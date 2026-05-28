import { describe, expect, it } from "vitest";
import {
  MAX_CHINESE_TITLE_CHARS,
  MAX_ENGLISH_TITLE_WORDS,
  clampIdeaTitle,
} from "./clamp-idea-title";

describe("clampIdeaTitle", () => {
  it("keeps short Chinese titles intact", () => {
    expect(clampIdeaTitle("日本家庭旅行")).toBe("日本家庭旅行");
    expect(clampIdeaTitle("家庭活動計劃")).toBe("家庭活動計劃");
  });

  it("clamps Chinese titles to the char limit", () => {
    const long = "一二三四五六七八九十十一十二";
    const clamped = clampIdeaTitle(long);
    expect([...clamped].filter((c) => /\p{Script=Han}/u.test(c))).toHaveLength(
      MAX_CHINESE_TITLE_CHARS,
    );
  });

  it("keeps short English titles intact", () => {
    expect(clampIdeaTitle("US Brand Idea")).toBe("US Brand Idea");
    expect(clampIdeaTitle("D Festival Ops")).toBe("D Festival Ops");
  });

  it("clamps English titles by words, not letters", () => {
    const long = "one two three four five six seven eight nine ten";
    const clamped = clampIdeaTitle(long);
    expect(clamped.split(" ")).toHaveLength(MAX_ENGLISH_TITLE_WORDS);
    // Multi-letter words survive — the old letter-based clamp would have
    // butchered this into "one two t".
    expect(clamped).toBe("one two three four five six seven eight");
  });

  it("strips trailing punctuation and quotes", () => {
    expect(clampIdeaTitle("US Brand Idea.")).toBe("US Brand Idea");
    expect(clampIdeaTitle("“日本旅行”")).toBe("日本旅行");
    expect(clampIdeaTitle("賞櫻旅行計劃。")).toBe("賞櫻旅行計劃");
  });

  it("strips HTML entities and QUESTION/ANS prefixes", () => {
    expect(clampIdeaTitle("QUESTION: US Brand Idea")).toBe("US Brand Idea");
    expect(clampIdeaTitle("日本旅行&nbsp;")).toBe("日本旅行");
  });
});
