import { CATEGORIES } from "../constants.js";

export function emptyState() {
  return Object.fromEntries(CATEGORIES.map((c) => [c, []]));
}

/** Parse the stored JSON string. Never throws; unknown keys and non-string entries are dropped. */
export function parseState(raw) {
  const state = emptyState();
  let data;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return state;
  }
  if (!data || typeof data !== "object") return state;
  for (const category of CATEGORIES) {
    const list = data[category];
    if (Array.isArray(list)) state[category] = [...new Set(list.filter((u) => typeof u === "string" && u))];
  }
  return state;
}

export function serializeState(state) {
  const clean = emptyState();
  for (const category of CATEGORIES) clean[category] = [...new Set(state?.[category] ?? [])].sort();
  return JSON.stringify(clean);
}

export function isHidden(state, category, uuid) {
  return !!state?.[category]?.includes(uuid);
}

/** Return a new state with uuid hidden/shown in category. */
export function setHidden(state, category, uuid, hidden) {
  const next = parseState(state);
  const set = new Set(next[category]);
  if (hidden) set.add(uuid);
  else set.delete(uuid);
  next[category] = [...set];
  return next;
}

/**
 * An ancestry cannot work without its default bonus, so it counts as hidden whenever that
 * bonus is hidden. Derived at use time, never stored.
 */
export function isAncestryBlocked(state, defaultBonus) {
  return !!defaultBonus && isHidden(state, "ancestryBonus", defaultBonus);
}

/** Drop hidden entries from a list of items. `getUuid` defaults to item.uuid. */
export function filterList(list, state, category, getUuid = (item) => item?.uuid) {
  if (!Array.isArray(list)) return list;
  const hidden = new Set(state?.[category] ?? []);
  const blocked = category === "ancestry" ? (item) => isAncestryBlocked(state, item?.system?.defaultBonus) : () => false;
  if (!hidden.size && !state?.ancestryBonus?.length) return list;
  return list.filter((item) => !hidden.has(getUuid(item)) && !blocked(item));
}

/**
 * Filter a method result: a plain list, or an ancestry-style `{ core, exotic }` object.
 * In the object form a group left empty is removed, because Nimble draws one titled section
 * per key and would otherwise show a heading with nothing under it.
 */
export function filterResult(result, state, category) {
  if (Array.isArray(result)) return filterList(result, state, category);
  if (result && typeof result === "object") {
    const out = {};
    for (const [key, value] of Object.entries(result)) {
      if (!Array.isArray(value)) {
        out[key] = value;
        continue;
      }
      const filtered = filterList(value, state, category);
      if (filtered.length) out[key] = filtered;
    }
    return out;
  }
  return result;
}

/** Changes between two states, e.g. for a "+2 hidden, -1 hidden" line. */
export function diffState(before, after) {
  let hidden = 0;
  let shown = 0;
  for (const category of CATEGORIES) {
    const a = new Set(before?.[category] ?? []);
    const b = new Set(after?.[category] ?? []);
    for (const u of b) if (!a.has(u)) hidden++;
    for (const u of a) if (!b.has(u)) shown++;
  }
  return { hidden, shown };
}
