# Refactoring Plan

This document outlines refactoring opportunities for the BitD Alternate Sheets module. Each item preserves existing functionality while improving clarity, consistency, and maintainability.

**Last Updated:** 2025-12-29
**Analyzed By:** Claude Code System Audit

---

## Summary Table

| ID | Priority | Effort | Item | Status |
|----|----------|--------|------|--------|
| H1 | High | Quick | Remove duplicate `resolveDescription` function | [x] |
| H2 | High | Medium | Consolidate clock rendering code | [x] |
| H3 | High | Quick | Centralize `MODULE_ID` constant | [x] |
| H4 | High | Quick | Extract `abilityCostFor` to Utils | [x] |
| M1 | Medium | Quick | Extract inline-input event handlers | [x] |
| M2 | Medium | Quick | Remove empty hook bodies | [x] |
| M3 | Medium | Quick | Replace nested ternary in standing toggle | [x] |
| M4 | Medium | Medium | Simplify `_applyLoad` with config object | [x] |
| M5 | Medium | Quick | Fix `confirmDialogV1` button labels | [x] |
| M6 | Medium | Quick | Remove identity map functions | [x] |
| M7 | Medium | Quick | Simplify `handleDrop` switch statement | [x] |
| M8 | Medium | Quick | Remove commented-out code and dead imports | [x] |
| L1 | Low | Large | Break up `getVirtualListOfItems` | [x] |
| L2 | Low | Medium | Standardize error handling patterns | [ ] |
| L3 | Low | Medium | Add JSDoc type annotations | [ ] |
| L4 | Low | Medium | Centralize template path constants | [ ] |
| L5 | Low | Large | Extract sheet state management | [ ] |

---

## High Priority

### H1: Remove Duplicate `resolveDescription` Function

**Effort:** Quick (5 minutes)
**Dependencies:** None

**Issue:** The `resolveDescription` function is defined identically in two files.

**Files:**
- `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/utils/text.js` (lines 20-30) - KEEP
- `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/utils/collections.js` (lines 123-133) - REMOVE

**Current Code in `collections.js`:**
```javascript
function resolveDescription(entity) {
  if (!entity) return "";
  const system = entity.system || {};
  return (
    system.description_short ||
    system.description ||
    system.notes ||
    system.biography ||
    ""
  );
}
```

**Implementation Steps:**

1. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/utils/collections.js`

2. Add import at the top of the file:
   ```javascript
   import { resolveDescription } from "./text.js";
   ```

3. Remove the local `resolveDescription` function definition (lines 123-133)

4. Verify the function is still used in `getFilteredActors` (line 117) - it will now use the imported version

5. Test by loading a character sheet and verifying acquaintance descriptions still display

---

### H2: Consolidate Clock Rendering Code

**Effort:** Medium (30 minutes)
**Dependencies:** None

**Issue:** Clock rendering functions are duplicated between `hooks.js` and `clocks.js`. The `hooks.js` file imports functions from `clocks.js` with aliases but then defines its own local versions.

**Files:**
- `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/hooks.js` (lines 184-266)
- `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/clocks.js` (lines 7-231)

**Current Code in `hooks.js`:**
```javascript
import { replaceClockLinks as replaceClockLinksCompat, setupGlobalClockHandlers as setupGlobalClockHandlersCompat } from "./clocks.js";

// ... later defines local versions of these same functions ...

async function replaceClockLinks(container, messageContent = null) {
  // Duplicate implementation
}
```

**Implementation Steps:**

1. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/hooks.js`

2. Change the import statement at line 5 to use the functions directly:
   ```javascript
   import { replaceClockLinks, setupGlobalClockHandlers } from "./clocks.js";
   ```

3. Remove these local function definitions from `hooks.js`:
   - `replaceClockLinks` (lines 184-207)
   - `parseClockSnapshotValues` (lines 209-218)
   - `isClockActor` (lines 220-222)
   - `getClockRenderModel` (lines 224-234)
   - `buildClockHtml` (lines 236-255)
   - `createClockDiv` (lines 257-266)
   - `setupGlobalClockHandlers` (lines 280-456)

