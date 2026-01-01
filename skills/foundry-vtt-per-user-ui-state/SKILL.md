# Foundry VTT Per-User UI State Persistence

Save and load per-user, per-actor UI preferences using Foundry's flag system to remember collapsed sections, filter toggles, dockable layouts, and other UI state across sessions.

## When to Use This Skill

Invoke this skill when implementing UI preferences that should persist across sessions:

### ✅ Use Per-User State For:

- **Collapsed/Expanded Sections** - Remember which sections are open/closed
- **Filter Toggles** - Remember "Show Equipped", "Show Owned", visibility settings
- **Dockable Section Layout** - Remember drag-and-drop column assignments
- **Sheet Lock State** - Remember edit mode vs locked mode preference
- **Sort Order Preferences** - Remember how lists are sorted
- **Tab Selection** - Remember which tab was last active
- **Any UI-only preference** - Not part of actor data, just visual state

### ❌ Don't Use Per-User State For:

- Actor data (use actor.system or actor.flags instead)
- World-level settings (use game.settings.register with scope: "world")
- Client-level module settings (use game.settings.register with scope: "client")
- Temporary state that doesn't need to persist (use instance variables)

## The Problem: UI State Without Persistence

### What Happens Without Persistence

```
Timeline:
T0: User opens actor sheet
T1: User collapses "Abilities" section
T2: User toggles "Show Equipped Only" filter
T3: User drags section to right column
T4: User closes sheet
T5: User reopens sheet
T6: All preferences lost - sections expanded, filters reset, layout back to default
```

**Result:** User has to reconfigure preferences every time they open the sheet.

## Solution: Per-User Flag Storage

Foundry provides a flag system for storing arbitrary data on documents. We can use `game.user` flags to store per-user preferences.

### Storage Structure

```javascript
game.user.flags[MODULE_ID] = {
  uiStates: {
    [actorId]: {
      collapsedSections: { abilities: true, items: false },
      showFilteredAbilities: true,
      showFilteredItems: false,
      showFilteredAcquaintances: true,
    },
    [anotherActorId]: {
      // Different state for different actor
    }
  },
  dockLayout: {
    [actorUuid]: {
      left: ["identity", "abilities", "harm"],
      right: ["items", "notes"],
    },
    [anotherActorUuid]: {
      // Different layout for different actor
    }
  }
};
```

**Key Properties:**
- **Per-user**: Each connected client has their own preferences
- **Per-actor**: Different state for each character sheet
- **Persistent**: Survives session restarts
- **Not synced**: Doesn't trigger document updates or multi-client cascades

## Step-by-Step Implementation

### Step 1: Create Helper Functions

**File:** `scripts/utils.js` (or equivalent utility module)

```javascript
const MODULE_ID = "my-module";

/**
 * Get the unique key for this sheet (actor ID).
 * @param {DocumentSheet} sheet
 * @returns {string|null}
 */
function _getUiStateKey(sheet) {
  return sheet?.actor?.id ?? sheet?.document?.id ?? null;
}

/**
 * Load persisted UI state for a sheet.
 * @param {DocumentSheet} sheet
 * @returns {Promise<object>} The persisted state object (or empty object)
 */
async function loadUiState(sheet) {
  const key = _getUiStateKey(sheet);
  if (!key) return {};

  const user = game?.user;
  if (!user?.getFlag) return {};

  const current = user.getFlag(MODULE_ID, "uiStates") || {};
  return current[key] || {};
}

/**
 * Save UI state for a sheet.
 * @param {DocumentSheet} sheet
 * @param {object} state - Partial state object to merge with existing state
 */
async function saveUiState(sheet, state) {
  const key = _getUiStateKey(sheet);
  if (!key) return;

  const user = game?.user;
  if (!user?.setFlag) return;

  // Get current state
  const current = user.getFlag(MODULE_ID, "uiStates") || {};

  // Merge new state with existing state for this actor
  const next = {
    ...current,
    [key]: { ...(current[key] || {}), ...state }
  };

  // Persist
  await user.setFlag(MODULE_ID, "uiStates", next);
}
```

**Why this pattern?**
- `getFlag` is synchronous (no await needed)
- `setFlag` is asynchronous (requires await)
- Merges partial updates with existing state
- Handles missing keys gracefully

### Step 2: Load State During Sheet Initialization

**File:** `scripts/my-actor-sheet.js`

