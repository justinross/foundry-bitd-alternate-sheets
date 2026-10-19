const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// Every Deep Cuts toggle, grouped by where the setting lives. Labels and hints are this module's own strings.
const GROUPS = [
  {
    namespace: "blades-in-the-dark",
    legend: "bitd-alt.DeepCutsSystemGroup",
    note: "bitd-alt.DeepCutsSystemNote",
    reload: true,
    keys: ["ActionRoll", "ThreatRoll", "PushYourself", "DeepCutLoad", "ClockXP", "Edge"],
  },
  {
    namespace: "bitd-alternate-sheets",
    legend: "bitd-alt.DeepCutsModuleGroup",
    note: "bitd-alt.DeepCutsModuleNote",
    keys: ["deepCutsVault", "deepCutsHarm", "deepCutsTrauma"],
  },
];

/** The window's groups, holding only settings that are registered (an older system may lack some). */
export function deepCutsGroups() {
  return GROUPS.map(({ keys, namespace, ...group }) => ({
    ...group,
    toggles: keys
      .filter((key) => game.settings.settings.has(`${namespace}.${key}`))
      .map((key) => {
        const label = `bitd-alt.DeepCuts${key.replace(/^deepCuts/, "")}`;
        return { name: `${namespace}.${key}`, label, hint: `${label}Hint`, value: !!game.settings.get(namespace, key) };
      }),
  })).filter((group) => group.toggles.length);
}

/** Writes each changed toggle to its setting, then asks for a reload like Foundry's settings form does. */
export async function saveDeepCutsSettings(data) {
  let reload = false;
  for (const { toggles } of deepCutsGroups()) {
    for (const { name, value } of toggles) {
      const next = !!data[name];
      if (next === value) continue;
      const setting = game.settings.settings.get(name);
      await game.settings.set(setting.namespace, setting.key, next);
      reload ||= !!setting.requiresReload;
    }
  }
  if (reload) {
    // v12's SettingsConfig is a bare global, not a globalThis property.
    const Config = foundry.applications.settings?.SettingsConfig ?? SettingsConfig;
    await Config.reloadConfirm({ world: true });
  }
}

export class DeepCutsSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "bitd-deep-cuts-settings",
    tag: "form",
    classes: ["bitd-deep-cuts-config"],
    window: { title: "bitd-alt.DeepCutsSettings", icon: "fa-solid fa-scissors", contentClasses: ["standard-form"] },
    position: { width: 520 },
    form: { handler: DeepCutsSettings.#onSubmit, closeOnSubmit: true },
  };

  static PARTS = {
    body: { template: "modules/bitd-alternate-sheets/templates/deep-cuts-settings.html" },
    footer: { template: "modules/bitd-alternate-sheets/templates/deep-cuts-settings-footer.html" },
  };

  async _prepareContext() {
    return { groups: deepCutsGroups() };
  }

  static async #onSubmit(event, form, formData) {
    await saveDeepCutsSettings(formData.object);
  }
}
