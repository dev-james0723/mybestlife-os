import { describe, expect, it } from "vitest";

import { pickOSBuddyDragEndLine } from "./os-buddy-drag-lines";

describe("pickOSBuddyDragEndLine", () => {
  it("starts with one of the requested friendly placement phrases", () => {
    expect(pickOSBuddyDragEndLine("en", 0)).toBe("A good spot.");
  });

  it("varies English placement lines and avoids the old fixed copy", () => {
    const lines = Array.from({ length: 28 }, (_, index) =>
      pickOSBuddyDragEndLine("en", index / 28),
    );

    expect(new Set(lines).size).toBeGreaterThan(20);
    expect(lines).not.toContain("Nice spot.");
  });

  it("does not repeat the same placement line back to back", () => {
    const first = pickOSBuddyDragEndLine("en", 0.5);
    const second = pickOSBuddyDragEndLine("en", 0.5);

    expect(second).not.toBe(first);
  });

  it("supports Traditional Chinese placement lines without using the old copy", () => {
    const first = pickOSBuddyDragEndLine("zh-TW", 0);
    const second = pickOSBuddyDragEndLine("zh-TW", 0);

    expect(first).toBe("好位置。");
    expect(second).not.toBe(first);
    expect([first, second]).not.toContain("這個位置不錯。");
  });
});