```javascript
async getData() {
  const data = await super.getData();

  // Load persisted UI state
  const persistedUi = await loadUiState(this);

  // Initialize instance variables from persisted state
  this.collapsedSections =
    this.collapsedSections ||
    persistedUi.collapsedSections ||
    {};

  this.showFilteredAbilities =
    persistedUi.showFilteredAbilities ?? true;  // Default: true

  this.showFilteredItems =
    persistedUi.showFilteredItems ?? false;  // Default: false

  // Pass to template
  data.collapsedSections = this.collapsedSections;
  data.showFilteredAbilities = this.showFilteredAbilities;
  data.showFilteredItems = this.showFilteredItems;

  return data;
}
```

**Pattern Notes:**
- Use `??` (nullish coalescing) for boolean defaults (not `||`)
- `||` treats `false` as falsy, `??` only treats `null`/`undefined` as missing
- Prefer instance variables over re-reading flags every render
- Load once in `getData`, update instance variables on change

### Step 3: Save State When User Changes Preferences

#### Example 1: Collapsed Sections

```javascript
activateListeners(html) {
  super.activateListeners(html);

  // Collapse toggle handler
  html.find('[data-action="toggle-section-collapse"]').on("click", (ev) => {
    ev.preventDefault();
    const sectionKey = ev.currentTarget?.dataset?.sectionKey;
    if (!sectionKey) return;

    // Find section element
    const section = ev.currentTarget.closest(".section-block");
    if (!section) return;

    // Toggle CSS class
    const isCollapsed = section.classList.toggle("collapsed");

    // Update icon
    const icon = ev.currentTarget.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-caret-right", isCollapsed);
      icon.classList.toggle("fa-caret-down", !isCollapsed);
    }

    // Update instance state
    this.collapsedSections = {
      ...(this.collapsedSections || {}),
      [sectionKey]: isCollapsed,
    };

    // Persist to user flags
    saveUiState(this, { collapsedSections: this.collapsedSections });
  });
}
```

#### Example 2: Filter Toggles

```javascript
html.find('[data-action="toggle-filter-abilities"]').on("click", (ev) => {
  ev.preventDefault();

  // Toggle instance state
  const next = !this.showFilteredAbilities;
  this.showFilteredAbilities = next;

  // Persist
  saveUiState(this, { showFilteredAbilities: next });

  // Re-render to show/hide filtered items
  this.render(false);
});

html.find('[data-action="toggle-filter-items"]').on("click", (ev) => {
  ev.preventDefault();

  const next = !this.showFilteredItems;
  this.showFilteredItems = next;

  saveUiState(this, { showFilteredItems: next });
  this.render(false);
});
```

#### Example 3: Dockable Section Layout

For more complex state like drag-and-drop layout, use a separate flag key:

```javascript
// File: scripts/ui/dockable-sections.js
const MODULE_ID = "my-module";
const FLAG_KEY = "dockLayout";

async function initDockableSections(config) {
  const actorUuid = config.actorUuid;
  const defaultLayout = config.defaultLayout || { left: [], right: [] };

  // Sanitize UUID for flag storage (Foundry expands dots in keys)
  const storageKey = actorUuid.replace(/\./g, "_");

  // 1. Load saved layout
  const savedMap = (await game.user.getFlag(MODULE_ID, FLAG_KEY)) || {};
  const savedLayout = savedMap[storageKey] || defaultLayout;

  // 2. Apply layout to DOM
  applySavedLayout(savedLayout, config);

  // 3. Save layout on drag/drop
  const saveLayout = async () => {
    const newLayout = extractLayoutFromDOM(config);

    // Persist
    const currentMap = (await game.user.getFlag(MODULE_ID, FLAG_KEY)) || {};
    currentMap[storageKey] = newLayout;
    await game.user.setFlag(MODULE_ID, FLAG_KEY, currentMap);
  };

  // 4. Initialize SortableJS with save callback
  initializeSortable(config, saveLayout);
}
```

**Why separate flag keys?**
- Keeps related state grouped (all layouts under `dockLayout`)
- Prevents key collisions between different persistence systems
- Easier to debug (can inspect each flag independently)

### Step 4: Apply Persisted State in Template

**File:** `templates/actor-sheet.html`

```handlebars
{{!-- Collapsed sections --}}
<div class="section-block {{#if (lookup ../collapsedSections "abilities")}}collapsed{{/if}}"
     data-section-key="abilities">
  <div class="section-header" data-action="toggle-section-collapse" data-section-key="abilities">
    <i class="fas {{#if (lookup ../collapsedSections "abilities")}}fa-caret-right{{else}}fa-caret-down{{/if}}"></i>
    <h2>{{localize "Abilities"}}</h2>
  </div>
  <div class="section-content">
    {{!-- Abilities list --}}
  </div>
</div>

{{!-- Filter toggle --}}
<div class="filter-controls">
  <button data-action="toggle-filter-abilities" class="{{#if showFilteredAbilities}}active{{/if}}">
    <i class="fas fa-filter"></i>
    Show Available Only
  </button>
</div>

{{!-- Conditional rendering based on filter --}}
{{#if showFilteredAbilities}}
  {{#each filteredAbilities as |ability|}}
    {{> ability-card ability=ability}}
  {{/each}}
{{else}}
  {{#each allAbilities as |ability|}}
    {{> ability-card ability=ability}}
  {{/each}}
{{/if}}
```

