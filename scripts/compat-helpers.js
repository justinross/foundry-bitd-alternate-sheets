import {
  loadHandlebarsTemplates,
  registerActorSheet,
  registerItemSheet,
} from "./compat.js";

let cachedDocumentSheetConfig;

const ACTOR_SPECIAL = {
  register: registerActorSheet,
  collection: () =>
    foundry?.documents?.collections?.Actors ?? game?.actors ?? Actors ?? null,
};

const ITEM_SPECIAL = {
  register: registerItemSheet,
  collection: () =>
    foundry?.documents?.collections?.Items ?? game?.items ?? Items ?? null,
};

function getSheetSpecialCase(documentClass) {
  if (!documentClass) return null;
  if (documentClass === CONFIG.Actor.documentClass) {
    return ACTOR_SPECIAL;
  }
  if (documentClass === CONFIG.Item.documentClass) {
    return ITEM_SPECIAL;
  }
  return null;
}

function getDocumentSheetConfig() {
  cachedDocumentSheetConfig ??=
    foundry?.applications?.apps?.DocumentSheetConfig ??
    foundry?.applications?.config?.DocumentSheetConfig ??
    foundry?.applications?.api?.DocumentSheetConfig ??
    null;
  return cachedDocumentSheetConfig;
}

function getLegacyCollection(documentClass) {
  if (!documentClass) return null;
  const special = getSheetSpecialCase(documentClass);
  if (special) return special.collection();
  const collectionName = documentClass.collection;
  return (
    foundry?.documents?.collections?.[collectionName] ??
    game?.collections?.get(collectionName) ??
    game?.[collectionName] ??
    null
  );
}

export function registerDocumentSheet(documentClass, namespace, sheetClass, options) {
  const special = getSheetSpecialCase(documentClass);
  if (special) {
    return special.register(namespace, sheetClass, options);
  }
  const sheetConfig = getDocumentSheetConfig();
  if (sheetConfig?.registerSheet) {
    return sheetConfig.registerSheet(documentClass, namespace, sheetClass, options);
  }
  return getLegacyCollection(documentClass)?.registerSheet?.(namespace, sheetClass, options);
}

export function loadTemplatesCompat(paths) {
  return loadHandlebarsTemplates(paths);
}
