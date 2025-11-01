/**
 * Compatibility helpers for the alternate sheets module. Prefer the V13+
 * namespaced APIs so we avoid deprecation warnings, but retain fallbacks while
 * the module still advertises support for earlier Foundry versions.
 */
export function getItemSheetClass() {
  return foundry?.appv1?.sheets?.ItemSheet ?? globalThis.ItemSheet;
}

export function loadTemplatesCompat(paths) {
  const loader = foundry?.applications?.handlebars?.loadTemplates ?? globalThis.loadTemplates;
  if (!loader) {
    throw new Error("Unable to resolve a Handlebars template loader.");
  }
  return loader(paths);
}

let cachedSheetConfig;

function getSheetConfig() {
  if (cachedSheetConfig) return cachedSheetConfig;
  const apiConfig =
    foundry?.applications?.api?.DocumentSheetConfig ??
    foundry?.applications?.config?.DocumentSheetConfig ??
    null;
  cachedSheetConfig = apiConfig;
  return cachedSheetConfig;
}

function getCollectionFor(documentClass) {
  if (documentClass === CONFIG.Actor.documentClass) {
    return foundry?.documents?.collections?.Actors ?? game?.actors ?? null;
  }
  if (documentClass === CONFIG.Item.documentClass) {
    return foundry?.documents?.collections?.Items ?? game?.items ?? null;
  }
  const collectionName = documentClass?.collection;
  return (
    foundry?.documents?.collections?.[collectionName] ??
    game?.collections?.get(collectionName) ??
    null
  );
}

export function registerDocumentSheet(documentClass, namespace, sheetClass, options) {
  const sheetConfig = getSheetConfig();
  if (sheetConfig?.registerSheet) {
    sheetConfig.registerSheet(documentClass, namespace, sheetClass, options);
    return;
  }

  const collection = getCollectionFor(documentClass);
  collection?.registerSheet?.(namespace, sheetClass, options);
}
