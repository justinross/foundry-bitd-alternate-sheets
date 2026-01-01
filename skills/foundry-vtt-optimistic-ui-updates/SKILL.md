# Foundry VTT Optimistic UI Updates

Handle race conditions between UI state and Foundry document updates using optimistic UI patterns to prevent flickering and laggy interactions.

## When to Use This Skill

Invoke this skill when implementing interactive UI elements that update actor/item documents:

### ✅ Use Optimistic Updates For:

- **Clock segments** - Click to increment/decrement progress
- **Checkboxes/Toggles** - Ability checkboxes, item equipped state
- **Progress bars** - XP tracks, harm clocks, stress
- **Radio buttons** - Load level, standing toggles
- **Any rapid-fire interaction** - Where users click multiple times quickly

### ❌ Not Needed For:

- Text input (already optimistic in Foundry forms)
- Dialogs/Modals (blocking interactions)
- Server-side only updates (GM-triggered events)

## The Problem: Race Conditions

### What Happens Without Optimistic Updates

```
Timeline:
T0: User clicks clock segment (wants to go from 4 → 5)
T1: Click handler reads form state → value = 4
T2: Handler updates document → actor.update({ clock: 5 })
T3: User clicks again (wants 5 → 6)
T4: Click handler reads form state → value = 4 (stale!)
T5: Handler updates document → actor.update({ clock: 5 }) (wrong!)
T6: updateActor hook fires → sheet.render()
T7: Form refreshes from document → shows 5 (not 6)
```

**Result:** Second click ignored, user confused, bad UX.

### Why This Happens

Foundry's form handling creates a race condition:
1. Form shows current document state
2. User interaction triggers update
3. Update happens asynchronously
4. updateActor hook triggers render
5. Render updates form from document
6. During steps 2-5, form state is stale

## Solution: Three Optimistic Patterns

### Pattern 1: Read from DOM, Not Form State

**Problem:** Form state (radio/checkbox `.value`) can be stale during updates.

**Solution:** Read from visual representation (CSS background-image, class names).

#### Example: Clock Segments

```javascript
// ❌ BAD: Radio button value is stale
html.find(".clock-segment").click(async (event) => {
  const radioButton = $(event.currentTarget).find('input[type="radio"]');
  const currentValue = parseInt(radioButton.val());  // STALE during updates!

  const newValue = currentValue + 1;
  await actor.update({ "system.clock.value": newValue });
});

// ✅ GOOD: Read from background-image (source of truth)
html.find(".clock-segment").click(async (event) => {
  const label = $(event.currentTarget);
  const bgImage = label.css("background-image");

  // Extract segment number from URL: url('clocks/clock-4.webp')
  const match = bgImage.match(/clock-(\d+)/);
  const currentValue = match ? parseInt(match[1]) : 0;

  const newValue = currentValue + 1;
  await actor.update({ "system.clock.value": newValue });
});
```

**Why this works:**
- Background-image is set by CSS based on radio state
- Radio state updates immediately when clicked (browser behavior)
- Background-image reflects actual visual, not form state
- Immune to Foundry's async render timing

### Pattern 2: Update UI Immediately, Then Persist

**Problem:** Waiting for document update before showing change feels laggy.

**Solution:** Update DOM immediately (optimistic), then persist asynchronously.

#### Example: Ability Toggle

```javascript
html.find(".ability-checkbox").click(async (event) => {
  const checkbox = event.currentTarget;
  const abilityId = checkbox.dataset.abilityId;

  // 1. Update UI immediately (optimistic)
  const wasChecked = checkbox.classList.contains("checked");
  const newChecked = !wasChecked;

  if (newChecked) {
    checkbox.classList.add("checked");
    checkbox.style.backgroundImage = "url('teeth/tooth-full.webp')";
  } else {
    checkbox.classList.remove("checked");
    checkbox.style.backgroundImage = "url('teeth/tooth-empty.webp')";
  }

  // 2. Persist to document (async)
  const newProgress = newChecked ? 1 : 0;
  await actor.setFlag(MODULE_ID, `abilityProgress.${abilityId}`, newProgress);

  // 3. Don't manually render - visual already correct!
});
```

