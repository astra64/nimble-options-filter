import { DIALOG_TITLE, MODULE_ID, PREPARE_METHODS, SETTINGS } from "./constants.js";
import { filterResult, parseState } from "./lib/filter-state.js";

const PATCHED = Symbol.for(`${MODULE_ID}.patched`);

function currentState() {
  return parseState(game.settings.get(MODULE_ID, SETTINGS.hiddenOptions));
}

function warn(message) {
  console.warn(`${MODULE_ID} | ${message}`);
  if (game.user?.isGM) ui.notifications?.warn(`Nimble Options Filter: ${message}`);
}

function isCreationDialog(app) {
  if (app?.constructor?.name === "CharacterCreationDialog") return true;
  return app?.options?.window?.title === DIALOG_TITLE;
}

/**
 * Wrap the prepare*Options methods on the dialog prototype. Idempotent; fails soft.
 * Returns true if this call applied the patch.
 */
export function patchDialog(app) {
  const proto = Object.getPrototypeOf(app);
  if (proto[PATCHED]) return false;

  const missing = [];
  for (const [method, category] of Object.entries(PREPARE_METHODS)) {
    const original = proto[method];
    if (typeof original !== "function") {
      missing.push(method);
      continue;
    }
    proto[method] = function (...args) {
      const result = original.apply(this, args);
      const apply = (r) => {
        try {
          return filterResult(r, currentState(), category);
        } catch (err) {
          console.error(`${MODULE_ID} | filtering ${category} failed`, err);
          return r;
        }
      };
      return result && typeof result.then === "function" ? result.then(apply) : apply(result);
    };
  }
  Object.defineProperty(proto, PATCHED, { value: true });

  if (missing.length) warn(`Nimble changed; could not filter: ${missing.join(", ")}.`);
  return true;
}

export function registerPatchHooks() {
  const onRender = (app) => {
    if (!isCreationDialog(app)) return;
    // The first instance built its lists before the patch existed, and Svelte will not remount on
    // re-render, so replace it with a fresh instance (constructor: data, { folder }).
    if (patchDialog(app)) {
      const { data, folder } = app;
      app.close().then(() => new app.constructor(data, { folder }).render(true));
    }
  };
  // Named hook first, then a generic fallback in case the bundled class name is not what Foundry hooks on.
  Hooks.on("renderCharacterCreationDialog", onRender);
  Hooks.on("renderApplicationV2", onRender);
}
