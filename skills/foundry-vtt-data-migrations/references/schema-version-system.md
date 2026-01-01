# Foundry VTT Schema Version System

## Overview

Foundry modules use a schema version system to track data structure changes and run migrations exactly once per world.

## Schema Version Setting

### Registration

```javascript
// In scripts/settings.js (or wherever settings are registered)
game.settings.register("my-module", "schemaVersion", {
  name: "Schema Version",
  scope: "world",        // Stored per-world, not per-client
  config: false,         // Hidden from settings UI
  type: Number,
  default: 0,            // 0 = never migrated
});
```

**Key properties:**
- `scope: "world"` - Shared across all clients (not per-user)
- `config: false` - Hidden from module settings UI
- `default: 0` - New worlds start at version 0

### Access

```javascript
// Get current schema version
const currentVersion = game.settings.get("my-module", "schemaVersion") || 0;

// Set new schema version (after migration completes)
await game.settings.set("my-module", "schemaVersion", 2);
```

## Migration Lifecycle

### When Migrations Run

```
Foundry Startup
    ↓
World Loaded
    ↓
'init' hook fires → Settings registered
    ↓
'ready' hook fires → Migration.migrate() called
    ↓
Check: currentVersion < targetVersion?
    ↓ YES (first time)
Run migrations
Set schemaVersion = targetVersion
    ↓ NO (already migrated)
Skip migration
```

### Hook Registration

```javascript
// In scripts/module.js (or main entry point)
import { Migration } from "./migration.js";

Hooks.once("ready", async function () {
  // Settings already registered in 'init' hook
  // Now safe to read schemaVersion and run migrations
  await Migration.migrate();
});
```

**Why 'ready' hook?**
- Settings are registered in 'init' hook
- World data is fully loaded
- Game actors/items are available
- Runs once per world load
- Runs on ALL connected clients (but migration should guard with ownership checks)

## Version Comparison Logic

### Basic Pattern

```javascript
export class Migration {
    static async migrate() {
        const currentVersion = game.settings.get(MODULE_ID, "schemaVersion") || 0;
        const targetVersion = 3;  // Latest version

        if (currentVersion < targetVersion) {
            // Run migrations
            await this.runMigrations();
            await game.settings.set(MODULE_ID, "schemaVersion", targetVersion);
        }
    }
}
```

### Version States

| Current | Target | Action |
|---------|--------|--------|
| 0 | 3 | Run ALL migrations (v1, v2, v3) |
| 1 | 3 | Run migrations v2, v3 |
| 2 | 3 | Run migration v3 only |
| 3 | 3 | Skip (already current) |

### Incremental Migration Pattern

```javascript
static async migrate() {
    const currentVersion = game.settings.get(MODULE_ID, "schemaVersion") || 0;
    const targetVersion = 3;

    if (currentVersion < targetVersion) {
        ui.notifications.info("My Module: Migrating data...");

        // Run migrations incrementally based on current version
        if (currentVersion < 1) {
            await this.migrateToV1();
        }
        if (currentVersion < 2) {
            await this.migrateToV2();
        }
        if (currentVersion < 3) {
            await this.migrateToV3();
        }

        await game.settings.set(MODULE_ID, "schemaVersion", targetVersion);
        ui.notifications.info("Migration complete.");
    }
}
```

**When to use incremental:**
- Migrations have dependencies (v2 depends on v1 completing first)
- Want to skip already-completed migrations on partial upgrades
- Complex multi-version upgrade paths

### All-at-Once Pattern (Simpler)

```javascript
static async migrate() {
    const currentVersion = game.settings.get(MODULE_ID, "schemaVersion") || 0;
    const targetVersion = 3;

    if (currentVersion < targetVersion) {
        ui.notifications.info("My Module: Migrating data...");

        for (const actor of game.actors) {
            if (actor.type !== "character") continue;

            // All migrations run regardless of currentVersion
            await this.migrateEquippedItems(actor);      // From v1
            await this.migrateAbilityProgress(actor);    // From v2
            await this.migrateLegacyFields(actor);       // From v3
        }

        await game.settings.set(MODULE_ID, "schemaVersion", targetVersion);
        ui.notifications.info("Migration complete.");
    }
}
```

**When to use all-at-once:**
- Migrations are idempotent (safe to run multiple times)
- Each migration checks if work is needed before acting
- Simpler code structure
- **This is the pattern used in BitD Alternate Sheets**

## Version Numbering Strategy

### Sequential Numbering

```
v0 → Initial state (no migrations run)
v1 → First migration (equipped items array → object)
v2 → Second migration (ability progress cleanup)
v3 → Third migration (legacy fields system → flags)
```

**Rules:**
- Always increment by 1
- Never skip numbers
- Never decrement
- Never reuse numbers

### When to Increment

**Increment `targetVersion` when adding a NEW migration:**

```javascript
// Before (targetVersion = 2)
static async migrate() {
    const targetVersion = 2;
    // ...
    await this.migrateEquippedItems(actor);
    await this.migrateAbilityProgress(actor);
}

// After adding new migration (targetVersion = 3)
static async migrate() {
    const targetVersion = 3;  // ← INCREMENT
    // ...
    await this.migrateEquippedItems(actor);
    await this.migrateAbilityProgress(actor);
    await this.migrateLegacyFields(actor);  // ← NEW
}
```

