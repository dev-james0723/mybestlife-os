import { describe, expect, it } from "vitest";

import {
  AI_KNOWLEDGE_CHAT_TOOLS,
  getAITool,
} from "@/lib/ai/tool-registry";

const PREFILL_TOOLS = [
  ["chatgpt", "https://chatgpt.com/"],
  ["claude", "https://claude.ai/new"],
  ["gemini", "https://gemini.google.com/app"],
  ["grok", "https://grok.com/"],
] as const;

describe("AI tool prompt URLs", () => {
  it("exposes the five requested AI Knowledge chat choices", () => {
    expect(AI_KNOWLEDGE_CHAT_TOOLS.map((tool) => tool.id)).toEqual([
      "chatgpt",
      "gemini",
      "claude",
      "grok",
      "deepseek",
    ]);
  });

  it("round-trips prompt text through every supported prefill URL", () => {
    const prompt = "Review {résumé} & explain 2 + 2?\n繁體中文 #1";

    for (const [id] of PREFILL_TOOLS) {
      const tool = getAITool(id);
      const url = new URL(tool.buildUrl(prompt));

      expect(tool.supportsUrlPrefill, id).toBe(true);
      expect(tool.urlPrefillCharLimit, id).toBeGreaterThanOrEqual(prompt.length);
      expect(url.searchParams.get("q"), id).toBe(prompt);
    }
  });

  it("returns each tool's clean landing URL when no prompt is supplied", () => {
    for (const [id, baseUrl] of PREFILL_TOOLS) {
      const url = getAITool(id).buildUrl("");

      expect(url, id).toBe(baseUrl);
      expect(new URL(url).searchParams.has("q"), id).toBe(false);
    }
  });

  it("uses DeepSeek's documented chat URL with clipboard hand-off", () => {
    const tool = getAITool("deepseek");

    expect(tool.buildUrl("private prompt text")).toBe(
      "https://chat.deepseek.com/",
    );
    expect(tool.supportsUrlPrefill).toBe(false);
    expect(tool.urlPrefillCharLimit).toBe(0);
  });
});
