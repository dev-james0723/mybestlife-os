/**
 * Signals — preferences storage adapter.
 *
 * MVP uses account-scoped browser storage. The shape
 * is the durable contract; only the *backend* is provisional.
 *
 * TODO(Supabase): swap the read/write impl for a `user_signal_prefs` table
 * (per-user, RLS-scoped to auth.uid()) — migration drafted in
 * `app/supabase/migrations/*_signals.sql`. Keep this module's function
 * signatures so callers (hooks/components) don't change.
 */

import {
  DEFAULT_SIGNALS_PREFERENCES,
  SIGNALS_PREFS_STORAGE_KEY,
} from "./constants";
import type { SignalsPreferences } from "./types";
import { z } from "zod";

const strings = z.array(z.string().max(4000)).max(1000).catch([]);
const bool = z.boolean().catch(false);
const preferencesSchema = z.object({
  onboardingCompleted: bool, purposes: strings, followedTopics: strings, hiddenTopics: strings, preferredSources: strings, mutedSources: strings,
  feedIntensity: z.enum(["top3", "light", "balanced", "deep"]).catch("light"),
  tone: z.enum(["calm", "executive", "analytical", "local-first", "global-first", "career-focused", "learning-focused"]).catch("calm"),
  useBrainContext: bool, useProjects: bool, useCalendar: bool, useTasks: bool, useLocation: bool, useReadingBehavior: bool,
  viewMode: z.enum(["editorial", "grid", "table", "compact", "gallery"]).catch("editorial"),
  gallery: z.object({ enabled: bool, speed: z.enum(["slow", "normal", "fast"]).catch("slow") }).catch({ enabled: false, speed: "slow" }),
  customTopics: z.array(z.object({ id: z.string(), name: z.string(), keywords: strings, sources: strings.optional(), rssFeeds: strings.optional(), priority: z.enum(["low", "normal", "high"]), includeInTop3: bool, muted: bool, createdAt: z.string(), updatedAt: z.string() })).max(1000).catch([]),
  marketsEnabled: bool, videoEnabled: bool,
  localLocation: z.object({ city: z.string().optional(), region: z.string().optional(), country: z.string().optional(), countryCode: z.string().optional(), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), precision: z.enum(["gps", "city", "region", "manual", "unknown"]).optional() }).optional().catch(undefined),
});

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Merge a (possibly partial / legacy) stored object onto safe defaults. */
export function normalizePreferences(
  input: Partial<SignalsPreferences> | null | undefined,
): SignalsPreferences {
  return preferencesSchema.parse(input && typeof input === "object" ? input : {});
}

export function loadPreferences(userId: string | null): SignalsPreferences {
  if (!userId || !isBrowser()) return { ...DEFAULT_SIGNALS_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(`${SIGNALS_PREFS_STORAGE_KEY}:${userId}`);
    if (!raw) return { ...DEFAULT_SIGNALS_PREFERENCES };
    return normalizePreferences(JSON.parse(raw) as Partial<SignalsPreferences>);
  } catch {
    return { ...DEFAULT_SIGNALS_PREFERENCES };
  }
}

export function savePreferences(prefs: SignalsPreferences, userId: string | null): boolean {
  if (!userId || !isBrowser()) return false;
  try {
    window.localStorage.setItem(`${SIGNALS_PREFS_STORAGE_KEY}:${userId}`, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

export function clearPreferences(userId: string | null): void {
  if (!userId || !isBrowser()) return;
  try {
    window.localStorage.removeItem(`${SIGNALS_PREFS_STORAGE_KEY}:${userId}`);
  } catch {
    // ignore
  }
}