## Common Use Cases

### Use Case 1: Collapsible Sections

**Storage:**
```javascript
{
  collapsedSections: {
    "identity": false,
    "abilities": true,
    "items": false,
    "harm": true,
  }
}
```

**Load:**
```javascript
this.collapsedSections = persistedUi.collapsedSections || {};
```

**Save:**
```javascript
this.collapsedSections[sectionKey] = isCollapsed;
saveUiState(this, { collapsedSections: this.collapsedSections });
```

**Template:**
```handlebars
<div class="section {{#if (lookup ../collapsedSections "abilities")}}collapsed{{/if}}">
```

### Use Case 2: Filter Toggles

**Storage:**
```javascript
{
  showFilteredAbilities: true,
  showFilteredItems: false,
  showFilteredAcquaintances: true,
}
```

**Load:**
```javascript
this.showFilteredAbilities = persistedUi.showFilteredAbilities ?? true;
```

**Save:**
```javascript
saveUiState(this, { showFilteredAbilities: next });
```

**Template:**
```handlebars
{{#if showFilteredAbilities}}
  {{!-- Filtered list --}}
{{else}}
  {{!-- All items --}}
{{/if}}
```

### Use Case 3: Sheet Lock State (Edit Mode)

**Storage:**
```javascript
{
  isLocked: true,  // User prefers sheets locked by default
}
```

**Load:**
```javascript
// In getData or constructor
const persistedUi = await loadUiState(this);
this.options.editable = !(persistedUi.isLocked ?? true);  // Default: locked
```

**Save:**
```javascript
html.find('[data-action="toggle-sheet-lock"]').on("click", (ev) => {
  const isLocked = !this.options.editable;
  saveUiState(this, { isLocked });

  this.options.editable = !isLocked;
  this.render(false);
});
```

### Use Case 4: Dockable Section Layout

**Storage:**
```javascript
game.user.flags[MODULE_ID].dockLayout = {
  "Actor_abc123": {
    left: ["identity", "abilities", "harm"],
    right: ["items", "notes", "acquaintances"],
  }
}
```

**Load:**
```javascript
const storageKey = actorUuid.replace(/\./g, "_");
const savedMap = (await game.user.getFlag(MODULE_ID, "dockLayout")) || {};
const savedLayout = savedMap[storageKey] || defaultLayout;
```

**Save:**
```javascript
const currentMap = (await game.user.getFlag(MODULE_ID, "dockLayout")) || {};
currentMap[storageKey] = newLayout;
await game.user.setFlag(MODULE_ID, "dockLayout", currentMap);
```

**Why use UUID as key?**
- Actor IDs are not unique across worlds
- Actor UUIDs are globally unique
- Sanitize dots to underscores (Foundry limitation)

## Default Values Strategy

### Pattern 1: Explicit Defaults in Load

```javascript
async getData() {
  const persistedUi = await loadUiState(this);

  // Explicit defaults
  this.showFilteredAbilities = persistedUi.showFilteredAbilities ?? true;
  this.showFilteredItems = persistedUi.showFilteredItems ?? false;
}
```

**When to use:**
- Different defaults for different properties
- Boolean defaults (use `??` not `||`)
- Clear documentation of expected behavior

### Pattern 2: Default Layout Object

```javascript
const defaultLayout = {
  left: ["identity", "abilities", "harm"],
  right: ["items", "notes"],
};

const savedLayout = savedMap[storageKey] || defaultLayout;
```

**When to use:**
- Complex nested objects
- Layout configurations
- Arrays of values

### Pattern 3: Empty Object Fallback

```javascript
this.collapsedSections = persistedUi.collapsedSections || {};
```

**When to use:**
- Map/dictionary structures
- No meaningful default (all sections expanded)
- Truthy check is safe (`{}` is truthy)

## Nullish Coalescing vs Logical OR

### ❌ Wrong: Using `||` for Booleans

```javascript
// BAD: Treats false as missing!
this.showFilteredAbilities = persistedUi.showFilteredAbilities || true;

// If user saved false, this overwrites it with true
// User preference lost!
```

