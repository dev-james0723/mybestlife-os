import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadPreferences, savePreferences, normalizePreferences, clearPreferences } from "./preferences-store";
import { appendAction, loadActions, clearActions } from "./memory-store";
import { loadFollowUps, trackFollowUp } from "./followups-store";
import { DEFAULT_SIGNALS_PREFERENCES, SIGNALS_PREFS_STORAGE_KEY } from "./constants";
import type { SignalItem, SignalsPreferences } from "./types";
let data: Map<string, string>;
beforeEach(() => { data = new Map(); vi.stubGlobal("window", { localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) } }); });
afterEach(() => vi.unstubAllGlobals());
it("does not transfer preferences or consent between accounts or from an unowned legacy key", () => {
  data.set(SIGNALS_PREFS_STORAGE_KEY, JSON.stringify({ useProjects: true }));
  expect(loadPreferences("b").useProjects).toBe(false);
  expect(savePreferences({ ...DEFAULT_SIGNALS_PREFERENCES, useProjects: true, followedTopics: ["Music"] }, "a")).toBe(true);
  expect(loadPreferences("a").followedTopics).toEqual(["Music"]);
  expect(loadPreferences("b").followedTopics).toEqual([]);
  clearPreferences("b"); expect(loadPreferences("a").useProjects).toBe(true);
  expect(savePreferences(DEFAULT_SIGNALS_PREFERENCES, null)).toBe(false);
});
it("keeps reading behavior and tracked stories with their account", () => {
  appendAction({ signalId: "story", kind: "open", topic: "Music" }, "a");
  expect(loadActions("a")).toHaveLength(1); expect(loadActions("b")).toEqual([]);
  clearActions("b"); expect(loadActions("a")).toHaveLength(1);
  trackFollowUp({ id: "story", headline: "A real source story", source: { name: "Source", url: "https://example.invalid" }, sourceUrl: "https://example.invalid/story", topic: "Music" } as SignalItem, "a");
  expect(loadFollowUps("a")).toHaveLength(1); expect(loadFollowUps("b")).toEqual([]);
});
it("rejects malformed consent and recovers from unavailable browser storage", () => {
  const prefs = normalizePreferences({ useProjects: "true", followedTopics: "Music", gallery: null } as unknown as Partial<SignalsPreferences>);
  expect(prefs.useProjects).toBe(false); expect(prefs.followedTopics).toEqual([]); expect(prefs.gallery.enabled).toBe(false);
  vi.stubGlobal("window", { get localStorage() { throw new Error("storage blocked"); } });
  expect(loadPreferences("a")).toEqual(DEFAULT_SIGNALS_PREFERENCES);
  expect(loadActions("a")).toEqual([]); expect(loadFollowUps("a")).toEqual([]);
  expect(savePreferences(DEFAULT_SIGNALS_PREFERENCES, "a")).toBe(false);
});
