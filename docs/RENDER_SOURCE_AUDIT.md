## Overview
Reviewed explicit sheet render triggers and removed redundant renders where document updates already refresh the UI.

## Render Sites Examined
- `scripts/blades-alternate-actor-sheet.js`
  - `setLocalProp` — calls `this.render(false)` after local state change.
  - `switchPlaybook` — previously scheduled a delayed `this.render(false)` after switching playbook.
- `scripts/blades-alternate-crew-sheet.js`
  - Turf checkbox change calls `this.render(false)` after an embedded document update with `render: false`.
- `scripts/blades-alternate-class-sheet.js`
  - `setLocalProp` and `activateListeners` callbacks render(false).
- `scripts/hooks.js`
  - `renderBladesClockSheet` triggers `character.sheet.render(false)` for linked notes.
- `scripts/settings.js`
  - Re-renders actors directory on setting change.
- Misc: dialog renders (`render(true)`) for user-facing popups; left as-is (critical UI).

## Changes Made
- `scripts/blades-alternate-actor-sheet.js::switchPlaybook` — removed the delayed extra `render(false)` (document updates already rerender; redundant render dropped).

## Notes / Left Intact (Critical or acceptable)
- `setLocalProp` patterns across sheets: keep `render(false)` since they intentionally force a view refresh when toggling local sheet state.
- Crew sheet turf change: uses `updateEmbeddedDocuments` with `{ render: false }` then `render(false)` once—kept as single intentional refresh.
- Clock note hook: rerenders owned/open character sheets when a linked clock renders; UI sync purpose, left in place.
- Dialog renders and directory render are user-facing or systemic; kept as critical.
