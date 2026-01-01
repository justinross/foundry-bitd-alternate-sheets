# Foundry VTT Hook Ownership Patterns

## Multi-Client Hook Execution

In Foundry VTT, hooks fire on **ALL connected clients**, not just the one that initiated the action.

### Example: deleteItem Hook

When a user deletes an item, the `deleteItem` hook fires on:
- The client that deleted the item
- All other connected clients viewing the same world

```javascript
// This hook runs on EVERY client
Hooks.on("deleteItem", (item, options, userId) => {
  // Without guards, this update happens N times (N = number of clients)
  item.parent.update({ ... });
});
```

## Ownership Properties

### item.isOwner
- `true` if current user has OWNER permission on this item
- Use for: Item-specific actions

### item.parent?.isOwner
- `true` if current user owns the parent document (usually an Actor)
- Most common guard for actor updates
- Use for: Updating the actor when an item changes

### actor.isOwner
- `true` if current user owns this actor
- Use for: Actor-specific actions

### game.user.isGM
- `true` if current user is the Game Master
- Use for: World-level changes, compendium updates

## Common Hook Patterns

### Pattern 1: Owner-Only Side Effects

```javascript
Hooks.on("deleteItem", (item, options, userId) => {
  // Only the owner of the parent actor performs the update
  if (!item.parent?.isOwner) return;

  // This now runs once instead of N times
  item.parent.update({ "system.loadout": recalculateLoad() });
});
```

### Pattern 2: GM-Only World Changes

```javascript
Hooks.on("updateActor", (actor, changes, options, userId) => {
  if (!game.user.isGM) return;

  // Only GM updates world state
  game.settings.set("myModule", "lastUpdate", Date.now());
});
```

### Pattern 3: Self-Only Actions (No Broadcast)

```javascript
Hooks.on("renderActorSheet", (sheet, html, data) => {
  // Renders happen per-client automatically
  // No ownership guard needed - each client manages own UI
  html.find(".custom-button").on("click", handleClick);
});
```

## When NOT to Use Ownership Guards

- UI-only changes (no document updates)
- Client-specific state (UI flags, local storage)
- Rendering hooks (each client renders independently)

## Testing Multi-Client Behavior

1. Open two browser windows
2. Log in as different users (or same user in both)
3. Trigger the action (delete item, update actor)
4. Check console in BOTH windows:
   - With guard: Update log appears in ONE window
   - Without guard: Update log appears in BOTH windows (duplicate work)