### ✅ Correct: Using `??` for Booleans

```javascript
// GOOD: Only uses default if null or undefined
this.showFilteredAbilities = persistedUi.showFilteredAbilities ?? true;

// If user saved false, this respects it
// If missing (null/undefined), uses default (true)
```

**Rule:** Always use `??` for boolean defaults, not `||`.

## Performance Considerations

### Pattern 1: Load Once, Cache in Instance

```javascript
// ✅ GOOD: Load once in getData
async getData() {
  const persistedUi = await loadUiState(this);
  this.collapsedSections = persistedUi.collapsedSections || {};
  // Use this.collapsedSections throughout
}

// ❌ BAD: Re-load every time
activateListeners(html) {
  html.find('.toggle').on('click', async (ev) => {
    const persistedUi = await loadUiState(this);  // Slow!
  });
}
```

**Why:**
- `loadUiState` reads from `game.user.flags` (fast, synchronous access)
- But wrapping in async function adds overhead
- Cache in instance variables, update on change

### Pattern 2: Batch Updates (If Needed)

```javascript
// If multiple related preferences change together
async function saveMultiplePreferences(sheet) {
  await saveUiState(sheet, {
    collapsedSections: sheet.collapsedSections,
    showFilteredAbilities: sheet.showFilteredAbilities,
    showFilteredItems: sheet.showFilteredItems,
  });
}
```

**Note:** `saveUiState` already merges, so this is mostly for documentation.

## Multi-User Behavior

### Per-User Storage

```
World with 3 connected clients:
  ↓
Client A (User 1):
  game.user.flags[MODULE_ID].uiStates[actorId] = { ... }

Client B (User 2):
  game.user.flags[MODULE_ID].uiStates[actorId] = { ... }  // Different!

Client C (GM):
  game.user.flags[MODULE_ID].uiStates[actorId] = { ... }  // Different!
```

**Each user has independent preferences:**
- User 1 can collapse "Abilities"
- User 2 can expand "Abilities"
- GM can have different layout
- No conflicts, no syncing needed

### Not Shared Across Clients

```javascript
// User A saves preference
await game.user.setFlag(MODULE_ID, "uiStates", { ... });

// User B's flags are UNCHANGED
// Each client manages its own user flags
```

**Benefits:**
- No multi-client update storms
- No ownership guards needed
- No race conditions
- Fast (local read/write)

## Debugging UI State

### Inspect Current State

```javascript
// In browser console
const uiStates = game.user.getFlag("my-module", "uiStates");
console.log("All UI states:", uiStates);

const actorId = "abc123";
console.log("State for actor:", uiStates[actorId]);
```

### Reset State for Actor

```javascript
// In browser console
const MODULE_ID = "my-module";
const actorId = "abc123";

const current = game.user.getFlag(MODULE_ID, "uiStates") || {};
delete current[actorId];
await game.user.setFlag(MODULE_ID, "uiStates", current);

// Reload sheet to see defaults
```

### Reset All State

```javascript
// In browser console
await game.user.setFlag("my-module", "uiStates", {});
await game.user.setFlag("my-module", "dockLayout", {});

// All preferences cleared
```

## Integration with Sheet Lifecycle

### When to Load State

```javascript
// Option 1: In getData (recommended)
async getData() {
  const data = await super.getData();
  const persistedUi = await loadUiState(this);
  this.collapsedSections = persistedUi.collapsedSections || {};
  // ...
}

// Option 2: In constructor (if state needed before first render)
constructor(...args) {
  super(...args);
  this._loadStatePromise = loadUiState(this).then(state => {
    this.collapsedSections = state.collapsedSections || {};
  });
}

async getData() {
  await this._loadStatePromise;  // Ensure loaded
  // ...
}
```

**Recommendation:** Load in `getData` (simpler, happens before render).

### When to Save State

```javascript
// In event handlers (activateListeners)
activateListeners(html) {
  super.activateListeners(html);

  html.find('[data-action="toggle-filter"]').on("click", (ev) => {
    // 1. Update instance state
    this.showFilteredAbilities = !this.showFilteredAbilities;

    // 2. Persist immediately
    saveUiState(this, { showFilteredAbilities: this.showFilteredAbilities });

    // 3. Re-render if needed
    this.render(false);
  });
}
```

**Pattern:** Update instance variable → Save → Render (if visual change needed).

## Error Handling

### Graceful Degradation

