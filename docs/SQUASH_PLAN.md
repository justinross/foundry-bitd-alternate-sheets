# Squash Plan for feature/alt-crew-sheet

**Branch:** `feature/alt-crew-sheet`  
**Base:** `upstream/master`  
**Total Commits:** 240  
**Target:** 8 logical squashed commits  
**Created:** 2025-12-31

---

## Prerequisites

```bash
# 1. Ensure you're on the correct branch
git checkout feature/alt-crew-sheet

# 2. Create backup branch (REQUIRED)
git checkout -b feature/alt-crew-sheet-backup
git checkout feature/alt-crew-sheet

# 3. Verify upstream remote
git fetch upstream
```

---

## Squash Groups

Each group below lists the commits to be squashed together, in chronological order. The first commit in each group becomes the "pick" commit; all others become "fixup".

---

### Group 1: Build Infrastructure & Tooling

**Squashed Commit Message:**
```
build: Add Sass build infrastructure and development tooling

Establishes the build pipeline for SCSS compilation and adds development
tooling for code quality and metrics.

Key changes:
- Add Sass build script and npm scripts (build:css, lint:css)
- Add stylelint configuration for SCSS linting
- Add metrics tooling (cloc, jscpd, complexity)
- Configure metrics to exclude vendor code
- Add style snapshot harness for regression testing

Files affected:
- package.json, package-lock.json
- .stylelintrc.json (new)
- tools/style-snapshots/* (new)

---
Squashed commits:
- c26b915 Add Sass build script and align SCSS with CSS
- c33c37b Add stylelint for SCSS and prune unused legacy styles
- 71c58cf Document lint/metrics, clean SCSS, add AGENTS note
- 3104718 Add repeatable metrics tooling (cloc, jscpd, complexity)
- bda0c7a Scope metrics to project code (exclude vendor)
- bcf5b05 Ignore metrics reports directory
- be658ba Add style snapshot harness for character and crew fixtures
```

**Commits (7):**
```
pick c26b915 Add Sass build script and align SCSS with CSS
fixup c33c37b Add stylelint for SCSS and prune unused legacy styles
fixup 71c58cf Document lint/metrics, clean SCSS, add AGENTS note
fixup 3104718 Add repeatable metrics tooling (cloc, jscpd, complexity)
fixup bda0c7a Scope metrics to project code (exclude vendor)
fixup bcf5b05 Ignore metrics reports directory
fixup be658ba Add style snapshot harness for character and crew fixtures
```

---

### Group 2: Crew Sheet Feature Implementation

**Squashed Commit Message:**
```
feat: Crew sheet alternate implementation

Implements the alternate crew sheet with enhanced layout, controls, and
styling to match the character sheet improvements.

Key changes:
- Add ProseMirror rich text editor to crew notes tab
- Implement Claims, Upgrades, and Abilities sections
- Add shared allow-edit toggle for crew sheet
- Redesign crew sheet layout: 2x2 grid with tighter stats
- Circular portrait with XP bar layout
- Crew XP notes section
- Crew coins with caption display
- Identity styling standardization

UI improvements:
- Inline editing for reputation
- Crew selection dialog refinements
- Hold/tier spacing adjustments
- Name sizing consistency with character sheet

---
Squashed commits:
- 2de68aa chore: snapshot before crew upgrade fix
- 80a6926 Claims, Upgrades, Abilities basic support
- b4368a7 Added ProseMirror to the crew notes tab
- 9d757bd feat: add shared allow-edit toggle and unify crew sheet controls
- 8b9fd0d Fixed All Items tab to single line height
- 0c71482 Removing unused scss
- 796873e Bad commit; not functional
- 4970e1d Bad commit; just saving state
- e79f437 Pretty good
- b9d145d pretty close
- 6262599 Trying to reduce CSS.
- 2b82706 This looks good I think.
- 08b90ca Missing data to distinguish multi-cost vs multi-level abilities.
- 56698af CSS refactor
- ffbd119 Improve crew inline editing and reputation UI
- bced9d6 Restore SCSS sources
- c8f32f4 Match crew name sizing to character sheet
- a5e7dec Align crew coins layout to paper sheet
- 03630b9 Tighten crew hold/tier spacing
- 86b1405 Add caption beneath crew coins display
- 95476c1 Fix coins caption layout and reuse xp-notes class
- 2918497 Fix localization namespace for crew coins caption
- 2ee2463 Remove muted color from crew coins caption
- cd75fc7 Use dedicated coins-caption class instead of xp-notes
- 7085c8e Move coins-caption and xp-notes styles to shared location
- cd8dc50 Reduce gap between coins and caption
- e2c0aae Add translations for crew coins caption
- edac75c Add crew XP notes section to crew sheet
- 082888b Move crew XP notes to top-right section
- f6847d5 Fix crew XP notes to display correctly
- 11e9ad3 Crew XP header styling alignment
- f592fa5 Refine crew sheet portrait and XP bar layout
- 828e7dd refactor(crew-sheet): restructure layout to 2x2 grid
- 5b6c170 Move Claims checkbox to corner
```

