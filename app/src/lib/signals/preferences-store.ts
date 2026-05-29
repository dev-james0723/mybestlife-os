/**
 * Signals — preferences storage adapter.
 *
 * MVP uses localStorage (privacy-safe, instant, zero migration risk). The shape
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

function isBrowser(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/** Merge a (possibly partial / legacy) stored object onto safe defaults. */
export function normalizePreferences(
  input: Partial<SignalsPreferences> | null | undefined,
): SignalsPreferences {
  if (!input) return { ...DEFAULT_SIGNALS_PREFERENCES };
  return {
    ...DEFAULT_SIGNALS_PREFERENCES,
    ...input,
    purposes: input.purposes ?? [],
    followedTopics: input.followedTopics ?? [],
    hiddenTopics: input.hiddenTopics ?? [],
    preferredSources: input.preferredSources ?? [],
    mutedSources: input.mutedSources ?? [],
    localLocation: input.localLocation,
    // Visual / personalization upgrade — tolerate older stored shapes.
    viewMode: input.viewMode ?? DEFAULT_SIGNALS_PREFERENCES.viewMode,
    gallery: {
      ...DEFAULT_SIGNALS_PREFERENCES.gallery,
      ...(input.gallery ?? {}),
    },
    customTopics: input.customTopics ?? [],
    marketsEnabled: input.marketsEnabled ?? DEFAULT_SIGNALS_PREFERENCES.marketsEnabled,
    videoEnabled: input.videoEnabled ?? DEFAULT_SIGNALS_PREFERENCES.videoEnabled,
  };
}

export function loadPreferences(): SignalsPreferences {
  if (!isBrowser()) return { ...DEFAULT_SIGNALS_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(SIGNALS_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SIGNALS_PREFERENCES };
    return normalizePreferences(JSON.parse(raw) as Partial<SignalsPreferences>);
  } catch {
    return { ...DEFAULT_SIGNALS_PREFERENCES };
  }
}

export function savePreferences(prefs: SignalsPreferences): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SIGNALS_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full / disabled — non-fatal; prefs simply won't persist.
  }
}

export function clearPreferences(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(SIGNALS_PREFS_STORAGE_KEY);
  } catch {
    // ignore
  }
}