```javascript
async function loadUiState(sheet) {
  try {
    const key = _getUiStateKey(sheet);
    if (!key) return {};

    const user = game?.user;
    if (!user?.getFlag) return {};

    const current = user.getFlag(MODULE_ID, "uiStates") || {};
    return current[key] || {};
  } catch (err) {
    console.warn("Failed to load UI state:", err);
    return {};  // Fallback to defaults
  }
}

async function saveUiState(sheet, state) {
  try {
    const key = _getUiStateKey(sheet);
    if (!key) return;

    const user = game?.user;
    if (!user?.setFlag) return;

    const current = user.getFlag(MODULE_ID, "uiStates") || {};
    const next = { ...current, [key]: { ...(current[key] || {}), ...state } };

    await user.setFlag(MODULE_ID, "uiStates", next);
  } catch (err) {
    console.error("Failed to save UI state:", err);
    // Don't notify user - non-critical failure
  }
}
```

**Why graceful?**
- UI state is non-critical (defaults work)
- Silent failure is OK for preferences
- Log to console for debugging

## Testing UI State Persistence

### Manual Test Procedure

```
1. Open actor sheet
2. Change preference (collapse section, toggle filter, drag section)
3. Close sheet
4. Reopen sheet
5. Verify preference persisted

Expected: Preference retained
Actual: _____ (should match expected)
```

### Test Edge Cases

```
1. First time opening sheet (no saved state)
   Expected: Defaults applied

2. Multiple actors
   Expected: Different state per actor

3. Multiple users (if testing multi-client)
   Expected: Independent preferences per user

4. Invalid/corrupted state
   Expected: Falls back to defaults gracefully
```

## Common Pitfalls

### ❌ Pitfall 1: Using `||` for Boolean Defaults

```javascript
// BAD: false gets overwritten with true
this.showFiltered = persistedUi.showFiltered || true;
```

**Fix:** Use `??` (nullish coalescing).

### ❌ Pitfall 2: Not Sanitizing UUIDs

```javascript
// BAD: Dots in UUID break Foundry flag storage
const key = actor.uuid;  // "Actor.abc123.Item.xyz789"
await game.user.setFlag(MODULE_ID, "layout", { [key]: layout });
// Foundry expands dots into nested objects!
```

**Fix:** Sanitize UUIDs by replacing dots.

```javascript
const key = actor.uuid.replace(/\./g, "_");
```

### ❌ Pitfall 3: Saving Before Loading

```javascript
// BAD: Overwrites other saved state
activateListeners(html) {
  // This runs before getData loads state!
  saveUiState(this, { showFiltered: true });
}
```

**Fix:** Ensure state loaded in `getData` before saving in `activateListeners`.

### ❌ Pitfall 4: Forgetting to Update Instance Variable

```javascript
// BAD: State saved but instance not updated
html.find('.toggle').on('click', (ev) => {
  const next = !this.showFiltered;
  saveUiState(this, { showFiltered: next });
  // this.showFiltered still has old value!
});
```

**Fix:** Update instance variable first.

```javascript
this.showFiltered = next;
saveUiState(this, { showFiltered: next });
```

## Quick Checklist

Before implementing per-user UI state:

- [ ] Identified what UI preferences need persistence
- [ ] Created `loadUiState` and `saveUiState` helper functions
- [ ] Load state in `getData` (or constructor if needed early)
- [ ] Initialize instance variables with defaults using `??`
- [ ] Save state in event handlers (after updating instance)
- [ ] Applied state in template (conditional classes, `{{#if}}`)
- [ ] Used `??` not `||` for boolean defaults
- [ ] Sanitized UUIDs if using actor.uuid as key
- [ ] Tested: close/reopen sheet, preferences persist
- [ ] Tested: multiple actors, independent state
- [ ] Graceful error handling (fallback to defaults)

## References

- Implementation: `scripts/utils.js` (search for "loadUiState", "saveUiState")
- Dockable sections: `scripts/ui/dockable-sections.js` (full drag-and-drop example)
- Collapsed sections: `scripts/utils.js` (search for "bindCollapseToggles")
- Example usage: `scripts/blades-alternate-actor-sheet.js` (getData, activateListeners)
- Example usage: `scripts/blades-alternate-crew-sheet.js` (filter toggles)

## Project-Specific Notes

For BitD Alternate Sheets:
- UI state key: `MODULE_ID = "bitd-alternate-sheets"`
- Main flag: `game.user.flags[MODULE_ID].uiStates[actorId]`
- Dockable layout flag: `game.user.flags[MODULE_ID].dockLayout[actorUuid_sanitized]`
- Collapsed sections stored as object: `{ "abilities": true, "items": false }`
- Filter toggles: `showFilteredAbilities`, `showFilteredItems`, `showFilteredAcquaintances`
- Sheet defaults to locked (edit mode off) unless user toggles it
