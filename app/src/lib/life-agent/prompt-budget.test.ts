import { describe, expect, it } from "vitest";
import {
  clampChatHistory,
  clampMessageContent,
  truncateContextText,
} from "@/lib/life-agent/prompt-budget";

describe("prompt-budget", () => {
  it("truncates long message content", () => {
    const long = "a".repeat(3000);
    const out = clampMessageContent(long, 100);
    expect(out.length).toBeLessThan(120);
    expect(out).toContain("truncated");
  });

  it("truncates context block", () => {
    const long = "x".repeat(20_000);
    expect(truncateContextText(long, 500).length).toBeLessThan(600);
  });

  it("clamps each history turn", () => {
    const history = clampChatHistory([
      { role: "user", content: "u".repeat(5000) },
      { role: "assistant", content: "ok" },
    ]);
    expect(history[0].content).toContain("truncated");
    expect(history[1].content).toBe("ok");
  });
});
