# Changelog

## 1.0.18

### New Alternate Crew Sheet
- Added alternate crew sheet
- Collapsible sections for abilities, upgrades, and contacts with per-user persistence
- Claims grid with corner checkboxes matching the paper sheet layout
- Acquaintance rendering with friend/rival standing toggles and color indicators
- Crew XP notes section
- Minimize toggle for compact view during gameplay

### Performance Improvements
- Compendium caching reduces sheet rendering times from ~600ms to ~2-3ms for character sheets and ~200ms to ~1-2ms for crew sheets
- Pre-caches common item types on startup for faster initial sheet opens
- Smart cache invalidation when compendiums or world items change
- Added opt-in performance profiling logs (enable in module settings)

### Clock System Enhancements
- Clocks work in journals, chat messages, and popup dialogs (harm, coin, load)
- Global event handling ensures consistent clock behavior across all contexts
- User notification when a clock entity is missing

### UI Improvements
- Binary item checkboxes for toggled item states
- Load status pills with color indicators
- Collapsible sections on character sheet
- Added chooser dialog boxes for character/crew fields
- Compendium-backed tooltips for identity/bio fields

### Bug Fixes
- Fixed handler stacking that caused duplicate event processing
- Fixed layout shift when toggling edit mode
- Fixed Firefox flexbox width calculation bug with checkbox inputs
- Improved error handling throughout (radio toggles, smart edit, inline inputs, migrations)

### Healing Clock Fix
- The healing clock on the character sheet was not syncing with the system's default sheet due to a field name change in system version 6.0.0
- A migration automatically copies any existing healing clock progress from the old field to the new field
- If alt-sheets is set as the default character sheet, the migration treats the legacy field as authoritative and overwrites the current field
- Module now requires Blades in the Dark system version 6.0.0 or higher

### Code Quality
- Simplified build system to use npx for SCSS compilation
- Consolidated and cleaned up SCSS to facillitate reuse between sheets
- Wrapped document operations in queueUpdate for multi-client safety
- Optimized PNG images with Zopfli compression

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
