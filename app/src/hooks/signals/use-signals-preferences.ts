"use client";

import { useCallback, useEffect, useState } from "react";

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
  update: (patch: Partial<SignalsPreferences>) => void;
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(loadPreferences());
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<SignalsPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    clearPreferences();
    setPrefs({ ...DEFAULT_SIGNALS_PREFERENCES });
  }, []);

  return { prefs, ready, update, reset };
}
