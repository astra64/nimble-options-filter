import { MODULE_ID, SETTINGS } from "./constants.js";

export function setupSettings({ OptionsFilterManager }) {
  // Edited only through the settings menu; the GM never types UUIDs.
  game.settings.register(MODULE_ID, SETTINGS.hiddenOptions, {
    name: "Hidden Options",
    scope: "world",
    config: false,
    type: String,
    default: "{}"
  });

  game.settings.registerMenu(MODULE_ID, SETTINGS.optionsFilterMenu, {
    name: "NOF.Settings.Menu.Name",
    label: "NOF.Settings.Menu.Label",
    hint: "NOF.Settings.Menu.Hint",
    icon: "fa-solid fa-filter",
    type: OptionsFilterManager,
    restricted: true
  });
}
