# Remaining Refactorings

**Status:** Deferred low-priority improvements
**Source:** REFACTOR_PLAN.md (archived 2025-12-31)
**Last Updated:** 2025-12-31

---

## Summary

These are **optional quality improvements** deferred from the main refactoring work. All high-priority (H1-H4) and medium-priority (M1-M8) items have been completed, plus L1 (break up `getVirtualListOfItems`).

**Remaining:** 3 low-priority tasks (L4 completed)
**Total Estimated Effort:** ~4 hours (revised: L2 updated with Foundry-native approach)
**Impact:** Code quality and maintainability (not blocking functionality)

| ID | Task | Effort | Priority | Status |
|----|------|--------|----------|--------|
| L2 | Standardize error handling (Foundry-native) | 1 hour | Low | ⬜ Not started |
| L3 | Add JSDoc type annotations | 1 hour | Low | ⬜ Not started |
| L4 | Centralize template path constants | 30 min | Low | ✅ Completed (2025-12-31) |
| L5 | Extract sheet state management | 2 hours | Very Low | ⬜ Not started |

---

## L2: Standardize Error Handling Patterns (Foundry-Native)

**Effort:** Medium (1 hour - revised to use Foundry mechanisms)
**Dependencies:** None
**Priority:** Low

### Issue

Error handling is inconsistent across the codebase. Some errors use `console.error`, others use `console.log`. User notifications are inconsistent and don't leverage Foundry's built-in error handling mechanisms.

### Current State

**Inconsistent patterns:**
```javascript
// Pattern 1: Manual notification + console (duplicates Foundry functionality)
ui.notifications.error(`Failed to add item: ${err.message}`);
console.error("Item chooser error", err);

// Pattern 2: Console.log instead of console.error
console.log("Error: ", e);  // Wrong logging level

// Pattern 3: No user notification when appropriate
```

### Foundry V13 Best Practices

Foundry provides two built-in mechanisms:

**Option A: NotificationOptions.console (simplest)**
```javascript
ui.notifications.error(message, { console: true, clean: true });
```
- Automatically logs to console with stack trace
- `clean: true` sanitizes untrusted input
- Single call replaces manual notification + console.error

**Option B: Hooks.onError (ecosystem-compatible)**
```javascript
Hooks.onError(`BitD-Alt.${contextDescription}`, error, {
  msg: "[BitD-Alt]",
  log: "error",
  notify: "error"
});
```
- Triggers Foundry's centralized error funnel
- Other modules can listen to error hooks
- Consistent with core error reporting

### Proposed Solution

**Decision tree for catch blocks:**

1. **User-facing errors** (failed operations, validation errors):
   ```javascript
   } catch (err) {
     const message = `[BitD-Alt] ${userFacingDescription}`;
     ui.notifications.error(message, { console: true, clean: true });
   }
   ```

2. **Developer-only errors** (silent failures, recoverable errors):
   ```javascript
   } catch (err) {
     console.error(`[BitD-Alt] ${contextDescription}:`, err);
     // No UI notification - error is diagnostic only
   }
   ```

3. **Critical errors** (require ecosystem visibility):
   ```javascript
   } catch (err) {
     const error = err instanceof Error ? err : new Error(String(err));
     Hooks.onError(`BitD-Alt.${contextDescription}`, error, {
       msg: "[BitD-Alt]",
       log: "error",
       notify: "error"
     });
   }
   ```

### Implementation Steps

1. **Audit all catch blocks:**
   ```bash
   grep -r "} catch" scripts/
   ```

2. **Classify each error:**
   - User-actionable? → Use Option A (notification + console)
   - Diagnostic only? → Use console.error only
   - Ecosystem-critical? → Use Option B (Hooks.onError)

3. **Replace patterns:**
   - `console.log` → `console.error` (minimum fix)
   - Manual notification + console → `ui.notifications.*(msg, { console: true })`
   - Consider `{ clean: true }` if error messages contain user/document data

4. **Test error paths:**
   - Verify notifications appear for user-facing errors
   - Verify console logging includes stack traces
   - Check that diagnostic errors don't spam UI

### Files Likely Affected

- `scripts/utils.js`
- `scripts/sheets/actor/smart-edit.js`
- `scripts/blades-alternate-actor-sheet.js`
- `scripts/blades-alternate-crew-sheet.js`
- `scripts/migration.js`

### Benefits

