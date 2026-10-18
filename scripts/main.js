import { OptionsFilterManager } from "./apps/OptionsFilterManager.js";
import { MODULE_ID } from "./constants.js";
import { registerPatchHooks } from "./patch.js";
import { setupSettings } from "./settings.js";

Hooks.once("init", () => {
  setupSettings({ OptionsFilterManager });
});

Hooks.once("ready", () => {
  if (game.system.id !== "nimble") {
    console.warn(`${MODULE_ID} | system is not nimble; filter inactive.`);
    return;
  }
  registerPatchHooks();
});