**Commits (34):**
```
pick 2de68aa chore: snapshot before crew upgrade fix
fixup 80a6926 Claims, Upgrades, Abilities basic support
fixup b4368a7 Added ProseMirror to the crew notes tab
fixup 9d757bd feat: add shared allow-edit toggle and unify crew sheet controls
fixup 8b9fd0d Fixed All Items tab to single line height
fixup 0c71482 Removing unused scss
fixup 796873e Bad commit; not functional
fixup 4970e1d Bad commit; just saving state
fixup e79f437 Pretty good
fixup b9d145d pretty close
fixup 6262599 Trying to reduce CSS.
fixup 2b82706 This looks good I think.
fixup 08b90ca Missing data to distinguish multi-cost vs multi-level abilities.
fixup 56698af CSS refactor
fixup ffbd119 Improve crew inline editing and reputation UI
fixup bced9d6 Restore SCSS sources
fixup c8f32f4 Match crew name sizing to character sheet
fixup a5e7dec Align crew coins layout to paper sheet
fixup 03630b9 Tighten crew hold/tier spacing
fixup 86b1405 Add caption beneath crew coins display
fixup 95476c1 Fix coins caption layout and reuse xp-notes class
fixup 2918497 Fix localization namespace for crew coins caption
fixup 2ee2463 Remove muted color from crew coins caption
fixup cd75fc7 Use dedicated coins-caption class instead of xp-notes
fixup 7085c8e Move coins-caption and xp-notes styles to shared location
fixup cd8dc50 Reduce gap between coins and caption
fixup e2c0aae Add translations for crew coins caption
fixup edac75c Add crew XP notes section to crew sheet
fixup 082888b Move crew XP notes to top-right section
fixup f6847d5 Fix crew XP notes to display correctly
fixup 11e9ad3 Crew XP header styling alignment
fixup f592fa5 Refine crew sheet portrait and XP bar layout
fixup 828e7dd refactor(crew-sheet): restructure layout to 2x2 grid
fixup 5b6c170 Move Claims checkbox to corner
```

---

### Group 3: SCSS Architecture Overhaul

**Squashed Commit Message:**
```
refactor: SCSS architecture overhaul with zero visual change

Reorganizes SCSS into modern, token-driven architecture while maintaining
identical visual output. Migrates from @import to @use/@forward module system.

Architecture changes:
- New folder structure: abstracts/, base/, layout/, components/
- main.scss as new entrypoint (bitd-alt.scss forwards for compatibility)
- All @import statements converted to @use/@forward

Tokenization:
- Colors centralized in abstracts/_tokens.scss
- Spacing values tokenized (4/8/12/16/20px)
- Breakpoints moved to tokens
- Z-index tiers defined

Selector improvements:
- Major nesting hotspots flattened (10+ levels → 3-4)
- Crew identity, tabs, hold row helpers flattened
- Character minimized view selectors flattened
- Shared ability list and toggle selectors simplified

Deduplication:
- Toggle styles extracted to shared mixin
- Coin grid styles deduplicated
- XP notes styles unified
- Unused fonts.scss removed

Files affected:
- styles/scss/main.scss (new entrypoint)
- styles/scss/abstracts/*.scss (new)
- styles/scss/layout/*.scss (new)
- styles/scss/components/**/*.scss (restructured)
- styles/scss/import/*.scss (now forwarders)

---
Squashed commits:
- af55b04 Fix Sass deprecations and add shared variables module
- d9cfba7 Consolidate crew styling, coin mixin, and restore missing styles
- 4765e51 Simplify SCSS by removing duplicate ability list styles
- b718e58 Add shared teeth track mixin
- d10498c Consolidate header styling and drop multi-cost class
- 2ec99a9 Clean up SCSS: remove dead code, fix variable inconsistency
- b4ec2fb Scaffold SCSS refactor with tokens and forwarders
- 2c0fc93 Remove unused flexbox variable stubs
- 8c91227 Flatten character minimized view selectors
- c848283 Flatten crew identity toggles and teeth layout
- 97ac29d Flatten character and crew tab layouts
- a4af95b Stabilize scrollbar gutter on actor sheets
- ee43c8b Flatten crew hold row helpers
- 321ea2f Flatten crew portrait stress block
- 35cdd53 Flatten crew identity toggle positioning
- 8f22d8b Flatten crew tabs styling
- a2e4038 Restore crew XP stress bar styling
- f9937d7 Flatten crew ability and XP notes selectors
- 0b77c2c Flatten crew identity header layout
- b1a1fb7 Flatten crew stats grid selectors
- 0afefb4 Flatten shared ability list selectors
- 2a2e819 Flatten shared toggles and layout helpers
- 29dbce1 Forward grid/visibility from layout main
- 9aed450 Flatten debug toggle styling
- 24460f5 Flatten shared tab visibility rule
- 944df1c Update SCSS refactor plan progress
- 64e14f8 Inline grid and visibility into layout layer
- eae7a32 Inline shared globals and forward legacy path
- 6c3ae83 Wrap sheet imports in component mixins
- f627210 Use component mixins to include sheet styles
- b6c0847 Restore crew sheet mixin load
- 8a2f198 Forward item sheet to component body
- ee8f5a0 Forward playbook sheet to component body
- c3bd08c Forward character sheet mixin from component
- 6fa182c Forward character/crew sheets to component bodies
- 80f7785 Scope crew tabs/nav to blades-alt
- f8effe5 Scope identity styles to blades-alt
- 96935a7 Scope and restore coin layout globally
- c572330 Apply coin layout styles at sheet level
- 0a71433 Fix coin section layout (again)
- 02a3898 Tokenize SCSS colors
- db9e2ed Tokenize SCSS spacing
- 770c64b Use tokens for breakpoints
- c49b5da Forward flexbox layout
- dcc9871 Drop import shim for crew styles
- e72e82c Document SCSS refactor status
- 41cc1e6 Flatten minimized view nesting
- 0acb2a7 Flatten playbook tab nesting
- 025468f Flatten crew portrait nesting
- 165c8a2 Deduplicate toggle and coin styles
- f262428 Remove unused fonts stylesheet
- 0661fcc Deduplicate XP notes styles
- 41fe506 Update SCSS refactor status
- fe36106 docs: Mark SCSS refactor as 90% complete
- 0f6b6e5 refactor: Remove empty SCSS placeholder files
- afe74c8 refactor: Eliminate !important in radio/checkbox mixins
- 3f1209d refactor: Eliminate !important in toggle-expand
- b7c2ec4 docs: Document remaining !important usage
```

