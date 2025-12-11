## Overview
Stress-tested click-heavy interactions (clocks, ability tooth bars, crew upgrades). Focused on per-click updates and renders under rapid use, aiming to suppress redundant work without changing visible behavior or sync.

## Interactions and Changes
- **Clocks (img.clockImage)** – `scripts/utils.js::bindClockControls`
  - Before: Each click/contextmenu issued `entity.update({system.value…})` with default render and no gating; rapid clicks could enqueue multiple updates/renders.
  - After: Added a simple pending guard to drop overlapping clicks and set `{ render: false }` on the update while still calling the provided rerender callback. Per click: 1 update (render suppressed), 1 explicit rerender from callback.
- **Ability tooth bars** – `scripts/blades-alternate-actor-sheet.js` handler
  - Path: Toggle may create/delete an embedded Item via `Utils.toggleOwnership` (with `{render:false}`) and update a flag via `updateAbilityProgressFlag` (no-op guarded, `{render:false}`).
  - Per click: up to 2 updates (ownership + flag), 0 renders (UI updated manually). No change in this pass; considered safe.
- **Crew upgrades** – `scripts/blades-alternate-crew-sheet.js::_onUpgradeToggle`
  - Path: create/delete/update upgrade Item with `{render:false}`, UI updated manually. Per click: 1 update, 0 renders. No change needed.

## Remaining Risks / Notes
- Clock spam is now gated one-at-a-time per control; if rapid double-click throughput is desired, a queued throttle could be added later, but current guard avoids overlapping updates and suppresses local renders.
- Ability toggles still emit two updates when ownership flips and progress changes; batching would require design changes (embedded Item vs. flag).