4. The imported functions from `clocks.js` will now be used throughout

5. Test by:
   - Opening a journal with clock links
   - Clicking clock segments to increment/decrement
   - Right-clicking to decrement
   - Verifying clocks work in chat messages

---

### H3: Centralize `MODULE_ID` Constant

**Effort:** Quick (10 minutes)
**Dependencies:** None

**Issue:** `MODULE_ID` is defined as a local constant in multiple files instead of being imported from a single source.

**Files to Modify:**
- `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/migration.js` (line 3)
- `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/profiler.js` (line 1)

**Source of Truth:**
- `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/utils.js` (line 7)

**Current Code in `migration.js`:**
```javascript
export const MODULE_ID = "bitd-alternate-sheets";
```

**Current Code in `profiler.js`:**
```javascript
const MODULE_ID = "bitd-alternate-sheets";
```

**Implementation Steps:**

1. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/migration.js`

2. Replace line 3:
   ```javascript
   // Remove this line:
   export const MODULE_ID = "bitd-alternate-sheets";

   // Add this import at the top:
   import { MODULE_ID } from "./utils.js";
   ```

3. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/profiler.js`

4. Replace line 1:
   ```javascript
   // Remove this line:
   const MODULE_ID = "bitd-alternate-sheets";

   // Add this import at the top:
   import { MODULE_ID } from "./utils.js";
   ```

5. Test by:
   - Loading a world (triggers migration check)
   - Enabling profiling logs in settings and performing a timed action

---

### H4: Extract `abilityCostFor` to Utils

**Effort:** Quick (15 minutes)
**Dependencies:** None

**Issue:** The same ability/item cost calculation logic appears in three places.

**Files:**
- `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-actor-sheet.js` (lines 632-637)
- `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-crew-sheet.js` (lines 104-109)
- `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/handlebars-helpers.js` (lines 171-176)

**Current Duplicated Code:**
```javascript
const abilityCostFor = (ability) => {
  const rawCost = ability?.system?.price ?? ability?.system?.cost ?? 1;
  const parsed = Number(rawCost);
  if (Number.isNaN(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
};
```

**Implementation Steps:**

1. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/utils.js`

2. Add new static method to the `Utils` class (after line 66):
   ```javascript
   /**
    * Calculate the cost/price of an ability or item.
    * @param {Object} abilityOrItem - An ability or item object with system data
    * @returns {number} The cost (minimum 1)
    */
   static getAbilityCost(abilityOrItem) {
     const raw = abilityOrItem?.system?.price ?? abilityOrItem?.system?.cost ?? 1;
     const parsed = Number(raw);
     if (Number.isNaN(parsed) || parsed < 1) return 1;
     return Math.floor(parsed);
   }
   ```

3. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-actor-sheet.js`

4. In `_applyAbilityProgress` method (around line 631), replace the local function:
   ```javascript
   // Remove lines 632-637 (the local abilityCostFor function)

   // Update line 645 to use Utils:
   const cost = Utils.getAbilityCost(ability);
   ```

5. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-crew-sheet.js`

6. In `_buildChoiceList` method, replace the local function:
   ```javascript
   // Remove lines 104-109 (the local abilityCostFor function)

   // Update usages to use Utils.getAbilityCost instead of abilityCostFor
   ```

7. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/handlebars-helpers.js`

8. Update the `ability-cost` helper (lines 171-176):
   ```javascript
   Handlebars.registerHelper("ability-cost", function (ability) {
     return Utils.getAbilityCost(ability);
   });
   ```

9. Test by:
   - Loading a character sheet with multi-cost abilities (like Veteran)
   - Verifying checkbox count matches ability cost
   - Testing crew sheet upgrades

---

## Medium Priority

### M1: Extract Inline-Input Event Handlers

**Effort:** Quick (15 minutes)
**Dependencies:** None

