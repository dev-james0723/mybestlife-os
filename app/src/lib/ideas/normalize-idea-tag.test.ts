import { describe, expect, it } from "vitest";
import {
  clampIdeaTag,
  dedupeIdeaTags,
  isBadIdeaTag,
  normalizeIdeaTag,
  normalizeIdeaTags,
} from "./normalize-idea-tag";

describe("normalizeIdeaTag", () => {
  it("keeps short Traditional Chinese keywords", () => {
    expect(normalizeIdeaTag("日本")).toBe("日本");
    expect(normalizeIdeaTag("東京")).toBe("東京");
    expect(normalizeIdeaTag("新幹線")).toBe("新幹線");
    expect(normalizeIdeaTag("家庭")).toBe("家庭");
  });

  it("keeps Latin proper nouns and short phrases", () => {
    expect(normalizeIdeaTag("ChatGPT")).toBe("ChatGPT");
    expect(normalizeIdeaTag("New York")).toBe("New York");
    expect(normalizeIdeaTag("US market")).toBe("US market");
  });

  it("strips hashes and surrounding whitespace", () => {
    expect(normalizeIdeaTag("#travel")).toBe("travel");
    expect(normalizeIdeaTag("  ＃旅行  ")).toBe("旅行");
  });

  it("rejects full Chinese sentences", () => {
    expect(normalizeIdeaTag("今日諗到去日本旅行")).toBeNull();
    expect(normalizeIdeaTag("帶阿爸阿媽去賞櫻")).toBeNull();
    expect(normalizeIdeaTag("由東京搭新幹線去日本")).toBeNull();
    expect(normalizeIdeaTag("創立品牌並打算以美國市場為中心")).toBeNull();
  });

  it("rejects Latin sentence fragments and clauses", () => {
    expect(normalizeIdeaTag("I want to build a brand")).toBeNull();
    expect(normalizeIdeaTag("targeting the US market with an Oodie")).toBeNull();
  });

  it("rejects vague filler tags", () => {
    expect(normalizeIdeaTag("random")).toBeNull();
    expect(normalizeIdeaTag("text")).toBeNull();
    expect(normalizeIdeaTag("captured")).toBeNull();
    expect(normalizeIdeaTag("note")).toBeNull();
  });

  it("rejects tags with sentence punctuation", () => {
    expect(normalizeIdeaTag("日本，旅行")).toBeNull();
    expect(normalizeIdeaTag("travel, family")).toBeNull();
  });
});

describe("isBadIdeaTag", () => {
  it("flags over-long CJK tags", () => {
    expect(isBadIdeaTag("創立品牌並打算以美國市場為中心")).toBe(true);
    expect(isBadIdeaTag("日本")).toBe(false);
  });

  it("flags over-long Latin tags", () => {
    expect(isBadIdeaTag("premium winter lifestyle direct to consumer")).toBe(true);
    expect(isBadIdeaTag("brand strategy")).toBe(false);
  });
});

describe("dedupeIdeaTags", () => {
  it("removes case-insensitive duplicates, keeping first", () => {
    expect(dedupeIdeaTags(["Travel", "travel", "日本", "日本"])).toEqual([
      "Travel",
      "日本",
    ]);
  });
});

describe("normalizeIdeaTags (full pipeline)", () => {
  it("extracts clean tags from a mixed list, dropping sentences", () => {
    const input = [
      "日本",
      "東京",
      "旅行",
      "家庭",
      "新幹線",
      "今日諗到去日本旅行", // sentence — dropped
      "#日本", // dup after strip — dropped
    ];
    expect(normalizeIdeaTags(input)).toEqual([
      "日本",
      "東京",
      "旅行",
      "家庭",
      "新幹線",
    ]);
  });

  it("caps the number of tags", () => {
    const many = Array.from({ length: 20 }, (_, i) => `tag${i}`);
    expect(normalizeIdeaTags(many, 8)).toHaveLength(8);
  });

  it("returns empty array for non-array input", () => {
    expect(normalizeIdeaTags(null)).toEqual([]);
    expect(normalizeIdeaTags("日本")).toEqual([]);
  });
});

describe("clampIdeaTag", () => {
  it("returns null rather than truncating long data", () => {
    expect(clampIdeaTag("由東京搭新幹線去日本旅行賞櫻")).toBeNull();
    expect(clampIdeaTag("日本")).toBe("日本");
  });
});
