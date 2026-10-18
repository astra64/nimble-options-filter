import { CATEGORIES } from "../constants.js";

export const WORLD_SOURCE = "World";

/**
 * Sort rows by name (then source) and split into common and exotic sections, common first.
 * Empty sections are dropped.
 */
export function splitSections(rows) {
  const collator = new Intl.Collator(undefined, { sensitivity: "base" });
  const sorted = [...rows].sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.source, b.source));
  return [
    { key: "common", rows: sorted.filter((r) => !r.exotic) },
    { key: "exotic", rows: sorted.filter((r) => r.exotic) }
  ].filter((s) => s.rows.length);
}

/**
 * An ancestry bonus is exotic when it is the default bonus of an exotic ancestry.
 * Mutates and returns `options` ({ [category]: row[] }).
 */
export function markExoticBonuses(options) {
  const exoticDefaults = new Set(
    (options.ancestry ?? []).filter((a) => a.exotic && a.defaultBonus).map((a) => a.defaultBonus)
  );
  for (const bonus of options.ancestryBonus ?? []) {
    if (exoticDefaults.has(bonus.uuid)) bonus.exotic = true;
  }
  return options;
}

function toRow(category, uuid, name, img, source, exotic, defaultBonus) {
  return {
    category,
    uuid,
    name: name ?? uuid,
    img: img ?? "icons/svg/mystery-man.svg",
    source,
    exotic: !!exotic,
    defaultBonus: defaultBonus || null
  };
}

/**
 * Every option Nimble's creation dialog could list: world Items plus compendium index entries,
 * per category. Returns { [category]: row[] }.
 */
export async function listOptions() {
  const out = Object.fromEntries(CATEGORIES.map((c) => [c, []]));

  for (const item of game.items) {
    if (!out[item.type]) continue;
    out[item.type].push(
      toRow(item.type, item.uuid, item.name, item.img, WORLD_SOURCE, item.system?.exotic, item.system?.defaultBonus)
    );
  }

  const fields = ["img", "system.exotic", "system.defaultBonus"];
  for (const pack of game.packs) {
    if (pack.documentName !== "Item") continue;
    const index = await pack.getIndex({ fields });
    for (const entry of index) {
      if (!out[entry.type]) continue;
      out[entry.type].push(
        toRow(
          entry.type,
          entry.uuid,
          entry.name,
          entry.img,
          pack.metadata.label,
          foundry.utils.getProperty(entry, "system.exotic"),
          foundry.utils.getProperty(entry, "system.defaultBonus")
        )
      );
    }
  }
  return markExoticBonuses(out);
}
