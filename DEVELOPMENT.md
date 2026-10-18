# Nimble Options Filter - Development Plan

Status: **v0.1.0 implemented and validated on Foundry v14 + Nimble 0.9.0** (see checklist). Changes to `esmodules`/`styles` in `module.json` need a full Foundry restart, not just F5.

## Goal

A Foundry v14 module for the **Nimble** system (verified against Nimble 0.9.0). The GM chooses which classes, ancestries, ancestry bonuses and backgrounds are hidden from the new-character creation dialog (`CharacterCreationDialog`, opened from Create Actor → Character). Hidden options are **fully removed for everyone, GMs included**. The GM can still unhide them from this module's config UI.

## Findings about Nimble (0.9.0)

Source read from the source maps in `systems/nimble/ActorCreationDialog.svelte-*.js.map` and `nimble-*.js.map`.

- `ActorCreationDialog.submitActorType('character')` does `new CharacterCreationDialog({}, { folder }).render(true)`.
- `CharacterCreationDialog` is an `ApplicationV2` + Svelte class. It is **bundled, not exported** (not on `game.nimble` or `CONFIG`), so libWrapper can't target it by path at startup.
- Option lists are built in `_prepareContext` by four prototype methods, **before** the Svelte components render:
  - `prepareClassOptions()` → `NimbleClassItem[]`
  - `prepareAncestryOptions()` → `{ core: [], exotic: [] }` (split on `system.exotic`)
  - `prepareAncestryBonusOptions()` → `NimbleAncestryBonusItem[]`
  - `prepareBackgroundOptions()` → `NimbleBackgroundItem[]`
- Each one calls `getChoicesFromCompendium(type)`: the UUID of **every world Item and every compendium index entry** of that item type (`class`, `ancestry`, `ancestryBonus`, `background`). No filtering or settings exist upstream.
- **UUID is the stable filter key.** It covers compendium and world items alike.
- Stat arrays and languages come from `CONFIG.NIMBLE` (`statArrayModifiers`, `languages`), not from Items. Out of v1 scope.
- Stage ids: `CLASS 0, CLASS_FEATURES 0b, SPELLS 0c, ANCESTRY 1a, ANCESTRY_BONUS 1b, ANCESTRY_OPTIONS 1c, BACKGROUND 2, BACKGROUND_OPTIONS 2b, STARTING_EQUIPMENT 3, ARRAY 4, STATS 5, SKILLS 6, LANGUAGES 7`.

## Approach

### Filtering (the core mechanism)
1. Store one **world-scoped, hidden-from-config** setting: JSON `{ class: [uuid], ancestry: [uuid], ancestryBonus: [uuid], background: [uuid] }`.
2. Get a handle on the dialog class. Hook `renderCharacterCreationDialog`. On first fire, take `Object.getPrototypeOf(app)` and wrap the four `prepare*Options` methods to drop hidden UUIDs. Then re-render that first instance so it picks up the filter. Later instances are filtered from the start.
3. Apply to **all users, GMs included** (decided). No grey-out, so no DOM matching is needed. This removes the fragile name-matching idea from the earlier plan.
4. Wrapper must be idempotent (guard flag on the prototype) and must fail soft: if a method is missing (Nimble changed), log a warning and notify the GM rather than throwing.

### Spike result (verified on live v14 + Nimble 0.9.0)
- `renderCharacterCreationDialog` fires (class name `CharacterCreationDialog` survives bundling; title `Character Creation Helper`).
- `prepare*Options` are **async** (return promises, resolved by Svelte); items expose `.uuid`. The wrapper handles both sync and async.
- Re-rendering the first instance does **not** update the Svelte UI. Instead the first instance is closed and a fresh `new Ctor(app.data, { folder })` is opened; later instances are filtered from the start. Works, with a brief close/reopen on the first open after a reload.
- Decided: an ancestry is treated as hidden whenever its default bonus (`system.defaultBonus`) is hidden. Derived at filter time and in the manager (locked, with a note), never stored; hiding an ancestry does not hide its bonus. Ancestry bonuses that are an exotic ancestry's default count as exotic.

### Things to verify first (original spike checklist)
- Does Foundry fire `renderCharacterCreationDialog` for this bundled build (class names might be minified)? Fallbacks: match by `app.options.window.title === 'Character Creation Helper'` on the generic `renderApplicationV2` hook, or wrap `ActorCreationDialog.prototype.submitActorType` (reached via `renderActorCreationDialog`).
- Whether the first-instance re-render is visually acceptable, or a pre-render hook is available instead.
- Hiding an ancestry bonus that is some ancestry's default: confirm the ANCESTRY_BONUS step doesn't break.
- Hiding the only option in a category (empty list) behaves sanely; consider warning in the config UI.

### GM configuration UI (ApplicationV2, reusing proven patterns)
Reuse the *UX, markup and CSS structure* of the sibling modules; build on `ApplicationV2` + `HandlebarsApplicationMixin` (not V1 `FormApplication`).

