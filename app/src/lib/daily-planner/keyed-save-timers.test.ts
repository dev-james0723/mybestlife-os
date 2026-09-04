import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearKeyedSaveTimer,
  replaceKeyedSaveTimer,
  type KeyedSaveTimerMap,
} from "./keyed-save-timers";

describe("keyed planner save timers", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("keeps pending saves for different dates independent", () => {
    const timers: KeyedSaveTimerMap = new Map();
    const saved: string[] = [];

    replaceKeyedSaveTimer(timers, "2026-09-03", () => saved.push("A"), 600);
    replaceKeyedSaveTimer(timers, "2026-09-04", () => saved.push("B"), 600);
    clearKeyedSaveTimer(timers, "2026-09-04");
    vi.advanceTimersByTime(600);

    expect(saved).toEqual(["A"]);
    expect(timers.size).toBe(0);
  });

  it("replaces only the older save for the same date", () => {
    const timers: KeyedSaveTimerMap = new Map();
    const saved: string[] = [];

    replaceKeyedSaveTimer(timers, "2026-09-03", () => saved.push("old"), 600);
    replaceKeyedSaveTimer(timers, "2026-09-03", () => saved.push("new"), 600);
    vi.advanceTimersByTime(600);

    expect(saved).toEqual(["new"]);
  });
});
