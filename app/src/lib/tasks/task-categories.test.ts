import { describe, expect, it } from "vitest";

import {
  collectTaskCategories,
  deriveTaskCategory,
  normalizeCategory,
  resolveTaskCategory,
} from "./task-categories";

describe("normalizeCategory", () => {
  it("lowercases and trims; empty -> null", () => {
    expect(normalizeCategory("  Business ")).toBe("business");
    expect(normalizeCategory("")).toBeNull();
    expect(normalizeCategory(null)).toBeNull();
  });
});

describe("deriveTaskCategory", () => {
  it("prefers an exact canonical tag", () => {
    expect(
      deriveTaskCategory({ tags: ["finance"], source: null, title: "anything" }),
    ).toBe("finance");
  });

  it("infers from title keywords", () => {
    expect(
      deriveTaskCategory({ tags: [], source: null, title: "Practice piano scales" }),
    ).toBe("music");
    expect(
      deriveTaskCategory({
        tags: [],
        source: null,
        title: "Email the sponsor about the contract",
      }),
    ).toBe("business");
  });

  it("returns null when nothing matches", () => {
    expect(deriveTaskCategory({ tags: [], source: null, title: "zzz qqq" })).toBeNull();
  });
});

describe("resolveTaskCategory", () => {
  it("explicit category wins over heuristics", () => {
    expect(
      resolveTaskCategory({
        tags: ["music"],
        source: null,
        title: "piano",
        category: "Personal",
      }),
    ).toBe("personal");
  });
});

describe("collectTaskCategories", () => {
  it("returns canonical-ordered present categories then custom extras", () => {
    const cats = collectTaskCategories([
      { tags: ["finance"], source: null, title: "" },
      { tags: [], source: null, title: "piano practice" },
      { tags: [], source: null, title: "", category: "custom-x" },
    ]);
    expect(cats).toEqual(["music", "finance", "custom-x"]);
  });
});
