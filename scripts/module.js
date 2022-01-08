import { BladesAlternateActorSheet } from "./blades-alternate-actor-sheet.js";
import { registerSystemSettings } from "./settings.js";
import { preloadHandlebarsTemplates } from "./blades-templates.js";
import { registerHandlebarsHelpers } from "./handlebars-helpers.js";
import { registerHooks } from "./hooks.js";

Hooks.once('init', async function() {
  Actors.registerSheet("bitd-alt", BladesAlternateActorSheet, { types: ["character"], makeDefault: true});

  await registerSystemSettings();

  await preloadHandlebarsTemplates();
  await registerHandlebarsHelpers();
  await registerHooks();

});