**Commits (58):**
```
pick af55b04 Fix Sass deprecations and add shared variables module
fixup d9cfba7 Consolidate crew styling, coin mixin, and restore missing styles
fixup 4765e51 Simplify SCSS by removing duplicate ability list styles
fixup b718e58 Add shared teeth track mixin
fixup d10498c Consolidate header styling and drop multi-cost class
fixup 2ec99a9 Clean up SCSS: remove dead code, fix variable inconsistency
fixup b4ec2fb Scaffold SCSS refactor with tokens and forwarders
fixup 2c0fc93 Remove unused flexbox variable stubs
fixup 8c91227 Flatten character minimized view selectors
fixup c848283 Flatten crew identity toggles and teeth layout
fixup 97ac29d Flatten character and crew tab layouts
fixup a4af95b Stabilize scrollbar gutter on actor sheets
fixup ee43c8b Flatten crew hold row helpers
fixup 321ea2f Flatten crew portrait stress block
fixup 35cdd53 Flatten crew identity toggle positioning
fixup 8f22d8b Flatten crew tabs styling
fixup a2e4038 Restore crew XP stress bar styling
fixup f9937d7 Flatten crew ability and XP notes selectors
fixup 0b77c2c Flatten crew identity header layout
fixup b1a1fb7 Flatten crew stats grid selectors
fixup 0afefb4 Flatten shared ability list selectors
fixup 2a2e819 Flatten shared toggles and layout helpers
fixup 29dbce1 Forward grid/visibility from layout main
fixup 9aed450 Flatten debug toggle styling
fixup 24460f5 Flatten shared tab visibility rule
fixup 944df1c Update SCSS refactor plan progress
fixup 64e14f8 Inline grid and visibility into layout layer
fixup eae7a32 Inline shared globals and forward legacy path
fixup 6c3ae83 Wrap sheet imports in component mixins
fixup f627210 Use component mixins to include sheet styles
fixup b6c0847 Restore crew sheet mixin load
fixup 8a2f198 Forward item sheet to component body
fixup ee8f5a0 Forward playbook sheet to component body
fixup c3bd08c Forward character sheet mixin from component
fixup 6fa182c Forward character/crew sheets to component bodies
fixup 80f7785 Scope crew tabs/nav to blades-alt
fixup f8effe5 Scope identity styles to blades-alt
fixup 96935a7 Scope and restore coin layout globally
fixup c572330 Apply coin layout styles at sheet level
fixup 0a71433 Fix coin section layout (again)
fixup 02a3898 Tokenize SCSS colors
fixup db9e2ed Tokenize SCSS spacing
fixup 770c64b Use tokens for breakpoints
fixup c49b5da Forward flexbox layout
fixup dcc9871 Drop import shim for crew styles
fixup e72e82c Document SCSS refactor status
fixup 41cc1e6 Flatten minimized view nesting
fixup 0acb2a7 Flatten playbook tab nesting
fixup 025468f Flatten crew portrait nesting
fixup 165c8a2 Deduplicate toggle and coin styles
fixup f262428 Remove unused fonts stylesheet
fixup 0661fcc Deduplicate XP notes styles
fixup 41fe506 Update SCSS refactor status
fixup fe36106 docs: Mark SCSS refactor as 90% complete
fixup 0f6b6e5 refactor: Remove empty SCSS placeholder files
fixup afe74c8 refactor: Eliminate !important in radio/checkbox mixins
fixup 3f1209d refactor: Eliminate !important in toggle-expand
fixup b7c2ec4 docs: Document remaining !important usage
```

---

### Group 4: JavaScript Modularization

