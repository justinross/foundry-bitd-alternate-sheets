/**
 * Lightweight compatibility helpers that prefer the V13+ namespaced APIs while
 * keeping graceful fallbacks for the V11/V12 globals this system still
 * supports. Each accessor resolves the modern entry point first so we avoid
 * deprecation warnings once the legacy globals disappear.
 */
export function getActorSheetClass() {
  return foundry?.appv1?.sheets?.ActorSheet ?? ActorSheet;
}

export function getItemSheetClass() {
  return foundry?.appv1?.sheets?.ItemSheet ?? ItemSheet;
}

let cachedSheetConfig;

function getSheetConfig() {
  if (cachedSheetConfig) return cachedSheetConfig;
  const apiConfig =
    foundry?.applications?.apps?.DocumentSheetConfig ??
    foundry?.applications?.config?.DocumentSheetConfig ??
    foundry?.applications?.api?.DocumentSheetConfig ??
    null;
  cachedSheetConfig = apiConfig;
  return cachedSheetConfig;
}

function getActorsCollectionLegacy() {
  return foundry?.documents?.collections?.Actors ?? game?.actors ?? Actors ?? null;
}

function getItemsCollectionLegacy() {
  return foundry?.documents?.collections?.Items ?? game?.items ?? Items ?? null;
}

function getLegacyCollection(documentClass) {
  if (!documentClass) return null;
  if (documentClass === CONFIG.Actor.documentClass) return getActorsCollectionLegacy();
  if (documentClass === CONFIG.Item.documentClass) return getItemsCollectionLegacy();

  const collectionName = documentClass.collection;
  return (
    foundry?.documents?.collections?.[collectionName] ??
    game?.collections?.get(collectionName) ??
    game?.[collectionName] ??
    null
  );
}

export function unregisterActorSheet(namespace, sheetClass) {
  const sheetConfig = getSheetConfig();
  if (sheetConfig?.unregisterSheet) {
    return sheetConfig.unregisterSheet(CONFIG.Actor.documentClass, namespace, sheetClass);
  }
  return getActorsCollectionLegacy()?.unregisterSheet?.(namespace, sheetClass);
}

export function registerActorSheet(namespace, sheetClass, options) {
  const sheetConfig = getSheetConfig();
  if (sheetConfig?.registerSheet) {
    return sheetConfig.registerSheet(CONFIG.Actor.documentClass, namespace, sheetClass, options);
  }
  return getActorsCollectionLegacy()?.registerSheet?.(namespace, sheetClass, options);
}

export function unregisterItemSheet(namespace, sheetClass) {
  const sheetConfig = getSheetConfig();
  if (sheetConfig?.unregisterSheet) {
    return sheetConfig.unregisterSheet(CONFIG.Item.documentClass, namespace, sheetClass);
  }
  return getItemsCollectionLegacy()?.unregisterSheet?.(namespace, sheetClass);
}

export function registerItemSheet(namespace, sheetClass, options) {
  const sheetConfig = getSheetConfig();
  if (sheetConfig?.registerSheet) {
    return sheetConfig.registerSheet(CONFIG.Item.documentClass, namespace, sheetClass, options);
  }
  return getItemsCollectionLegacy()?.registerSheet?.(namespace, sheetClass, options);
}

export function registerDocumentSheet(documentClass, namespace, sheetClass, options) {
  const sheetConfig = getSheetConfig();
  if (sheetConfig?.registerSheet) {
    return sheetConfig.registerSheet(documentClass, namespace, sheetClass, options);
  }

  const collection = getLegacyCollection(documentClass);
  return collection?.registerSheet?.(namespace, sheetClass, options);
}

export function loadHandlebarsTemplates(paths) {
  const loader = foundry?.applications?.handlebars?.loadTemplates ?? loadTemplates;
  if (!loader) {
    throw new Error("Unable to resolve a Handlebars template loader.");
  }
  return loader(paths);
}

export function renderHandlebarsTemplate(...args) {
  const renderer = foundry?.applications?.handlebars?.renderTemplate ?? renderTemplate;
  if (!renderer) {
    throw new Error("Unable to resolve a Handlebars template renderer.");
  }
  return renderer(...args);
}

export function loadTemplatesCompat(paths) {
  return loadHandlebarsTemplates(paths);
}

export function enrichHTML(...args) {
  const textEditor = foundry?.applications?.ux?.TextEditor?.implementation ?? TextEditor;
  const enrich = textEditor?.enrichHTML;
  if (!enrich) {
    throw new Error("Unable to resolve TextEditor.enrichHTML");
  }
  return enrich.apply(textEditor, args);
}

export function generateRandomId() {
  const randomIdFn = foundry?.utils?.randomID ?? randomID;
  if (!randomIdFn) {
    throw new Error("Unable to resolve a randomID generator");
  }
  return randomIdFn();
}
