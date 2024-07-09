export const registerSystemSettings = function () {
  game.settings.register("bitd-alternate-sheets", "populateFromCompendia", {
    name: "Load Compendium Objects",
    hint: "Include Compendium Playbooks, NPCs, Items, and Abilities When Auto-Populating Playbooks",
    scope: "world", // "world" = sync to db, "client" = local storage
    config: true, // false if you dont want it to show in module config
    type: Boolean, // Number, Boolean, String,
    default: true,
    onChange: (value) => {
      // value is the new value of the setting
    },
  });

  game.settings.register("bitd-alternate-sheets", "populateFromWorld", {
    name: "Load World Objects",
    hint: "Include World (Custom) Playbooks, NPCs, Items, and Abilities When Auto-Populating Playbooks",
    scope: "world", // "world" = sync to db, "client" = local storage
    config: true, // false if you dont want it to show in module config
    type: Boolean, // Number, Boolean, String,
    default: false,
    onChange: (value) => {
      // value is the new value of the setting
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
};
