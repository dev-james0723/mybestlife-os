import { describe, expect, it } from "vitest";
import { isSuggestionTooSimilar, textOverlapRatio } from "./idea-suggestion-guard";

describe("isSuggestionTooSimilar", () => {
  const content =
    "我想做一個 Oodie-style hooded scarf product，target 美國市場，視覺想偏 premium winter lifestyle。";

  it("flags a near-verbatim echo of the content", () => {
    expect(isSuggestionTooSimilar(content, content)).toBe(true);
    expect(
      isSuggestionTooSimilar(
        "我想做一個 Oodie-style hooded scarf product target 美國市場",
        content,
      ),
    ).toBe(true);
  });

  it("allows a genuine, differently-worded insight", () => {
    expect(
      isSuggestionTooSimilar(
        "這是一個以美國冬季生活場景為核心的 DTC 產品構想。",
        content,
      ),
    ).toBe(false);
  });

  it("treats empty suggestions as duplicates (nothing useful to show)", () => {
    expect(isSuggestionTooSimilar("", content)).toBe(true);
    expect(isSuggestionTooSimilar("   ", content)).toBe(true);
  });
});

describe("textOverlapRatio", () => {
  it("is 1 for identical text and low for unrelated text", () => {
    expect(textOverlapRatio("hello world", "hello world")).toBe(1);
    expect(textOverlapRatio("alpha beta", "gamma delta")).toBe(0);
  });
});
