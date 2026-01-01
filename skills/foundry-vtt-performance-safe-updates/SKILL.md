# Foundry VTT Performance-Safe Updates

Ensure document updates in Foundry VTT modules don't cause multi-client update storms or render cascades.

## When to Use This Skill

Invoke this skill when implementing ANY of the following in a Foundry VTT module:
- Adding a new feature that updates actors or items
- Modifying existing update logic
- Adding UI elements that trigger document changes
- Implementing hook handlers that respond to document changes
- Replacing or swapping embedded documents (abilities, items, effects)

## Core Problem

Foundry VTT runs in multi-client sessions where hooks fire on ALL connected clients. Without proper guards:
- Every client triggers duplicate updates (2-10x redundant database writes)
- Update storms occur when updates trigger more updates across clients
- UI flickers when delete+create patterns cause "empty state" renders between operations
- Performance degrades exponentially with number of connected clients

## The Performance-Safe Pattern

### Step 1: Ownership Guards

**Before any document update, ask: "Should this run on every client?"**

```javascript
// ❌ BAD: Runs on every connected client
Hooks.on("deleteItem", (item, options, userId) => {
  item.parent.update({ "system.someField": newValue });
});

// ✅ GOOD: Only owner/GM performs the update
Hooks.on("deleteItem", (item, options, userId) => {
  if (!item.parent?.isOwner) return;
  item.parent.update({ "system.someField": newValue });
});
```

**Common ownership checks:**
- `item.isOwner` - Current user owns this item
- `item.parent?.isOwner` - Current user owns the parent (actor/container)
- `actor.isOwner` - Current user owns this actor
- `game.user.isGM` - Current user is the GM

**Use GM-only guards for:**
- World-level changes
- Compendium updates
- Global settings modifications

### Step 2: Skip No-Op Updates

**Before calling update, check if the value actually changes:**

```javascript
// ❌ BAD: Always updates, even if value unchanged
await actor.update({ "system.selected_load_level": newLevel });

// ✅ GOOD: Skip if already set
if (actor.system.selected_load_level === newLevel) return;
await actor.update({ "system.selected_load_level": newLevel });
```

**For flag-based updates:**

```javascript
// ✅ Skip if flag already matches target state
const currentProgress = actor.getFlag('bitd-alternate-sheets', 'abilityProgress') || {};
if (currentProgress[abilityId] === targetValue) return;

await actor.setFlag('bitd-alternate-sheets', 'abilityProgress', {
  ...currentProgress,
  [abilityId]: targetValue
});
```

### Step 3: Batch Multiple Updates

**Combine multiple field changes into a single update call:**

```javascript
// ❌ BAD: Three separate updates (3x hooks, 3x database writes)
await actor.update({ "system.harm.level1.value": "Bruised" });
await actor.update({ "system.stress.value": 5 });
await actor.update({ "system.xp.value": 3 });

// ✅ GOOD: Single batched update
await actor.update({
  "system.harm.level1.value": "Bruised",
  "system.stress.value": 5,
  "system.xp.value": 3
});
```

### Step 4: Use queueUpdate Wrapper

**Wrap ALL document updates in queueUpdate to prevent concurrent update collisions:**

```javascript
import { queueUpdate } from "./update-queue.js";

// ✅ Prevents race conditions in multi-client sessions
await queueUpdate(async () => {
  await this.actor.update(updates);
});
```

**What queueUpdate does:**
- Ensures updates execute sequentially, not concurrently
- Prevents "lost update" race conditions
- Automatically handles update conflicts

**When to use:**
- ANY actor.update() call
- ANY updateEmbeddedDocuments() call
- Batch operations that modify multiple documents

### Step 5: Atomic Embedded Document Updates

**When replacing embedded documents (items, effects), NEVER use delete+create:**

```javascript
// ❌ BAD: Delete + Create causes UI flicker and race conditions
await actor.deleteEmbeddedDocuments("Item", [oldItemId]);
await actor.createEmbeddedDocuments("Item", [newItemData]);
// UI renders "empty state" between these calls!

// ✅ GOOD: Update in place (atomic operation)
await actor.updateEmbeddedDocuments("Item", [{
  _id: oldItemId,
  name: newItemData.name,
  img: newItemData.img,
  system: newItemData.system
}]);
```

**Use cases:**
- Swapping crew abilities
- Changing hunting grounds
- Replacing playbook items
- Updating item references

### Step 6: Guard Rerenders in Hooks

**Only rerender sheets that are owned and currently visible:**

```javascript
// ❌ BAD: Rerenders ALL character sheets (including closed/unowned)
Hooks.on("renderBladesClockSheet", (sheet, html, data) => {
  game.actors.forEach(actor => {
    actor.sheet.render(false);
  });
});

// ✅ GOOD: Only rerender owned, open sheets
Hooks.on("renderBladesClockSheet", (sheet, html, data) => {
  game.actors.forEach(actor => {
    if (actor.isOwner && actor.sheet.rendered) {
      actor.sheet.render(false);
    }
  });
});
```

