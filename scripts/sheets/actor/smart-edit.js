import { openCardSelectionDialog } from "../../lib/dialog-compat.js";
import { Utils } from "../../utils.js";

export async function handleSmartEdit(sheet, event) {
  event.preventDefault();
  const ctx = smartEditContextFromEvent(event);
  const candidates = await getSmartEditCandidates(sheet, ctx);
  const shouldOpenChooser = ctx.source === "actor" || (candidates && candidates.length > 0);

  if (shouldOpenChooser) {
    const choices = toSmartEditChoices(candidates || []);
    const result = await openSmartEditChooser(ctx, choices);
    if (result === undefined) return;
    const updateValue = result === null ? "" : result;
    await updateSmartField(sheet, ctx.field, updateValue, ctx.header);
    return;
  }

  const textValue = await openSmartEditTextDialog(ctx);
  if (textValue === undefined) return;
  await updateSmartField(sheet, ctx.field, textValue, ctx.header);
}

export async function openItemChooser(sheet, filterPlaybook, itemScope = "") {
  try {
    const scope = itemScope || (filterPlaybook ? "playbook" : "general");
    const ctx = _resolveItemChooserContext(sheet, filterPlaybook, scope);
    const candidates = await _getItemChooserCandidates(sheet, ctx);
    const ordered = _partitionAndOrderCandidates(candidates, ctx);
    const filtered = Utils.filterItemsForDuplicatesOnActor(ordered, "item", sheet.actor, true);
    const choices = _toItemChooserChoices(filtered);

    const result = await openCardSelectionDialog({
      title: `${game.i18n.localize("bitd-alt.Select")} ${game.i18n.localize("bitd-alt.items")}`,
      instructions: game.i18n.localize("bitd-alt.SelectToAddItem"),
      okLabel: game.i18n.localize("bitd-alt.Ok"),
      cancelLabel: game.i18n.localize("bitd-alt.Cancel"),
      clearLabel: game.i18n.localize("bitd-alt.Cancel"),
      choices,
    });

    if (!result) return;
    const selected = filtered.find((i) => i._id === result);
    if (!selected) return;

    const itemData = _buildEmbeddedItemData(selected, ctx);
    await sheet.actor.createEmbeddedDocuments("Item", [itemData]);
  } catch (err) {
    // Preserve original error as cause when wrapping non-Errors
    const error = err instanceof Error ? err : new Error(String(err), { cause: err });

    // Error funnel: stack traces + ecosystem hooks (no UI)
    Hooks.onError("BitD-Alt.ItemChooser", error, {
      msg: "[BitD-Alt]",
      log: "error",
      notify: null,
      data: {
        context: "ItemChooser",
        actorId: sheet.actor.id
      }
    });

    // Fully controlled user message (sanitized, no console - already logged)
    ui.notifications.error("[BitD-Alt] Failed to add item", {
      clean: true,
      console: false
    });
  }
}

export async function openAcquaintanceChooser(sheet) {
  try {
    const allNpcs = await Utils.getSourcedItemsByType("npc");
    const existingIds = new Set((sheet.actor.system.acquaintances ?? []).map((a) => a.id || a._id));
    const filtered = allNpcs.filter((n) => !existingIds.has(n._id));
    const choices = filtered.map((npc) => ({
      value: npc._id,
      label: npc.name,
      img: npc.img || "icons/svg/mystery-man.svg",
      description: npc.system?.description_short ?? npc.system?.description ?? "",
    }));

    const result = await openCardSelectionDialog({
      title: `${game.i18n.localize("bitd-alt.Select")} ${game.i18n.localize("bitd-alt.Acquaintances")}`,
      instructions: game.i18n.localize("bitd-alt.SelectToAddItem"),
      okLabel: game.i18n.localize("bitd-alt.Ok"),
      cancelLabel: game.i18n.localize("bitd-alt.Cancel"),
      clearLabel: game.i18n.localize("bitd-alt.Cancel"),
      choices,
    });

    if (!result) return;
    const selected = filtered.find((n) => n._id === result);
    if (!selected) return;

    await Utils.addAcquaintance(sheet.actor, selected);
  } catch (err) {
    // Preserve original error as cause when wrapping non-Errors
    const error = err instanceof Error ? err : new Error(String(err), { cause: err });

    // Error funnel: stack traces + ecosystem hooks (no UI)
    Hooks.onError("BitD-Alt.AcquaintanceChooser", error, {
      msg: "[BitD-Alt]",
      log: "error",
      notify: null,
      data: {
        context: "AcquaintanceChooser",
        actorId: sheet.actor.id
      }
    });

    // Fully controlled user message (sanitized, no console - already logged)
    ui.notifications.error("[BitD-Alt] Failed to add acquaintance", {
      clean: true,
      console: false
    });
  }
}