**Squashed Commit Message:**
```
refactor: JavaScript modularization and code cleanup

Splits monolithic utils.js into focused modules and extracts reusable
patterns from sheet classes following the REFACTOR_PLAN.md roadmap.

Module structure:
- scripts/utils/collections.js - Actor/item collection helpers
- scripts/utils/text.js - Text processing utilities
- scripts/lib/sheet-helpers.js - Shared sheet event handlers
- scripts/clocks.js - Consolidated clock rendering and handlers

Refactoring completed (from REFACTOR_PLAN.md):
- H1: Remove duplicate resolveDescription function
- H2: Consolidate clock rendering code
- H3: Centralize MODULE_ID constant
- H4: Extract abilityCostFor to Utils.getAbilityCost
- M1: Extract inline-input event handlers
- M2: Remove empty hook bodies
- M3: Replace nested ternary in standing toggle
- M4: Simplify _applyLoad with config object
- M5: Fix confirmDialogV1 button labels
- M6: Remove identity map functions
- M7: Simplify handleDrop switch statement
- M8: Remove commented-out code and dead imports
- L1: Break up getVirtualListOfItems into helper functions

Additional improvements:
- Modularize utils sourcing and text helpers
- Extract smart edit/item/acquaintance flows
- Refactor actor getData into phased view model pipeline
- DRY contenteditable sanitizers
- DRY filter and collapse binding helpers

---
Squashed commits:
- 7a496da DRY contenteditable sanitizers and harm styling
- d761438 DRY filter and collapse binding helpers
- a65d74d Refactor item sections into reusable partial
- 3628e5f Refactor sheet sections into dock-section partial
- 90d8860 Refactor duplicate clock handlers and sheet helpers
- 194f37f Refactor actor getData into phased view model pipeline
- d52dae5 Refactor metrics diff reporting pipeline
- 33f34c4 Refactor compat helpers to shared special-case dispatch
- 11bb804 Refactor item chooser ordering and reduce complexity
- f90d6f0 Refactor playbook diff check to helper pipeline
- 6664fd9 Refactor smart edit handler into helper pipeline
- d1cb916 Refactor clock link replacement into helpers
- 220c347 Extract smart edit/item/acquaintance flows
- c76771e Move clock replacement/handlers to clocks module
- 41c12cd Modularize utils sourcing and text helpers
- f517f91 Harden text utils and modularize sourcing helpers
- 2b5a015 Wire utils to modular collections/text helpers
- 1fb59e4 Refactor: Remove duplicate resolveDescription function (H1)
- 7640ddb Refactor: Centralize MODULE_ID constant (H3)
- 4be125f Refactor: Extract abilityCostFor to Utils.getAbilityCost (H4)
- d181274 Refactor: Consolidate clock rendering code (H2)
- 01235c8 Refactor: Extract inline-input event handlers (M1)
- 33a27a5 Refactor: Remove empty hook bodies (M2)
- e46d6c6 Refactor: Replace nested ternary in standing toggle (M3)
- 09780eb Refactor: Fix confirmDialogV1 button labels (M5)
- 996a28a Refactor: Remove identity map functions (M6)
- 4953742 Refactor: Simplify handleDrop switch statement (M7)
- 57b39f3 Refactor: Remove commented-out code and dead imports (M8)
- d786efc Refactor: Simplify _applyLoad with config object (M4)
- cd4ef8a Refactor: Break up getVirtualListOfItems (L1)
- 1307d6c Move schemaVersion setting registration to init hook
```

**Commits (31):**
```
pick 7a496da DRY contenteditable sanitizers and harm styling
fixup d761438 DRY filter and collapse binding helpers
fixup a65d74d Refactor item sections into reusable partial
fixup 3628e5f Refactor sheet sections into dock-section partial
fixup 90d8860 Refactor duplicate clock handlers and sheet helpers
fixup 194f37f Refactor actor getData into phased view model pipeline
fixup d52dae5 Refactor metrics diff reporting pipeline
fixup 33f34c4 Refactor compat helpers to shared special-case dispatch
fixup 11bb804 Refactor item chooser ordering and reduce complexity
fixup f90d6f0 Refactor playbook diff check to helper pipeline
fixup 6664fd9 Refactor smart edit handler into helper pipeline
fixup d1cb916 Refactor clock link replacement into helpers
fixup 220c347 Extract smart edit/item/acquaintance flows
fixup c76771e Move clock replacement/handlers to clocks module
fixup 41c12cd Modularize utils sourcing and text helpers
fixup f517f91 Harden text utils and modularize sourcing helpers
fixup 2b5a015 Wire utils to modular collections/text helpers
fixup 1fb59e4 Refactor: Remove duplicate resolveDescription function (H1)
fixup 7640ddb Refactor: Centralize MODULE_ID constant (H3)
fixup 4be125f Refactor: Extract abilityCostFor to Utils.getAbilityCost (H4)
fixup d181274 Refactor: Consolidate clock rendering code (H2)
fixup 01235c8 Refactor: Extract inline-input event handlers (M1)
fixup 33a27a5 Refactor: Remove empty hook bodies (M2)
fixup e46d6c6 Refactor: Replace nested ternary in standing toggle (M3)
fixup 09780eb Refactor: Fix confirmDialogV1 button labels (M5)
fixup 996a28a Refactor: Remove identity map functions (M6)
fixup 4953742 Refactor: Simplify handleDrop switch statement (M7)
fixup 57b39f3 Refactor: Remove commented-out code and dead imports (M8)
fixup d786efc Refactor: Simplify _applyLoad with config object (M4)
fixup cd4ef8a Refactor: Break up getVirtualListOfItems (L1)
fixup 1307d6c Move schemaVersion setting registration to init hook
```

