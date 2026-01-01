import { MODULE_ID } from "./utils.js";

/**
 * Template path constants for the module.
 * Single source of truth for all template file paths.
 */

export const TEMPLATES = {
  ACTOR_SHEET: `modules/${MODULE_ID}/templates/actor-sheet.html`,
  CREW_SHEET: `modules/${MODULE_ID}/templates/crew-sheet.html`,
  CLASS_SHEET: `modules/${MODULE_ID}/templates/class-sheet.html`,
  ITEM_SHEET: `modules/${MODULE_ID}/templates/item-sheet.html`,
};

export const TEMPLATE_PARTS_PATH = `modules/${MODULE_ID}/templates/parts`;

/**
 * Template part paths for preloading.
 * Used by blades-templates.js for Handlebars partial registration.
 */
export const TEMPLATE_PARTS = [
  // Actor Sheet Partials
  "coins.html",
  "attributes.html",
  "xp-tracks.html",
  "harm.html",
  "load.html",
  "radiotoggles.html",
  "ability.html",
  "item.html",
  "item-list-section.html",
  "item-header.html",
  "dock-section.html",
  "crew-ability.html",
  "crew-upgrade.html",
  "turf-list.html",
  "section-controls.html",
  "acquaintance-body.html",
  // "cohort-block.html",
  // "factions.html",
  "active-effects.html",
  "identity-header.html",
];