### Step 7: Avoid Redundant Manual Renders

**Foundry automatically rerenders sheets after document updates:**

```javascript
// ❌ BAD: Explicit render after update causes double-render
await this.actor.update(updates);
this.render(false);  // Unnecessary!

// ✅ GOOD: Let Foundry's updateActor hook handle the render
await this.actor.update(updates);
// Sheet automatically rerenders via hook
```

**Exception:** Only call `render(false)` manually if:
- You're updating UI state without document changes
- You need to refresh after external changes (other user's update)

### Step 8: Debounce High-Frequency Handlers

**For handlers that run frequently (keyup, mousemove), add debouncing:**

```javascript
import { debounce } from "./utils.js";

// ❌ BAD: Updates on every keystroke
html.find("input").on("keyup", async (ev) => {
  await actor.update({ "system.notes": ev.target.value });
});

// ✅ GOOD: Debounce to reduce update frequency
html.find("input").on("keyup", debounce(async (ev) => {
  await queueUpdate(async () => {
    await actor.update({ "system.notes": ev.target.value });
  });
}, 300));
```

## Quick Checklist for New Code

Before submitting any code that updates documents, verify:

- [ ] **Ownership Guard**: Added `if (!item.parent?.isOwner) return;` or `if (!game.user.isGM) return;` where appropriate
- [ ] **No-Op Check**: Skip update if current value already matches target value
- [ ] **Batched**: Multiple field changes combined into single update object
- [ ] **Queued**: Update wrapped in `queueUpdate(async () => { ... })`
- [ ] **Atomic**: Used `updateEmbeddedDocuments()` instead of delete+create for replacements
- [ ] **Rerender Guards**: Only rerender owned and currently open sheets
- [ ] **No Redundant Renders**: Removed manual `render(false)` after document updates
- [ ] **Debounced**: High-frequency handlers (keyup, mousemove) use debouncing

## Common Patterns by Feature Type

### Adding a Toggle (checkbox, button)

```javascript
html.find(".toggle-something").on("click", async (ev) => {
  const currentValue = this.actor.system.someFlag;
  const newValue = !currentValue;

  // Skip if unchanged
  if (currentValue === newValue) return;

  await queueUpdate(async () => {
    await this.actor.update({ "system.someFlag": newValue });
  });
  // No manual render - hook handles it
});
```

### Implementing a Hook Handler

```javascript
Hooks.on("deleteItem", (item, options, userId) => {
  // Guard: Only owner performs side effects
  if (!item.parent?.isOwner) return;

  // Check if update needed
  const needsUpdate = /* your logic */;
  if (!needsUpdate) return;

  // Perform update
  queueUpdate(async () => {
    await item.parent.update({ /* changes */ });
  });
});
```

### Swapping Embedded Documents

```javascript
async replaceAbility(oldAbilityId, newAbilityData) {
  const oldAbility = this.actor.items.get(oldAbilityId);
  if (!oldAbility) return;

  // Update in place (atomic)
  await queueUpdate(async () => {
    await this.actor.updateEmbeddedDocuments("Item", [{
      _id: oldAbilityId,
      name: newAbilityData.name,
      img: newAbilityData.img,
      system: newAbilityData.system
    }]);
  });
}
```

## Anti-Patterns to Avoid

### ❌ Update Storms
```javascript
// Every client updates, causing N × clients database writes
Hooks.on("deleteItem", (item) => {
  item.parent.update({ ... });  // Missing ownership guard!
});
```

### ❌ Render Cascades
```javascript
// Rerenders ALL sheets, including unowned/closed
Hooks.on("updateActor", (actor) => {
  game.actors.forEach(a => a.sheet.render(false));
});
```

### ❌ Delete + Create Race Conditions
```javascript
// UI flickers; race condition between delete and create
await actor.deleteEmbeddedDocuments("Item", [id]);
await actor.createEmbeddedDocuments("Item", [data]);
```

### ❌ Redundant No-Op Updates
```javascript
// Updates even if value unchanged (wasted database writes)
await actor.update({ "system.xp": actor.system.xp });
```

## Testing Multi-Client Performance

After implementing updates, test with multiple clients:

1. **Open two browser windows** (or use incognito mode)
2. **Log in as different users** (or same user, different tabs)
3. **Perform the action** (toggle, update, swap)
4. **Check browser console** in both windows for:
   - Duplicate update logs
   - Error messages
   - Unexpected rerenders
5. **Verify in database** that only one update occurred (not N × clients)

## References

- Foundry VTT Hook documentation: ownership checks in hooks
- Update queue pattern: prevents concurrent update collisions
- Atomic updates: `updateEmbeddedDocuments` vs delete+create

## Project-Specific Notes

For BitD Alternate Sheets module:
- queueUpdate implementation in `scripts/utils.js`
- Ownership patterns in `scripts/hooks.js`
- Performance guidelines in `docs/performance-update-guidelines.md`
