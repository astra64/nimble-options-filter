import { CATEGORIES, MODULE_ID, SETTINGS } from "../constants.js";
import {
  diffState,
  isAncestryBlocked,
  isHidden,
  listOptions,
  parseState,
  serializeState,
  setHidden,
  splitSections
} from "../lib/index.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const TAB_LABELS = {
  class: "NOF.Manager.Tabs.Classes",
  ancestry: "NOF.Manager.Tabs.Ancestries",
  ancestryBonus: "NOF.Manager.Tabs.AncestryBonuses",
  background: "NOF.Manager.Tabs.Backgrounds"
};

const SECTION_LABELS = {
  common: "NOF.Manager.Sections.Common",
  exotic: "NOF.Manager.Sections.Exotic"
};

export class OptionsFilterManager extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "nof-manager",
    classes: ["nof-app"],
    tag: "div",
    window: { title: "NOF.Manager.Title", icon: "fa-solid fa-filter", resizable: true },
    position: { width: 720, height: 700 },
    actions: {
      switchTab: OptionsFilterManager.#onTab,
      resetDefault: OptionsFilterManager.#onResetDefault,
      revert: OptionsFilterManager.#onRevert,
      save: OptionsFilterManager.#onSave
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/options-filter.hbs` }
  };

  activeTab = CATEGORIES[0];
  optionRows = null;
  saved = null;
  draft = null;

  async _prepareContext() {
    this.optionRows ??= await listOptions();
    this.saved ??= parseState(game.settings.get(MODULE_ID, SETTINGS.hiddenOptions));
    this.draft ??= parseState(this.saved);

    const tabs = CATEGORIES.map((category) => {
      const hidden = new Set(this.draft[category]);
      const rows = this.optionRows[category].map((row) => ({ ...row, hidden: hidden.has(row.uuid), lcname: row.name.toLowerCase() }));
      const sections = splitSections(rows);
      // Headings only matter when the tab actually has an exotic section.
      const showHeadings = sections.some((s) => s.key === "exotic");
      return {
        id: category,
        label: TAB_LABELS[category],
        active: category === this.activeTab,
        sections: sections.map((s) => ({ ...s, heading: showHeadings ? SECTION_LABELS[s.key] : null })),
        total: rows.length
      };
    });
    return { tabs };
  }

  _onRender() {
    const el = this.element;
    el.querySelector(".nof-search").addEventListener("input", () => this.#applyFilter());
    el.querySelector(".nof-hidden-only").addEventListener("change", () => this.#applyFilter());
    for (const check of el.querySelectorAll(".nof-check")) {
      check.addEventListener("change", () => {
        this.draft = setHidden(this.draft, check.dataset.category, check.dataset.uuid, check.checked);
        this.#syncBlocked();
        this.#applyFilter();
        this.#refresh();
      });
    }
    this.#syncBlocked();
    this.#applyFilter();
    this.#refresh();
  }

  /**
   * Ancestries whose default bonus is hidden show as hidden and locked (derived, not stored;
   * see isAncestryBlocked). An explicit hide stays editable.
   */
  #syncBlocked() {
    for (const row of this.element.querySelectorAll(".nof-row[data-default-bonus]")) {
      const bonus = row.dataset.defaultBonus;
      if (!bonus) continue;
      const check = row.querySelector(".nof-check");
      const explicit = isHidden(this.draft, "ancestry", check.dataset.uuid);
      const blocked = isAncestryBlocked(this.draft, bonus);
      check.checked = explicit || blocked;
      check.disabled = blocked && !explicit;
      row.querySelector(".nof-blocked-note").hidden = !blocked;
    }
  }

  /** Search + "hidden only" filtering is DOM-only so typing never re-renders. */
  #applyFilter() {
    const el = this.element;
    const term = el.querySelector(".nof-search").value.trim().toLowerCase();
    const hiddenOnly = el.querySelector(".nof-hidden-only").checked;
    for (const row of el.querySelectorAll(".nof-row")) {
      const matches = !term || row.dataset.name.includes(term);
      const shown = matches && (!hiddenOnly || row.querySelector(".nof-check").checked);
      row.classList.toggle("nof-filtered", !shown);
    }
    for (const group of el.querySelectorAll(".nof-group")) {
      group.hidden = !group.querySelector(".nof-row:not(.nof-filtered)");
    }
  }

  /** Update chips, badges, warnings and buttons from the draft without re-rendering. */
  #refresh() {
    const el = this.element;
    let total = 0;
    let hiddenTotal = 0;
    let emptied = false; // some category has nothing left to pick
    for (const category of CATEGORIES) {
      const count = this.optionRows[category].length;
      const hidden = this.optionRows[category].filter(
        (r) => isHidden(this.draft, category, r.uuid) || (category === "ancestry" && isAncestryBlocked(this.draft, r.defaultBonus))
      ).length;
      total += count;
      hiddenTotal += hidden;
      el.querySelector(`[data-badge="${category}"]`).textContent = hidden;
      const allHidden = count > 0 && hidden === count;
      if (allHidden) emptied = true;
      el.querySelector(`.nof-warn[data-tab="${category}"]`).hidden = !allHidden;
      el.querySelector(`.nof-tab[data-tab="${category}"]`).classList.toggle("nof-invalid", allHidden);
    }
    el.querySelector('[data-chip="total"]').textContent = total;
    el.querySelector('[data-chip="hidden"]').textContent = hiddenTotal;
    el.querySelector('[data-chip="visible"]').textContent = total - hiddenTotal;

    const dirty = serializeState(this.draft) !== serializeState(this.saved);
    el.querySelector(".nof-status").hidden = !dirty;
    el.querySelector('[data-action="save"]').disabled = !dirty || emptied;
    el.querySelector('[data-action="revert"]').disabled = !dirty;
    const { hidden, shown } = diffState(this.saved, this.draft);
    el.querySelector(".nof-changes").textContent = emptied
      ? game.i18n.localize("NOF.Manager.CannotSave")
      : dirty
        ? game.i18n.format("NOF.Manager.Changes", { hidden, shown })
        : game.i18n.localize("NOF.Manager.NoChanges");
  }

  static #onTab(event, target) {
    this.activeTab = target.dataset.tab;
    for (const node of this.element.querySelectorAll("[data-tab]")) {
      if (node.matches(".nof-tab, .nof-panel")) node.classList.toggle("active", node.dataset.tab === this.activeTab);
    }
  }

  /** Default for the active tab: show everything common, hide exotic options. */
  static #onResetDefault() {
    const panel = this.element.querySelector(".nof-panel.active");
    for (const row of panel.querySelectorAll(".nof-row")) {
      const check = row.querySelector(".nof-check");
      this.draft = setHidden(this.draft, check.dataset.category, check.dataset.uuid, row.dataset.exotic === "true");
      check.checked = row.dataset.exotic === "true";
    }
    this.#syncBlocked();
    this.#applyFilter();
    this.#refresh();
  }

  static async #onRevert() {
    this.draft = parseState(this.saved);
    await this.render();
  }

  static async #onSave() {
    if (this.element.querySelector(".nof-tab.nof-invalid")) return;
    await game.settings.set(MODULE_ID, SETTINGS.hiddenOptions, serializeState(this.draft));
    this.saved = parseState(this.draft);
    ui.notifications.info(game.i18n.localize("NOF.Manager.Saved"));
    await this.close();
  }
}