---

### Group 5: Performance Optimization

**Squashed Commit Message:**
```
perf: Render optimization and update batching

Implements comprehensive performance fixes achieving 5-10x improvement in
sheet rendering and update responsiveness.

Phase 1 fixes:
- Add compendium document caching with smart invalidation
- Fix critical bug in getCachedPackDocuments (type filter, pack.collection)
- Reduce redundant actor updates
- Suppress render on ability ownership changes
- Avoid rerender flicker on ability progress updates

Update storm prevention:
- Suppress redundant renders on turf/upgrades and equip flags
- Remove redundant delayed render after playbook switch
- Gate sidebar name replacement to GM only
- Guard clock clicks and add stress audit

Profiling infrastructure:
- Add opt-in profiling logs for key interactions
- Add hook cascade audit report
- Add update storm audit report
- Add performance update guidelines documentation

---
Squashed commits:
- 78fe27a Reduce redundant updates and add audit
- c08059c Add performance update guide
- 60e99e4 Avoid rerender flicker on ability progress updates
- 4d36ceb Suppress redundant renders on turf/upgrades and equip flags
- 49d6116 Add update storm audit report
- f7172fd Add hook cascade audit report
- 14a38ad Gate sidebar name replacement to GM
- 9e96ec0 Remove redundant delayed render after playbook switch
- 9425588 Guard clock clicks and add stress audit
- 6a43cd7 Add opt-in profiling logs and instrument key interactions
- 14908d8 Suppress render on ability ownership changes
- 43ec611 Prevent ability delete path from rerendering
- 831e233 Stop ability ownership ops from rendering sheets
- 53ecc60 Fix profiler setting lookup to avoid circular import
- c3e41f1 docs: Add performance fix implementation plan
- 9927810 perf: Implement Phase 1 performance fixes (5-10x improvement)
- 88a0842 docs: Document critical bug in Fix 1.1
- 045f4a2 fix: Add missing type filter in getCachedPackDocuments
- 26f0450 Add comprehensive debug logging to trace cache
- db98b4d Add debug log to confirm cache invalidation hooks
- 4b4ab9b Add pack count debug logging
- b6a2761 Fix critical bug: Use pack.collection instead of pack.id
- 258ccee Remove debug logging - performance fix complete
- fbdc4e7 docs: Mark Phase 1 performance fixes as complete
- e8a6abd docs: Add comprehensive testing results
- 245dfbe docs: Add caching options analysis and decision
```

**Commits (26):**
```
pick 78fe27a Reduce redundant updates and add audit
fixup c08059c Add performance update guide
fixup 60e99e4 Avoid rerender flicker on ability progress updates
fixup 4d36ceb Suppress redundant renders on turf/upgrades and equip flags
fixup 49d6116 Add update storm audit report
fixup f7172fd Add hook cascade audit report
fixup 14a38ad Gate sidebar name replacement to GM
fixup 9e96ec0 Remove redundant delayed render after playbook switch
fixup 9425588 Guard clock clicks and add stress audit
fixup 6a43cd7 Add opt-in profiling logs and instrument key interactions
fixup 14908d8 Suppress render on ability ownership changes
fixup 43ec611 Prevent ability delete path from rerendering
fixup 831e233 Stop ability ownership ops from rendering sheets
fixup 53ecc60 Fix profiler setting lookup to avoid circular import
fixup c3e41f1 docs: Add performance fix implementation plan
fixup 9927810 perf: Implement Phase 1 performance fixes (5-10x improvement)
fixup 88a0842 docs: Document critical bug in Fix 1.1
fixup 045f4a2 fix: Add missing type filter in getCachedPackDocuments
fixup 26f0450 Add comprehensive debug logging to trace cache
fixup db98b4d Add debug log to confirm cache invalidation hooks
fixup 4b4ab9b Add pack count debug logging
fixup b6a2761 Fix critical bug: Use pack.collection instead of pack.id
fixup 258ccee Remove debug logging - performance fix complete
fixup fbdc4e7 docs: Mark Phase 1 performance fixes as complete
fixup e8a6abd docs: Add comprehensive testing results
fixup 245dfbe docs: Add caching options analysis and decision
```

---

### Group 6: UI Features & Enhancements