function smartEditContextFromEvent(event) {
  const target = event.currentTarget;
  return {
    field: target.dataset.field,
    header: target.dataset.header,
    initialValue: target.dataset.value || "",
    source: target.dataset.source || "compendium_item",
    filterField: target.dataset.filterField || "",
    filterValue: target.dataset.filterValue || "",
  };
}

async function getSmartEditCandidates(sheet, ctx) {
  if (ctx.source === "actor") {
    return getSmartEditActorCandidates(sheet, ctx);
  }
  return getSmartEditCompendiumCandidates(ctx);
}

async function getSmartEditActorCandidates(sheet, ctx) {
  let availableItems = await Utils.getFilteredActors(
    "npc",
    ctx.filterField,
    ctx.filterValue
  );

  if (ctx.filterValue === "Vice Purveyor") {
    const currentVice = sheet.actor.system.vice;
    if (currentVice && typeof currentVice === "string" && currentVice.trim().length > 0) {
      const viceKey = currentVice.toLowerCase().trim();
      availableItems = availableItems.filter((npc) => {
        const keywords = (npc.system.associated_crew_type || "").toLowerCase();
        return keywords.includes(viceKey);
      });
    }
  }
  return availableItems || [];
}

async function getSmartEditCompendiumCandidates(ctx) {
  const typeMap = {
    "system.heritage": "heritage",
    "system.background": "background",
    "system.vice": "vice",
  };
  const type = typeMap[ctx.field];
  if (!type) return [];
  const items = await Utils.getSourcedItemsByType(type);
  return items || [];
}

function toSmartEditChoices(items) {
  return items.map((i) => ({
    value: i.name || i._id,
    label: i.name,
    img: i.img || "icons/svg/mystery-man.svg",
    description: i.system?.description ?? "",
  }));
}

async function openSmartEditChooser(ctx, choices) {
  return openCardSelectionDialog({
    title: `${game.i18n.localize("bitd-alt.Select")} ${ctx.header}`,
    instructions: `Choose a ${ctx.header} from the list below.`,
    okLabel: game.i18n.localize("bitd-alt.Select") || "Select",
    cancelLabel: game.i18n.localize("bitd-alt.Cancel") || "Cancel",
    clearLabel: game.i18n.localize("bitd-alt.Clear") || "Clear",
    choices: choices,
    currentValue: ctx.initialValue,
  });
}

function _resolveItemChooserContext(sheet, filterPlaybook, scope) {
  const isPlaybookScope = scope === "playbook" || scope === "all";
  const playbookNameRaw = isPlaybookScope
    ? (filterPlaybook ||
      sheet.actor?.items?.find((i) => i.type === "class")?.name ||
      sheet.actor?.system?.playbook ||
      "")
    : "";
  const playbookName = (playbookNameRaw || "").trim();
  const playbookKey = playbookName.toLowerCase();
  return { scope, isPlaybookScope, playbookName, playbookKey };
}

async function _getItemChooserCandidates(sheet, ctx) {
  if (ctx.scope === "all") {
    return _getAllScopeItems(sheet, ctx);
  }
  return ctx.isPlaybookScope
    ? _getPlaybookScopeItems(sheet, ctx)
    : _getGeneralScopeItems(sheet);
}

function _getItemClass(item) {
  const raw = item?.system?.class ?? item?.system?.associated_class ?? "";
  return (raw || "").trim();
}

async function _getGeneralScopeItems(sheet) {
  const defaults = await Utils.getVirtualListOfItems(
    "item",
    { actor: sheet.actor },
    true,
    "",
    false,
    false
  );
  const defaultsById = new Set(defaults.map((i) => i._id));

  const allGeneric = (await Utils.getSourcedItemsByType("item")).filter((i) => {
    const cls = _getItemClass(i);
    return !cls;
  });

  const extras = allGeneric.filter((i) => !defaultsById.has(i._id));
  return [...defaults, ...extras];
}