**Issue:** The same `keyup` and `blur` handlers for `.inline-input` are duplicated in both sheet classes.

**Files:**
- `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-actor-sheet.js` (lines 1181-1199)
- `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-crew-sheet.js` (lines 231-249)

**Current Duplicated Code:**
```javascript
html.find(".inline-input").on("keyup", async (ev) => {
  let input = ev.currentTarget.previousSibling;
  const text = ev.currentTarget.innerText ?? "";
  input.value = text.trim().length === 0 ? "" : text;
});

html.find(".inline-input").on("blur", async (ev) => {
  let input = ev.currentTarget.previousSibling;
  const placeholder = ev.currentTarget.dataset.placeholder ?? "";
  const text = ev.currentTarget.innerText ?? "";
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    ev.currentTarget.innerText = placeholder;
    input.value = "";
  } else {
    input.value = text;
  }
  $(input).change();
});
```

**Implementation Steps:**

1. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/lib/sheet-helpers.js`

2. Add new function at the end of the file:
   ```javascript
   /**
    * Bind event handlers for inline-input contenteditable fields.
    * Syncs contenteditable span content to hidden input on keyup and blur.
    * @param {JQuery} html - The sheet's HTML element
    */
   export function bindInlineInputHandlers(html) {
     html.find(".inline-input").on("keyup", async (ev) => {
       const input = ev.currentTarget.previousSibling;
       const text = ev.currentTarget.innerText ?? "";
       input.value = text.trim().length === 0 ? "" : text;
     });

     html.find(".inline-input").on("blur", async (ev) => {
       const input = ev.currentTarget.previousSibling;
       const placeholder = ev.currentTarget.dataset.placeholder ?? "";
       const text = ev.currentTarget.innerText ?? "";
       const trimmed = text.trim();
       if (trimmed.length === 0) {
         ev.currentTarget.innerText = placeholder;
         input.value = "";
       } else {
         input.value = text;
       }
       $(input).change();
     });
   }
   ```

3. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-actor-sheet.js`

4. Add import at the top:
   ```javascript
   import { bindInlineInputHandlers } from "./lib/sheet-helpers.js";
   ```

5. Replace lines 1181-1199 in `activateListeners` with:
   ```javascript
   bindInlineInputHandlers(html);
   ```

6. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-crew-sheet.js`

7. Add import at the top:
   ```javascript
   import { bindInlineInputHandlers } from "./lib/sheet-helpers.js";
   ```

8. Replace lines 231-249 in `activateListeners` with:
   ```javascript
   bindInlineInputHandlers(html);
   ```

9. Test by editing inline fields (alias, notes) on both character and crew sheets

---

### M2: Remove Empty Hook Bodies

**Effort:** Quick (5 minutes)
**Dependencies:** None

**Issue:** The `updateActor` and `createActor` hooks have empty conditional bodies that serve no purpose.

**File:** `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/hooks.js` (lines 160-174)

**Current Code:**
```javascript
Hooks.on("updateActor", async (actor, updateData, options, actorId) => {
  if (
    options.diff &&
    updateData?.flags?.core &&
    "sheetClass" in updateData?.flags?.core
  ) {
  }
  if (actor._sheet instanceof BladesAlternateActorSheet) {
  }
});

Hooks.on("createActor", async (actor) => {
  if (actor._sheet instanceof BladesAlternateActorSheet) {
  }
});
```

**Implementation Steps:**

1. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/hooks.js`

2. Remove lines 160-174 entirely (both `updateActor` and `createActor` hooks)

3. Optionally, add a comment explaining why they were removed:
   ```javascript
   // Note: updateActor and createActor hooks were removed as they contained
   // no implementation. If sheet-switching logic is needed in the future,
   // re-add them with actual functionality.
   ```

4. Test by creating a new actor and updating an existing one - behavior should be unchanged

---

### M3: Replace Nested Ternary in Standing Toggle

**Effort:** Quick (5 minutes)
**Dependencies:** None

