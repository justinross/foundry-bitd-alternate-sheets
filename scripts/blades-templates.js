import { loadTemplatesCompat } from "./compat-helpers.js";
import { TEMPLATE_PARTS_PATH, TEMPLATE_PARTS } from "./constants.js";

/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {}
 */
export const preloadHandlebarsTemplates = function () {
  // Build full paths from TEMPLATE_PARTS constant
  const templatePaths = TEMPLATE_PARTS.map(
    (partialName) => `${TEMPLATE_PARTS_PATH}/${partialName}`
  );

  // Load the template parts
  return loadTemplatesCompat(templatePaths);
};
