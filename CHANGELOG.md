# Changelog

## 1.0.18
### Healing Clock Fix
- The healing clock on the character sheet was not syncing with the system's default sheet due to a field name change in system version 6.0.0
- Alt-sheets now uses the correct field (`system.healing_clock.value` instead of `system.healing-clock`)
- A migration automatically copies any existing healing clock progress from the old field to the new field
- Module now requires Blades in the Dark system version 6.0.0 or higher

## 1.0.17
### Crew Linking
- Character sheets have a crew field in the header
- When the sheet is unlocks, a crew can be selected from the available crew actors by clicking on the field and selected a crew from a dialog box
- When the sheet is unlocked, clicking on the crew field opens the associated crew sheet
- Not a direct fix, but supports these issues when the system module provides active effects for crew abilities
    - [Issue #76](https://github.com/justinross/foundry-bitd-alternate-sheets/issues/76)
    - [Issue #83](https://github.com/justinross/foundry-bitd-alternate-sheets/issues/83)

### Ability progress
- Playbook abilities that have multiple checkboxes on the standard character sheets now have multiple checkboxes on the alternate sheets

### Deep Cut Loadout [Issue #97](https://github.com/justinross/foundry-bitd-alternate-sheets/issues/97)
- Previously, when the system module selected Deep Cut mode
    - The loadout sheet would not display the encumbered option. This has been fixed.
    - The maximum load values for each loadout did not reflect the Deep Cut values. This has been fixed.

### Clocks in the Notes Tab [Issue #98](https://github.com/justinross/foundry-bitd-alternate-sheets/issues/98)
- sheet-embedded clocks now display 10 or 12 segment clocks.

### Item Deletion [Issue #110](https://github.com/justinross/foundry-bitd-alternate-sheets/issues/110)
- When the sheet is unlocked, items that are not standard for a playbook display a trash can icon that will delete the item when clicked
- Right clicking on a non-playbook item will display a context menu with a delete option. This was previously broken, but has been fixed.

### Manifest Warnings [Issue #99](https://github.com/justinross/foundry-bitd-alternate-sheets/issues/99)
- Manifest warnings have been fixed.

### Debug Panel
- The "Clear Load" button in the debug panel (visible only to GMs) now correctly clears the loadout.
