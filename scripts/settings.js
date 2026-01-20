import { Utils } from "./utils.js";

export const registerSystemSettings = function () {
  game.settings.register("bitd-alternate-sheets", "populateFromCompendia", {
    name: "Load Compendium Objects",
    hint: "Include Compendium Playbooks, NPCs, Items, and Abilities When Auto-Populating Playbooks",
    scope: "world", // "world" = sync to db, "client" = local storage
    config: true, // false if you dont want it to show in module config
    type: Boolean, // Number, Boolean, String,
    default: true,
    onChange: (value) => {
      // Clear cache when compendium source setting changes
      Utils._invalidateCache(null);
    },
  });

  game.settings.register("bitd-alternate-sheets", "populateFromWorld", {
    name: "Load World Objects",
    hint: "Include World (Custom) Playbooks, NPCs, Items, and Abilities When Auto-Populating Playbooks",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      // Clear cache when world source setting changes
      Utils._invalidateCache(null);
    },
  });

  game.settings.register("bitd-alternate-sheets", "searchAllPacks", {
    name: "Search All Compendiums",
    hint: "When enabled, the sheet will scan ALL installed compendiums (not just system default) for matching items (Playbooks, NPCs, etc). This allows Custom Compendiums to work automatically but may affect performance.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      // Clear cache when search scope setting changes
      Utils._invalidateCache(null);
    },
  });

  game.settings.register("bitd-alternate-sheets", "patchSystemData", {
    name: "Patch System Module Data Issues",
    hint: "Automatically fix known issues in the official system module's compendium data (e.g., Steady upgrade missing effect data, Ordained missing crew type).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      // Clear cache when patching setting changes
      Utils._invalidateCache(null);
    },
  });

  game.settings.register(
    "bitd-alternate-sheets",
    "showPronounsInCharacterDirectory",
    {
      name: "Include Character Pronouns in Directory",
      hint: "In the Actor Directory, append each character's pronouns to their name",
      scope: "world", // "world" = sync to db, "client" = local storage
      config: true, // false if you dont want it to show in module config
      type: Boolean, // Number, Boolean, String,
      default: true,
      onChange: (value) => {
        game.actors.directory.render(false);
        // value is the new value of the setting
      },
    }
  );

  game.settings.register("bitd-alternate-sheets", "enableProfilingLogs", {
    name: "Enable performance profiling logs",
    hint: "When enabled, logs structured timing data for key interactions to the browser console (client-side only).",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("bitd-alternate-sheets", "showClearLoadButton", {
    name: "Show Clear Load Button to Players",
    hint: "Show the Clear Load button to players in the load popout. GMs always see it.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
};
