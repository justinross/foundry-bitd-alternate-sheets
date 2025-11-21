import { BladesAlternateActorSheet } from "./blades-alternate-actor-sheet.js";
import { BladesAlternateItemSheet } from "./blades-alternate-item-sheet.js";
import { BladesAlternateClassSheet } from "./blades-alternate-class-sheet.js";
import { registerSystemSettings } from "./settings.js";
import { preloadHandlebarsTemplates } from "./blades-templates.js";
import { registerHandlebarsHelpers } from "./handlebars-helpers.js";
import { registerHooks } from "./hooks.js";
import { registerActorSheet, registerItemSheet } from "./compat.js";

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
  registerActorSheet("bitd-alt", BladesAlternateActorSheet, {
    types: ["character"],
    makeDefault: true,
  });
  // registerItemSheet("bitd-alt", BladesAlternateItemSheet, { types: ["item"], makeDefault: true });
  registerItemSheet("bitd-alt", BladesAlternateClassSheet, {
    types: ["class"],
    makeDefault: true,
  });

  await preloadHandlebarsTemplates();
});
