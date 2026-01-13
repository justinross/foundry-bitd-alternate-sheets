## Performance-Safe Update Patterns

This module runs in multi-user Foundry sessions, so updates and rerenders can multiply across clients. Use these patterns to avoid reintroducing lag:

- **Check ownership before side effects**: Hooks like `deleteItem` should only call document updates when `item.isOwner`, `item.parent?.isOwner`, or `game.user.isGM`. This prevents duplicate update storms from every connected client.
- **Skip no-op updates**: Before calling `actor.update`/`updateEmbeddedDocuments`, compare the target state. Example: `Utils.updateAbilityProgressFlag` now bails if the stored value already matches or is absent for removals; `toggleOwnership` skips rewriting `equipped-items` when unchanged.
- **Limit rerenders to active sheets**: When responding to hooks (e.g., `renderBladesClockSheet`), only rerender when the sheet is owned and currently rendered. Avoid re-rendering closed sheets or sheets the user cannot see.
- **Prefer batched updates**: When setting multiple fields, combine them into a single update object instead of sequential calls. This reduces network chatter and hook cascades.
- **Avoid hot-path work**: Keep heavy work out of `update*` hooks and high-frequency handlers (mousemove, keydown). Debounce if you must react to rapid events.
- **Respect cached allow-edit state**: The sheet lock/unlock toggle persists per user. Don't bypass `Utils.ensureAllowEdit` / `bindAllowEditToggle`; wire new toggles through those helpers.
- **Wrap document operations in queueUpdate**: All `createEmbeddedDocuments`, `deleteEmbeddedDocuments`, `updateEmbeddedDocuments`, `setFlag`, and `unsetFlag` calls should be wrapped in `queueUpdate()` to prevent race conditions in multi-client sessions.

### Quick checklist for new code
1. Will this update fire on every client? Guard with ownership/GM checks where appropriate.
2. Am I issuing multiple sequential updates to the same document? Batch them.
3. Could this handler run frequently? Add debouncing or early exits.
4. Does the new state differ from current state? Skip the update if not.
5. Will I rerender other sheets? Only rerender owned and currently open sheets.
6. Is the document operation wrapped in `queueUpdate()`? Wrap it.

### queueUpdate vs safeUpdate

- **queueUpdate**: Low-level wrapper that ensures document operations execute sequentially, preventing race conditions when multiple async operations happen on the same client.
- **safeUpdate**: Higher-level helper for `doc.update()` that combines ownership guards, no-op detection, and queueUpdate in one call.

Use `queueUpdate` for embedded document operations (`createEmbeddedDocuments`, `deleteEmbeddedDocuments`, etc.) and flag operations. Use `safeUpdate` for simple field updates where you want all guards applied automatically.

## Known Performance Issue: Compendium Access

Profiling (January 2026) identified compendium fetching as a significant bottleneck:

| Sheet | Compendium Calls | Per-Call Time | Total getData |
|-------|------------------|---------------|---------------|
| Actor | 7 (heritage, background, vice, npc, ability, item x2) | ~80ms | ~550-650ms |
| Crew  | 2 (crew_ability, crew_upgrade) | ~85ms | ~170-220ms |

**Key findings:**
- Each `pack.getDocuments()` call costs ~80-100ms regardless of item type
- No caching between renders - same cost on every sheet render
- Actor sheet spends over half a second in compendium I/O per render

**Future optimization**: Implement module-level caching for compendium data, invalidating on compendium changes. This would reduce getData times to ~50-100ms after first load.

### Enabling Profiling

To measure performance, enable "Enable Profiling Logs" in module settings. Look for `[bitd-alt-profiler]` entries in the browser console showing timing data for key operations.
