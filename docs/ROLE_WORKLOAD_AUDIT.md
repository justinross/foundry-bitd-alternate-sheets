## Overview
Reviewed hooks and shared handlers for work that can be restricted to the GM to avoid redundant per-client processing.

## Changes Made
- `scripts/hooks.js` – `renderSidebarTab`: now GM-only. The directory name replacement only needs to run once; results are visible to all users without every client rewriting the DOM.

## Notes / Remaining Watch Points
- `renderBladesClockSheet` rerenders owned, open character sheets whose notes reference the clock. This is per-client UI work (no document updates) and already gated by ownership/rendered state; left unchanged.
- Other hooks (`updateActor`, `createActor`) are currently no-ops.