**Issue:** Standing toggle uses a nested ternary which violates CLAUDE.md guidelines.

**File:** `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/utils.js` (lines 452-454)

**Current Code:**
```javascript
const nextStanding =
  standing === "friend" ? "rival" : standing === "rival" ? "neutral" : "friend";
```

**Proposed Code:**
```javascript
const STANDING_CYCLE = { friend: "rival", rival: "neutral", neutral: "friend" };
const nextStanding = STANDING_CYCLE[standing] ?? "friend";
```

**Implementation Steps:**

1. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/utils.js`

2. Find the `bindStandingToggles` method (around line 424)

3. Add constant inside the method (before the click handler) or as a module-level const:
   ```javascript
   const STANDING_CYCLE = { friend: "rival", rival: "neutral", neutral: "friend" };
   ```

4. Replace lines 452-454 with:
   ```javascript
   const nextStanding = STANDING_CYCLE[standing] ?? "friend";
   ```

5. Test by clicking the standing toggle on acquaintances - should cycle: neutral -> friend -> rival -> neutral

---

### M4: Simplify `_applyLoad` with Config Object

**Effort:** Medium (20 minutes)
**Dependencies:** None

**Issue:** Duplicate switch statements for Deep Cut Load vs standard load levels.

**File:** `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-actor-sheet.js` (lines 760-823)

**Current Code:**
```javascript
async _applyLoad(sheetData) {
  // ... loadout calculation ...

  if (game.settings.get('blades-in-the-dark', 'DeepCutLoad')) {
    switch (sheetData.system.selected_load_level) {
      case "BITD.Discreet":
        sheetData.max_load = sheetData.system.base_max_load + 4;
        break;
      case "BITD.Conspicuous":
        sheetData.max_load = sheetData.system.base_max_load + 6;
        break;
      case "BITD.Encumbered":
        sheetData.max_load = sheetData.system.base_max_load + 9;
        break;
      default:
        sheetData.system.selected_load_level = "BITD.Discreet";
        sheetData.max_load = sheetData.system.base_max_load + 4;
        break;
    }
  }
  else {
    switch (sheetData.system.selected_load_level) {
      // ... similar pattern ...
    }
  }
}
```

**Proposed Code:**
```javascript
const LOAD_CONFIG = {
  deepCut: {
    levels: {
      "BITD.Discreet": 4,
      "BITD.Conspicuous": 6,
      "BITD.Encumbered": 9,
    },
    defaultLevel: "BITD.Discreet",
  },
  standard: {
    levels: {
      "BITD.Light": 3,
      "BITD.Normal": 5,
      "BITD.Heavy": 6,
    },
    defaultLevel: "BITD.Normal",
  }
};
```

**Implementation Steps:**

1. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-actor-sheet.js`

2. Add the config constant near the top of the file (after imports, before the class):
   ```javascript
   const LOAD_CONFIG = {
     deepCut: {
       levels: {
         "BITD.Discreet": 4,
         "BITD.Conspicuous": 6,
         "BITD.Encumbered": 9,
       },
       defaultLevel: "BITD.Discreet",
     },
     standard: {
       levels: {
         "BITD.Light": 3,
         "BITD.Normal": 5,
         "BITD.Heavy": 6,
       },
       defaultLevel: "BITD.Normal",
     }
   };
   ```

3. Replace the switch statements in `_applyLoad` (lines 789-822) with:
   ```javascript
   const isDeepCut = game.settings.get('blades-in-the-dark', 'DeepCutLoad');
   const config = isDeepCut ? LOAD_CONFIG.deepCut : LOAD_CONFIG.standard;
   const selectedLevel = sheetData.system.selected_load_level;

   if (config.levels[selectedLevel] !== undefined) {
     sheetData.max_load = sheetData.system.base_max_load + config.levels[selectedLevel];
   } else {
     sheetData.system.selected_load_level = config.defaultLevel;
     sheetData.max_load = sheetData.system.base_max_load + config.levels[config.defaultLevel];
   }
   ```

