## Overview
Focused on “update storms” that issue multiple document updates for a single user action. Scanned for sequential `update*` calls, loops of updates, and helpers that emit many small updates. Goal: batch related updates where safe to cut network chatter in multi-user sessions.

## Changes Made
- No batching changes were applied; current code paths already perform single updates per user action after prior performance fixes.

## Remaining Risky / Reviewed Spots
- `scripts/blades-alternate-actor-sheet.js` – Ability checkbox handler issues an embedded-item create/delete (via `Utils.toggleOwnership`) plus a flag update. These are different operations (one alters embedded Item ownership, one tracks progress flags), so batching isn’t safely possible without redesign.
- `scripts/blades-alternate-crew-sheet.js::_onUpgradeToggle` – Creates/deletes/updates a crew upgrade item depending on slot state. Operations are already minimized to a single update per branch; batching would require a larger refactor and clearer semantics.

No other multi-update sequences were found that are both related and safely batchable.
