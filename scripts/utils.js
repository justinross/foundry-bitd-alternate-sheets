import { BladesAlternateActorSheet } from "./blades-alternate-actor-sheet.js";
import { BladesAlternateCrewSheet } from "./blades-alternate-crew-sheet.js";
import { queueUpdate } from "./lib/update-queue.js";
import { enrichHTML as compatEnrichHTML, deletionUpdate } from "./compat.js";

export const MODULE_ID = "bitd-alternate-sheets";

import { openCardSelectionDialog } from "./lib/dialog-compat.js";
import { Profiler } from "./profiler.js";

// Module-level cache for compendium items to avoid repeated pack.getDocuments() calls
// Cache key format: "itemType|fromCompendia|fromWorld|allPacks"
const _compendiumCache = new Map();

// [core, Deep Cuts] values for items whose numbers Deep Cuts changes, the setting that picks them,
// and the effect change key they apply to
const VAULT_SETTING = [MODULE_ID, "deepCutsVault"];
const DEEP_CUTS_ITEMS = {
  "Vault 1": {
    type: "crew_upgrade",
    setting: VAULT_SETTING,
    key: "vault.max",
    description: ["Adds the Vault providing additional 4 Coin space", "Adds the Vault providing additional 8 Coin space"],
    value: ["4", "8"],
  },
  "Vault 2": {
    type: "crew_upgrade",
    setting: VAULT_SETTING,
    key: "vault.max",
    description: ["Extend the Vault to additional +8 coins", "Extend the Vault to additional +12 coins"],
    value: ["8", "12"],
  },
  "(Hu) Compartments": {
    type: "ability",
    setting: ["blades-in-the-dark", "DeepCutLoad"],
    key: "base_max_load",
    value: ["2", "3"],
  },
};

// Deep Cuts text (p77, p113) for abilities whose load numbers Deep Cuts changes
const DEEP_CUTS_LOAD_TEXT = {
  "(C) Mule": "Your load limits are higher. Discreet: 6. Conspicuous: 8. Encumbered at 9. Max: 10.",
  "(Hu) Compartments": "Your items are built-in to your frame and may recess beneath panels out of sight. Your load limits are +3, and you can carry heavy items while discreet.",
};

// Deep Cuts text for every crew's Rigging upgrade
const DEEP_CUTS_RIGGING_TEXT = "Carry 2 free load of a particular class of item, including a **heavy** item while your load is discreet, if you wish.";

export class Utils {
  /**
   * Generate a cache key that incorporates current settings
   * @param {string} itemType - The item type being cached
   * @returns {string} Cache key
   */
  static _getCacheKey(itemType) {
    const fromCompendia = game.settings.get("bitd-alternate-sheets", "populateFromCompendia");
    const fromWorld = game.settings.get("bitd-alternate-sheets", "populateFromWorld");
    const allPacks = game.settings.get("bitd-alternate-sheets", "searchAllPacks");
    return `${itemType}|${fromCompendia}|${fromWorld}|${allPacks}`;
  }

  /**
   * Invalidate cache entries. If itemType is null, clears all cache.
   * @param {string|null} itemType - Specific type to invalidate, or null for all
   */
  static _invalidateCache(itemType = null) {
    if (itemType === null) {
      _compendiumCache.clear();
    } else {
      // Remove all entries for this item type (any settings combination)
      for (const key of _compendiumCache.keys()) {
        if (key.startsWith(`${itemType}|`)) {
          _compendiumCache.delete(key);
        }
      }
    }
    // Re-render any open alternate sheets so they pick up the changes
    Utils._refreshOpenSheets();
  }

  /**
   * Re-render any open alternate sheets to reflect cache changes
   */
  static _refreshOpenSheets() {
    const openSheets = Object.values(ui.windows).filter(
      (w) => w instanceof BladesAlternateActorSheet || w instanceof BladesAlternateCrewSheet
    );
    if (openSheets.length > 0) {
      for (const sheet of openSheets) {
        sheet.render(false);
      }
    }
  }

  /**
   * Applies fixes for known upstream system module data issues.
   * Called during cache population for Document objects.
   * @param {Document[]} items - Array of items loaded from compendium
   * @returns {Document[]} Items with fixes applied
   */
  static _applySystemDataFixes(items) {
    // Check if patching is enabled
    if (!game.settings.get("bitd-alternate-sheets", "patchSystemData")) {
      return items;
    }

    for (const item of items) {
      if (item.type !== "crew_upgrade") continue;

      // Fix: Ordained missing class field (should be "Cult")
      if (item.name === "(C) Ordained" && item.system?.class === "") {
        item.system.class = "Cult";
      }
    }
    return items;
  }

  /**
   * Sets Deep Cuts item data (Vault 1 / Vault 2 sizes, Compartments' load bonus) to the Deep Cuts values
   * when its setting is on, or back to core when it is off (only where the Deep Cuts values are present).
   * @param {object} itemData - Plain item data (e.g. from toObject())
   * @returns {object} The modified itemData
   */
  static applyDeepCutsChanges(itemData) {
    const entry = DEEP_CUTS_ITEMS[itemData?.name];
    if (!entry || entry.type !== itemData.type) return itemData;
    const on = game.settings.get(...entry.setting);
    const change = itemData.effects?.[0]?.changes?.[0];
    const fields = [
      [itemData.system, "description", entry.description],
      [change?.key?.endsWith(entry.key) && change, "value", entry.value],
    ];
    for (const [target, key, values] of fields) {
      if (!values || target?.[key] === undefined) continue;
      const [core, deepCuts] = values;
      if (on) target[key] = deepCuts;
      else if (target[key] === deepCuts) target[key] = core;
    }
    return itemData;
  }

  /**
   * An ability's description, with the Deep Cuts text when the system's Deep Cuts load setting is on.
   * @param {object} item - Item or item data with name and system.description
   * @returns {string}
   */
  static deepCutsDescription(item) {
    const text = game.settings.get("blades-in-the-dark", "DeepCutLoad") && (DEEP_CUTS_LOAD_TEXT[item.name] ?? (Utils.isRigging(item) && DEEP_CUTS_RIGGING_TEXT));
    return text || item.system.description;
  }

  /**
   * Whether an item is a crew's Rigging upgrade (Assassin, Bravos, Cult, Hawker, Thief, Smuggler Rigging).
   * @param {object} item - Item or item data with name and type
   * @returns {boolean}
   */
  static isRigging(item) {
    return item?.type === "crew_upgrade" && / Rigging$/.test(item.name);
  }

  /**
   * The load Deep Cuts Rigging frees: the carried rigged items' load, up to 2.
   * @param {object} equipped - The equipped-items flag
   * @param {object} rigged - The rigged-items flag (item id: true)
   * @returns {number}
   */
  static riggingFreeLoad(equipped, rigged) {
    const load = Object.keys(rigged).reduce((sum, id) => sum + (parseInt(equipped?.[id]?.load) || 0), 0);
    return Math.min(load, 2);
  }

  /**
   * The Deep Cuts level-1 harm size step, by count: up to 5 full size, 6-7 at 85%, 8 or more at 72%.
   * @param {number} count - Level-1 harms
   * @returns {string} A class for the level-1 list
   */
  static harmShrink(count) {
    return count >= 8 ? "shrink-2" : count >= 6 ? "shrink-1" : "";
  }