async function _getPlaybookScopeItems(sheet, ctx) {
  const allClassed = (await Utils.getSourcedItemsByType("item")).filter((i) => {
    const cls = _getItemClass(i);
    return Boolean(cls);
  });
  return allClassed;
}

async function _getAllScopeItems(sheet, ctx) {
  const generalItems = await _getGeneralScopeItems(sheet);
  const classedItems = await _getPlaybookScopeItems(sheet, ctx);
  return [...classedItems, ...generalItems];
}

function _partitionAndOrderCandidates(items, ctx) {
  const isPlaybookScope = ctx.isPlaybookScope;
  const playbookKey = ctx.playbookKey;

  const bucketed = items.map((item) => {
    const cls = _getItemClass(item);
    const clsKey = cls.toLowerCase();
    const virtual = item?.system?.virtual ? 0 : 1;

    if (!isPlaybookScope) {
      return { bucket: virtual, name: Utils.trimClassFromName(item.name) || item.name, item, virtual };
    }

    let primary = 2;
    if (clsKey === playbookKey) {
      primary = 0;
    } else if (clsKey) {
      primary = 1;
    }
    return { bucket: primary, name: Utils.trimClassFromName(item.name) || item.name, item, virtual };
  });

  bucketed.sort((a, b) => {
    if (a.bucket !== b.bucket) return a.bucket - b.bucket;
    if (a.virtual !== b.virtual) return a.virtual - b.virtual;
    if (a.name === b.name) return 0;
    return a.name > b.name ? 1 : -1;
  });

  return bucketed.map((b) => b.item);
}

function _toItemChooserChoices(items) {
  return items.map((i) => ({
    value: i._id,
    label: Utils.trimClassFromName(i.name) || i.name,
    img: i.img || "icons/svg/mystery-man.svg",
    description: i.system?.description ?? "",
  }));
}

function _buildEmbeddedItemData(selected, ctx) {
  const itemData = {
    name: selected.name,
    type: selected.type,
    system: foundry.utils.deepClone(selected.system ?? {}),
    img: selected.img,
  };
  itemData.system = _normalizeEmbeddedItemSystem(itemData.system, ctx);
  return itemData;
}

function _normalizeEmbeddedItemSystem(system, ctx) {
  const clone = system || {};
  delete clone.virtual;
  if (!ctx.isPlaybookScope) {
    delete clone.class;
    delete clone.associated_class;
  } else {
    const existingClass = _getItemClass({ system: clone });
    if (existingClass) {
      clone.class = existingClass;
    }
  }
  return clone;
}

async function updateSmartField(sheet, field, value, header) {
  try {
    await sheet.actor.update({ [field]: value });
  } catch (err) {
    // Preserve original error as cause when wrapping non-Errors
    const error = err instanceof Error ? err : new Error(String(err), { cause: err });

    // Error funnel: stack traces + ecosystem hooks (no UI)
    Hooks.onError("BitD-Alt.SmartFieldUpdate", error, {
      msg: "[BitD-Alt]",
      log: "error",
      notify: null,
      data: {
        context: "SmartFieldUpdate",
        field: field,
        header: header,
        actorId: sheet.actor.id
      }
    });

    // Fully controlled user message (sanitized, no console - already logged)
    ui.notifications.error(`[BitD-Alt] Failed to update ${header}`, {
      clean: true,
      console: false
    });
  }
}

async function openSmartEditTextDialog(ctx) {
  const escapedHeader = foundry.utils.escapeHTML(ctx.header);
  const escapedValue = foundry.utils.escapeHTML(ctx.initialValue);
  const content = `
      <form>
        <div class="form-group">
          <label>${escapedHeader}</label>
          <input type="text" name="value" value="${escapedValue}" autofocus/>
        </div>
      </form>
      `;

  return new Promise((resolve) => {
    new Dialog({
      title: `${game.i18n.localize("bitd-alt.Edit")} ${escapedHeader}`,
      content: content,
      buttons: {
        save: {
          label: game.i18n.localize("bitd-alt.Ok") || "Ok",
          icon: '<i class="fas fa-check"></i>',
          callback: async (html) => {
            const newValue = html.find('[name="value"]').val();
            resolve(newValue);
          },
        },
        cancel: {
          label: game.i18n.localize("bitd-alt.Cancel") || "Cancel",
          icon: '<i class="fas fa-times"></i>',
          callback: () => resolve(undefined),
        },
      },
      default: "save",
      close: () => resolve(undefined),
    }).render(true);
  });
}