4. Test by:
   - Changing load level selector on character sheet
   - Testing with DeepCutLoad setting both on and off

---

### M5: Fix `confirmDialogV1` Button Labels

**Effort:** Quick (10 minutes)
**Dependencies:** None

**Issue:** The V1 dialog confirm implementation may not correctly apply custom button labels.

**File:** `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/lib/dialog-compat.js` (lines 286-304)

**Current Code:**
```javascript
async function confirmDialogV1({
  title,
  content,
  yesLabel,
  noLabel,
  defaultYes = false,
}) {
  return await Dialog.confirm({
    title,
    content,
    yes: () => true,
    no: () => false,
    defaultYes,
    buttons: {
      yes: { label: yesLabel || game.i18n.localize("Yes") },
      no: { label: noLabel || game.i18n.localize("No") },
    }
  });
}
```

**Proposed Code:**
```javascript
async function confirmDialogV1({
  title,
  content,
  yesLabel,
  noLabel,
  defaultYes = false,
}) {
  return new Promise((resolve) => {
    new Dialog({
      title,
      content,
      buttons: {
        yes: {
          label: yesLabel || game.i18n.localize("Yes"),
          icon: '<i class="fas fa-check"></i>',
          callback: () => resolve(true)
        },
        no: {
          label: noLabel || game.i18n.localize("No"),
          icon: '<i class="fas fa-times"></i>',
          callback: () => resolve(false)
        }
      },
      default: defaultYes ? "yes" : "no",
      close: () => resolve(false)
    }).render(true);
  });
}
```

**Implementation Steps:**

1. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/lib/dialog-compat.js`

2. Replace the `confirmDialogV1` function (lines 286-304) with the proposed code above

3. Test by triggering a confirmation dialog (e.g., switching playbooks) and verify button labels appear correctly

---

### M6: Remove Identity Map Functions

**Effort:** Quick (5 minutes)
**Dependencies:** None

**Issue:** Unnecessary `.map(e => e)` calls that return the same object.

**File:** `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/utils/collections.js` (lines 7-18, 28-30)

**Current Code:**
```javascript
world_items = game.actors
  .filter((e) => e.type === item_type)
  .map((e) => {
    return e;
  });

// ... and later ...

compendium_items = compendium_content.map((e) => {
  return e;
});
```

**Proposed Code:**
```javascript
world_items = game.actors.filter((e) => e.type === item_type);

// ... and later ...

compendium_items = compendium_content;
```

**Implementation Steps:**

1. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/utils/collections.js`

2. Replace lines 7-12:
   ```javascript
   // Before:
   world_items = game.actors
     .filter((e) => e.type === item_type)
     .map((e) => {
       return e;
     });

   // After:
   world_items = game.actors.filter((e) => e.type === item_type);
   ```

3. Replace lines 13-18:
   ```javascript
   // Before:
   world_items = game.items
     .filter((e) => e.type === item_type)
     .map((e) => {
       return e;
     });

   // After:
   world_items = game.items.filter((e) => e.type === item_type);
   ```

4. Replace lines 28-30:
   ```javascript
   // Before:
   compendium_items = compendium_content.map((e) => {
     return e;
   });

   // After:
   compendium_items = compendium_content;
   ```

5. Test by loading a character sheet and verifying abilities/items populate correctly

---

### M7: Simplify `handleDrop` Switch Statement

**Effort:** Quick (5 minutes)
**Dependencies:** None

**Issue:** Switch cases with only comments or no-ops.

**File:** `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-actor-sheet.js` (lines 74-95)