## Multi-Client Behavior

### Migration Runs on All Clients

```
World with 3 connected clients:
    ↓
Client A loads → ready hook → Migration.migrate()
    ↓
Client B loads → ready hook → Migration.migrate()
    ↓
Client C loads → ready hook → Migration.migrate()
```

**Problem:** All clients try to migrate at the same time!

### Solution: First-Client-Wins Pattern

The first client to run the migration sets `schemaVersion`, so subsequent clients skip:

```
Timeline:
T0: All clients at schemaVersion = 0
T1: Client A checks: 0 < 3? YES → starts migration
T2: Client B checks: 0 < 3? YES → starts migration (race!)
T3: Client A finishes, sets schemaVersion = 3
T4: Client B still migrating... (duplicate work)
T5: Client C loads, checks: 3 < 3? NO → skips (good!)
```

**This is usually OK because:**
- Migrations are idempotent (check before acting)
- `actor.update()` calls are queued (see performance-safe-updates skill)
- Duplicate work is wasted but not harmful

**Optional improvement:** GM-only migration guard

```javascript
static async migrate() {
    // Only GM runs migrations
    if (!game.user.isGM) return;

    const currentVersion = game.settings.get(MODULE_ID, "schemaVersion") || 0;
    const targetVersion = 3;

    if (currentVersion < targetVersion) {
        // Only one client (GM) does migration work
        // ...
    }
}
```

## Idempotent Migration Pattern

Make migrations safe to run multiple times:

```javascript
static async migrateEquippedItems(actor) {
    const equipped = actor.getFlag(MODULE_ID, "equipped-items");

    // CHECK: Is migration needed?
    if (!Array.isArray(equipped)) {
        // Already migrated (or doesn't exist)
        return;
    }

    // SAFE: Transform and update
    const newMap = {};
    for (const item of equipped) {
        if (item?.id) {
            newMap[item.id] = item;
        }
    }

    await actor.setFlag(MODULE_ID, "equipped-items", newMap);
}
```

**Idempotent checklist:**
- Check if old format exists before migrating
- Check if new format already exists before creating
- Return early if no work needed
- Safe to run twice (second run does nothing)

## Testing Schema Version Behavior

### Force Re-Migration

```javascript
// In browser console
await game.settings.set("my-module", "schemaVersion", 0);

// Reload world or manually trigger:
await Migration.migrate();
```

### Check Current Version

```javascript
// In browser console
const version = game.settings.get("my-module", "schemaVersion");
console.log(`Current schema version: ${version}`);
```

### Verify Version Updated

```javascript
// Before migration
console.log(game.settings.get("my-module", "schemaVersion"));  // 0

// Trigger migration
await Migration.migrate();

// After migration
console.log(game.settings.get("my-module", "schemaVersion"));  // 3
```

## Common Pitfalls

### ❌ Forgetting to Increment targetVersion

```javascript
// Added new migration but forgot to increment
static async migrate() {
    const targetVersion = 2;  // Should be 3!
    // ...
    await this.migrateNewFeature(actor);  // Never runs!
}
```

**Result:** New migration never runs because `currentVersion (2) >= targetVersion (2)`

### ❌ Setting Version Before Migration Completes

```javascript
// BAD: Set version too early
static async migrate() {
    if (currentVersion < targetVersion) {
        await game.settings.set(MODULE_ID, "schemaVersion", targetVersion);
        await this.runMigrations();  // Error here = version set but migration incomplete!
    }
}

// GOOD: Set version after migration completes
static async migrate() {
    if (currentVersion < targetVersion) {
        await this.runMigrations();
        await game.settings.set(MODULE_ID, "schemaVersion", targetVersion);
    }
}
```

### ❌ Not Handling Errors

```javascript
// BAD: Error leaves version stuck at old value
static async migrate() {
    if (currentVersion < targetVersion) {
        await this.runMigrations();  // Throws error
        await game.settings.set(MODULE_ID, "schemaVersion", targetVersion);  // Never reached
    }
}

// GOOD: Set version even if some migrations fail
static async migrate() {
    if (currentVersion < targetVersion) {
        try {
            await this.runMigrations();
        } catch (err) {
            console.error("Migration failed:", err);
        }
        // Always update version to prevent infinite retry loop
        await game.settings.set(MODULE_ID, "schemaVersion", targetVersion);
    }
}
```

## Version History Documentation

Consider maintaining a migration log:

```javascript
/**
 * Migration history:
 * v0 → v1: Migrate equipped-items from array to object
 * v1 → v2: Clean up orphaned ability progress flags
 * v2 → v3: Migrate legacy system fields to flags
 */
export class Migration {
    static async migrate() {
        const currentVersion = game.settings.get(MODULE_ID, "schemaVersion") || 0;
        const targetVersion = 3;
        // ...
    }
}
```

**Benefits:**
- Helps understand what each version change did
- Useful for debugging migration issues
- Documents when breaking changes occurred
