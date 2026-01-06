import { Utils } from "./utils.js";

export const MODULE_ID = "bitd-alternate-sheets";

export class Migration {
    static async migrate() {
        const currentVersion = game.settings.get(MODULE_ID, "schemaVersion") || 0;
        const targetVersion = 2;

        if (currentVersion < targetVersion) {
            console.log(`[BitD Alternate Sheets] Starting migration from schema v${currentVersion} to v${targetVersion}`);
            ui.notifications.info(
                "BitD Alternate Sheets: Migrating data, please wait..."
            );

            try {
                // Migrate world actors
                for (const actor of game.actors) {
                    await this.migrateActor(actor, currentVersion);
                }

                // Migrate unlinked token actors in scenes
                for (const scene of game.scenes) {
                    for (const token of scene.tokens) {
                        // Only migrate unlinked tokens (linked tokens use the world actor)
                        if (token.actorLink) continue;
                        if (!token.actor) continue;

                        await this.migrateActor(token.actor, currentVersion);
                    }
                }

                await game.settings.set(MODULE_ID, "schemaVersion", targetVersion);
                ui.notifications.info("BitD Alternate Sheets: Migration complete.");

            } catch (err) {
                console.error("[BitD Alternate Sheets] Critical migration error:", err);
                ui.notifications.error("BitD Alternate Sheets: Migration failed. See console for details.");
            }
        }
    }

    /**
     * Run all applicable migrations for a single actor.
     * Wrapped in try-catch to prevent one actor's failure from blocking others.
     */
    static async migrateActor(actor, currentVersion) {
        if (actor.type !== "character") return;

        try {
            if (currentVersion < 1) {
                // Step 1: Fix Multi-Ability Progress (Orphaned Flags)
                await this.migrateAbilityProgress(actor);

                // Step 2: Fix Equipped Items (Array -> Object)
                await this.migrateEquippedItems(actor);
            }

            if (currentVersion < 2) {
                // Step 3: Migrate healing clock from legacy field
                await this.migrateHealingClock(actor);
            }
        } catch (err) {
            console.error(`[BitD Alternate Sheets] Migration failed for ${actor.name}:`, err);
            ui.notifications.warn(`Migration failed for ${actor.name} - see console`);
        }
    }

    static async migrateEquippedItems(actor) {
        const equipped = actor.getFlag(MODULE_ID, "equipped-items");
        if (Array.isArray(equipped)) {
            const newMap = {};
            for (const i of equipped) {
                if (i && i.id) newMap[i.id] = i;
            }
            await actor.setFlag(MODULE_ID, "equipped-items", newMap);
            console.log(
                `[BitD Alternate Sheets] Migrated equipped items for ${actor.name}`
            );
        }
    }

    static async migrateAbilityProgress(actor) {
        const progressMap =
            actor.getFlag(MODULE_ID, "multiAbilityProgress") || {};
        if (foundry.utils.isEmpty(progressMap)) return;

        let changed = false;
        const updates = {};

        for (const [key, value] of Object.entries(progressMap)) {
            // If the key is not an ID (i.e. it's a name), remove it
            // We assume valid IDs are alphanumeric and at least 16 chars
            // Or we can check if it matches an item ID?
            // Actually, the issue was name-based keys.
            // If we can't find an item with this ID, it might be a name.

            // But wait, we can't easily check if it's a valid ID vs a name just by looking at it
            // consistently.
            // However, we know the new system uses IDs.
            // If the key matches an existing item ID (owned or virtual), keep it.
            // If it doesn't, it's likely garbage (orphaned name or orphaned ID).

            // For now, let's use the logic we discussed:
            // If it's a name-based key, it won't match any ID.
            // But we don't have the list of all valid IDs easily here without reconstructing the sheet data.

            // Simpler approach:
            // If the key contains spaces, it's definitely a name.
            // If the key is short (e.g. "Reflexes"), it's a name.
            // Foundry IDs are 16 chars.

            if (key.length !== 16) {
                updates[`flags.${MODULE_ID}.multiAbilityProgress.-=${key}`] = null;
                changed = true;
            }
        }

        if (changed) {
            await actor.update(updates);
            console.log(
                `[BitD Alternate Sheets] Cleaned up orphaned progress flags for ${actor.name}`
            );
        }
    }

    /**
     * Migrate healing clock data from the legacy field to the current system field.
     *
     * Alt-sheets was incorrectly using `system.healing-clock` while the system
     * changed to `system.healing_clock.value` in v6.0.0. If alt-sheets is the
     * default character sheet, the legacy field is authoritative and should
     * overwrite the current field when they differ.
     */
    static async migrateHealingClock(actor) {
        const legacyValue = actor.system["healing-clock"];
        const currentValue = actor.system.healing_clock?.value;

        // Normalize values for comparison (handle arrays like [2] vs numbers like 2)
        const legacyNum = Array.isArray(legacyValue) ? legacyValue[0] : legacyValue;
        const currentNum = Array.isArray(currentValue) ? currentValue[0] : currentValue;

        // No legacy data to migrate
        if (!legacyNum || legacyNum === 0) return;

        // Values already match, no migration needed
        if (legacyNum === currentNum) return;

        // Check if alt-sheets is the default character sheet
        const altSheet = CONFIG.Actor.sheetClasses?.character?.["bitd-alt.BladesAlternateActorSheet"];
        const isAltSheetsDefault = altSheet?.default === true;

        // If current is empty/zero, always migrate (legacy is the only data)
        // If current has data but alt-sheets is default, migrate (legacy is authoritative)
        if ((!currentNum || currentNum === 0) || isAltSheetsDefault) {
            await actor.update({
                "system.healing_clock.value": legacyValue
            });
            console.log(
                `[BitD Alternate Sheets] Migrated healing clock for ${actor.name}: ${legacyNum} -> system.healing_clock.value`
            );
        }
    }
}
