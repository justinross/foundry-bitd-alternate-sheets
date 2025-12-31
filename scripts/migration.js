import { Utils, MODULE_ID } from "./utils.js";

export class Migration {
    static async migrate() {
        const currentVersion = game.settings.get(MODULE_ID, "schemaVersion") || 0;
        const targetVersion = 1;

        if (currentVersion < targetVersion) {
            ui.notifications.info(
                "BitD Alternate Sheets: Migrating data, please wait..."
            );

            for (const actor of game.actors) {
                if (actor.type !== "character") continue;

                // Step 1: Fix Multi-Ability Progress (Orphaned Flags)
                await this.migrateAbilityProgress(actor);

                // Step 2: Fix Equipped Items (Array -> Object)
                await this.migrateEquippedItems(actor);

                // Step 3: Migrate Legacy Fields (System -> Flags)
                await this.migrateLegacyFields(actor);
            }

            await game.settings.set(MODULE_ID, "schemaVersion", targetVersion);
            ui.notifications.info("BitD Alternate Sheets: Migration complete.");
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
                `BitD Alternate Sheets | Migrated equipped items for ${actor.name}`
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
                `BitD Alternate Sheets | Cleaned up orphaned progress flags for ${actor.name}`
            );
        }
    }

    static async migrateLegacyFields(actor) {
        const updates = {};
        let changed = false;

        // Migrate system.background-details -> flags.bitd-alternate-sheets.background_details
        const oldDetails = foundry.utils.getProperty(actor, "system.background-details");
        const newDetails = actor.getFlag(MODULE_ID, "background_details");

        if (oldDetails && !newDetails) {
            updates[`flags.${MODULE_ID}.background_details`] = oldDetails;
            updates["system.-=background-details"] = null;
            changed = true;
        } else if (oldDetails && newDetails) {
            // Just clean up the old data if both exist (favoring the flag)
            updates["system.-=background-details"] = null;
            changed = true;
        }

        // Migrate system.vice-purveyor -> flags.bitd-alternate-sheets.vice_purveyor
        const oldPurveyor = foundry.utils.getProperty(actor, "system.vice-purveyor");
        const newPurveyor = actor.getFlag(MODULE_ID, "vice_purveyor");

        if (oldPurveyor && !newPurveyor) {
            updates[`flags.${MODULE_ID}.vice_purveyor`] = oldPurveyor;
            updates["system.-=vice-purveyor"] = null;
            changed = true;
        } else if (oldPurveyor && newPurveyor) {
            // Just clean up
            updates["system.-=vice-purveyor"] = null;
            changed = true;
        }

        if (changed) {
            await actor.update(updates);
            console.log(
                `BitD Alternate Sheets | Migrated legacy system fields for ${actor.name}`
            );
        }
    }
}