**Squashed Commit Message:**
```
feat: UI enhancements and new features

Adds major UI features including dockable sections, compendium tooltips,
smart fields, and improved item/ability management.

Dockable sections:
- Implement draggable dockable sections for actor sheet
- Move Harm section to dockable section on playbook tab
- Add persistence and default layout handling
- Drag & drop robustness for empty columns

Smart field system:
- Compendium-backed Identity fields with tooltips
- Smart field tooltip fallback handling
- NPC integration and advanced filtering for Vice Purveyors
- Compendium description tooltips for bio/identity fields

Item/Ability management:
- Playbook selection chooser with centralized switch logic
- Ghost slots for cross-playbook abilities
- Ability persistence improvements for non-native abilities
- Coin/Stash refactor with draggable sections and grid layout
- Zero-load items default equipped behavior

Collapsible sections:
- Per-user persistence for collapse state
- Filter toggle persistence per actor/user
- Unified section controls partial

Clock improvements:
- Standardize clock rendering and interactions
- Unify clock handlers into single source of truth
- Add toggle behavior for clock segments

---
Squashed commits:
- 9d99818 feat: Standardize Identity styling and refactor for reuse
- 7e5af7a feat: Add smart field system and crew sheet enhancements
- 83ad2d6 Implement compendium-backed Identity fields
- 7d2015c feat(actor-sheet): revert simple fields to inline-edit
- b1ccd1b feat: NPC Integration & Advanced Filtering
- a197970 feat(sheets): Add compendium description tooltips
- c151899 Feat: Dockable Sections for Actor Sheet
- 80c4529 Move harm to dockable section on playbook tab
- 3ef174a Add docked harm section styling
- 532ab8a Restore and refine Harm section styling
- c596988 Refine Harm section layout
- 51da6b5 Standardize clock rendering and interactions
- d635d45 Unify clock handlers into single source of truth
- b37ffcc Add toggle behavior for clock segments
- 0607278 Add collapsible sections with per-user persistence
- e376ce8 Persist filter toggles per actor/user
- 7719707 Restore playbook two-column layout and collapse sync
- 40dd77e Rename item sections to Items and Special Items
- ff9bf4b Unify Items section with single add and combined chooser
- 90188a8 Reposition filter/add controls left
- 295de95 Highlight load controls when over max
- 4af2fbc Default zero-load items equipped
- f31959b Ensure zero-load items render equipped by default
- 64cb930 Default zero-load items to checked
- 4887ce4 Default zero-load items checked; remove debug logging
- 3561897 Implement Playbook selection chooser
- f4f2d5b Refine Playbook Selection Chooser
- b2036a0 Fix ability persistence bug
- e3ded55 Simplify ability management: use virtual flag
- 6cc9912 Restore trashcan for owned abilities
- f277841 Allow non-native abilities to persist with 0 progress
- 947acb7 Fix ability progress flag saving
- e639bf6 Remove Profiler.time wrapper from ability toggle
- e3e5c94 Implement ghost slots for cross-playbook abilities
- 061535a feat: implement ghost slots for cross-playbook abilities
- f748f66 Refactor Coin/Stash: Draggable section, Ghost Slots
- 02baf66 Default sheets locked and remember toggle
```

**Commits (37):**
```
pick 9d99818 feat: Standardize Identity styling and refactor for reuse
fixup 7e5af7a feat: Add smart field system and crew sheet enhancements
fixup 83ad2d6 Implement compendium-backed Identity fields
fixup 7d2015c feat(actor-sheet): revert simple fields to inline-edit
fixup b1ccd1b feat: NPC Integration & Advanced Filtering
fixup a197970 feat(sheets): Add compendium description tooltips
fixup c151899 Feat: Dockable Sections for Actor Sheet
fixup 80c4529 Move harm to dockable section on playbook tab
fixup 3ef174a Add docked harm section styling
fixup 532ab8a Restore and refine Harm section styling
fixup c596988 Refine Harm section layout
fixup 51da6b5 Standardize clock rendering and interactions
fixup d635d45 Unify clock handlers into single source of truth
fixup b37ffcc Add toggle behavior for clock segments
fixup 0607278 Add collapsible sections with per-user persistence
fixup e376ce8 Persist filter toggles per actor/user
fixup 7719707 Restore playbook two-column layout and collapse sync
fixup 40dd77e Rename item sections to Items and Special Items
fixup ff9bf4b Unify Items section with single add and combined chooser
fixup 90188a8 Reposition filter/add controls left
fixup 295de95 Highlight load controls when over max
fixup 4af2fbc Default zero-load items equipped
fixup f31959b Ensure zero-load items render equipped by default
fixup 64cb930 Default zero-load items to checked
fixup 4887ce4 Default zero-load items checked; remove debug logging
fixup 3561897 Implement Playbook selection chooser
fixup f4f2d5b Refine Playbook Selection Chooser
fixup b2036a0 Fix ability persistence bug
fixup e3ded55 Simplify ability management: use virtual flag
fixup 6cc9912 Restore trashcan for owned abilities
fixup f277841 Allow non-native abilities to persist with 0 progress
fixup 947acb7 Fix ability progress flag saving
fixup e639bf6 Remove Profiler.time wrapper from ability toggle
fixup e3e5c94 Implement ghost slots for cross-playbook abilities
fixup 061535a feat: implement ghost slots for cross-playbook abilities
fixup f748f66 Refactor Coin/Stash: Draggable section, Ghost Slots
fixup 02baf66 Default sheets locked and remember toggle
```

