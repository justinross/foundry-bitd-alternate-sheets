import {
  loadHandlebarsTemplates,
  registerActorSheet,
  registerItemSheet,
} from "./compat.js";

let cachedDocumentSheetConfig;

function getDocumentSheetConfig() {
  if (cachedDocumentSheetConfig) return cachedDocumentSheetConfig;
  cachedDocumentSheetConfig =
    foundry?.applications?.apps?.DocumentSheetConfig ??
    foundry?.applications?.config?.DocumentSheetConfig ??
    foundry?.applications?.api?.DocumentSheetConfig ??
    null;
  return cachedDocumentSheetConfig;
}

function getLegacyCollection(documentClass) {
  if (!documentClass) return null;
  if (documentClass === CONFIG.Actor.documentClass) {
    return foundry?.documents?.collections?.Actors ?? game?.actors ?? Actors ?? null;
  }
  if (documentClass === CONFIG.Item.documentClass) {
    return foundry?.documents?.collections?.Items ?? game?.items ?? Items ?? null;
  }
  const collectionName = documentClass.collection;
  return (
    foundry?.documents?.collections?.[collectionName] ??
    game?.collections?.get(collectionName) ??
    game?.[collectionName] ??
    null
  );
}

export function registerDocumentSheet(documentClass, namespace, sheetClass, options) {
  if (documentClass === CONFIG.Actor.documentClass) {
    return registerActorSheet(namespace, sheetClass, options);
  }
  if (documentClass === CONFIG.Item.documentClass) {
    return registerItemSheet(namespace, sheetClass, options);
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
