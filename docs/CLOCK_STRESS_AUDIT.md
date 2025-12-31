## Overview
Stress-tested click-heavy interactions (clocks, ability tooth bars, crew upgrades). Focused on per-click updates and renders under rapid use, aiming to suppress redundant work without changing visible behavior or sync.

## Interactions and Changes
- **Clocks (.blades-clock)** – `scripts/hooks.js::setupGlobalClockHandlers`
  - Single source of truth for all clock interactions via global event delegation on document.body.
  - Uses radio input `name` attribute to determine update path (no special casing for healing clocks).
  - Optimistic UI updates applied immediately; database save with `{ render: false }`.
  - Legacy `img.clockImage` elements no longer exist; bindClockControls has been removed.
- **Ability tooth bars** – `scripts/blades-alternate-actor-sheet.js` handler
  - Path: Toggle may create/delete an embedded Item via `Utils.toggleOwnership` (with `{render:false}`) and update a flag via `updateAbilityProgressFlag` (no-op guarded, `{render:false}`).
  - Per click: up to 2 updates (ownership + flag), 0 renders (UI updated manually). No change in this pass; considered safe.
- **Crew upgrades** – `scripts/blades-alternate-crew-sheet.js::_onUpgradeToggle`
  - Path: create/delete/update upgrade Item with `{render:false}`, UI updated manually. Per click: 1 update, 0 renders. No change needed.

## Remaining Risks / Notes
- Clock spam is now gated one-at-a-time per control; if rapid double-click throughput is desired, a queued throttle could be added later, but current guard avoids overlapping updates and suppresses local renders.
- Ability toggles still emit two updates when ownership flips and progress changes; batching would require design changes (embedded Item vs. flag).