---

### Group 7: Bug Fixes & Polish

**Squashed Commit Message:**
```
fix: Bug fixes and UI polish

Addresses various bugs and UI refinements discovered during development.

Bug fixes:
- Clock optimistic update race condition
- Final clock double-update conflict
- Firefox flexbox width calculation bug with checkbox inputs
- Checkbox toggle behavior improvements
- Standing toggle icon when standing is friend
- Acquaintance standing template recognition
- Item list handling for owned vs default items
- Item distinction logic and trashcan visibility
- Layout shift when toggling edit mode
- Special Items label resolution in all locales
- Shrewd Friends name/comma spacing

UI polish:
- Enable alternating item colors in both modes
- Remove hover outline from editable fields
- Outline pills refinement
- Character crew link styling
- Over-max load indicator styling
- CSS workflow fixes
- XP track positioning adjustment

Shared components:
- Share acquaintance rendering between actor and crew
- Share acquaintance styles and standing colors
- Preload partials to fix missing partial errors
- Use section controls partial for filters/add buttons

---
Squashed commits:
- 9bfad17 Fix Firefox flexbox width calculation bug
- fa72e78 Fix clock optimistic update race condition
- 6820774 Fix final clock double-update conflict
- c96bc47 fix: Crew selection dialog, standard labels
- b70c64d fix: Prevent layout shift when toggling edit mode
- ef3b8f6 fix: Address security, accessibility, and UX issues
- e9ce450 Fix layout shift when toggling edit mode on header bars
- 68f5797 Enable alternating item colors in both modes
- d7da6e8 Fix standing toggle icon when standing is friend
- b0af959 Remove hover outline from editable fields
- 23d370e Refine visuals: Outline Pills, Character Crew Link
- 02e1a40 Tighten Shrewd Friends name/comma spacing
- fa5c05e Trim whitespace in acquaintance name display
- dd21344 Fix Shrewd Friends name spacing
- 8f50128 Right-align load selector in Items header
- 5ac36c4 Fix checkbox toggle behavior and improve items layout
- b052de6 Improve over-max load indicator styling
- 5ac9240 Ensure Special Items label resolves in all locales
- a340fd9 Fix item list handling for owned vs default items
- d96461c Fix item distinction logic, trashcan visibility
- c658ee7 Fix CSS workflow: Move styling to SCSS source
- c0334ac Fix Special Abilities header styling
- bf41a35 Adjust XP track position left by two teeth width
- bd02d6c Fix: Persistence, Default Layout, and Cleanup
- 1d5054e Fix: Teeth click performance with optimistic UI
- 83df55d Fix: Drag & Drop robustness for empty columns
- a3aebd0 Fix acquaintance standing template
- 0cf1975 Share acquaintance rendering and standing toggle
- 5e7ffc9 Preload acquaintance partial
- 452c4e1 Add acquaintance standing colors to crew contacts
- 34a63de Build CSS after acquaintance color tweak
- e3ec93b Share acquaintance styles between actor and crew
- ee62451 Use section controls partial for filters/add buttons
- 9a556ee Preload section-controls partial for filters
- 227042e Fix smart field tooltip fallback
- 271e9e8 Use compat TextEditor helper
```

**Commits (36):**
```
pick 9bfad17 Fix Firefox flexbox width calculation bug
fixup fa72e78 Fix clock optimistic update race condition
fixup 6820774 Fix final clock double-update conflict
fixup c96bc47 fix: Crew selection dialog, standard labels
fixup b70c64d fix: Prevent layout shift when toggling edit mode
fixup ef3b8f6 fix: Address security, accessibility, and UX issues
fixup e9ce450 Fix layout shift when toggling edit mode on header bars
fixup 68f5797 Enable alternating item colors in both modes
fixup d7da6e8 Fix standing toggle icon when standing is friend
fixup b0af959 Remove hover outline from editable fields
fixup 23d370e Refine visuals: Outline Pills, Character Crew Link
fixup 02e1a40 Tighten Shrewd Friends name/comma spacing
fixup fa5c05e Trim whitespace in acquaintance name display
fixup dd21344 Fix Shrewd Friends name spacing
fixup 8f50128 Right-align load selector in Items header
fixup 5ac36c4 Fix checkbox toggle behavior and improve items layout
fixup b052de6 Improve over-max load indicator styling
fixup 5ac9240 Ensure Special Items label resolves in all locales
fixup a340fd9 Fix item list handling for owned vs default items
fixup d96461c Fix item distinction logic, trashcan visibility
fixup c658ee7 Fix CSS workflow: Move styling to SCSS source
fixup c0334ac Fix Special Abilities header styling
fixup bf41a35 Adjust XP track position left by two teeth width
fixup bd02d6c Fix: Persistence, Default Layout, and Cleanup
fixup 1d5054e Fix: Teeth click performance with optimistic UI
fixup 83df55d Fix: Drag & Drop robustness for empty columns
fixup a3aebd0 Fix acquaintance standing template
fixup 0cf1975 Share acquaintance rendering and standing toggle
fixup 5e7ffc9 Preload acquaintance partial
fixup 452c4e1 Add acquaintance standing colors to crew contacts
fixup 34a63de Build CSS after acquaintance color tweak
fixup e3ec93b Share acquaintance styles between actor and crew
fixup ee62451 Use section controls partial for filters/add buttons
fixup 9a556ee Preload section-controls partial for filters
fixup 227042e Fix smart field tooltip fallback
fixup 271e9e8 Use compat TextEditor helper
```

