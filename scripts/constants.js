export const MODULE_ID = "nimble-options-filter";

export const SETTINGS = {
  hiddenOptions: "hiddenOptions",
  optionsFilterMenu: "optionsFilterMenu"
};

// Keys match the Nimble item types and the keys of the stored hidden-options JSON.
export const CATEGORIES = ["class", "ancestry", "ancestryBonus", "background"];

// Nimble CharacterCreationDialog prototype method -> category it lists.
export const PREPARE_METHODS = {
  prepareClassOptions: "class",
  prepareAncestryOptions: "ancestry",
  prepareAncestryBonusOptions: "ancestryBonus",
  prepareBackgroundOptions: "background"
};

export const DIALOG_TITLE = "Character Creation Helper";