  /**
   * Deep Cuts harm (p73) for the sheet. Core harm fields hold the slots core has; the deepCuts flag
   * holds level 1 past two (light), the Tough as Nails level 3 (heavy2), the scar, and the
   * toughed-out marks ("level:name").
   * @param {object} harm - system.harm
   * @param {object} flag - The deepCuts flag
   * @param {boolean} toughAsNails - Whether the character has Tough as Nails
   * @returns {{light: object[], medium: object[], heavy: object[], scar: string, shrink: string}}
   */
  static deepCutsHarm(harm, flag, toughAsNails) {
    const tough = flag?.tough ?? [];
    const slot = (level) => (value) => ({ value: value ?? "", tough: Boolean(value) && tough.includes(`${level}:${value}`) });
    const light = [harm.light.one, harm.light.two, ...(flag?.light ?? [])].filter(Boolean).map(slot(1));
    const heavy = toughAsNails ? [harm.heavy.one, flag?.heavy2] : [harm.heavy.one];
    return {
      light,
      medium: [harm.medium.one, harm.medium.two].map(slot(2)),
      heavy: heavy.map(slot(3)),
      scar: flag?.scar ?? "",
      shrink: Utils.harmShrink(light.length),
    };
  }

  /**
   * The actor update for Deep Cuts harm typed on the sheet: level 1 fills the core slots first, the
   * rest goes to the flag; toughed-out marks whose harm is gone are dropped.
   * @param {{light: string[], medium: string[], heavy: string[]}} values - Inputs per level; heavy[1] only with Tough as Nails
   * @param {string[]} tough - Current toughed-out marks
   * @returns {object}
   */
  static deepCutsHarmUpdate({ light, medium, heavy }, tough = []) {
    const flag = `flags.${MODULE_ID}.deepCuts`;
    const l = light.map((v) => v.trim()).filter(Boolean);
    const present = [...l.map((v) => `1:${v}`), ...medium.map((v) => `2:${v}`), ...heavy.map((v) => `3:${v}`)];
    const update = {
      "system.harm.light.one": l[0] ?? "",
      "system.harm.light.two": l[1] ?? "",
      "system.harm.medium.one": medium[0],
      "system.harm.medium.two": medium[1],
      "system.harm.heavy.one": heavy[0],
      [`${flag}.light`]: l.slice(2),
      [`${flag}.tough`]: tough.filter((t) => present.includes(t)),
    };
    if (heavy.length > 1) update[`${flag}.heavy2`] = heavy[1];
    return update;
  }

  /**
   * The Deep Cuts load level (p77) reached by the load marked.
   * @param {number} loadout - Load marked
   * @param {boolean} mule - Whether the character has Mule
   * @param {number} [bonus=0] - Added to every limit (Compartments: 3)
   * @returns {string} A BITD.* lang key
   */
  static deepCutsLoadLevel(loadout, mule, bonus = 0) {
    const limits = (mule ? [6, 8, 10] : [4, 6, 9]).map((limit) => limit + bonus);
    const i = limits.findIndex((limit) => loadout <= limit);
    return ["BITD.Discreet", "BITD.Conspicuous", "BITD.Encumbered"][i] ?? "BITD.OverMax";
  }

  /**
   * Brings one actor's owned Deep Cuts items (Vaults, Compartments) in line with their settings,
   * then caps the vault coins at the (possibly lower) vault max. Writes only what differs.
   * @param {Actor} actor - An actor the current user may update
   */
  static async syncDeepCuts(actor) {
    for (const item of actor.items.filter((i) => DEEP_CUTS_ITEMS[i.name]?.type === i.type)) {
      const data = Utils.applyDeepCutsChanges(item.toObject());
      if (data.system.description !== item.system.description) {
        await item.update({ "system.description": data.system.description });
      }
      const effect = data.effects?.[0];
      if (!effect) continue;
      for (const current of [item.effects.get(effect._id), ...Utils.legacyEffectCopies(item)]) {
        if (current && JSON.stringify(current.changes) !== JSON.stringify(effect.changes)) {
          await current.update({ changes: effect.changes });
        }
      }
    }
    const { value, max } = actor.system.vault ?? {};
    if (Number(value) > Number(max)) await actor.update({ "system.vault.value": Number(max) });
  }

  /**
   * On v12 (legacy transferral) the actor holds copies of an owned item's effects, and the copies are what apply.
   * Matched like core: by origin, on token actors by the item's last two uuid parts.
   * @param {Item} item - An owned item
   * @returns {ActiveEffect[]} The copies; none on v13
   */
  static legacyEffectCopies(item) {
    const actor = item.parent;
    if (!CONFIG.ActiveEffect.legacyTransferral || !actor) return [];
    const key = (uuid) => (actor.isToken ? uuid.split(".").slice(-2).join(".") : uuid);
    return actor.effects.filter((e) => e.origin && key(e.origin) === key(item.uuid));
  }

  /**
   * Active GM only: syncs every world actor and unlinked token actor with the Deep Cuts settings.
   */
  static async syncDeepCutsWorld() {
    if (!game.users.activeGM?.isSelf) return;
    const tokenActors = game.scenes.contents.flatMap((s) => s.tokens.filter((t) => !t.actorLink).map((t) => t.actor));
    for (const actor of [...game.actors, ...tokenActors]) {
      if (actor) await Utils.syncDeepCuts(actor);
    }
  }

  /**
   * Optional: Pre-cache common item types for faster initial sheet renders
   * Call this from a hook if desired (e.g., ready hook)
   * @param {string[]} types - Array of item types to pre-cache
   */
  static async _preCacheCommonTypes(types = ["heritage", "background", "vice", "ability", "item", "npc", "crew_ability", "crew_upgrade", "class"]) {
    for (const type of types) {
      await Utils.getSourcedItemsByType(type);
    }
  }
  // ... (previous static methods)


  static async getFilteredActors(type, filterPath, filterValue) {
    // 1. Fetch Candidates (World + Compendium based on settings)
    const rawList = await Utils.getSourcedItemsByType(type);

    // 2. Filter Candidates
    const filtered = rawList.filter((a) => {
      const val = foundry.utils.getProperty(a, filterPath ?? "");
      // Loose equality to handle potential string/number mismatches, though unlikely for class strings
      return val === filterValue;
    });

    // 3. Map to Card Format
    return filtered.map((actor) => ({
      _id: actor._id || actor.id,
      name: actor.name,
      img: actor.img || actor.prototypeToken?.texture?.src || "icons/svg/mystery-man.svg",
      type: actor.type,
      system: {
        description: Utils.resolveDescription(actor),
        // Expose potential filtering fields
        associated_crew_type: actor.system.associated_crew_type || actor.system.recruit_type || "",
      },
    }));
  }

  static resolveDescription(entity) {
    if (!entity) return "";
    const system = entity.system || {};
    // Fallback chain: description_short -> description -> notes -> biography
    return (
      system.description_short ||
      system.description ||
      system.notes ||
      system.biography ||
      ""
    );
  }

