import { describe, expect, it } from "vitest";
import { diffState, emptyState, filterResult, isHidden, parseState, serializeState, setHidden } from "../scripts/lib/filter-state.js";
import { markExoticBonuses, splitSections } from "../scripts/lib/options-source.js";

describe("parseState", () => {
  it("returns empty state for bad input", () => {
    expect(parseState("not json")).toEqual(emptyState());
    expect(parseState(null)).toEqual(emptyState());
    expect(parseState("[]")).toEqual(emptyState());
  });
  it("drops unknown keys, non-strings and duplicates", () => {
    const s = parseState('{"class":["a","a",1,""],"bogus":["x"]}');
    expect(s.class).toEqual(["a"]);
    expect(s.bogus).toBeUndefined();
  });
});

describe("serializeState", () => {
  it("round-trips and sorts", () => {
    const s = { ...emptyState(), class: ["b", "a"] };
    expect(parseState(serializeState(s)).class).toEqual(["a", "b"]);
  });
});

describe("setHidden / isHidden", () => {
  it("hides and shows without mutating input", () => {
    const base = emptyState();
    const hidden = setHidden(base, "class", "u1", true);
    expect(isHidden(hidden, "class", "u1")).toBe(true);
    expect(base.class).toEqual([]);
    expect(isHidden(setHidden(hidden, "class", "u1", false), "class", "u1")).toBe(false);
  });
});

describe("filterResult", () => {
  const state = { ...emptyState(), class: ["c1"], ancestry: ["a2"] };
  it("filters plain lists", () => {
    expect(filterResult([{ uuid: "c1" }, { uuid: "c2" }], state, "class")).toEqual([{ uuid: "c2" }]);
  });
  it("filters core/exotic objects", () => {
    const r = filterResult({ core: [{ uuid: "a1" }], exotic: [{ uuid: "a2" }] }, state, "ancestry");
    expect(r).toEqual({ core: [{ uuid: "a1" }] });
  });
  it("removes a core/exotic group that ends up empty", () => {
    const s = { ...emptyState(), ancestry: ["a2"] };
    const r = filterResult({ core: [{ uuid: "a1" }], exotic: [{ uuid: "a2" }] }, s, "ancestry");
    expect(r).toEqual({ core: [{ uuid: "a1" }] });
    expect(Object.keys(r)).toEqual(["core"]);
  });
  it("hides ancestries whose default bonus is hidden", () => {
    const s = { ...emptyState(), ancestryBonus: ["b1"] };
    const list = { core: [{ uuid: "a1", system: { defaultBonus: "b1" } }, { uuid: "a2", system: { defaultBonus: "b2" } }, { uuid: "a3", system: {} }], exotic: [] };
    expect(filterResult(list, s, "ancestry").core.map((a) => a.uuid)).toEqual(["a2", "a3"]);
  });
  it("does not hide a bonus when its ancestry is hidden", () => {
    const s = { ...emptyState(), ancestry: ["a1"] };
    expect(filterResult([{ uuid: "b1" }], s, "ancestryBonus")).toEqual([{ uuid: "b1" }]);
  });
  it("passes through unknown shapes", () => {
    expect(filterResult(null, state, "class")).toBeNull();
  });
});

describe("splitSections", () => {
  it("lists common first then exotic, each sorted by name", () => {
    const rows = [
      { name: "b", source: "X", exotic: true },
      { name: "z", source: "X", exotic: false },
      { name: "a", source: "X", exotic: true },
      { name: "c", source: "X", exotic: false }
    ];
    const sections = splitSections(rows);
    expect(sections.map((s) => s.key)).toEqual(["common", "exotic"]);
    expect(sections[0].rows.map((r) => r.name)).toEqual(["c", "z"]);
    expect(sections[1].rows.map((r) => r.name)).toEqual(["a", "b"]);
  });
  it("drops empty sections", () => {
    expect(splitSections([{ name: "a", source: "X", exotic: false }]).map((s) => s.key)).toEqual(["common"]);
  });
});

describe("markExoticBonuses", () => {
  it("marks bonuses that are the default of an exotic ancestry only", () => {
    const options = {
      ancestry: [
        { exotic: true, defaultBonus: "b1" },
        { exotic: false, defaultBonus: "b2" },
        { exotic: true, defaultBonus: null }
      ],
      ancestryBonus: [
        { uuid: "b1", exotic: false },
        { uuid: "b2", exotic: false },
        { uuid: "b3", exotic: false }
      ]
    };
    markExoticBonuses(options);
    expect(options.ancestryBonus.map((b) => b.exotic)).toEqual([true, false, false]);
  });
});

describe("diffState", () => {
  it("counts newly hidden and newly shown", () => {
    const a = { ...emptyState(), class: ["x", "y"] };
    const b = { ...emptyState(), class: ["y", "z"], background: ["w"] };
    expect(diffState(a, b)).toEqual({ hidden: 2, shown: 1 });
  });
});
