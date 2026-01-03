import { BladesAlternateActorSheet } from "./blades-alternate-actor-sheet.js";
import { queueUpdate } from "./lib/update-queue.js";
import { enrichHTML as compatEnrichHTML } from "./compat.js";
import * as collections from "./utils/collections.js";
import * as textUtils from "./utils/text.js";

export const MODULE_ID = "bitd-alternate-sheets";

import { openCardSelectionDialog } from "./lib/dialog-compat.js";
import { Profiler } from "./profiler.js";

export class Utils {
  // ... (previous static methods)


  static async getFilteredActors(type, filterPath, filterValue) {
    return collections.getFilteredActors(type, filterPath, filterValue);
  }

  /**
   * Resolve a description from an entity's various description fields.
   * Tries description_short -> description -> notes -> biography in order.
   * @param {unknown} entity - The entity (item/actor) to extract description from
   * @returns {string} The resolved description text (empty string if none found)
   */
  static resolveDescription(entity) {
    return textUtils.resolveDescription(entity);
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

  /**
   * Calculate the cost/price of an ability or item.
   * @param {Object} abilityOrItem - An ability or item object with system data
   * @returns {number} The cost (minimum 1)
   */
  static getAbilityCost(abilityOrItem) {
    const raw = abilityOrItem?.system?.price ?? abilityOrItem?.system?.cost ?? 1;
    const parsed = Number(raw);
    if (Number.isNaN(parsed) || parsed < 1) return 1;
    return Math.floor(parsed);
  }

  static async updateAbilityProgressFlag(actor, key, value) {
    if (!actor || !key) return;
    const normalized = Math.max(0, Number(value) || 0);

    const existingProgress =
      foundry.utils.deepClone(
        actor.getFlag(MODULE_ID, "multiAbilityProgress")
      ) || {};

    // Check if update is needed
    if (existingProgress[key] === normalized) return;

    if (normalized === 0) {
      if (existingProgress[key] !== undefined) {
        await actor.update({
          [`flags.${MODULE_ID}.multiAbilityProgress.-=${key}`]: null
        }, { render: false });
      }
    } else {
      await actor.update({
        [`flags.${MODULE_ID}.multiAbilityProgress.${key}`]: normalized
      }, { render: false });
    }
  }

  /**
   * Get the list of added ability slot IDs for an actor.
   * @param {Actor} actor
   * @returns {string[]}
   */
  static getAbilitySlots(actor) {
    return actor?.getFlag(MODULE_ID, "addedAbilitySlots") || [];
  }

  /**
   * Add a source ability ID to the actor's added ability slots.
   * @param {Actor} actor
   * @param {string} sourceId - The source item ID (from compendium/world)
   */
  static async addAbilitySlot(actor, sourceId) {
    if (!actor || !sourceId) return;
    const slots = Utils.getAbilitySlots(actor);
    if (slots.includes(sourceId)) return; // Already exists
    await actor.setFlag(MODULE_ID, "addedAbilitySlots", [...slots, sourceId]);
  }

  /**
   * Remove a source ability ID from the actor's added ability slots.
   * @param {Actor} actor
   * @param {string} sourceId - The source item ID to remove
   */
  static async removeAbilitySlot(actor, sourceId) {
    if (!actor || !sourceId) return;
    const slots = Utils.getAbilitySlots(actor);
    const filtered = slots.filter((id) => id !== sourceId);
    if (filtered.length === slots.length) return; // Nothing to remove
    // Don't suppress render - let Foundry update the sheet with fresh data
    await actor.setFlag(MODULE_ID, "addedAbilitySlots", filtered);
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

  static getOwnedObjectByType(actor, type) {
    return actor.items.find((item) => item.type === type);
  }

  /**
   * Get the list of all available ingame items by Type.
   *
   * @param {string} item_type
   * @param {Object} game
   */
  static async getAllItemsByType(item_type) {
    return collections.getAllItemsByType(item_type);
  }

  /**
   * Get items of a specific type from configured sources (world and/or compendia).
   * Sources are controlled by module settings.
   * @param {string} item_type - The item/actor type (e.g., "ability", "item", "npc")
   * @returns {Promise<Array<unknown>>} Array of matching documents from enabled sources
   */
  static async getSourcedItemsByType(item_type) {
    return collections.getSourcedItemsByType(item_type);
  }

  static async getItemByType(item_type, item_id) {
    let game_items = await this.getAllItemsByType(item_type);
    let item = game_items.find((item) => item.id === item_id);
    return item;
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
      if (!playbook_item) return attributes_to_return;
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
      // Preserve original error as cause when wrapping non-Errors
      const error = err instanceof Error ? err : new Error(String(err), { cause: err });

      // Error funnel: stack traces + ecosystem hooks (no UI notification)
      Hooks.onError("BitD-Alt.GetStartingAttributes", error, {
        msg: "[BitD-Alt]",
        log: "error",
        notify: null,  // Developer-only, no UI spam
        data: {
          context: "GetStartingAttributes",
          playbookUuid: playbook_item?.uuid
        }
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

  // NOTE: Clock controls are now handled globally by setupGlobalClockHandlers() in hooks.js
  // The legacy bindClockControls function has been removed since no img.clockImage elements exist.

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
   * Applies changes locally and saves to the actor without triggering a render.
   * @param {DocumentSheet} sheet
   * @param {JQuery} html
   */
  static bindStandingToggles(sheet, html) {
    const STANDING_CYCLE = { friend: "rival", rival: "neutral", neutral: "friend" };

    const updateIcon = (icon, standing) => {
      if (!icon) return;
      icon.classList.remove("fa-caret-up", "fa-caret-down", "fa-minus", "green-icon", "red-icon");
      switch (standing) {
        case "friend":
          icon.classList.add("fa-caret-up", "green-icon");
          break;
        case "rival":
          icon.classList.add("fa-caret-down", "red-icon");
          break;
        default:
          icon.classList.add("fa-minus");
      }
    };

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
      const nextStanding = STANDING_CYCLE[standing] ?? "friend";
      acquaintances[idx].standing = nextStanding;

      updateIcon(ev.currentTarget, nextStanding);

      await sheet.actor.update({ system: { acquaintances } }, { render: false });
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

  /**
   * Load persisted UI state for a sheet (e.g., collapsed sections, filters).
   * @param {unknown} sheet - The sheet instance
   * @returns {Promise<object>} The persisted UI state object (empty if none saved)
   */
  static async loadUiState(sheet) {
    const key = Utils._getUiStateKey(sheet);
    if (!key) return {};
    const user = game?.user;
    if (!user?.getFlag) return {};
    const current = user.getFlag(MODULE_ID, "uiStates") || {};
    return current[key] || {};
  }

  /**
   * Save UI state for a sheet (e.g., collapsed sections, filters).
   * Merges new state with existing state for the sheet.
   * @param {unknown} sheet - The sheet instance
   * @param {object} state - The state object to merge and persist
   * @returns {Promise<void>}
   */
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
        if (!checked_item) {
          return;
        }
        let added_item = await actor.createEmbeddedDocuments("Item", [
          {
            type: checked_item.type,
            name: checked_item.name,
            system: checked_item.system,
          },
        ], { render: false, renderSheet: false });
      } else {
        const ownedDoc = actor.getEmbeddedDocument("Item", id);
        if (ownedDoc) {
          await actor.deleteEmbeddedDocuments("Item", [id], {
            render: false,
            renderSheet: false,
          });
          return;
        }

        const item_source = await Utils.getItemByType(type, id);
        const item_source_name = item_source?.name;
        if (!item_source_name) return;

        const matching_owned_item = actor.items.find(
          (item) => item.name === item_source_name
        );
        if (matching_owned_item) {
          await actor.deleteEmbeddedDocuments("Item", [matching_owned_item.id], {
            render: false,
            renderSheet: false,
          });
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
      if (!item_blueprint || !item_blueprint.id) return;

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
        await actor.update({
          [`flags.bitd-alternate-sheets.equipped-items.${item_blueprint.id}`]:
            newItem,
        }, { render: false });
      } else {
        const load = item_blueprint.system?.load;
        if (load === 0 || load === "0") {
          await actor.update({
            [`flags.bitd-alternate-sheets.equipped-items.${item_blueprint.id}`]:
              false,
          }, { render: false });
        } else {
          if (!equipped_items[item_blueprint.id]) return;
          // Atomic Remove
          await actor.update({
            [`flags.bitd-alternate-sheets.equipped-items.-=${id}`]: null,
          }, { render: false });
        }
      }
    }
  }

  static replaceCharacterNamesInDirectory(app, html) {
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
        ? game.actors.get(character).system.alias
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
        el.innerHTML = `<a>${computedName}</a>`;
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
      // queueUpdate(()=> {actor.update({system: {acquaintances : current_acquaintances.concat([acquaintance])}});});
      await actor.update({
        system: { acquaintances: current_acquaintances.concat([acquaintance]) },
      });
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
    await actor.update({
      system: { acquaintances: current_acquaintances.concat(acqArr) },
    });
  }

  static async removeAcquaintance(actor, acqId) {
    let current_acquaintances = actor.system.acquaintances;
    let updated_acquaintances = current_acquaintances.filter(
      (acq) => acq._id !== acqId && acq.id !== acqId
    );
    await actor.update({ system: { acquaintances: updated_acquaintances } });
  }

  static async removeAcquaintanceArray(actor, acqArr) {

    //see who the current acquaintances are
    let current_acquaintances = actor.system.acquaintances;

    //for each of the passed acquaintances
    for (const currAcq of acqArr) {
      //remove the matching acquaintance from the current acquaintances
      current_acquaintances.findSplice((acq) => acq.id == currAcq.id);
    }
    // let new_acquaintances = current_acquaintances.filter(acq => acq._id !== acqId && acq.id !== acqId);
    await actor.update({ system: { acquaintances: current_acquaintances } });
  }

  /**
   * Build a virtual list of items combining source items and optionally owned items.
   * Virtual items are plain objects marked with virtual=true and owned flags.
   * @param {string} [type=""] - The item type (e.g., "ability", "item")
   * @param {unknown} data - Sheet data containing actor reference
   * @param {boolean} [sort=true] - Whether to sort the result
   * @param {string} [filter_playbook=""] - Playbook name to filter by
   * @param {boolean} [duplicate_owned_items=false] - Allow duplicates when merging owned items
   * @param {boolean} [include_owned_items=false] - Include actor's owned items in the list
   * @returns {Promise<Array<unknown>>} Array of virtual item objects
   */
  static async getVirtualListOfItems(
    type = "",
    data,
    sort = true,
    filter_playbook = "",
    duplicate_owned_items = false,
    include_owned_items = false
  ) {
    const sourceItems = await this._getFilteredSourceItems(type, filter_playbook);
    const virtualItems = this._mapToVirtualItems(sourceItems, false);

    let mergedList = this._sortVirtualItems(virtualItems, type);

    if (include_owned_items) {
      const ownedItems = this._getFilteredOwnedItems(data.actor, type, filter_playbook);
      const virtualOwned = this._mapToVirtualItems(ownedItems, true);
      mergedList = this._mergeVirtualLists(mergedList, virtualOwned, duplicate_owned_items);
    }

    if (type === "ability" && data.actor) {
      mergedList = await this._addGhostSlotsForAbilities(mergedList, data.actor);
    }

    return mergedList;
  }

  /**
   * Get source items filtered by type and playbook
   * @private
   */
  static async _getFilteredSourceItems(type, filterPlaybook) {
    const allGameItems = await Utils.getSourcedItemsByType(type);

    return allGameItems.filter((item) => {
      if (item.system.class !== undefined) {
        if (item.system.class === "" && type === "ability") {
          return false;
        } else {
          return item.system.class === filterPlaybook;
        }
      } else if (item.system.associated_class) {
        return item.system.associated_class === filterPlaybook;
      } else {
        return false;
      }
    });
  }

  /**
   * Get owned items from actor filtered by type and playbook
   * @private
   */
  static _getFilteredOwnedItems(actor, type, filterPlaybook) {
    return actor.items.filter((item) => {
      if (item.type !== type) return false;
      const itemClass =
        item.system?.class ?? item.system?.associated_class ?? "";

      // Abilities should always be included if owned, regardless of playbook filtering
      if (type === "ability") {
        return true;
      }

      if (filterPlaybook) {
        // When filtering for a playbook, only include owned items that match that playbook
        if (!itemClass || itemClass !== filterPlaybook) return false;
      } else {
        // General list: only include classless items
        if (itemClass) return false;
      }
      return true;
    });
  }

  /**
   * Map items to virtual item format
   * @private
   */
  static _mapToVirtualItems(items, owned) {
    return items.map((item) => {
      // Clone to plain object and mark as virtual
      const data = item.toObject ? item.toObject() : foundry.utils.deepClone(item);
      data._id = item.id;
      if (!data.system) data.system = {};
      data.system.virtual = true;
      data.owned = owned;
      return data;
    });
  }

  /**
   * Sort virtual items according to type-specific rules
   * @private
   */
  static _sortVirtualItems(items, type) {
    const sorted = [...items];
    sorted.sort((a, b) => {
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
    return sorted;
  }

  /**
   * Merge two virtual item lists, optionally allowing duplicates
   * @private
   */
  static _mergeVirtualLists(base, additions, allowDuplicates) {
    const merged = [...base];
    for (const item of additions) {
      if (
        allowDuplicates ||
        !merged.some((i) => i.name === item.name)
      ) {
        merged.push(item);
      }
    }
    return merged;
  }

  /**
   * Add ghost slots for cross-playbook abilities
   * @private
   */
  static async _addGhostSlotsForAbilities(list, actor) {
    const resultList = [...list];

    // Get the live actor document (actor is just the plain sheet data)
    const liveActor = game.actors.get(actor._id);
    if (!liveActor) {
      return resultList;
    }

    const addedSlots = Utils.getAbilitySlots(liveActor);
    const playbookName = liveActor.items.find((i) => i.type === "class")?.name;

    // Fetch ALL abilities (not filtered by playbook) since ghost slots are for cross-playbook abilities
    const allAbilities = await Utils.getSourcedItemsByType("ability");

    for (const slotId of addedSlots) {
      // Fetch the source item from all abilities
      const sourceItem = allAbilities.find((i) => i.id === slotId);
      if (!sourceItem) continue;

      // Skip native playbook abilities (shouldn't happen, but defensive)
      const sourceClass = sourceItem.system?.class ?? sourceItem.system?.associated_class;
      if (sourceClass === playbookName) continue;

      // Check if this ability is already in the list (e.g., as an owned item)
      const existingItem = resultList.find((i) => i.name === sourceItem.name);
      if (existingItem) {
        // Mark it as an added slot so the trashcan appears
        existingItem.addedSlot = true;
        existingItem._sourceId = slotId;
        continue;
      }

      // Create ghost for this slot
      const ghostData = sourceItem.toObject ? sourceItem.toObject() : foundry.utils.deepClone(sourceItem);
      ghostData._id = sourceItem.id;
      ghostData._sourceId = slotId;
      if (!ghostData.system) ghostData.system = {};
      ghostData.system.virtual = true;
      ghostData.owned = false;
      ghostData.addedSlot = true; // Mark as added slot for trashcan visibility
      resultList.push(ghostData);
    }

    return resultList;
  }

  static strip(html) {
    return textUtils.strip(html);
  }

  static convertArrayToBooleanObject(arr) {
    return textUtils.convertArrayToBooleanObject(arr);
  }

  static convertBooleanObjectToArray(obj) {
    return textUtils.convertBooleanObjectToArray(obj);
  }

  /**
   * Smart Item Selector Logic (Shared)
   * Enforces singleton pattern for specific item types (Hunting Grounds, Reputation, etc.)
   */
  static async handleSmartItemSelector(event, actor) {
    event.preventDefault();
    const itemType = event.currentTarget.dataset.itemType;
    const label = event.currentTarget.innerText;
    const existingItems = actor.items.filter(i => i.type === itemType);
    const existingItem = existingItems[0] ?? null;

    // 1. Fetch options via Utils
    const availableItems = await Utils.getSourcedItemsByType(itemType);

    // 2. Prepare Choices for Card Dialog
    const choices = availableItems.map(i => ({
      value: i._id,
      label: i.name,
      img: i.img || "icons/svg/mystery-man.svg"
    }));

    // 3. Determine Current Value (if any)
    const currentValue = existingItem ? existingItem.name : ""; // Use ID if possible? Source items have different IDs than owned. Match by Name usually safer for Compendium vs World? 
    // Wait, the "Unique" rule means we likely want to match by Source ID if we tracked it, but we don't always. 
    // And standard `availableItems` are the *Source* items. 
    // If I select "Docks", I want "Docks" to be selected. The `value` is the Source ID.
    // The owned item has a different ID. 
    // BUT we can match by NAME? `dialog-compat` expects `value` match.
    // Let's try to match by Name -> Find Source ID.
    const currentName = existingItem?.name;
    const currentSourceId = availableItems.find(i => i.name === currentName)?._id ?? "";


    // 4. Open Chooser
    const result = await openCardSelectionDialog({
      title: `${game.i18n.localize("bitd-alt.Select")} ${label}`,
      instructions: game.i18n.localize("bitd-alt.SelectToAddItem"),
      okLabel: game.i18n.localize("bitd-alt.Ok"),
      cancelLabel: game.i18n.localize("bitd-alt.Cancel"),
      clearLabel: game.i18n.localize("bitd-alt.Clear"),
      choices: choices,
      currentValue: currentSourceId
    });

    if (result === undefined) return; // Cancelled

    if (result === null) {
      // Clear: remove existing singleton entry (cannot represent "none" via update)
      const existingIds = existingItems.map(i => i.id);
      if (existingIds.length > 0) {
        try {
          await actor.deleteEmbeddedDocuments("Item", existingIds);
        } catch (err) {
          // Preserve original error as cause when wrapping non-Errors
          const error = err instanceof Error ? err : new Error(String(err), { cause: err });

          // Error funnel: stack traces + ecosystem hooks (no UI)
          Hooks.onError("BitD-Alt.ItemDeletion", error, {
            msg: "[BitD-Alt]",
            log: "error",
            notify: null,
            data: {
              context: "ItemDeletion",
              itemType: itemType,
              label: label,
              actorId: actor.id
            }
          });

          // Fully controlled user message (sanitized, no console - already logged)
          ui.notifications.error(`[BitD-Alt] Failed to remove ${label}`, {
            clean: true,
            console: false
          });
        }
      }
    } else {
      const selectedId = result;
      const selectedItem = availableItems.find(i => i._id === selectedId);

      if (selectedItem) {
        // Prepare data from selected source item
        const itemData = {
          name: selectedItem.name,
          type: selectedItem.type,
          system: foundry.utils.deepClone(selectedItem.system ?? {}),
          img: selectedItem.img
        };

        // Check for existing item to update-in-place
        try {
          if (existingItem) {
            // UPDATE existing item (Atomic, no race condition, no empty gap)
            await actor.updateEmbeddedDocuments("Item", [{
              _id: existingItem.id,
              name: itemData.name,
              system: itemData.system,
              img: itemData.img
            }]);
          } else {
            // CREATE if none exists
            await actor.createEmbeddedDocuments("Item", [itemData]);
          }
        } catch (err) {
          // Preserve original error as cause when wrapping non-Errors
          const error = err instanceof Error ? err : new Error(String(err), { cause: err });

          // Error funnel: stack traces + ecosystem hooks (no UI)
          Hooks.onError("BitD-Alt.ItemSet", error, {
            msg: "[BitD-Alt]",
            log: "error",
            notify: null,
            data: {
              context: "ItemSet",
              itemType: itemType,
              label: label,
              actorId: actor.id,
              operation: existingItem ? "update" : "create"
            }
          });

          // Fully controlled user message (sanitized, no console - already logged)
          ui.notifications.error(`[BitD-Alt] Failed to set ${label}`, {
            clean: true,
            console: false
          });
        }
      }
    }

    // Force re-render to ensure UI reflects final state
    if (actor.sheet && actor.sheet.rendered) {
      actor.sheet.render(false);
    }
  }

  /**
   * Attach plain-text paste and single-line enforcement to contenteditable fields.
   * @param {JQuery} html - root jQuery element for the sheet.
   */
  static bindContenteditableSanitizers(html) {
    if (!html || typeof html.find !== "function") return;
    const $fields = html.find('*[contenteditable="true"]');
    $fields.on("paste", (e) => {
      e.preventDefault();
      const text = (e.originalEvent || e).clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    });
    $fields.on("keydown", (e) => {
      if (e.which === 13) {
        e.preventDefault();
        $(e.target).blur();
      }
    });
  }

  /**
   * Bind toggle-filter click handlers with provided per-target callbacks.
   * @param {JQuery} html
   * @param {Object<string, Function>} handlers
   */
  static bindFilterToggles(html, handlers = {}) {
    if (!html || typeof html.find !== "function") return;
    html.find('[data-action="toggle-filter"]').off("click").on("click", (ev) => {
      ev.preventDefault();
      const target = ev.currentTarget?.dataset?.filterTarget;
      if (!target || typeof handlers[target] !== "function") return;
      handlers[target](ev);
    });
  }

  /**
   * Bind collapse toggles for sections and persist UI state.
   * @param {JQuery} html
   * @param {DocumentSheet} sheet
   */
  static bindCollapseToggles(html, sheet) {
    if (!html || typeof html.find !== "function" || !sheet) return;
    html.find('[data-action="toggle-section-collapse"]').off("click").on("click", (ev) => {
      ev.preventDefault();
      const sectionKey = ev.currentTarget?.dataset?.sectionKey;
      if (!sectionKey) return;
      const section = ev.currentTarget.closest(".section-block");
      if (!section) return;
      const icon = ev.currentTarget.querySelector("i");
      const isCollapsed = section.classList.toggle("collapsed");
      if (icon) {
        icon.classList.toggle("fa-caret-right", isCollapsed);
        icon.classList.toggle("fa-caret-down", !isCollapsed);
      }
      sheet.collapsedSections = {
        ...(sheet.collapsedSections || {}),
        [sectionKey]: isCollapsed,
      };
      Utils.saveUiState(sheet, { collapsedSections: sheet.collapsedSections });
    });
  }
}