---

### Group 8: Documentation

**Squashed Commit Message:**
```
docs: Documentation updates

Adds comprehensive documentation for the refactoring work, performance
improvements, and development guidelines.

New documentation:
- AGENTS.md - Comprehensive architectural documentation for AI agents
- REFACTOR_PLAN.md - Detailed refactoring roadmap with status tracking
- SCSS_REFACTOR.md - SCSS architecture migration plan
- PERFORMANCE_FIX_PLAN.md - Performance improvement documentation
- CONTRIBUTING.md updates

Audit reports:
- CLOCK_STRESS_AUDIT.md
- HOOK_CASCADE_AUDIT.md
- UPDATE_STORM_AUDIT.md
- performance-update-guidelines.md

Progress tracking:
- Mark completed refactoring items (H1-H4, M1-M8, L1)
- Document SCSS refactor completion status
- Add caching options analysis

---
Squashed commits:
- 59aed1b Add comprehensive architectural documentation for AI agents
- 3655586 docs: Update AGENTS.md with NPC integration notes
- cb2fb9f docs: Add Agent Routing Protocols to CLAUDE.md
- 3fe66f3 Update REFACTOR_PLAN.md: Mark H1 as complete
- 78e2767 docs: Mark H3 and H4 as complete in REFACTOR_PLAN.md
- d0d2e4a docs: Mark H2 as complete in REFACTOR_PLAN.md
- effb37a docs: Mark M1-M3, M5-M8 as complete in REFACTOR_PLAN.md
- da250cb docs: Mark M4 as complete in REFACTOR_PLAN.md
- e2384c4 docs: Mark L1 as complete in REFACTOR_PLAN.md
- 78ad913 Move audit reports into docs
- 31d8134 Reorder data source settings by scope
```

**Commits (11):**
```
pick 59aed1b Add comprehensive architectural documentation for AI agents
fixup 3655586 docs: Update AGENTS.md with NPC integration notes
fixup cb2fb9f docs: Add Agent Routing Protocols to CLAUDE.md
fixup 3fe66f3 Update REFACTOR_PLAN.md: Mark H1 as complete
fixup 78e2767 docs: Mark H3 and H4 as complete in REFACTOR_PLAN.md
fixup d0d2e4a docs: Mark H2 as complete in REFACTOR_PLAN.md
fixup effb37a docs: Mark M1-M3, M5-M8 as complete in REFACTOR_PLAN.md
fixup da250cb docs: Mark M4 as complete in REFACTOR_PLAN.md
fixup e2384c4 docs: Mark L1 as complete in REFACTOR_PLAN.md
fixup 78ad913 Move audit reports into docs
fixup 31d8134 Reorder data source settings by scope
```

---

## Execution Instructions

### Step 1: Begin Interactive Rebase

```bash
git rebase -i upstream/master
```

### Step 2: Reorder and Mark Commits

When the editor opens, you'll see all 240 commits. Reorder them according to the groups above and change commands:
- First commit in each group: `pick`
- All other commits in group: `fixup`

### Step 3: Edit Commit Messages

After the rebase completes the fixups, you'll be prompted to edit commit messages for each `pick` commit. Use the curated messages from this document.

Alternatively, use `reword` instead of `pick` to edit the message during rebase:

```
reword c26b915 Add Sass build script and align SCSS with CSS
fixup c33c37b Add stylelint for SCSS...
```

### Step 4: Resolve Conflicts

If conflicts occur:
```bash
# View conflicting files
git status

# Edit and resolve conflicts
# Then:
git add <resolved-files>
git rebase --continue
```

### Step 5: Verify

```bash
# Check commit count (should be 8)
git log --oneline upstream/master..HEAD | wc -l

# Build and test
npm run build:css
npm run lint:css

# Compare with backup
git diff feature/alt-crew-sheet-backup --stat
# Should show no differences in content, only in history
```

### Step 6: Force Push (after verification)

```bash
git push origin feature/alt-crew-sheet --force-with-lease
```

---

## Rollback Procedure

If anything goes wrong:

```bash
# Abort in-progress rebase
git rebase --abort

# Restore from backup
git checkout feature/alt-crew-sheet
git reset --hard feature/alt-crew-sheet-backup
```

---

## Verification Checklist

After squashing, verify:

- [ ] `git log --oneline upstream/master..HEAD` shows exactly 8 commits
- [ ] `npm run build:css` succeeds
- [ ] `npm run lint:css` passes
- [ ] `git diff feature/alt-crew-sheet-backup -- . ':!*.css.map'` shows no content changes
- [ ] Load character sheet in Foundry - renders correctly
- [ ] Load crew sheet in Foundry - renders correctly
- [ ] Test clock interactions
- [ ] Test dockable sections dragging
