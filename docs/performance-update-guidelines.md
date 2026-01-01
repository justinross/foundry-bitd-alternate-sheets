## Performance-Safe Update Patterns

This module runs in multi-user Foundry sessions, so updates and rerenders can multiply across clients. Use these patterns to avoid reintroducing lag:

- **Check ownership before side effects**: Hooks like `deleteItem` should only call document updates when `item.isOwner`, `item.parent?.isOwner`, or `game.user.isGM`. This prevents duplicate update storms from every connected client.
- **Skip no-op updates**: Before calling `actor.update`/`updateEmbeddedDocuments`, compare the target state. Example: `Utils.updateAbilityProgressFlag` now bails if the stored value already matches or is absent for removals; `toggleOwnership` skips rewriting `equipped-items` when unchanged.
- **Limit rerenders to active sheets**: When responding to hooks (e.g., `renderBladesClockSheet`), only rerender when the sheet is owned and currently rendered. Avoid re-rendering closed sheets or sheets the user cannot see.
- **Prefer batched updates**: When setting multiple fields, combine them into a single update object instead of sequential calls. This reduces network chatter and hook cascades.
- **Avoid hot-path work**: Keep heavy work out of `update*` hooks and high-frequency handlers (mousemove, keydown). Debounce if you must react to rapid events.
- **Respect cached allow-edit state**: The sheet lock/unlock toggle persists per user. Don’t bypass `Utils.ensureAllowEdit` / `bindAllowEditToggle`; wire new toggles through those helpers.

### Quick checklist for new code
1. Will this update fire on every client? Guard with ownership/GM checks where appropriate.
2. Am I issuing multiple sequential updates to the same document? Batch them.
3. Could this handler run frequently? Add debouncing or early exits.
4. Does the new state differ from current state? Skip the update if not.
5. Will I rerender other sheets? Only rerender owned and currently open sheets.
