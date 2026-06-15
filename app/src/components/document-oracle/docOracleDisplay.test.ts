import { describe, expect, it } from "vitest";
import {
  cleanDisplayTags,
  getDisplayLanguage,
  sanitizeDisplayTag,
} from "./docOracleDisplay";

describe("Doc Oracle display helpers", () => {
  it("normalizes common language codes and slugs for display", () => {
    expect(getDisplayLanguage("ZH")).toBe("中文");
    expect(getDisplayLanguage("zh-Hant")).toBe("繁體中文");
    expect(getDisplayLanguage("traditional_chinese")).toBe("繁體中文");
    expect(getDisplayLanguage("ZH-HANS")).toBe("簡體中文");
    expect(getDisplayLanguage("en")).toBe("English");
    expect(getDisplayLanguage("ja")).toBe("日本語");
    expect(getDisplayLanguage("mixed")).toBe("多語言");
    expect(getDisplayLanguage("")).toBe("Unknown");
  });

  it("filters internal implementation terms from display tags", () => {
    expect(sanitizeDisplayTag("MinorU")).toBeNull();
    expect(sanitizeDisplayTag("mineru")).toBeNull();
    expect(sanitizeDisplayTag("document_pages")).toBeNull();
    expect(sanitizeDisplayTag("parser_output")).toBeNull();
    expect(cleanDisplayTags(["research_paper", "Finance", "finance", "document_chunks", "very-long-tag-name-for-layout"], 3)).toEqual({
      tags: ["Research Paper", "Finance", "Very Long Tag Name For Layo…"],
      overflow: 0,
    });
  });
});