**Current Code:**
```javascript
async handleDrop(event, droppedEntity) {
  if (!droppedEntity?.uuid) return;
  let droppedEntityFull = await fromUuid(droppedEntity.uuid);
  if (!droppedEntityFull) return;

  switch (droppedEntityFull.type) {
    case "npc":
      await Utils.addAcquaintance(this.actor, droppedEntityFull);
      break;
    case "item":
      // just let Foundry do its thing
      break;
    case "ability":
      // just let Foundry do its thing
      break;
    default:
      // await this.actor.setUniqueDroppedItem(droppedEntityFull);
      // await this.onDroppedDistinctItem(droppedEntityFull);
      break;
  }
}
```

**Proposed Code:**
```javascript
async handleDrop(event, droppedEntity) {
  if (!droppedEntity?.uuid) return;
  const droppedEntityFull = await fromUuid(droppedEntity.uuid);
  if (!droppedEntityFull) return;

  // Only handle NPC drops specially; all other types handled by Foundry via super._onDropItem
  if (droppedEntityFull.type === "npc") {
    await Utils.addAcquaintance(this.actor, droppedEntityFull);
  }
}
```

**Implementation Steps:**

1. Open `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-actor-sheet.js`

2. Replace lines 74-95 with the proposed code above

3. Test by dropping an NPC onto a character sheet - should still add as acquaintance

---

### M8: Remove Commented-Out Code and Dead Imports

**Effort:** Quick (10 minutes)
**Dependencies:** None

**Issue:** Several files contain commented-out imports and code.

**Files to Clean:**

1. `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-actor-sheet.js`
   - Line 11: Remove `// import { migrateWorld } from "../../../systems/blades-in-the-dark/module/migration.js";`

2. `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/blades-alternate-item-sheet.js`
   - Line 1: Remove `// import { BladesActiveEffect } from "../../../systems/blades-in-the-dark/module/blades-active-effect.js";`
   - Line 9: Remove `// import { migrateWorld } from "../../../systems/blades-in-the-dark/module/migration.js";`
   - Lines 16-54: Consider removing the large commented-out JSON schema block or moving to documentation

3. `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/utils.js`
   - Lines 261-272: Remove commented-out `_addOwnedItem` function

**Implementation Steps:**

1. Open each file listed above

2. Remove the commented-out import lines

3. For the JSON schema in `blades-alternate-item-sheet.js`, either:
   - Remove it entirely (preferred)
   - Or move it to a documentation file if it serves as reference

4. Remove the commented-out `_addOwnedItem` function in `utils.js`

5. No functional testing needed - these are dead code removals

---

## Low Priority

### L1: Break Up `getVirtualListOfItems`

**Effort:** Large (1 hour)
**Dependencies:** None

**Issue:** This 136-line function has multiple levels of nesting and handles too many concerns.

**File:** `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/utils.js` (lines 764-900)

**Proposed Structure:**
```javascript
static async getVirtualListOfItems(type, data, sort, filterPlaybook, duplicateOwned, includeOwned) {
  const sourceItems = await this._getFilteredSourceItems(type, filterPlaybook);
  const virtualItems = this._mapToVirtualItems(sourceItems, false);

  let mergedList = this._sortVirtualItems(virtualItems, type);

  if (includeOwned) {
    const ownedItems = this._getFilteredOwnedItems(data.actor, type, filterPlaybook);
    const virtualOwned = this._mapToVirtualItems(ownedItems, true);
    mergedList = this._mergeVirtualLists(mergedList, virtualOwned, duplicateOwned);
  }

  if (type === "ability" && data.actor) {
    mergedList = await this._addGhostSlotsForAbilities(mergedList, data.actor, sourceItems, filterPlaybook);
  }

  return mergedList;
}

static async _getFilteredSourceItems(type, filterPlaybook) { /* ... */ }
static _getFilteredOwnedItems(actor, type, filterPlaybook) { /* ... */ }
static _mapToVirtualItems(items, owned) { /* ... */ }
static _sortVirtualItems(items, type) { /* ... */ }
static _mergeVirtualLists(base, additions, allowDuplicates) { /* ... */ }
static async _addGhostSlotsForAbilities(list, actor, sourceItems, currentPlaybook) { /* ... */ }
```

**Implementation Steps:**

