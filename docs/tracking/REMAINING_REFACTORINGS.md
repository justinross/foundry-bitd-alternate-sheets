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
- Automatically logs to console (string only - no stack trace unless you pass Error)
- `clean: true` sanitizes untrusted input
- Single call replaces manual notification + console.error
- **Note**: For stack traces, pass the Error object or use Hooks.onError

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

**Core Principle**: Always separate error funnel from user notification.

- **Error funnel** (Hooks.onError): Logs stack traces, triggers ecosystem hooks, structured `data`
- **User notification** (ui.notifications.*): Clean, sanitized messages with full UX control

**Key constraints**:
- `msg` in Hooks.onError is a **prefix**, not a fully-controlled message
- `clean: true` only works in NotificationOptions (not Hooks.onError)
- `notify` strings in Hooks.onError are undocumented - avoid relying on them
- Use `{ console: false }` in ui.notifications.* to prevent double-logging

**Decision tree for catch blocks:**

1. **User-facing failures** (unexpected errors, operations failed):
   ```javascript
   } catch (err) {
     // Preserve original error as cause when wrapping non-Errors
     const error = err instanceof Error ? err : new Error(String(err), { cause: err });

     // Error funnel: stack traces + ecosystem hooks (no UI)
     Hooks.onError(`BitD-Alt.${contextDescription}`, error, {
       msg: "[BitD-Alt]",
       log: "error",
       notify: null,  // No UI from hook
       data: { contextDescription, userFacingDescription }  // Structured context
     });

     // Fully controlled user message (sanitized)
     ui.notifications.error(`[BitD-Alt] ${userFacingDescription}`, { clean: true });
   }
   ```
   - Separates error funnel (logs + hooks) from user message
   - Full UX control: user sees only `userFacingDescription`
   - Stack traces logged via Hooks.onError, UI via notifications
   - Structured `data` for hook subscribers and debugging
   - Ecosystem visibility for unexpected failures

2. **Expected validation/recoverable issues** (user input errors, missing data):
   ```javascript
   } catch (err) {
     const message = `[BitD-Alt] ${userFacingDescription}`;
     ui.notifications.warn(message, { console: true, clean: true });
   }
   ```
   - Uses `warn` severity (not `error`) for expected cases
   - Simpler than Hooks.onError for routine validation
   - NotificationOptions.console logs to console automatically

3. **Developer-only errors** (diagnostic logging, no user notification):
   ```javascript
   } catch (err) {
     const error = err instanceof Error ? err : new Error(String(err), { cause: err });
     Hooks.onError(`BitD-Alt.${contextDescription}`, error, {
       msg: "[BitD-Alt]",
       log: "error",
       notify: null,  // Log only, no UI spam
       data: { contextDescription }  // Structured context for debugging
     });
   }
   ```
   - Uses error funnel (consistency) but no notification
   - Structured `data` for debugging and hook subscribers
   - Alternative: `console.error(...)` for truly isolated cases

4. **High-frequency errors** (render loops, hooks):
   ```javascript
   // Module-scoped throttle (outside class/function)
   const errorThrottles = new Map();

   // In catch block:
   } catch (err) {
     const throttleKey = contextDescription;
     const lastError = errorThrottles.get(throttleKey) || 0;

     // Throttle: 5 second window per context
     if (Date.now() - lastError > 5000) {
       const error = err instanceof Error ? err : new Error(String(err), { cause: err });

       // Error funnel (no UI)
       Hooks.onError(`BitD-Alt.${contextDescription}`, error, {
         msg: "[BitD-Alt]",
         log: "warn",
         notify: null,  // No UI from hook
         data: { contextDescription, userFacingDescription }
       });

       // Separate controlled notification (console: false prevents double-logging)
       ui.notifications.warn(`[BitD-Alt] ${userFacingDescription}`, {
         clean: true,
         console: false  // Already logged via Hooks.onError
       });

       errorThrottles.set(throttleKey, Date.now());
     }
   }
   ```
   - Throttles to prevent notification queue flood
   - Separates error funnel (logs only) from user notification
   - Uses `console: false` to prevent double-logging (Hooks.onError already logs)
   - Module-scoped Map prevents spam across multiple instances
   - Avoids relying on undocumented `notify` strings in Hooks.onError

### Implementation Steps

1. **Audit all catch blocks:**
   ```bash
   grep -r "} catch" scripts/
   ```

2. **Classify each error:**
   - Unexpected failure? → Hooks.onError (`notify: null`) + ui.notifications.error
   - Expected validation/recoverable? → `ui.notifications.warn` (not error)
   - Diagnostic only? → Hooks.onError with `notify: null` or console.error
   - High-frequency? → Throttle + Hooks.onError (`notify: null`) + ui.notifications.warn

3. **Replace patterns:**
   - `console.log` → `console.error` or Hooks.onError (minimum fix)
   - Manual notification + console → Hooks.onError (`notify: null`) + ui.notifications.*
   - Expected failures → `ui.notifications.warn` (not error)
   - Use `{ clean: true }` on ui.notifications.* for user/document data
   - Use `{ console: false }` when you've already logged via Hooks.onError
   - **Never** put untrusted strings in Hooks.onError `msg` (it's a prefix only)
   - **Always** separate error funnel from user notification for full UX control
   - Preserve original error: `new Error(String(err), { cause: err })`
   - Add structured `data` to Hooks.onError for debugging and hook subscribers
   - Throttle errors in render loops/hooks (prevent UI spam)

4. **Test error paths:**
   - Verify user-facing errors show clean message (no technical details leaked)
   - Verify stack traces in console (Error objects via Hooks.onError)
   - Verify `warn` severity used for expected validation errors
   - Check that diagnostic errors don't spam UI (Hooks.onError with `notify: null`)
   - Test throttling for high-frequency error paths (5 second window)
   - Verify no double-logging (Hooks.onError + ui.notifications with `console: false`)
   - Verify structured `data` appears in error hooks for debugging

### Files Likely Affected

- `scripts/utils.js`
- `scripts/sheets/actor/smart-edit.js`
- `scripts/blades-alternate-actor-sheet.js`
- `scripts/blades-alternate-crew-sheet.js`
- `scripts/migration.js`

### Benefits

- **Foundry-native:** Uses only documented NotificationOptions and Hooks.onError APIs
- **Full UX control:** Always separates error funnel from user message (no technical leaks)
- **Stack traces:** Error objects via Hooks.onError include full stack traces in console
- **Preserves context:** `{ cause: err }` retains original error when wrapping non-Errors
- **Structured debugging:** `data` parameter provides context to hook subscribers and debugging
- **Ecosystem-compatible:** Error funnel allows other modules to listen to BitD-Alt errors
- **Better UX:** Severity discipline (warn vs error) + throttling prevents notification spam
- **Sanitization:** `{ clean: true }` on ui.notifications.* prevents XSS from error messages
- **No double-logging:** `{ console: false }` prevents duplicate console entries
- **Consistent pattern:** All errors use same "funnel + notification" approach
- **Robust throttling:** Module-scoped Map prevents spam across multiple instances
- **Future-proof:** Uses only documented Foundry V13 error handling mechanisms

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
