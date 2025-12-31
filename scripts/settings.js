export const registerSystemSettings = function () {
  game.settings.register("bitd-alternate-sheets", "populateFromWorld", {
    name: "Include World Directory Entries",
    hint: "Include Actors/Items saved in this world (the entries in the sidebar directories). Does not search Compendium Packs.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("bitd-alternate-sheets", "populateFromCompendia", {
    name: "Include Compendium Pack Entries",
    hint: "Include Actors/Items from Compendium Packs when auto-populating. Finds compendium-only content.",
    scope: "world", // "world" = sync to db, "client" = local storage
    config: true, // false if you dont want it to show in module config
    type: Boolean, // Number, Boolean, String,
    default: true,
    onChange: (value) => {
      // value is the new value of the setting
    },
  });

  game.settings.register("bitd-alternate-sheets", "searchAllPacks", {
    name: "Scan All Installed Compendium Packs",
    hint: "Requires \"Include Compendium Pack Entries\". When off, scan only the system’s default packs. When on, scan all installed Actor/Item packs (may be slower).",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
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

  // Schema version for data migrations (hidden from UI)
  game.settings.register("bitd-alternate-sheets", "schemaVersion", {
    name: "Schema Version",
    scope: "world",
    config: false,
    type: Number,
    default: 0,
  });
};