This is a larger refactoring. Break into sub-tasks:

1. Extract source item filtering logic to `_getFilteredSourceItems`
2. Extract owned item filtering to `_getFilteredOwnedItems`
3. Extract the virtual item mapping to `_mapToVirtualItems`
4. Extract sorting logic to `_sortVirtualItems`
5. Extract merge logic to `_mergeVirtualLists`
6. Extract ghost slot logic to `_addGhostSlotsForAbilities`
7. Rewrite main function to compose these helpers
8. Test all sheet types (character, crew) thoroughly

---

### L2: Standardize Error Handling Patterns

**Effort:** Medium (45 minutes)
**Dependencies:** None

**Issue:** Error handling is inconsistent across the codebase.

**Examples:**

Good pattern (in `smart-edit.js`):
```javascript
} catch (err) {
  ui.notifications.error(`Failed to add item: ${err.message}`);
  console.error("Item chooser error", err);
}
```

Inconsistent pattern (in `utils.js`):
```javascript
} catch (e) {
  console.log("Error: ", e);  // Should use console.error
}
```

**Implementation Steps:**

1. Search for all `catch` blocks in the codebase

2. For each, apply this pattern:
   - User-facing operations: Add `ui.notifications.error` with helpful message
   - Always use `console.error` instead of `console.log` for errors
   - Include original error for debugging

3. Standard pattern to use:
   ```javascript
   } catch (err) {
     const message = `[BitD-Alt] ${contextDescription}: ${err.message}`;
     ui.notifications.error(message);
     console.error(message, err);
   }
   ```

---

### L3: Add JSDoc Type Annotations

**Effort:** Medium (1 hour)
**Dependencies:** None

**Issue:** Many functions lack type annotations.

**Priority Functions to Document:**

1. `Utils` class public methods
2. Sheet class `getData` methods
3. Dialog functions in `dialog-compat.js`
4. Update queue functions

**Example:**
```javascript
/**
 * Get all items of a specific type from world and compendia.
 * @param {string} itemType - The item type (e.g., "ability", "item", "npc")
 * @returns {Promise<Item[]>} Array of matching items
 */
static async getAllItemsByType(itemType) { ... }
```

---

### L4: Centralize Template Path Constants

**Effort:** Medium (30 minutes)
**Dependencies:** H3 (MODULE_ID centralization)

**Issue:** Template paths are hardcoded strings scattered throughout.

**Implementation Steps:**

1. Create new file `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/constants.js`:
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

2. Update each sheet class to import and use these constants

3. Update `blades-templates.js` to use the constants for preloading

---

### L5: Extract Sheet State Management

**Effort:** Large (2 hours)
**Dependencies:** None

**Issue:** Multiple local state properties are scattered across sheet classes.

**Proposed Pattern:**

Create `/home/rhudson/git/bitd/bitd-alternate-sheets/scripts/lib/sheet-state.js`:

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

This would replace scattered state like `showFilteredAbilities`, `showFilteredItems`, `collapsedSections`, etc.

---

## Implementation Order

For maximum impact with minimum risk, implement in this order:

1. **Quick wins first:** H1, H3, M2, M3, M6, M7, M8
2. **Medium effort, high value:** H4, M1, M5
3. **Larger refactors:** H2, M4
4. **Low priority when time permits:** L1-L5

Each item should be implemented as a separate commit to allow easy rollback if issues arise.

---

## Testing Checklist

After implementing refactors, verify:

- [ ] Character sheet loads without errors
- [ ] Crew sheet loads without errors
- [ ] Class/playbook sheet loads without errors
- [ ] Abilities display with correct checkbox counts
- [ ] Items can be equipped/unequipped
- [ ] Clocks work in journals and chat
- [ ] Playbook switching works correctly
- [ ] Acquaintance standing toggles cycle correctly
- [ ] Inline editing saves correctly
- [ ] Migration runs on first load of updated world
- [ ] Profiling logs appear when enabled
- [ ] No console errors during normal operation
