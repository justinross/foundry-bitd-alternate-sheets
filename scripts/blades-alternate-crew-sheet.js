import { BladesCrewSheet as SystemCrewSheet } from "../../../systems/blades-in-the-dark/module/blades-crew-sheet.js";
import { Utils, MODULE_ID } from "./utils.js";
import { Profiler } from "./profiler.js";
import { queueUpdate } from "./lib/update-queue.js";

/**
 * Alternate crew sheet that mirrors the functionality of the system sheet
 * while adding full ability/upgrade catalogs with checkboxes (like the
 * alternate character sheet).
 */
export class BladesAlternateCrewSheet extends SystemCrewSheet {
  /** @override */
  static get defaultOptions() {
    const baseClasses = super.defaultOptions?.classes ?? [];
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [...new Set([...baseClasses, "blades-alt"])],
      template: "modules/bitd-alternate-sheets/templates/crew-sheet.html",
      width: 900,
      height: 940,
      tabs: [
        { navSelector: ".tabs", contentSelector: ".tab-content", initial: "turfs" },
      ],
    });
  }

  /** @override */
  async getData(options) {
    const getDataStart = performance.now();
    const sheetData = await super.getData(options);
    Utils.ensureAllowEdit(this);
    const persistedUi = await Utils.loadUiState(this);
    if (typeof this.showFilteredAcquaintances === "undefined") {
      this.showFilteredAcquaintances = Boolean(
        persistedUi.showFilteredAcquaintances
      );
    }
    this.collapsedSections =
      this.collapsedSections ||
      persistedUi.collapsedSections ||
      {};
    // Restore minimized state from persisted UI (matches character sheet behavior)
    if (typeof this.sheetMinimized === "undefined") {
      this.sheetMinimized = Boolean(persistedUi.sheetMinimized);
    }
    // The system sheet returns a data object; mirror actor/system for template parity.
    sheetData.actor = sheetData.data ?? sheetData.actor ?? this.actor;
    sheetData.system = sheetData.system ?? this.actor.system;
    sheetData.editable = this.options.editable;
    sheetData.allow_edit = this.allow_edit;

    // Cache selected crew type (if present) to contextualize ability/upgrade lists.
    const crewTypeItem = this.actor.items.find((item) => item.type === "crew_type");
    const crewTypeName = crewTypeItem?.name ?? "";
    sheetData.selected_crew_type = crewTypeItem ?? null;

    sheetData.available_crew_abilities = await this._buildChoiceList(
      "crew_ability",
      crewTypeName
    );
    sheetData.available_crew_upgrades = await this._buildChoiceList(
      "crew_upgrade",
      crewTypeName
    );
    sheetData.collapsedSections = this.collapsedSections;

    // Notes content - use system.description for compatibility with base system sheets
    // Migrate from old flag storage if needed (append to preserve both)
    const flagNotes = this.actor.getFlag(MODULE_ID, "notes");
    if (flagNotes) {
      const existingNotes = this.actor.system.description || "";
      const mergedNotes = existingNotes ? `${existingNotes}\n\n${flagNotes}` : flagNotes;
      console.log(`${MODULE_ID} | Migrating notes from flag to system.description for ${this.actor.name}`);
      await this.actor.update({ "system.description": mergedNotes });
      await this.actor.unsetFlag(MODULE_ID, "notes");
    }
    const rawNotes = this.actor.system.description || "";
    sheetData.notes = await Utils.enrichNotes(this.actor, rawNotes);

    // Custom text values for smart fields (used when no compendium item is selected)
    sheetData.customReputationType = this.actor.getFlag(MODULE_ID, "customReputationType") || "";
    sheetData.customHuntingGrounds = this.actor.getFlag(MODULE_ID, "customHuntingGrounds") || "";

    const acquaintanceList = Array.isArray(sheetData.system?.acquaintances)
      ? sheetData.system.acquaintances
      : [];
    const filteredAcqs = this.showFilteredAcquaintances
      ? acquaintanceList.filter((acq) => {
        const standing = (acq?.standing ?? "").toString().trim().toLowerCase();
        return standing === "friend" || standing === "rival";
      })
      : acquaintanceList;
    sheetData.display_acquaintances = filteredAcqs;
    sheetData.showFilteredAcquaintances = this.showFilteredAcquaintances;

    Profiler.log("CrewSheet.getData", {
      duration: performance.now() - getDataStart,
      actor: this.actor?.name,
    });
    return sheetData;
  }

  /**
   * Build a complete list of candidate items (abilities/upgrades) with ownership markers.
   */
  async _buildChoiceList(type, crewTypeName) {
    const sources = (await Utils.getSourcedItemsByType(type)) ?? [];
    const owned = this.actor.items.filter((item) => item.type === type);
    const selectedCrewKey =
      this.actor.items.find((item) => item.type === "crew_type")?.system
        ?.class || crewTypeName;
    const normalizeKey = (value) =>
      (value ?? "").toString().trim().toLowerCase();
    this._virtualUpgradeSources = this._virtualUpgradeSources || new Map();
    if (type !== "crew_upgrade") {
      this._virtualUpgradeSources.clear();
    }
    // Get progress flag for partial crew upgrade progress
    const upgradeProgress = type === "crew_upgrade"
      ? (this.actor.getFlag("bitd-alternate-sheets", "crewUpgradeProgress") || {})
      : {};
    // Manual fixes for missing crew metadata in system packs (e.g., Ritual Sanctum lacks crew type).
    const resolveManualCrewType = (normalizedName) => {
      if (!normalizedName) return null;
      if (normalizedName.includes("ritual sanctum")) return normalizeKey("Cult");
      return null;
    };
    const abilityCostFor = (item) => {
      const raw = item?.system?.price ?? item?.system?.cost ?? 1;
      const parsed = Number(raw);
      if (Number.isNaN(parsed) || parsed < 1) return 1;
      return Math.floor(parsed);
    };
    const normalizeBoxes = (sourceItem, ownedItem) => {
      const sourceBoxes = sourceItem?.system?.boxes ?? {};
      const ownedBoxes = ownedItem?.system?.boxes ?? {};
      const maxFromOwned = Number(ownedBoxes.max) || 0;
      const maxFromSource = Number(sourceBoxes.max) || 0;
      const fallbackMax = abilityCostFor(sourceItem);
      const max = Math.max(maxFromOwned, maxFromSource, fallbackMax, 1);
      // For crew upgrades: owned item means fully purchased (max), otherwise check progress flag
      let valueRaw;
      if (ownedItem) {
        // Owned = fully purchased = max value
        valueRaw = max;
      } else if (type === "crew_upgrade" && upgradeProgress[sourceItem?.id]) {
        // Partial progress from flag
        valueRaw = upgradeProgress[sourceItem?.id];
      } else {
        valueRaw = 0;
      }
      const value = Math.max(
        0,
        Math.min(Number(valueRaw) || 0, max)
      );
      return { max, value };
    };
    const matchesCrewType = (item) => {
      const keyRaw =
        foundry.utils.getProperty(item, "system.class") ??
        foundry.utils.getProperty(item, "system.crew_type") ??
        "";
      const normalizedItemName = normalizeKey(item?.name ?? "");
      const manualKey = resolveManualCrewType(normalizedItemName);
      const normalizedItemKey = manualKey || normalizeKey(keyRaw);
      const normalizedCrewKey = normalizeKey(selectedCrewKey);
      if (!normalizedCrewKey) return false;
      if (!normalizedItemKey || normalizedItemKey === "generic") return true;
      return normalizedItemKey === normalizedCrewKey;
    };

    let filteredSources = sources;
    if (type === "crew_upgrade") {
      const isCohortUpgrade = (name) => name.includes("cohort");
      const isPersonalTraining = (name) =>
        name === "training: personal exp";
      filteredSources = sources.filter((item) => {
        const normName = normalizeKey(item?.name ?? "");
        if (isCohortUpgrade(normName)) return false;
        if (isPersonalTraining(normName)) return false;
        return true;
      });

      // Inject explicit 2-cost cohort upgrades to replace multiple cohort variants from the system packs.
      this._virtualUpgradeSources.clear();
      const makeVirtual = (id, name, description) => {
        const system = {
          description,
          price: 2,
          cost: 2,
          boxes: { max: 2, value: 0 },
        };
        const virtual = {
          id,
          _id: id,
          type: "crew_upgrade",
          name,
          img: "icons/svg/sun.svg",
          system,
        };
        this._virtualUpgradeSources.set(id, virtual);
        return virtual;
      };
      const virtualUpgrades = [
        makeVirtual(
          "virtual-upgrade-cohort-new",
          "Cohort: New",
          "Gain a new cohort (costs 2 upgrades)."
        ),
        makeVirtual(
          "virtual-upgrade-cohort-add-type",
          "Cohort: Add Type",
          "Give an existing cohort an additional type (costs 2 upgrades)."
        ),
      ];
      filteredSources = [...filteredSources, ...virtualUpgrades];
    }

    return filteredSources
      .filter((item) => matchesCrewType(item))
      .map((item) => {
        const ownedMatch =
          owned.find((o) => o.id === item.id) ??
          owned.find((o) => o.name === item.name);
        const boxes = normalizeBoxes(item, ownedMatch);
        const normalizedItemName = normalizeKey(item?.name ?? "");
        const manualKey = resolveManualCrewType(normalizedItemName);
        return {
          id: item.id,
          _id: item.id,
          name: item.name,
          img: item.img,
          system: {
            ...item.system,
            class: manualKey ?? item.system?.class,
          },
          ownedId: ownedMatch?.id ?? "",
          owned: Boolean(ownedMatch),
          boxes,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Use namespaced events with .off() to prevent handler stacking on re-render
    html.find("input.radio-toggle, label.radio-toggle")
      .off("click.radioToggle mousedown.radioToggle")
      .on("click.radioToggle", (e) => e.preventDefault())
      .on("mousedown.radioToggle", (e) => {
        this._onRadioToggle(e);
      });

    // Minimize/expand toggle
    html.find(".toggle-expand").click((event) => {
      if (!this._element.hasClass("can-expand")) {
        // Compute height to show through bottom of coins-row
        const coinsRow = html.find('.coins-row')[0];
        const appRect = this._element[0].getBoundingClientRect();
        const coinsRect = coinsRow.getBoundingClientRect();
        const targetHeight = coinsRect.bottom - appRect.top;
        this.setPosition({ height: targetHeight });
        this._element.addClass("can-expand");
        this.sheetMinimized = true;
        Utils.saveUiState(this, { sheetMinimized: true });
      } else {
        this.setPosition({ height: "auto" });
        this._element.removeClass("can-expand");
        this.sheetMinimized = false;
        Utils.saveUiState(this, { sheetMinimized: false });
      }
    });

    // Restore minimized state on render
    if (this.sheetMinimized) {
      const coinsRow = html.find('.coins-row')[0];
      if (coinsRow) {
        const appRect = this._element[0].getBoundingClientRect();
        const coinsRect = coinsRow.getBoundingClientRect();
        const targetHeight = coinsRect.bottom - appRect.top;
        this.setPosition({ height: targetHeight });
        this._element.addClass("can-expand");
      }
    }

    html.find('[data-action="toggle-filter"]').off("click").on("click", (ev) => {
      ev.preventDefault();
      const target = ev.currentTarget?.dataset?.filterTarget;
      if (target === "acquaintances") {
        const next = !this.showFilteredAcquaintances;
        this.showFilteredAcquaintances = next;
        Utils.saveUiState(this, { showFilteredAcquaintances: next });
        this.render(false);
      }
    });

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
      this.collapsedSections = {
        ...(this.collapsedSections || {}),
        [sectionKey]: isCollapsed,
      };
      Utils.saveUiState(this, { collapsedSections: this.collapsedSections });
    });

    if (!this.options.editable) return;

    html.find('*[contenteditable="true"]').on("paste", (e) => {
      e.preventDefault();
      let text = (e.originalEvent || e).clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    });

    // Prevent multi-line edits in inline fields (Name, Lair, etc.)
    html.find('*[contenteditable="true"]').on("keydown", (e) => {
      // If Enter is pressed
      if (e.which === 13) {
        e.preventDefault();
        $(e.target).blur(); // Trigger save on blur
      }
    });

    html.find(".inline-input").on("keyup", async (ev) => {
      const input = ev.currentTarget.previousSibling;
      if (!input) return;
      const text = ev.currentTarget.innerText ?? "";
      input.value = text.trim().length === 0 ? "" : text;
    });

    html.find(".inline-input").on("blur", async (ev) => {
      const input = ev.currentTarget.previousSibling;
      if (!input) return;
      const placeholder = ev.currentTarget.dataset.placeholder ?? "";
      const text = ev.currentTarget.innerText ?? "";
      const trimmed = text.trim();
      if (trimmed.length === 0) {
        ev.currentTarget.innerText = placeholder;
        input.value = "";
      } else {
        input.value = text;
      }
      $(input).change();
    });

    html.on("change", ".crew-ability-checkbox", (event) =>
      this._onChoiceToggle(event, "crew_ability")
    );
    html.on("change", ".crew-upgrade-checkbox", (event) =>
      this._onUpgradeToggle(event)
    );

    // Replace the system turf toggle handler with a checkbox-aware version.
    html.off("click", ".turf-select");
    html.on("change", ".turf-select", async (event) => {
      const input = event.currentTarget;
      const element = $(input).parents(".item");
      const itemId = element.data("itemId");
      const turfId = $(input).data("turfId");
      const newValue = Boolean(input.checked);
      if (!itemId || !turfId) return;
      await queueUpdate(() => this.actor.updateEmbeddedDocuments("Item", [
        { _id: itemId, [`system.turfs.${turfId}.value`]: newValue },
      ]));
    });

    // NOTE: Clock controls are handled globally by setupGlobalClockHandlers() in hooks.js
    Utils.bindStandingToggles(this, html);
    Utils.bindAllowEditToggle(this, html);

    html.find('[data-action="smart-item-selector"]').click((e) => Utils.handleSmartItemSelector(e, this.actor));
  }

  async _onChoiceToggle(event, type) {
    const checkbox = event.currentTarget;
    const sourceId = checkbox.dataset.itemId;
    const itemName = checkbox.dataset.itemName;
    const checked = checkbox.checked;

    if (checked) {
      await this._ensureOwned(type, sourceId);
    } else {
      await this._removeOwned(type, sourceId, itemName);
    }
  }

  async _ensureOwned(type, sourceId) {
    if (this.actor.items.some((i) => i.type === type && (i.id === sourceId))) {
      return;
    }

    const source = await Utils.getItemByType(type, sourceId);
    if (!source) return;

    const data =
      typeof source.toObject === "function"
        ? source.toObject()
        : {
          type: source.type,
          name: source.name,
          system: foundry.utils.deepClone(source.system ?? {}),
          img: source.img,
        };

    // Ensure a fresh ID so Foundry treats this as a new embedded document.
    delete data._id;

    try {
      await queueUpdate(() => this.actor.createEmbeddedDocuments("Item", [data]));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err), { cause: err });

      Hooks.onError("BitD-Alt.EnsureOwned", error, {
        msg: "[BitD-Alt]",
        log: "error",
        notify: null,
        data: { type, sourceId, actorId: this.actor.id }
      });

      ui.notifications.error(`[BitD-Alt] Failed to add ${type} to crew.`, {
        console: false
      });

      // Re-render to reset checkbox state
      this.render(false);
    }
  }

  async _removeOwned(type, sourceId, itemName) {
    const existing =
      this.actor.items.find((i) => i.type === type && i.id === sourceId) ??
      this.actor.items.find((i) => i.type === type && i.name === itemName);
    if (!existing) return;

    try {
      await queueUpdate(() => this.actor.deleteEmbeddedDocuments("Item", [existing.id]));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err), { cause: err });

      Hooks.onError("BitD-Alt.RemoveOwned", error, {
        msg: "[BitD-Alt]",
        log: "error",
        notify: null,
        data: { type, sourceId, itemName, actorId: this.actor.id }
      });

      ui.notifications.error(`[BitD-Alt] Failed to remove ${type} from crew.`, {
        console: false
      });

      // Re-render to reset checkbox state
      this.render(false);
    }
  }

  _deriveUpgradeMax(sourceItem, ownedItem) {
    const rawCost = sourceItem?.system?.price ?? sourceItem?.system?.cost ?? 1;
    const parsedCost = Number(rawCost);
    const cost = Number.isNaN(parsedCost)
      ? 1
      : Math.max(1, Math.floor(parsedCost));
    const boxes =
      ownedItem?.system?.boxes ??
      sourceItem?.system?.boxes ??
      { max: cost, value: 0 };
    const maxFromBoxes = Number(boxes.max) || 0;
    return Math.max(maxFromBoxes, cost, 1);
  }

  _findOwnedUpgrade(sourceId, itemName) {
    return (
      this.actor.items.find(
        (i) =>
          i.type === "crew_upgrade" && (i.id === sourceId || i.name === itemName)
      ) ?? null
    );
  }

  async _createOwnedUpgrade(sourceItem, targetValue) {
    if (!sourceItem) return null;
    const data =
      typeof sourceItem.toObject === "function"
        ? sourceItem.toObject()
        : {
          type: sourceItem.type,
          name: sourceItem.name,
          system: foundry.utils.deepClone(sourceItem.system ?? {}),
          img: sourceItem.img,
        };

    const max = this._deriveUpgradeMax(sourceItem);
    if (!data.system) data.system = {};
    if (!data.system.boxes) data.system.boxes = {};
    data.system.boxes.max = Number.isFinite(data.system.boxes.max)
      ? data.system.boxes.max
      : max;
    data.system.boxes.value = Math.max(
      0,
      Math.min(Number(targetValue) || 0, data.system.boxes.max || max || 1)
    );
    // Ensure a fresh ID so Foundry treats this as a new embedded document.
    delete data._id;
    const created = await queueUpdate(() => this.actor.createEmbeddedDocuments("Item", [data]));
    return created?.[0] ?? null;
  }

  async _onUpgradeToggle(event) {
    event.preventDefault();
    const checkbox = event.currentTarget;
    const container = checkbox.closest(".crew-choice");
    const sourceId = checkbox.dataset.itemId;
    const itemName = checkbox.dataset.itemName ?? "";
    const slotValue = Number(checkbox.dataset.upgradeSlot) || 1;
    const ownedId = container?.dataset?.ownedId || "";

    const sourceItem =
      (await Utils.getItemByType("crew_upgrade", sourceId)) ??
      this._virtualUpgradeSources?.get(sourceId);
    // First try direct lookup by ownedId (most reliable), then fall back to name matching
    const ownedItem = ownedId
      ? this.actor.items.get(ownedId) ?? this._findOwnedUpgrade(sourceId, itemName)
      : this._findOwnedUpgrade(sourceId, itemName);
    const max = this._deriveUpgradeMax(sourceItem, ownedItem);

    // Get current progress: owned item means complete (max), otherwise check progress flag
    const progressFlag = this.actor.getFlag("bitd-alternate-sheets", "crewUpgradeProgress") || {};
    const previousValue = ownedItem
      ? max  // Owned item means fully purchased
      : Math.max(0, Math.min(Number(progressFlag[sourceId]) || 0, max - 1));

    let targetValue =
      slotValue <= previousValue ? slotValue - 1 : slotValue;
    targetValue = Math.max(0, Math.min(targetValue, max));

    const checkboxList = container
      ? Array.from(container.querySelectorAll(".crew-upgrade-checkbox"))
      : [checkbox];
    checkboxList.forEach((el) => el.setAttribute("disabled", "disabled"));

    try {
      await Profiler.time(
        "crewUpgradeToggle",
        async () => {
          // Upgrade becomes "active" (owned) only when ALL boxes are checked
          if (targetValue === max && !ownedItem) {
            // Fully purchased - create owned item and clear progress
            await this._createOwnedUpgrade(sourceItem, max);
            await Utils.updateCrewUpgradeProgressFlag(this.actor, sourceId, 0);
          } else if (targetValue === 0) {
            // Clearing all progress
            if (ownedItem) {
              await queueUpdate(() => this.actor.deleteEmbeddedDocuments("Item", [ownedItem.id]));
            }
            await Utils.updateCrewUpgradeProgressFlag(this.actor, sourceId, 0);
          } else if (targetValue < max) {
            // Partial progress - store in flag, not as owned item
            if (ownedItem) {
              // Unchecking from complete - remove owned item
              await queueUpdate(() => this.actor.deleteEmbeddedDocuments("Item", [ownedItem.id]));
            }
            await Utils.updateCrewUpgradeProgressFlag(this.actor, sourceId, targetValue);
          }
          // targetValue === max && ownedItem already exists: no change needed

          // Re-render open character sheets for crew members (upgrades may affect them)
          this._rerenderCrewMemberSheets();
        },
        {
          actorId: this.actor.id,
          upgradeSourceId: sourceId,
          ownedItemId: ownedItem?.id ?? null,
          targetValue,
        }
      );
    } finally {
      checkboxList.forEach((el) => el.removeAttribute("disabled"));
    }
  }

  /**
   * Re-render any open character sheets belonging to members of this crew.
   * Called after crew upgrades change, since some upgrades affect crew members
   * (e.g., Steady adds stress boxes to scoundrels).
   */
  _rerenderCrewMemberSheets() {
    const crewId = this.actor.id;
    for (const actor of game.actors) {
      if (actor.type !== "character") continue;
      const crewEntries = actor.system?.crew;
      if (!Array.isArray(crewEntries)) continue;
      const isMember = crewEntries.some((entry) => entry?.id === crewId);
      if (isMember && actor.sheet?.rendered) {
        actor.sheet.render(false);
      }
    }
  }

  /**
   * Handle radio toggle clicks.
   * Persists to database and lets Foundry handle re-render.
   * @param {Event} event - The mousedown event
   */
  async _onRadioToggle(event) {
    event.preventDefault();

    let type = event.target.tagName.toLowerCase();
    let target = event.target;
    if (type === "label") {
      const labelID = $(target).attr("for");
      target = document.getElementById(labelID);
    }

    if (!target) return;

    // Safety check: Ignore clock inputs (handled separately)
    if ($(target).closest('.blades-clock').length || $(event.currentTarget).closest('.blades-clock').length) {
      return;
    }

    const fieldName = target.name;
    const clickedValue = parseInt(target.value);

    // Get current value from actor data
    const currentValue = foundry.utils.getProperty(this.actor, fieldName) ?? 0;

    // Determine the new value based on visual state (red vs white teeth)
    // Red teeth: values 1 through currentValue
    // White teeth: values greater than currentValue
    let newValue;
    if (clickedValue <= currentValue) {
      // Clicking a red tooth → decrement (set to one below clicked)
      newValue = clickedValue - 1;
    } else {
      // Clicking a white tooth → set to this value
      newValue = clickedValue;
    }

    // Foundry update - Foundry handles re-render automatically
    try {
      await queueUpdate(async () => {
        await this.actor.update({ [fieldName]: newValue });
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err), { cause: err });

      Hooks.onError("BitD-Alt.RadioToggle", error, {
        msg: "[BitD-Alt]",
        log: "error",
        notify: null,
        data: { fieldName, newValue, actorId: this.actor.id }
      });

      ui.notifications.error("[BitD-Alt] Failed to save change.", {
        console: false
      });

      // Re-render to reset UI to database state
      this.render(false);
    }
  }
}