From **swade-character-manager** (`CompendiumPackSelector.js`, `compendium-pack-selector.hbs`, `TabManager.js`):
- Search input + action row + scrolling checkbox list of `label` rows.
- Meta line under each title (source pack); hover tooltip with the raw UUID (flip below when near the top edge).
- Flat JSON-string setting edited only through a settings menu (GM never types UUIDs).
- Tab bar for categories.

From **module-setup-tools** (`PresetModulesManager.js`, `preset-modules.hbs`, `settings.js`, `ui.js`):
- Panel header: title, inline search, filter toggles (`Show hidden only`, `Select all`, `Clear`), visible count.
- Summary chips (`Total · Hidden · Visible`), **Status: unsaved changes** chip, **Revert** button.
- Footer Save button and a "changes since last save" line (`+2 hidden, −1 hidden`).
- `registerMenu` with `restricted: true`. (No quick-access button or keybinding: decided not needed, the manager is rarely opened.)
- Code layout: `main.js` (hooks), `settings.js`, `lib/` of pure logic with Vitest, `DEVELOPMENT.md` validation checklist.

Differences from the sibling modules:
- AppV2: `static DEFAULT_OPTIONS`, `static PARTS`, `_prepareContext`, `_onRender`, `actions`; tabs via AppV2 tab config instead of the jQuery `TabManager`.
- CSS prefix: **`nof-`** (siblings use `cm-` and `mst-`).
- No search-dropdown component needed.

UI contents (v1):
- Four tabs: Classes, Ancestries, Ancestry Bonuses, Backgrounds. Common options first, then exotic (headed sections, only when a tab has exotic options).
- Row: image, name, source pack/world label, Hide checkbox.
- One bulk action per tab: **Reset to default** (show everything common, hide exotic). No hide-all/unhide-all buttons (decided not needed).
- Save closes the window and is disabled while any tab has every option hidden.
- Reuse `getDocumentSourceLabel`-style labels for the source line (Nimble has this util; re-implement from pack metadata rather than import it).

## Proposed file layout

```
nimble-options-filter/
  module.json
  DEVELOPMENT.md            (this file)
  README.md                 (write at first release)
  scripts/
    main.js                 init/ready hooks
    constants.js            MODULE_ID, SETTINGS keys, CATEGORIES, app id
    settings.js             setting + registerMenu
    patch.js                dialog prototype wrapping, soft-fail, idempotent
    apps/
      OptionsFilterManager.js   ApplicationV2 config UI
    lib/
      filter-state.js       pure: parse/serialize/diff, isHidden, apply filter to a list
      options-source.js     list available options per category (world items + pack indexes)
      index.js
  templates/options-filter.hbs
  styles/options-filter.css  (nof- prefix)
  lang/en.json
  tests/                    Vitest; helpers/foundry-fakes.js (copy pattern from siblings)
```

## Settings (planned)

- `hiddenOptions` - world, `config: false`, String (JSON). Only edited via the menu.
- `optionsFilterMenu` - settings menu, `restricted: true`.

## Build order

1. **Spike** the hook + prototype wrap on a live v14 world (see "verify first"). Record the outcome here.
2. Add `esmodules`/`styles` to `module.json`; `constants.js`, `settings.js`, `lib/filter-state.js` + tests.
3. `patch.js` wired to the setting; verify hiding in the real dialog.
4. `OptionsFilterManager` AppV2 UI + template + CSS.
5. ~~Quick-access button + keybinding~~ (dropped).
6. Validation pass, `README.md`, `CHANGELOG.md`.

## Validation checklist

1. [x] Module loads in Foundry v14 with no errors; Nimble 0.9.0 active.
2. [x] Hidden class/ancestry/bonus/background never appears in Create Actor → Character, for GM and player.
3. [x] Unhiding restores it without reload.
4. [x] Hiding survives a world reload; works for both compendium and world Items.
5. [x] By design: hiding an ancestry's default bonus hides that ancestry (derived rule); hiding every option in a category cannot be saved. (A saved all-hidden state, e.g. set via console, still opens with a warning.)
6. [ ] If Nimble's method names change, the module warns instead of throwing. Implemented in `patch.js` but never exercised against a changed Nimble.

## Roadmap (not v1)

- Filter more creation steps: stat arrays, languages, class features, spells, and skills/equipment if feasible.
- **GM-created custom options** from inside the module (a "Create custom…" button making a world Item of the right type, with tagging/grouping). Nimble already lists any world Item of these types, so this is mostly UI.
- Presets of hidden sets (per campaign), import/export (see module-setup-tools' preset flow).

## Notes

- This is a declutter feature, not a security boundary: players can still drag items in manually.
- Depends on Nimble internals (method names); pin `relationships.systems` compatibility and re-check on each Nimble release.
- Keep setting keys stable once published, or include a migration.
