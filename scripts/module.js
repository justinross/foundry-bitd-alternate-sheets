import { BladesAlternateActorSheet } from "./blades-alternate-actor-sheet.js";
import { Utils } from "./utils.js";
import { BladesAlternateCrewSheet } from "./blades-alternate-crew-sheet.js";
import { BladesAlternateItemSheet } from "./blades-alternate-item-sheet.js";
import { BladesAlternateClassSheet } from "./blades-alternate-class-sheet.js";
import { registerSystemSettings } from "./settings.js";
import { preloadHandlebarsTemplates } from "./blades-templates.js";
import { registerHandlebarsHelpers } from "./handlebars-helpers.js";
import { registerHooks } from "./hooks.js";
import { registerDocumentSheet } from "./compat-helpers.js";
import { Migration } from "./migration.js";

Hooks.once("init", function () {
  console.log("Initializing Blades in the Dark Alternate Sheets");
  // CONFIG.debug.hooks = true;

  registerSystemSettings();
  registerHandlebarsHelpers();
  registerHooks();
});

Hooks.once("ready", async function () {
  // Defer sheet registration until ready so DocumentSheetConfig and the
  // namespaced collections are available on V13+, avoiding reliance on the
  // legacy globals that will vanish in V15.
  registerDocumentSheet(CONFIG.Actor.documentClass, "bitd-alt", BladesAlternateActorSheet, {
    types: ["character"],
    makeDefault: true,
  });
  registerDocumentSheet(CONFIG.Actor.documentClass, "bitd-alt", BladesAlternateCrewSheet, {
    types: ["crew"],
    makeDefault: true,
  });
  // registerDocumentSheet(CONFIG.Item.documentClass, "bitd-alt", BladesAlternateItemSheet, { types: ["item"], makeDefault: true });
  registerDocumentSheet(CONFIG.Item.documentClass, "bitd-alt", BladesAlternateClassSheet, {
    types: ["class"],
    makeDefault: true,
  });

  await preloadHandlebarsTemplates();

  // Trigger migration (schemaVersion setting registered in init via settings.js)
  await Migration.migrate();
});
