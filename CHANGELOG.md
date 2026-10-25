# Changelog

## 1.1.1

### New
- Deep Cuts: a "Coin carried" box in the general items header sets how much Coin you take on a score. Only carried Coin counts as load, and it can be more than you own. Clear Load resets it to 0. A new "Coin Counts as Load" option in the Deep Cuts Settings window turns Coin load off. (Issue #164)

## 1.1.0

### New
- Buy cohorts from the crew sheet's "Cohort: New" and "Cohort: Add Type" upgrades.
- Optional Resist or Indulge prompt when clicking an attribute (module setting).
- Deep Cuts Settings window: every Deep Cuts option, system and module, in one place, with the rule each one changes and its page.
- Deep Cuts support:
  - XP clocks (4, 6 or 8 segments) and Edge. Click the clock to tick it. (PR #159)
  - Discreet/Conspicuous load, Coin as load, Mule and Compartments.
  - Rigging: right-click an item to rig it.
  - Harm: unlimited level 1 harm, toughed-out harm and a Scar field.
  - Trauma: mark a condition invoked, or remove it.
  - Vault sizes: 8 and 12 Coin. (PR #161)

### Misc layout and bug fixes
- Foundry v12 fixes.
- PopOut! sheets work like the main window (Issue #71).
- Teeth change once per click; right-click no longer changes them.
- Crew sheet: system-size Rep, Heat and Wanted, and a tidier Cohorts tab (Issue #144).
- Load count shows load above 10.
- Zero-load items no longer add load (Issue #157, PR #158).
- "Training: Personal Exp" crew upgrade is back (PR #160).
- Empty alias no longer blanks the sidebar name (Issue #146, PR #162).
- XP clues no longer show HTML tags (Issue #72).
- Card chooser fills its text box on Foundry v12.
- Shrinking a vault removes Coin above its size.

## 1.0.20
- Fixed Issue #145 by removing unused clock styling. Fixed by PR #149.
- Partially fixed Issue #144 by fixing the Deep Cuts crew sheet XP display. Fixed by PR #150.
- Fixed Issue #146 control of Name/Alias display in sidebar/ Fixed by PR #148.
- Partially fixed Issue #144 by moving notes data back into the system module's notes field. If notes were added during the interval when the notes were being stored in a flag, the notes in the flag should be appended to the end of the notes from the system module's storage.
- Prior to this, when a newly created crew had no crew type, all abilities and upgrades were listed on their respective tabs. Changed filtering so that nothing shows up on the tabs until a crew type is selected.
- Added a "Generic" type keyword. When put in the classing field of a playbook ability, crew ability, or crew update, this will cause the tagged item to show up in the list regardless of playbook or crew type. Leaving the classing field of items blank currently causes them to be added to lists for crew abilities, crew upgrades, and loadout items. I don't expect any change in behavior for those item types. For them, the Generic type currently just allows the author to indicate intent.

## 1.0.19
- Quick release to address manifest version issue

## 1.0.18

### Actor Sheet Enhancement
- Added alternate crew sheet in alt-sheet style
- Character and Crew sheet fields in the bio section have chooser dialogs allowing selection based on a search path
  * The dialogs are only available when the sheet is unlocked
  * The search path for options can be controlled from the module's settings. Options include the system module's compendiums, items available in the side bar, and non-system compendiums.
  * NPCs whose 'associated class' field is set to 'Vice Purveyor' will be available as choices for the vice purveyor field
  * All the fields with chooser dialog boxes will accept arbitrary text in the Custom field of the dialog box
  * Notes tabs support clock enrichers

### Performance Improvements
- Compendium caching reduces sheet rendering times from ~600ms to ~2-3ms for character sheets and ~200ms to ~1-2ms for crew sheets
- Pre-caches common item types on startup for faster initial sheet opens
- Cache invalidation when compendiums, world items change, or compendium search path settings change
- Added opt-in performance profiling logs (enable in module settings)

### Misc
- Load status pills with color indicators
- Compendium-backed tooltips for identity/bio fields
- User compendiums allow customization of the available playbooks through local or module extension
- Fixed some formatting/styling issues with multiple checkboxes
  
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

### Developer stuff
- Added some scripting to compile SCSS
- Consolidated some SCSS to facillitate reuse between sheets
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
