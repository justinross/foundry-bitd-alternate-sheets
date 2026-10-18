# Changelog

## 1.0.21
- Added an attribute roll dialog that prompts the player to choose between a Resist Roll and an Indulge Vice roll when clicking an attribute label. The dialog is enabled by a new "Prompt for Resist or Indulge" module setting (off by default). When disabled, the system module's default attribute roll popup is used.
- Added Deep Cuts experience clocks and Edge to the character sheet, following the system module's Deep Cuts settings. Added by PR #159.
- Added a "Deep Cuts vault sizes" module setting (off by default). When on, Vault 1 holds 8 Coin and Vault 2 holds 12 more (20 total), and the crew sheet lays the vault out to match. Crews' owned vault upgrades update to match the setting when it changes, or when an owner opens the crew sheet. A crew that isn't on any scene, or that loses a vault while its sheet is closed, updates the next time an owner opens its sheet. Crews inside compendiums are never changed. Added by PR #161.
- Vault Coin above the vault's size is now removed when the vault gets smaller (unticking a vault, or changing the Deep Cuts vault setting). Previously the extra Coin stayed stored but hidden.
- With the system's Deep Cuts load setting on, the character sheet's load picker offers only Discreet and Conspicuous, and the load popup (and the load count's tooltip) shows the level the marked load reaches: Conspicuous from the 5th box, encumbered from the 7th, over max past 9. With Mule: Discreet 6, Conspicuous 8, encumbered at 9, max 10. Abilities ticked on the sheet now keep their effects, so Mule raises the load limits.
- With the system's Deep Cuts experience clocks on, the character and crew sheets have a size picker next to the XP clock to make it 4, 6 or 8 segments (default 6). Making the clock smaller turns ticks that no longer fit into full clocks, so no xp is lost. The character sheet's full clocks now match the chosen size.
- With the system's Deep Cuts load setting on, the character sheet shows the Deep Cuts text for Mule (Discreet 6, Conspicuous 8, encumbered at 9, max 10) and the Hull's Compartments (load limits +3, heavy items while discreet). Compartments' load bonus also follows the setting: +3 with it on, +2 with it off. Owned Compartments update when the setting changes, or when an owner opens the character sheet.
- With the system's Deep Cuts load setting on, each Coin a character carries counts as 1 load in the character sheet's load count and level. Stashed Coin does not count.
- With the system's Deep Cuts load setting on and a crew with Rigging (any crew's Rigging upgrade), right-clicking any item on a crew member's character sheet offers Rig or Unrig. Rigged items get a toolbox mark and count 0 load, up to 2 load, so a rigged heavy item keeps the load Discreet. The load popup shows "Rigging: N of 2 free" and a hint; past 2 load the Rig entry is dimmed and does nothing. The crew sheet shows the Deep Cuts Rigging text. With the setting off or no Rigging, rigged items count normal load and nothing is shown, and the rigged mark comes back when Rigging does.
- Added a "Use Deep Cuts Harm" module setting (off by default). When on, the character sheet's harm popup has no Effect column, level 1 holds any number of harms (each in its own cell, with "+ Add" at the end; past 5 the cells get smaller so the list stays two lines tall, and past 9 it grows a third line), and a character with Tough as Nails gets a second level 3 slot. Each harm has a fist to mark it toughed out (struck through; the player marks the stress). A Scar field sits above armor. The harm summary under the actions shows level numbers instead of penalty icons, strikes through toughed-out harm and shows the scar. Turning the setting off shows the core two level 1 slots and keeps the extras for when it is turned back on.
- Added a "Use Deep Cuts Trauma" module setting (off by default). When on, each trauma condition on the character sheet has a bolt to mark it invoked this session (unmarked by hand) and an × that removes the condition and clears its trauma box.
- The character sheet's load count now shows the real marked load. It used to stop at 10, so more load showed as 10 and, with Deep Cuts load and Compartments, over max (13 or more) never showed.
- Clicking a tooth (stress, heat, action dots and the like) on the character, crew and class sheets now changes it once instead of running the change twice, and a right-click on a tooth no longer changes it. Right-clicking a clock still ticks it down.
- Restored the "Training: Personal Exp" crew upgrade, which was hidden from the crew sheet. Fixed by PR #160.
- Fixed Issue #157: items with zero load no longer add to the load count. Fixed by PR #158.
- Fixed Issue #146: an empty alias no longer shows a blank name in the sidebar, and names are shown as text, not HTML. Fixed by PR #162.
- Fixed the card chooser dialog not filling the custom text box on Foundry v12.
- Fixed Issue #71 (part): the character sheet no longer adds another document click handler every time it re-renders, and removes its handler when closed. The handler is bound to the document the sheet is in instead of always the main window's (groundwork for PopOut! support). Coin, harm and load popups still close on an outside click.
- Fixed Issue #72: the playbook and crew type XP clues no longer show HTML tags (such as `<p>`) as text, and the crew type tooltip shows plain text. Stripped text is now escaped, so quotes or escaped tags in a description can no longer break the sheet.
- Partially fixed Issue #144: the crew sheet's Rep, Heat and Wanted teeth are now the system crew sheet's size (17 by 50, 5 apart), and there is a gap between the last Heat tooth and Wanted. To fit the larger teeth, the crew sheet now opens 940 wide (the system crew sheet's width) and can't be made narrower than that.
- Partially fixed Issue #144: the crew sheet's Cohorts tab has a "Cohorts" title bar with the + at its right instead of an empty black bar. Each cohort's harm row is one aligned row: the image box is as tall as the harm cells, the cells share one border grid, and the row lines up with the cohort's header stripe. Quality and scale are spelled out and stacked ("Quality 2" over "Scale 2"), and gang types are comma-separated ("Gang of Rovers, Skulks"). The crew sheet now uses its own copy of the system's cohort block.
- The crew sheet's "Cohort: New" and "Cohort: Add Type" upgrades now buy cohorts. Filling the 2nd box of Cohort: New opens a New Cohort dialog: pick Gang or Expert (each shows its quality and scale from the crew's Tier), a gang type or an expert's type, and a name. Create adds the cohort to the Cohorts tab and opens its sheet to pick edges and flaws. Filling the 2nd box of Cohort: Add Type opens an Add Cohort Type dialog: pick a cohort, then the type it gains (experts get a text field). Cohorts at their max of 2 types (3 for gangs when the crew has Bravos Blood Brothers) and types a cohort already has are greyed out. After each purchase both boxes clear and a counter under the upgrade goes up ("Cohorts made: 1", "Types added: 1"). Cancelling a dialog unticks the 2nd box. Unticking a box never deletes a cohort; delete one with its trash icon on the Cohorts tab.

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