**Why this works:**
- User sees immediate feedback (no lag)
- Document update happens in background
- If update fails, error notification appears but UI already updated
- No flickering from render cycles

### Pattern 3: Suppress Redundant Renders

**Problem:** Manual `render(false)` after document updates causes double-render.

**Solution:** Let Foundry's `updateActor` hook handle rendering automatically.

#### Example: Playbook Switch

```javascript
async switchPlaybook(newPlaybookId) {
  const updates = {
    "system.playbook": newPlaybookId,
    // ... other fields
  };

  // ❌ BAD: Causes double-render
  await this.actor.update(updates);
  this.render(false);  // Redundant!

  // ✅ GOOD: Let Foundry hook handle render
  await this.actor.update(updates);
  // Foundry's updateActor hook automatically calls render()
}
```

**When is manual render needed?**
- Updating UI-only state (not document)
- Responding to external changes (other user's update)
- Forcing refresh after complex operations

**Rule:** If you're calling `actor.update()`, don't call `render()` immediately after.

## Implementation Patterns by Element Type

### Clocks (Background-Image Pattern)

```javascript
html.find(".clock-segment").click(async (event) => {
  event.preventDefault();

  const label = $(event.currentTarget);
  const bgImage = label.css("background-image");
  const match = bgImage.match(/clock-(\d+)/);
  const currentValue = match ? parseInt(match[1]) : 0;

  // Determine new value
  const segments = parseInt(label.closest('.clock').dataset.segments) || 4;
  const newValue = currentValue >= segments ? 0 : currentValue + 1;

  // Update document
  const clockPath = label.closest('.clock').dataset.path;
  await this.actor.update({ [clockPath]: newValue });
});

// Right-click to decrement
html.find(".clock-segment").contextmenu(async (event) => {
  event.preventDefault();

  const label = $(event.currentTarget);
  const bgImage = label.css("background-image");
  const match = bgImage.match(/clock-(\d+)/);
  const currentValue = match ? parseInt(match[1]) : 0;

  const newValue = Math.max(0, currentValue - 1);

  const clockPath = label.closest('.clock').dataset.path;
  await this.actor.update({ [clockPath]: newValue });
});
```

### Checkboxes (Class-Based Pattern)

```javascript
html.find(".ability-checkbox").click(async (event) => {
  const checkbox = event.currentTarget;
  const abilityId = checkbox.dataset.abilityId;
  const currentProgress = parseInt(checkbox.dataset.progress) || 0;
  const maxProgress = parseInt(checkbox.dataset.max) || 1;

  // Toggle progress
  const newProgress = currentProgress >= maxProgress ? 0 : currentProgress + 1;

  // Optimistic UI update
  checkbox.dataset.progress = newProgress;
  checkbox.classList.toggle("checked", newProgress > 0);

  // Persist
  await this.actor.setFlag(MODULE_ID, `abilityProgress.${abilityId}`, newProgress);
});
```

### Equipped Items (Toggle Pattern)

```javascript
html.find(".item-equipped").click(async (event) => {
  const checkbox = event.currentTarget;
  const itemId = checkbox.dataset.itemId;
  const wasEquipped = checkbox.checked;

  // Optimistic: checkbox already toggled by browser
  // Just persist the new state

  const equippedItems = this.actor.getFlag(MODULE_ID, "equipped-items") || {};

  if (wasEquipped) {
    equippedItems[itemId] = { id: itemId, equipped: true };
  } else {
    delete equippedItems[itemId];
  }

  await this.actor.setFlag(MODULE_ID, "equipped-items", equippedItems);
});
```

## Handling Rapid Clicks

### Debouncing (For Text Input)

```javascript
import { debounce } from "./utils.js";

html.find(".inline-input").on("keyup", debounce(async (ev) => {
  const value = ev.currentTarget.innerText.trim();
  await this.actor.update({ "system.notes": value });
}, 300));  // Wait 300ms after last keystroke
```

### No Debouncing Needed (For Discrete Actions)

```javascript
// Clocks/checkboxes don't need debouncing
// Each click is a discrete action with clear intent
html.find(".clock-segment").click(async (event) => {
  // Handle immediately - don't debounce
  await updateClock(event);
});
```

**When to debounce:**
- Text input (keyup, input events)
- Slider drag (mousemove)
- Window resize handlers

**When NOT to debounce:**
- Click events (discrete actions)
- Checkbox/radio changes
- Button presses

## Testing Optimistic Updates

### Test 1: Rapid Clicking

```
1. Open sheet
2. Click clock segment 5 times rapidly
3. Expected: Clock advances to 5
4. Actual: _____ (should match expected)
```

**If clicks are dropped:**
- Check if reading from form state instead of DOM
- Verify no debouncing on click handler
- Ensure optimistic UI update happens before persist

### Test 2: Visual Consistency

```
1. Click checkbox
2. Observe during network delay
3. Expected: Checkbox immediately appears checked
4. After update completes: Checkbox still checked (no flicker)
```

**If flickering occurs:**
- Check for manual `render(false)` after update
- Verify optimistic UI update matches final state
- Ensure no competing CSS classes

### Test 3: Error Recovery

```
1. Disable network (or break actor.update call)
2. Click checkbox
3. Expected: Checkbox updates, then error notification
4. Actual: _____ (UI should show attempted state)
```

**Error handling:**
- UI updates optimistically (user sees immediate feedback)
- Error notification appears if persist fails
- Consider rollback strategy for critical operations

## Common Pitfalls

### ❌ Pitfall 1: Reading Stale Form State

```javascript
// BAD: Reads from radio value during async update window
const currentValue = parseInt(radio.val());
```

**Fix:** Read from background-image, class names, or data attributes.

### ❌ Pitfall 2: Manual Render After Update

```javascript
// BAD: Causes double-render
await actor.update(updates);
this.render(false);
```

**Fix:** Remove `render(false)` - Foundry hook handles it.

### ❌ Pitfall 3: Not Updating UI Optimistically

```javascript
// BAD: Waits for document update before visual change
await actor.update({ "system.xp": newXp });
// UI updates after async completes (laggy)
```

**Fix:** Update DOM first, then persist.

### ❌ Pitfall 4: Competing Renders

```javascript
// BAD: Multiple renders in quick succession
await actor.update({ field1: value1 });  // Triggers render
await actor.update({ field2: value2 });  // Triggers render
await actor.update({ field3: value3 });  // Triggers render
```

**Fix:** Batch updates into single call (see performance-safe-updates skill).

## Integration with Performance-Safe Updates

Optimistic UI updates work well with the performance-safe-updates skill:

```javascript
html.find(".ability-checkbox").click(async (event) => {
  // 1. Optimistic UI update (this skill)
  checkbox.classList.toggle("checked");

  // 2. Ownership guard (performance-safe-updates skill)
  if (!this.actor.isOwner) return;

  // 3. Batched update (performance-safe-updates skill)
  const updates = {};
  updates[`flags.${MODULE_ID}.abilityProgress.${abilityId}`] = newProgress;

  // 4. Queued update (performance-safe-updates skill)
  await queueUpdate(async () => {
    await this.actor.update(updates);
  });

  // 5. No manual render (this skill)
});
```

## Quick Checklist

Before implementing interactive UI elements:

- [ ] Identified what user clicks/interacts with
- [ ] Determined current state (read from DOM, not form)
- [ ] Updated UI immediately (optimistic)
- [ ] Persisted to document asynchronously
- [ ] Removed manual `render(false)` after update
- [ ] Tested rapid clicking (5+ clicks in 1 second)
- [ ] Verified no flickering during updates
- [ ] Added error handling with notifications
- [ ] Considered integration with ownership guards (if multi-client)

## References

- Clock implementation: `scripts/hooks.js` (search for "clock-segment")
- Ability toggles: `scripts/blades-alternate-actor-sheet.js` (ability checkbox handlers)
- Performance guidelines: `docs/performance-update-guidelines.md`
- Render suppression: `scripts/hooks.js` (updateActor hook patterns)

## Project-Specific Notes

For BitD Alternate Sheets:
- Clocks use background-image pattern: `url('clocks/clock-N.webp')`
- Ability checkboxes use "teeth" imagery: `tooth-empty.webp`, `tooth-full.webp`
- Progress flags stored: `actor.flags[MODULE_ID].abilityProgress[abilityId]`
- Equipped items stored: `actor.flags[MODULE_ID]["equipped-items"][itemId]`