- **Foundry-native:** Uses built-in NotificationOptions and error hooks
- **Less redundant:** Single call instead of notification + console
- **Ecosystem-compatible:** Hooks.onError allows other modules to listen
- **Better UX:** Only notifies users for actionable errors (not diagnostic noise)
- **Sanitization:** `{ clean: true }` prevents XSS from error messages
- **Future-proof:** Aligns with Foundry V13+ error handling patterns

### Optional Enhancement

Consider localization for published modules:
```javascript
const message = game.i18n.format("BITD_ALT.Error.FailedToAddItem", {
  error: err.message
});
ui.notifications.error(message, { console: true, clean: true });
```

---

## L3: Add JSDoc Type Annotations

**Effort:** Medium (1 hour)
**Dependencies:** None
**Priority:** Low

### Issue

Many functions lack type annotations, making it harder for IDEs to provide autocomplete and for developers to understand function signatures.

### Proposed Solution

Add JSDoc comments to key functions with TypeScript-style type annotations.

### Priority Functions to Document

1. **`Utils` class public methods** (high impact)
   - `getSourcedItemsByType()`
   - `getVirtualListOfItems()`
   - `loadUiState()`, `saveUiState()`
   - `resolveDescription()`

2. **Sheet class `getData` methods** (moderate impact)
   - `BladesAlternateActorSheet.getData()`
   - `BladesAlternateCrewSheet.getData()`

3. **Dialog functions** in `dialog-compat.js` (moderate impact)
   - `openCardSelectionDialog()`
   - `confirmDialogV2()`

4. **Update queue functions** (low impact, already clear)
   - `queueUpdate()`

### Example Format

```javascript
/**
 * Get all items of a specific type from world and compendia.
 * @param {string} itemType - The item type (e.g., "ability", "item", "npc")
 * @param {Object} [options] - Optional filters
 * @param {string} [options.playbook] - Filter by playbook name
 * @returns {Promise<Item[]>} Array of matching items
 */
static async getAllItemsByType(itemType, options = {}) { ... }
```

### Implementation Steps

1. Start with `Utils` class (highest impact)
2. Add JSDoc to each public method
3. Include parameter types, return types, and descriptions
4. Move to sheet classes next
5. Add types to helper functions last

### Benefits

- Better IDE autocomplete and IntelliSense
- Self-documenting code (clearer function contracts)
- Easier onboarding for new developers
- Type checking without TypeScript overhead

---

## L4: Centralize Template Path Constants

**Effort:** Medium (30 minutes)
**Dependencies:** H3 (MODULE_ID centralization) - **COMPLETED**
**Priority:** Low

### Issue

Template paths are hardcoded strings scattered throughout the codebase. Changing module structure requires finding and updating multiple locations.

### Current State

Template paths are hardcoded in multiple files:

```javascript
// In blades-alternate-actor-sheet.js
static get defaultOptions() {
  return mergeObject(super.defaultOptions, {
    template: "modules/bitd-alternate-sheets/templates/actor-sheet.html",
    // ...
  });
}

// In blades-templates.js
const templatePaths = [
  "modules/bitd-alternate-sheets/templates/parts/ability.html",
  "modules/bitd-alternate-sheets/templates/parts/item.html",
  // ... 20+ more hardcoded paths
];
```

### Proposed Solution

Create `scripts/constants.js`:

```javascript
import { MODULE_ID } from "./utils.js";

export const TEMPLATES = {
  ACTOR_SHEET: `modules/${MODULE_ID}/templates/actor-sheet.html`,
  CREW_SHEET: `modules/${MODULE_ID}/templates/crew-sheet.html`,
  CLASS_SHEET: `modules/${MODULE_ID}/templates/class-sheet.html`,
  ITEM_SHEET: `modules/${MODULE_ID}/templates/item-sheet.html`,
};

export const TEMPLATE_PARTS_PATH = `modules/${MODULE_ID}/templates/parts`;
```

### Implementation Steps

1. Create `scripts/constants.js` with template path constants
2. Update sheet classes to import and use `TEMPLATES`:
   ```javascript
   import { TEMPLATES } from "./constants.js";

   static get defaultOptions() {
     return mergeObject(super.defaultOptions, {
       template: TEMPLATES.ACTOR_SHEET,
       // ...
     });
   }
   ```
3. Update `blades-templates.js` to use `TEMPLATE_PARTS_PATH`
4. Search for remaining hardcoded template paths and replace

### Files to Update