  /**
   * Identifies duplicate items by type and returns a array of item ids to remove
   *
   * @param {Object} item_data
   * @param {Document} actor
   * @returns {Array}
   *
   */
  static removeDuplicatedItemType(item_data, actor) {
    let dupe_list = [];
    let distinct_types = [
      "crew_reputation",
      "class",
      "vice",
      "background",
      "heritage",
    ];
    let allowed_types = ["item"];
    let should_be_distinct = distinct_types.includes(item_data.type);
    // If the Item has the exact same name - remove it from list.
    // Remove Duplicate items from the array.
    actor.items.forEach((i) => {
      let has_double = item_data.type === i.type;
      if (
        (i.name === item_data.name || (should_be_distinct && has_double)) &&
        !allowed_types.includes(item_data.type) &&
        item_data.id !== i.id
      ) {
        dupe_list.push(i.id);
      }
    });

    return dupe_list;
  }

  static trimClassFromName(name) {
    return name.replace(/\([^)]*\)\ /, "");
  }

  static getAbilityProgressKey(abilityLike) {
    if (!abilityLike) return "";
    return abilityLike._id || abilityLike.id || "";
  }

  static getAbilityProgressKeyFromData(name, id) {
    return id || "";
  }

  static async updateAbilityProgressFlag(actor, key, value) {
    if (!actor || !key) return;
    const normalized = Math.max(0, Number(value) || 0);

    const existingProgress = actor.getFlag(MODULE_ID, "multiAbilityProgress") || {};
    const currentValue = existingProgress?.[key];
    const isRemoval = normalized <= 1;
    if ((isRemoval && currentValue === undefined) || (!isRemoval && currentValue === normalized)) {
      return;
    }

    if (isRemoval) {
      await queueUpdate(() => actor.update({
        [`flags.${MODULE_ID}.multiAbilityProgress.-=${key}`]: null,
      }));
    } else {
      await queueUpdate(() => actor.update({
        [`flags.${MODULE_ID}.multiAbilityProgress.${key}`]: normalized,
      }));
    }
  }

  /**
   * Update crew upgrade progress flag for multi-cost upgrades.
   * Progress is stored until all boxes are checked, at which point the upgrade becomes owned.
   * @param {Actor} actor - The crew actor
   * @param {string} key - Unique key for the upgrade (usually sourceId)
   * @param {number} value - Current progress value (0 to max)
   */
  static async updateCrewUpgradeProgressFlag(actor, key, value) {
    if (!actor || !key) return;
    const normalized = Math.max(0, Number(value) || 0);

    const existingProgress = actor.getFlag(MODULE_ID, "crewUpgradeProgress") || {};
    const currentValue = existingProgress?.[key];
    const isRemoval = normalized === 0;
    if ((isRemoval && currentValue === undefined) || (!isRemoval && currentValue === normalized)) {
      return;
    }

    if (isRemoval) {
      await queueUpdate(() => actor.update({
        [`flags.${MODULE_ID}.crewUpgradeProgress.-=${key}`]: null,
      }));
    } else {
      await queueUpdate(() => actor.update({
        [`flags.${MODULE_ID}.crewUpgradeProgress.${key}`]: normalized,
      }));
    }
  }

  static capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  static isUsingAltSheets(actor) {
    return actor._sheet instanceof BladesAlternateActorSheet;
  }

  static isEffectSuppressed(e) {
    let isSuppressed = false;
    if (e.disabled || e.parent.documentName !== "Actor") return true;
    const [parentType, parentId, documentType, documentId] =
      e.origin?.split(".") ?? [];
    if (
      parentType !== "Actor" ||
      parentId !== e.parent.id ||
      documentType !== "Item"
    )
      return true;
    const item = e.parent.items.get(documentId);
    if (!item) return true;
    const itemData = item;
    // If an item is not equipped, or it is equipped but it requires attunement and is not attuned, then disable any
    // Active Effects that might have originated from it.
    //
    isSuppressed =
      itemData.type !== "class" &&
      itemData.system.equipped !== true &&
      itemData.system.purchased !== true;
    return isSuppressed;
  }

  /**
   * Compares a list of items to those already present on the provided actor and returns a deduped array
   *
   * @param {Object} item_data
   * @param {Document} actor
   * @returns {Array}
   *
   */
  static filterItemsForDuplicatesOnActor(
    item_list,
    type,
    actor,
    check_trimmed_name = false
  ) {
    let deduped_list = [];
    let existing_items = actor.items.filter((i) => i.type === type);

    // If the Item has the exact same name - remove it from list.
    // Remove Duplicate items from the array.
    deduped_list = item_list.filter((new_item) => {
      if (check_trimmed_name) {
        return !existing_items.some(
          (existing) =>
            this.trimClassFromName(new_item.name) ===
            this.trimClassFromName(existing.name)
        );
      } else {
        return !existing_items.some(
          (existing) => new_item.name === existing.name
        );
      }
    });

    return deduped_list;
  }

  /**
   * Returns a list of owned items with the same type as the passed item
   *
   * @param {Object} item_data the item being added
   * @param {Document} actor
   * @returns {Array}
   *
   */
  static getExistingItemsByType(item_data, actor) {
    let ownedItemsOfSameType = actor.items.filter(
      (i) => i.type === item_data.type
    );
    return ownedItemsOfSameType;
  }

  static groupItemsByClass(item_list, generic_last = true) {
    let grouped_items = {};
    let generics = [];
    for (const item of item_list) {
      let itemclass = foundry.utils.getProperty(item, "system.class");
      if (itemclass === "") {
        generics.push(item);
      } else {
        if (
          !(itemclass in grouped_items) ||
          !Array.isArray(grouped_items[itemclass])
        ) {
          grouped_items[itemclass] = [];
        }
        grouped_items[itemclass].push(item);
      }
    }
    if (!generic_last && generics.length > 0) {
      grouped_items["Generic"] = generics;
    }
    let sorted_grouped_items = Object.keys(grouped_items)
      .sort()
      .reduce((obj, key) => {
        obj[key] = grouped_items[key];
        return obj;
      }, {});
    if (generic_last && generics.length > 0) {
      sorted_grouped_items["Generic"] = generics;
    }
    return sorted_grouped_items;
  }

  /**
   * Get a nested dynamic attribute.
   * @param {Object} obj
   * @param {string} property
   */
  static getNestedProperty(obj, property) {
    return property.split(".").reduce((r, e) => {
      return r[e];
    }, obj);
  }

  /**
   * Add item functionality
   */
  // static _addOwnedItem(event, actor) {
  //
  //   event.preventDefault();
  //   const a = event.currentTarget;
  //   const item_type = a.dataset.itemType;
  //
  //   let data = {
  //     name: randomID(),
  //     type: item_type
  //   };
  //   return actor.createEmbeddedDocuments("Item", [data]);
  // }

  static getOwnedObjectByType(actor, type) {
    return actor.items.find((item) => item.type === type);
  }

  /**
   * Get the list of all available ingame items by Type.
   *
   * @param {string} item_type
   * @param {Object} game
   */
  // DEPRECATED: This function bypasses the compendium cache and causes slow uncached
  // pack.getDocuments() calls (~80-100ms each). Use getSourcedItemsByType() instead,
  // which respects module settings and uses the compendium cache.
  // Keeping commented for reference - remove in future version if no issues arise.
  //
  // static async getAllItemsByType(item_type) {
  //   let list_of_items = [];
  //   let world_items = [];
  //   let compendium_items = [];
  //
  //   if (item_type === "npc") {
  //     world_items = game.actors
  //       .filter((e) => e.type === item_type)
  //       .map((e) => {
  //         return e;
  //       });
  //   } else {
  //     world_items = game.items
  //       .filter((e) => e.type === item_type)
  //       .map((e) => {
  //         return e;
  //       });
  //   }
  //
  //   // Handle pluralization for pack lookup
  //   const packName = item_type === "npc" ? "npcs" : item_type;
  //   // Try explicit ID first, then generic name search
  //   let pack = game.packs.get("blades-in-the-dark." + packName) ||
  //     game.packs.get("blades-in-the-dark." + item_type) ||
  //     game.packs.find((e) => e.metadata.name === packName) ||
  //     game.packs.find((e) => e.metadata.name === item_type);
  //
  //   if (pack && typeof pack.getDocuments === "function") {
  //     let compendium_content = await pack.getDocuments();
  //     compendium_items = compendium_content.map((e) => {
  //       return e;
  //     });
  //   }
  //
  //   list_of_items = world_items.concat(compendium_items);
  //   list_of_items.sort(function (a, b) {
  //     let nameA = a.name.toUpperCase();
  //     let nameB = b.name.toUpperCase();
  //     return nameA.localeCompare(nameB);
  //   });
  //   return list_of_items;
  // }

  static async getSourcedItemsByType(item_type) {
    return Profiler.time(`getSourcedItemsByType`, async () => {
      // Check cache first
      const cacheKey = Utils._getCacheKey(item_type);
      if (_compendiumCache.has(cacheKey)) {
        return _compendiumCache.get(cacheKey);
      }

      const populateFromCompendia = game.settings.get(
        "bitd-alternate-sheets",
        "populateFromCompendia"
      );
      const populateFromWorld = game.settings.get(
        "bitd-alternate-sheets",
        "populateFromWorld"
      );
      const searchAllPacks = game.settings.get("bitd-alternate-sheets", "searchAllPacks");
      let limited_items = [];

      // 1. World Items (if enabled)
      if (populateFromWorld) {
        if (item_type === "npc") {
          limited_items = limited_items.concat(game.actors.filter((actor) => actor.type === item_type));
        } else {
          limited_items = limited_items.concat(game.items.filter((item) => item.type === item_type));
        }
      }

      // 2. Compendium Items (if enabled)
      if (populateFromCompendia) {
        if (searchAllPacks) {
          // Universal Scan: Check ALL packs for matching content
          const targetDocName = item_type === "npc" ? "Actor" : "Item";
          for (const pack of game.packs) {
            if (pack.documentName !== targetDocName) continue;

            // Optimization: Check index if available? For now, fetch generic docs to be safe with filtering.
            // Note: fetching all documents from all packs can be slow.
            const docs = await pack.getDocuments();
            const matches = docs.filter(d => d.type === item_type);
            limited_items = limited_items.concat(matches);
          }

        } else {
          // Default System-Only Scan
          const packName = item_type === "npc" ? "npcs" : item_type;
          const pack = game.packs.get("blades-in-the-dark." + packName) ||
            game.packs.get("blades-in-the-dark." + item_type) ||
            game.packs.find((e) => e.metadata.name === packName && e.metadata.packageName === "blades-in-the-dark") ||
            game.packs.find((e) => e.metadata.name === item_type && e.metadata.packageName === "blades-in-the-dark");

          if (pack) {
            const docs = await pack.getDocuments();
            limited_items = limited_items.concat(docs);
          }
        }
      }

      if (!populateFromCompendia && !populateFromWorld) {
        ui.notifications.error(
          `No playbook auto-population source has been selected in the system settings. Please choose at least one source.`
        );
      }
      if (limited_items) {
        limited_items.sort(function (a, b) {
          let nameA = a.name.toUpperCase();
          let nameB = b.name.toUpperCase();
          return nameA.localeCompare(nameB);
        });
      }

      // Apply fixes for known upstream system module data issues
      Utils._applySystemDataFixes(limited_items);

      // Store in cache before returning
      _compendiumCache.set(cacheKey, limited_items);

      return limited_items;
    }, { item_type });
  }

  static async getItemByType(item_type, item_id) {
    // First check world items directly (fast, no compendium fetch needed)
    if (item_type === "npc") {
      const worldItem = game.actors.find(a => a.type === item_type && a.id === item_id);
      if (worldItem) return worldItem;
    } else {
      const worldItem = game.items.find(i => i.type === item_type && i.id === item_id);
      if (worldItem) return worldItem;
    }
    // Fall back to cached sourced items (for compendium items)
    const game_items = await this.getSourcedItemsByType(item_type);
    return game_items.find((item) => item.id === item_id);
  }

  /* -------------------------------------------- */

  /**
   * Returns the label for attribute.
   *
   * @param {string} attribute_name
   * @returns {string}
   */
  static getAttributeLabel(attribute_name) {
    let attribute_labels = {};
    const attributes = game.model.Actor.character.attributes;

    for (const att_name in attributes) {
      attribute_labels[att_name] = attributes[att_name].label;
      for (const skill_name in attributes[att_name].skills) {
        attribute_labels[skill_name] =
          attributes[att_name].skills[skill_name].label;
      }
    }

    return attribute_labels[attribute_name];
  }

  /**
   * Returns true if the attribute is an action
   *
   * @param {string} attribute_name
   * @returns {Boolean}
   */
  static isAttributeAction(attribute_name) {
    const attributes = game.model.Actor.character.attributes;

    return !(attribute_name in attributes);
  }

  /* -------------------------------------------- */

  /**
   * Return an object with base skills/actions for the given playbook name
   *
   * @param {string} playbook_name
   * @returns {object}
   */
  static async getStartingAttributes(playbook_item) {
    let empty_attributes = game.model.Actor.character.attributes;
    //not sure what was getting linked rather than copied in empty_attributes, but the JSON hack below seems to fix the weirdness I was seeing
    let attributes_to_return = foundry.utils.deepClone(empty_attributes);
    try {
      let selected_playbook = await fromUuid(playbook_item.uuid);
      let selected_playbook_base_skills = selected_playbook.system.base_skills;
      for (const [key, value] of Object.entries(empty_attributes)) {
        for (const [childKey, childValue] of Object.entries(value.skills)) {
          if (selected_playbook_base_skills[childKey]) {
            attributes_to_return[key].skills[childKey].value =
              selected_playbook_base_skills[childKey].toString();
          }
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err), { cause: err });

      Hooks.onError("BitD-Alt.GetStartingAttributes", error, {
        msg: "[BitD-Alt]",
        log: "warn",
        notify: null,
        data: { playbookUuid: playbook_item?.uuid }
      });

      ui.notifications.warn("[BitD-Alt] Could not load playbook skills. Using defaults.", {
        console: false
      });
    }
    return attributes_to_return;
  }

  static async getPlaybookName(id) {
    let playbook = await this.getItemByType("class", id);
    if (playbook) {
      return playbook.name;
    } else {
      return "No Playbook";
    }
  }

  /**
   * Enrich a stored notes string the same way the alt character sheet does.
   * @param {Actor} actor
   * @param {string} rawNotes
   * @returns {Promise<string>}
   */
  static async enrichNotes(actor, rawNotes) {
    const notes = rawNotes || "";
    if (!notes) return "";
    const intermediate = await compatEnrichHTML(notes, {
      documents: false,
      async: true,
    });
    return compatEnrichHTML(intermediate, {
      relativeTo: actor,
      secrets: actor.isOwner,
      async: true,
    });
  }

  // NOTE: bindClockControls removed - clock handling now done globally via bindClockHandlers() in hooks.js

  /**
   * Ensure a sheet has a local allow_edit flag initialized.
   * Defaults to the sheet's editable option if unset.
   * @param {DocumentSheet} sheet
   */
  static ensureAllowEdit(sheet) {
    const canEdit = Boolean(
      sheet.options?.editable ?? sheet.isEditable ?? false
    );
    const savedStates =
      game?.user?.getFlag(MODULE_ID, "allowEditStates") || {};
    const key = Utils._getAllowEditKey(sheet);
    const saved = key ? savedStates[key] : undefined;

    if (typeof sheet.allow_edit === "undefined") {
      // Default to locked; allow unlock only when sheet is editable.
      sheet.allow_edit = canEdit && Boolean(saved ?? false);
    } else if (!canEdit && sheet.allow_edit) {
      sheet.allow_edit = false;
    }
    return sheet.allow_edit;
  }

  /**
   * Bind standing toggles for acquaintances (friend/rival/neutral) on a sheet.
   * Saves to the actor and lets Foundry handle re-render.
   * @param {DocumentSheet} sheet
   * @param {JQuery} html
   */
  static bindStandingToggles(sheet, html) {
    html.find(".standing-toggle").off("click").on("click", async (ev) => {
      ev.preventDefault();
      const acqEl = ev.currentTarget.closest(".acquaintance");
      const acqId = acqEl?.dataset?.acquaintance;
      if (!acqId) return;

      const acquaintances = foundry.utils.deepClone(sheet.actor.system?.acquaintances ?? []);
      const idx = acquaintances.findIndex(
        (item) => String(item?.id ?? item?._id ?? "") === String(acqId)
      );
      if (idx === -1) return;

      const standing = (acquaintances[idx].standing ?? "neutral").toString().trim();
      const nextStanding =
        standing === "friend" ? "rival" : standing === "rival" ? "neutral" : "friend";
      acquaintances[idx].standing = nextStanding;

      await queueUpdate(() => sheet.actor.update({ system: { acquaintances } }));
    });
  }

  /**
   * Resizes the XP clock, turning ticks that no longer fit into full clocks so no xp is lost.
   * @param {{value: number, number: number}} expClock - Current system.exp_clock
   * @param {number} size - New segment count
   * @returns {{size: number, value: number, number: number}}
   */
  static resizeExpClock({ value, number }, size) {
    const xp = Number(value) || 0;
    return { size, value: xp % size, number: (Number(number) || 0) + Math.floor(xp / size) };
  }

  /**
   * Click on XP clock segment `tick` (1-based): fill up to it, or clear it when it is the top filled one. Filling the last segment banks a full clock.
   * @param {{size: number, value: number, number: number}} expClock
   * @param {number} tick
   * @returns {{value: number, number: number}}
   */
  static tickExpClock({ size, value, number }, tick) {
    number = Number(number) || 0;
    if (tick === Number(value)) return { value: tick - 1, number };
    if (tick >= size) return { value: 0, number: number + 1 };
    return { value: tick, number };
  }

  /**
   * One xp up or down. Up rolls over into a full clock; down at 0 takes a full clock back.
   * @param {{size: number, value: number, number: number}} expClock
   * @param {1|-1} delta
   * @returns {{value: number, number: number}}
   */
  static stepExpClock({ size, value, number }, delta) {
    const xp = Math.max(0, (Number(number) || 0) * size + (Number(value) || 0) + delta);
    return { value: xp % size, number: Math.floor(xp / size) };
  }

  /**
   * Spend one full XP clock.
   * @param {{value: number, number: number}} expClock
   * @returns {{value: number, number: number}}
   */
  static spendExpClock({ value, number }) {
    return { value, number: Math.max(0, (Number(number) || 0) - 1) };
  }

  /**
   * Bind the Deep Cuts XP clock: click a segment, right-click or arrows to step, spend full clocks, pick the size (4/6/8).
   * @param {DocumentSheet} sheet
   * @param {JQuery} html
   */
  static bindExpClock(sheet, html) {
    const track = html.find(".xp-track");
    if (!track.length) return;
    const clock = () => sheet.actor.system.exp_clock;
    // Read the clock when the queued update runs, so fast repeated clicks or keys each build on the last.
    const save = (next) => queueUpdate(() => sheet.actor.update({ "system.exp_clock": next(clock()) }));
    const hit = track.find(".xp-clock-hit");
    // Keyboard steps re-render the sheet (once per queued update); put focus back on the redrawn control.
    // ponytail: a short time window, not focus tracking; renders within 1.5s of a key press while focus is lost get it back.
    const recent = sheet._xpFocus && Date.now() - sheet._xpFocus.at < 1500;
    const doc = track[0].ownerDocument; // PopOut! may move the sheet to another window
    if (recent && (!doc.activeElement || doc.activeElement === doc.body)) track.find(sheet._xpFocus.sel)[0]?.focus({ preventScroll: true });
    const KEYS = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };

    hit.on("click", "[data-tick]", (ev) => {
      ev.preventDefault();
      const tick = Number(ev.currentTarget.dataset.tick);
      save((c) => Utils.tickExpClock(c, tick));
    });
    hit.on("contextmenu", (ev) => {
      ev.preventDefault();
      save((c) => Utils.stepExpClock(c, -1));
    });
    hit.on("keydown", (ev) => {
      const delta = KEYS[ev.key];
      if (!delta) return;
      ev.preventDefault();
      sheet._xpFocus = { sel: ".xp-clock-hit", at: Date.now() };
      save((c) => Utils.stepExpClock(c, delta));
    });

    const banked = track.find(".xp-banked");
    banked.on("contextmenu", (ev) => {
      ev.preventDefault();
      save(Utils.spendExpClock);
    });
    banked.on("keydown", (ev) => {
      if (ev.key !== "Delete" && ev.key !== "Backspace") return;
      ev.preventDefault();
      sheet._xpFocus = { sel: Number(clock().number) > 1 ? ".xp-banked" : ".xp-clock-hit", at: Date.now() };
      save(Utils.spendExpClock);
    });

    track.find(".xp-size").on("click", "[data-size]", (ev) => {
      ev.preventDefault();
      const size = Number(ev.currentTarget.dataset.size);
      if (size === Number(clock().size)) return;
      save((c) => Utils.resizeExpClock(c, size));
    });
  }

  /**
   * Wire up the lock/unlock toggle to flip allow_edit and rerender.
   * @param {DocumentSheet} sheet
   * @param {JQuery} html
   */
  static bindAllowEditToggle(sheet, html) {
    html.find(".toggle-allow-edit").off("click").on("click", async (event) => {
      event.preventDefault();
      if (!sheet.options?.editable) return;
      // Trigger blur on any active inline-input fields to save their content before re-rendering
      html.find(".inline-input:focus").blur();
      sheet.allow_edit = !sheet.allow_edit;
      await Utils._persistAllowEditState(sheet);
      sheet.render(false);
    });
  }

  static _getAllowEditKey(sheet) {
    return sheet?.actor?.id ?? sheet?.document?.id ?? null;
  }

  static async _persistAllowEditState(sheet) {
    const key = Utils._getAllowEditKey(sheet);
    if (!key) return;
    const user = game?.user;
    if (!user?.setFlag) return;

    const current = user.getFlag(MODULE_ID, "allowEditStates") || {};
    await user.setFlag(MODULE_ID, "allowEditStates", {
      ...current,
      [key]: Boolean(sheet.allow_edit),
    });
  }

  /**
   * Per-actor, per-user persisted UI states (e.g., filters).
   */
  static _getUiStateKey(sheet) {
    return sheet?.actor?.id ?? sheet?.document?.id ?? null;
  }

  static async loadUiState(sheet) {
    const key = Utils._getUiStateKey(sheet);
    if (!key) return {};
    const user = game?.user;
    if (!user?.getFlag) return {};
    const current = user.getFlag(MODULE_ID, "uiStates") || {};
    return current[key] || {};
  }

  static async saveUiState(sheet, state) {
    const key = Utils._getUiStateKey(sheet);
    if (!key) return;
    const user = game?.user;
    if (!user?.setFlag) return;
    const current = user.getFlag(MODULE_ID, "uiStates") || {};
    const next = { ...current, [key]: { ...(current[key] || {}), ...state } };
    await user.setFlag(MODULE_ID, "uiStates", next);
  }

  static async toggleOwnership(state, actor, type, id) {
    if (type == "ability") {
      if (state) {
        let all_of_type = await Utils.getSourcedItemsByType(type);
        let checked_item = all_of_type.find((item) => item.id == id);
        // toObject keeps the ability's effects (e.g. Mule's load bonus).
        const data = Utils.applyDeepCutsChanges(checked_item.toObject());
        delete data._id;
        await queueUpdate(() => actor.createEmbeddedDocuments("Item", [data]));
      } else {
        const ownedDoc = actor.getEmbeddedDocument("Item", id);
        if (ownedDoc) {
          await queueUpdate(() => actor.deleteEmbeddedDocuments("Item", [id]));
          return;
        }

        const item_source = await Utils.getItemByType(type, id);
        const item_source_name = item_source?.name;
        if (!item_source_name) return;

        const matching_owned_item = actor.items.find(
          (item) => item.name === item_source_name
        );
        if (matching_owned_item) {
          await queueUpdate(() => actor.deleteEmbeddedDocuments("Item", [matching_owned_item.id]));
        }
      }
    } else if (type == "item") {
      let equipped_items = await actor.getFlag(
        "bitd-alternate-sheets",
        "equipped-items"
      );

      if (!equipped_items) {
        equipped_items = {};
      }

      let item_blueprint;
      if (actor.items.some((item) => item.id === id)) {
        item_blueprint = actor.items.find((item) => item.id === id);
      } else {
        item_blueprint = await Utils.getItemByType(type, id);
      }

      if (state) {
        // Atomic Add
        const newItem = {
          id: item_blueprint.id,
          load: item_blueprint.system.load,
          name: item_blueprint.name,
        };
        const existing = equipped_items[item_blueprint.id];
        if (
          existing &&
          existing.load === newItem.load &&
          existing.name === newItem.name
        ) {
          return;
        }
        await queueUpdate(() => actor.update({
          [`flags.bitd-alternate-sheets.equipped-items.${item_blueprint.id}`]:
            newItem,
        }));
      } else {
        // For removal, we can use the id directly even if item_blueprint wasn't found
        // (e.g., when the item was already deleted from the actor)
        const itemKey = item_blueprint?.id ?? id;
        if (!equipped_items[itemKey]) return;
        // Atomic Remove
        await queueUpdate(() => actor.update(
          deletionUpdate(`flags.bitd-alternate-sheets.equipped-items.${id}`)
        ));
      }
    }
  }

  static replaceCharacterNamesInDirectoryV12(app, html) {
    const listOfAllCharacterIds = app.documents
      .filter((item) => item.type === "character")
      .map((item) => item._id);
    for (const character of listOfAllCharacterIds) {
      const showPronouns = game.settings.get(
        "bitd-alternate-sheets",
        "showPronounsInCharacterDirectory"
      );
      const showAliasInDirectory = game.actors
        .get(character)
        .getFlag("bitd-alternate-sheets", "showAliasInDirectory");
      let computedName = showAliasInDirectory
        ? game.actors.get(character).system.alias || game.actors.get(character).name
        : game.actors.get(character).name;
      const pronouns = game.actors
        .get(character)
        .getFlag("bitd-alternate-sheets", "pronouns");
      if (showPronouns && pronouns && pronouns !== "Pronouns") {
        computedName = `${computedName} (${pronouns})`;
      }
      let elements = html
        .find(`[data-document-id="${character}"]`)
        .find(".document-name.entry-name");
      elements.each((index, el) => {
        el.innerHTML = `<a>${Handlebars.escapeExpression(computedName)}</a>`;
      });
    }
  }

  static replaceCharacterNamesInDirectoryV13(app, html) {
    const documents = app.options.collection;
    const listOfAllCharacterIds = documents
      .filter((item) => item.type === "character")
      .map((item) => item._id);
    for (const character of listOfAllCharacterIds) {
      const showPronouns = game.settings.get(
        "bitd-alternate-sheets",
        "showPronounsInCharacterDirectory"
      );
      const showAliasInDirectory = game.actors
        .get(character)
        .getFlag("bitd-alternate-sheets", "showAliasInDirectory");
      let computedName = showAliasInDirectory
        ? game.actors.get(character).system.alias || game.actors.get(character).name
        : game.actors.get(character).name;
      const pronouns = game.actors
        .get(character)
        .getFlag("bitd-alternate-sheets", "pronouns");
      if (showPronouns && pronouns && pronouns !== "Pronouns") {
        computedName = `${computedName} (${pronouns})`;
      }
      const elements = html.querySelectorAll(`[data-entry-id="${character}"] .entry-name`);
      elements.forEach((el) => {
        el.innerHTML = `<a>${Handlebars.escapeExpression(computedName)}</a>`;
      });
    }
  }

  static prepIndexForHelper(index) {
    let prepped = {};
    if (index) {
      index.forEach((item) => (prepped[item.id] = item.name));
    }
    return prepped;
  }

  static async checkIfDefault(playbook_name, entity) {
    let custom = false;
    switch (entity.type) {
      case "ability":
        custom = playbook_name === entity.system.class;
        break;
      case "item":
        custom = playbook_name === entity.system.class;
        break;
      case "npc":
        custom = playbook_name === entity.system.associated_class;
        break;
    }
    return custom;
  }

  /**
   * Creates options for faction clocks.
   *
   * @param {int[]} sizes
   *  array of possible clock sizes
   * @param {int} default_size
   *  default clock size
   * @param {int} current_size
   *  current clock size
   * @returns {string}
   *  html-formatted option string
   */
  static createListOfClockSizes(sizes, default_size, current_size) {
    let text = ``;

    sizes.forEach((size) => {
      text += `<option value="${size}"`;
      if (!current_size && size === default_size) {
        text += ` selected`;
      } else if (size === current_size) {
        text += ` selected`;
      }

      text += `>${size}</option>`;
    });

    return text;
  }

  // adds an NPC to the character as an acquaintance of neutral standing
  static async addAcquaintance(actor, acq) {
    let current_acquaintances = actor.system.acquaintances;
    let acquaintance = {
      id: acq.id,
      name: acq.name,
      description_short: acq.system.description_short,
      standing: "neutral",
    };
    let unique_id = !current_acquaintances.some((oldAcq) => {
      return oldAcq.id == acq.id;
    });
    if (unique_id) {
      await queueUpdate(() => actor.update({
        system: { acquaintances: current_acquaintances.concat([acquaintance]) },
      }));
    } else {
      ui.notifications.info(
        "The dropped NPC is already an acquaintance of this character."
      );
    }
  }

  static async addAcquaintanceArray(actor, acqArr) {
    let current_acquaintances = actor.system.acquaintances;
    for (const currAcq of current_acquaintances) {
      acqArr.findSplice((acq) => acq.id == currAcq._id);
    }
    acqArr = acqArr.map((acq) => {
      return {
        id: acq.id,
        name: acq.name,
        description_short: acq.system.description_short,
        standing: "neutral",
      };
    });
    await queueUpdate(() => actor.update({
      system: { acquaintances: current_acquaintances.concat(acqArr) },
    }));
  }

  static async removeAcquaintance(actor, acqId) {
    let current_acquaintances = actor.system.acquaintances;
    let updated_acquaintances = current_acquaintances.filter(
      (acq) => acq._id !== acqId && acq.id !== acqId
    );
    // No-op check: skip if no change
    if (updated_acquaintances.length === current_acquaintances.length) return;
    await queueUpdate(() => actor.update({ system: { acquaintances: updated_acquaintances } }));
  }

  static async removeAcquaintanceArray(actor, acqArr) {
    if (!acqArr?.length) return;

    //see who the current acquaintances are
    let current_acquaintances = actor.system.acquaintances;
    const originalLength = current_acquaintances.length;

    //for each of the passed acquaintances
    for (const currAcq of acqArr) {
      //remove the matching acquaintance from the current acquaintances
      current_acquaintances.findSplice((acq) => acq.id == currAcq.id);
    }
    // No-op check: skip if no change
    if (current_acquaintances.length === originalLength) return;
    await queueUpdate(() => actor.update({ system: { acquaintances: current_acquaintances } }));
  }

  static async getVirtualListOfItems(
    type = "",
    data,
    sort = true,
    filter_playbook = "",
    duplicate_owned_items = false,
    include_owned_items = false
  ) {
    let virtual_list = [];
    let owned_items;
    let all_game_items = await Utils.getSourcedItemsByType(type);
    let sheet_items;

    sheet_items = all_game_items.filter((item) => {
      const itemClass = (item.system.class ?? "").toLowerCase().trim();
      const associatedClass = (item.system.associated_class ?? "").toLowerCase().trim();
      const filterClass = filter_playbook.toLowerCase().trim();

      // "Generic" items appear for all playbooks
      if (itemClass === "generic" || associatedClass === "generic") {
        return true;
      }

      if (item.system.class !== undefined) {
        if (item.system.class === "" && type === "ability") {
          return false;
        } else {
          return itemClass === filterClass;
        }
      } else if (item.system.associated_class) {
        return associatedClass === filterClass;
      } else {
        return false;
      }
    });
    sheet_items.sort((a, b) => {
      if (a.name.includes("Veteran") || b.system.class_default) {
        return 1;
      }
      if (b.name.includes("Veteran") || a.system.class_default) {
        return -1;
      }
      if (a.name === b.name) {
        return 0;
      }
      return Utils.trimClassFromName(a.name) > Utils.trimClassFromName(b.name)
        ? 1
        : -1;
    });
    sheet_items = sheet_items.map((el) => {
      el.system.virtual = true;
      return el;
    });
    if (include_owned_items) {
      owned_items = data.actor.items.filter((item) => {
        item.owned = true;
        return item.type === type;
      });
    } else {
      owned_items = [];
    }
    virtual_list = sheet_items;
    for (const item of owned_items) {
      if (
        duplicate_owned_items ||
        !virtual_list.some((i) => i.name === item.name)
      ) {
        virtual_list.push(item);
      }
    }

    return virtual_list;
  }

  static strip(html) {
    let doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  }

  static convertArrayToBooleanObject(arr) {
    const obj = {};
    for (const key of arr) {
      obj[key] = true;
    }
    return obj;
  }

  static convertBooleanObjectToArray(obj) {
    return Object.keys(obj).filter((key) => obj[key]);
    // if(Array.isArray(obj))
    //
    //   let arr = [];
    //   if(!Array.isArray(object)){
    //     for(const el in object){
    //       if(object[el]){
    //         arr.push(el);
    //       }
    //     }
    //     return arr;
    //   }
    //   else{
    //     // console.log("Can't use convertBooleanObjectToArray on an array. Returning object untouched.");
    //     return object;
    //   }
  }

  // This doesn't work as expected. It hasn't been updated
  static async modifiedFromPlaybookDefault(actor) {
    let skillsChanged = false;
    let newAbilities = false;
    let ownedAbilities = false;
    let relationships = false;
    let acquaintanceList = false;
    let addedItems = false;

    //get the original playbook
    let selected_playbook_source;
    if (actor.system.playbook !== "" && actor.system.playbook) {
      // selected_playbook_source = await game.packs.get("blades-in-the-dark.class").getDocument(this.system.playbook);
      selected_playbook_source = await Utils.getItemByType(
        "class",
        actor.system.playbook
      );

      let startingAttributes = await Utils.getStartingAttributes(
        selected_playbook_source.name
      );
      let currentAttributes = actor.system.attributes;
      //vampire ActiveEffects make this think there's been a change to the base skills, so ignore the exp_max field
      for (const attribute in currentAttributes) {
        currentAttributes[attribute].exp = 0;
        delete currentAttributes[attribute].exp_max;
      }
      for (const attribute in startingAttributes) {
        startingAttributes[attribute].exp = 0;
        delete startingAttributes[attribute].exp_max;
      }
      //check for changes
      //check for exp changes
      for (const attribute in currentAttributes) {
        // console.log("Current attribute: ", currentAttributes[attribute]);
        // console.log("Starting attribute: ", startingAttributes[attribute]);
        // console.log("Current attribute exp: ", currentAttributes[attribute].exp);
        // console.log("Starting attribute exp: ", startingAttributes[attribute].exp);
        if (
          currentAttributes[attribute].exp !== startingAttributes[attribute].exp
        ) {
          skillsChanged = true;
        }
      }

      //check for added abilities
      let all_abilities = await Utils.getSourcedItemsByType("ability");
      if (all_abilities) {
        let pb_abilities = all_abilities.filter(
          (ab) => ab.system.class === selected_playbook_source.name
        );
        let my_abilities = actor.system.items.filter(
          (i) => i.type === "ability"
        );
        for (const ability of my_abilities) {
          if (!pb_abilities.some((ab) => ab.name === ability.name)) {
            newAbilities = true;
          }
          //check for purchased abilities that aren't class defaults
          if (
            ability.system.purchased &&
            ability.system.class_default &&
            ability.system.class ===
            (await Utils.getPlaybookName(actor.system.playbook))
          ) {
            ownedAbilities = true;
          }
        }
      }

      //check for non-default acquaintances
      let all_acquaintances = await Utils.getSourcedItemsByType("npc");
      if (all_acquaintances) {
        let pb_acquaintances = all_acquaintances.filter(
          (acq) => acq.system.associated_class === selected_playbook_source.name
        );
        let my_acquaintances = actor.system.acquaintances;
        for (const my_acq of my_acquaintances) {
          if (
            !pb_acquaintances.some(
              (acq) => acq.id === my_acq.id || acq.id === my_acq._id
            )
          ) {
            acquaintanceList = true;
          }
          //check for acquaintance relationships
          if (my_acq.standing !== "neutral") {
            relationships = true;
          }
        }
      }

      //check for added items
      let all_items = await Utils.getSourcedItemsByType("item");
      if (all_items) {
        let pb_items = all_items.filter(
          (i) => i.system.class === selected_playbook_source.name
        );
        let my_non_generic_items = actor.items.filter(
          (i) => i.type === "item" && i.system.class !== ""
        );
        for (const myNGItem of my_non_generic_items) {
          if (!pb_items.some((i) => i.name === myNGItem.name)) {
            addedItems = true;
          }
        }
      }
    }

    if (
      skillsChanged ||
      newAbilities ||
      ownedAbilities ||
      relationships ||
      acquaintanceList ||
      addedItems
    ) {
      return {
        skillsChanged,
        newAbilities,
        ownedAbilities,
        relationships,
        acquaintanceList,
        addedItems,
      };
    } else {
      return false;
    }
  }

  /**
   * Smart Item Selector Logic (Shared)
   * Enforces singleton pattern for specific item types (Hunting Grounds, Reputation, etc.)
   * Supports custom text values stored in flags when result doesn't match compendium items.
   */
  static async handleSmartItemSelector(event, actor) {
    event.preventDefault();
    const itemType = event.currentTarget.dataset.itemType;
    const label = event.currentTarget.innerText;
    const existingItems = actor.items.filter(i => i.type === itemType);
    const existingItem = existingItems[0] ?? null;

    // Flag keys for custom text storage
    const flagKeyMap = {
      "crew_reputation": "customReputationType",
      "hunting_grounds": "customHuntingGrounds"
    };
    const flagKey = flagKeyMap[itemType];
    const customFlagValue = flagKey ? actor.getFlag(MODULE_ID, flagKey) : null;

    // 1. Fetch options via Utils
    const availableItems = await Utils.getSourcedItemsByType(itemType);

    // 2. Prepare Choices for Card Dialog
    const choices = availableItems.map(i => ({
      value: i._id,
      label: i.name,
      img: i.img || "icons/svg/mystery-man.svg"
    }));

    // 3. Determine Current Value
    // Priority: existing Item name > custom flag value > empty
    const currentName = existingItem?.name ?? customFlagValue ?? "";


    // 4. Open Chooser with custom text support
    const result = await openCardSelectionDialog({
      title: `${game.i18n.localize("bitd-alt.Select")} ${label}`,
      instructions: game.i18n.localize("bitd-alt.SelectToAddItem"),
      okLabel: game.i18n.localize("bitd-alt.Ok"),
      cancelLabel: game.i18n.localize("bitd-alt.Cancel"),
      clearLabel: game.i18n.localize("bitd-alt.Clear"),
      choices: choices,
      currentValue: currentName,
      allowCustomText: true,
      textInputLabel: game.i18n.localize("bitd-alt.CustomValue") || "Custom:",
      textInputPlaceholder: label,
    });

    if (result === undefined) return; // Cancelled

    if (result === null || result === "") {
      // Clear: remove existing Item AND clear custom flag
      const existingIds = existingItems.map(i => i.id);
      try {
        if (existingIds.length > 0) {
          await queueUpdate(() => actor.deleteEmbeddedDocuments("Item", existingIds));
        }
        if (flagKey && customFlagValue) {
          await actor.unsetFlag(MODULE_ID, flagKey);
        }
      } catch (err) {
        ui.notifications.error(`Failed to clear ${label}: ${err.message}`);
        console.error("Clear error:", err);
      }
    } else {
      // Check if result matches a compendium item name
      const matchedItem = availableItems.find(i => i.name === result);

      if (matchedItem) {
        // Result matches compendium item - create/update Item, clear custom flag
        const itemData = {
          name: matchedItem.name,
          type: matchedItem.type,
          system: foundry.utils.deepClone(matchedItem.system ?? {}),
          img: matchedItem.img
        };

        try {
          // Clear custom flag if it exists
          if (flagKey && customFlagValue) {
            await actor.unsetFlag(MODULE_ID, flagKey);
          }

          if (existingItem) {
            // UPDATE existing item
            await queueUpdate(() => actor.updateEmbeddedDocuments("Item", [{
              _id: existingItem.id,
              name: itemData.name,
              system: itemData.system,
              img: itemData.img
            }]));
          } else {
            // CREATE if none exists
            await queueUpdate(() => actor.createEmbeddedDocuments("Item", [itemData]));
          }
        } catch (err) {
          ui.notifications.error(`Failed to set ${label}: ${err.message}`);
          console.error("Item update/create error:", err);
        }
      } else {
        // Custom text - delete Item if exists, store in flag
        try {
          const existingIds = existingItems.map(i => i.id);
          if (existingIds.length > 0) {
            await queueUpdate(() => actor.deleteEmbeddedDocuments("Item", existingIds));
          }

          if (flagKey) {
            await actor.setFlag(MODULE_ID, flagKey, result);
          }
        } catch (err) {
          ui.notifications.error(`Failed to set custom ${label}: ${err.message}`);
          console.error("Custom text save error:", err);
        }
      }
    }

    // Force re-render to ensure UI reflects final state
    if (actor.sheet && actor.sheet.rendered) {
      actor.sheet.render(false);
    }
  }
}

/**
 * Safely updates a document with ownership, no-op, and render-suppression guards.
 * @param {Document} doc - The Foundry document to update
 * @param {object} updateData - The update data object
 * @param {object} options - Additional options passed to update (render: true overrides suppression)
 * @returns {Promise<boolean>} - True if update was performed, false if skipped
 */
export async function safeUpdate(doc, updateData, options = {}) {
  // 1. Ownership guard - only owner should update
  if (!doc?.isOwner) return false;

  // 2. Empty update guard
  const entries = Object.entries(updateData || {});
  if (entries.length === 0) return false;

  // 3. No-op detection - skip if values unchanged
  const hasChange = entries.some(([key, value]) => {
    // Objects always treated as changes (too complex to deep-compare)
    if (value !== null && typeof value === "object") return true;
    const currentValue = foundry.utils.getProperty(doc, key);
    return currentValue !== value;
  });
  if (!hasChange) return false;

  // 4. Queued update (let Foundry handle re-render automatically)
  await queueUpdate(async () => {
    await doc.update(updateData, options);
  });
  return true;
}
