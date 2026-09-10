"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { DEFAULT_SIGNALS_PREFERENCES } from "@/lib/signals/constants";
import {
  clearPreferences,
  loadPreferences,
  savePreferences,
} from "@/lib/signals/preferences-store";
import type { SignalsPreferences } from "@/lib/signals/types";

export type UseSignalsPreferencesReturn = {
  prefs: SignalsPreferences;
  /** True once localStorage has been read (avoids SSR/first-paint flicker). */
  ready: boolean;
  update: (patch: Partial<SignalsPreferences>) => boolean;
  storageError: boolean;
  reset: () => void;
};

/**
 * Per-user Signals preferences, persisted to localStorage for MVP.
 *
 * TODO(Supabase): back this with `user_signal_prefs` via a repository — the
 * hook surface stays identical so no component changes are needed.
 */
export function useSignalsPreferences(): UseSignalsPreferencesReturn {
  const [prefs, setPrefs] = useState<SignalsPreferences>(DEFAULT_SIGNALS_PREFERENCES);
  const { user, isLoading } = useAuth();
  const userId = user?.id ?? null;
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);
  const [storageError, setStorageError] = useState(false);
  const latest = useRef({ userId, prefs: DEFAULT_SIGNALS_PREFERENCES });

  useEffect(() => {
    if (isLoading) return;
    const restored = loadPreferences(userId);
    latest.current = { userId, prefs: restored };
    setPrefs(restored);
    setStorageError(false);
    setLoadedFor(userId);
  }, [userId, isLoading]);

  const update = useCallback((patch: Partial<SignalsPreferences>) => {
    const next = { ...(latest.current.userId === userId ? latest.current.prefs : DEFAULT_SIGNALS_PREFERENCES), ...patch };
    latest.current = { userId, prefs: next };
    const saved = savePreferences(next, userId);
    setPrefs(next);
    setStorageError(!saved);
    return saved;
  }, [userId]);

  const reset = useCallback(() => {
    clearPreferences(userId);
    latest.current = { userId, prefs: DEFAULT_SIGNALS_PREFERENCES };
    setPrefs({ ...DEFAULT_SIGNALS_PREFERENCES });
  }, [userId]);

  return { prefs: loadedFor === userId ? prefs : DEFAULT_SIGNALS_PREFERENCES, ready: !isLoading && loadedFor === userId, update, reset, storageError };
}