- `scripts/blades-alternate-actor-sheet.js`
- `scripts/blades-alternate-crew-sheet.js`
- `scripts/blades-alternate-class-sheet.js`
- `scripts/blades-alternate-item-sheet.js`
- `scripts/blades-templates.js`

### Benefits

- Single source of truth for template paths
- Easier to refactor template directory structure
- Reduces string duplication
- Clearer intent (named constant vs magic string)

---

## L5: Extract Sheet State Management

**Effort:** Large (2 hours)
**Dependencies:** None
**Priority:** Very Low (partially addressed by existing patterns)

### Issue

Multiple local state properties are scattered across sheet classes (`showFilteredAbilities`, `showFilteredItems`, `collapsedSections`, etc.), making state management inconsistent.

### Current State

Each sheet class manages state differently:

```javascript
// In BladesAlternateActorSheet
this.showFilteredAbilities = persistedUi.showFilteredAbilities ?? true;
this.showFilteredItems = persistedUi.showFilteredItems ?? true;
this.collapsedSections = persistedUi.collapsedSections || {};
```

### Proposed Solution

Create `scripts/lib/sheet-state.js`:

```javascript
import { Utils } from "../utils.js";

/**
 * Manages UI state for a document sheet with persistence.
 */
export class SheetState {
  constructor(sheet, defaults = {}) {
    this.sheet = sheet;
    this.state = { ...defaults };
    this._loaded = false;
  }

  async load() {
    if (this._loaded) return this.state;
    const persisted = await Utils.loadUiState(this.sheet);
    this.state = { ...this.state, ...persisted };
    this._loaded = true;
    return this.state;
  }

  get(key) {
    return this.state[key];
  }

  async set(key, value) {
    this.state[key] = value;
    await Utils.saveUiState(this.sheet, { [key]: value });
  }

  async toggle(key) {
    const newValue = !this.state[key];
    await this.set(key, newValue);
    return newValue;
  }
}
```

### Usage Example

```javascript
// In BladesAlternateActorSheet
import { SheetState } from "./lib/sheet-state.js";

class BladesAlternateActorSheet extends BladesSheet {
  constructor(...args) {
    super(...args);
    this.uiState = new SheetState(this, {
      showFilteredAbilities: true,
      showFilteredItems: true,
      collapsedSections: {},
    });
  }

  async getData() {
    await this.uiState.load();
    // Use: this.uiState.get('showFilteredAbilities')
  }

  async _onToggleFilter(event) {
    await this.uiState.toggle('showFilteredAbilities');
    this.render(false);
  }
}
```

### Implementation Steps

1. Create `scripts/lib/sheet-state.js`
2. Update `BladesAlternateActorSheet` to use `SheetState`
3. Update `BladesAlternateCrewSheet` to use `SheetState`
4. Remove scattered state properties
5. Test all UI state persistence (filters, collapsed sections, etc.)

### Benefits

- Centralized state management (easier to reason about)
- Consistent state persistence patterns
- Easier to add new UI state properties
- Single place to add state-related features (undo, state validation, etc.)

### Note

**This refactoring is lower priority** because:
- Existing `loadUiState`/`saveUiState` pattern already works well (see `foundry-vtt-per-user-ui-state` skill)
- State is already persisted correctly
- This is primarily about code organization, not functionality

Consider this only if adding significant new UI state features.

---

## When to Tackle These

### Good Times to Implement

- **L2 (Error Handling):** When fixing bugs or adding error-prone features
- **L3 (JSDoc):** When onboarding new developers or improving documentation
- **L4 (Template Constants):** When refactoring template structure
- **L5 (Sheet State):** When adding complex new UI state features

### Not Necessary If

- Current code is working well
- No active development planned
- Team is small and familiar with codebase

---

## Progress Tracking

Update this section when implementing tasks:

- [ ] **L2:** Standardize error handling patterns
- [ ] **L3:** Add JSDoc type annotations
- [x] **L4:** Centralize template path constants (✅ 2025-12-31)
- [ ] **L5:** Extract sheet state management

---

## References

- **Source:** `docs/archive/2025-12-31-refactor-plan.md` (archived)
- **Related Skills:** `foundry-vtt-per-user-ui-state` (L5 partially addressed)
- **Completed Refactorings:** H1-H4, M1-M8, L1 (all done in 2025-12)

---

**Last Updated:** 2025-12-31
**Status:** Active tracking document for deferred improvements
