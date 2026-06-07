"use client";

import { useEffect, useMemo } from "react";
import { useActiveFocusSession } from "@/hooks/use-active-focus-session";
import { useFocusPreferences } from "@/hooks/use-focus-preferences";

export const LOW_STIMULATION_ROOT_CLASS = "mylifeos-low-stimulation-mode";

export function useLowStimulationMode() {
  const { data: activeSession } = useActiveFocusSession();
  const { data: preferences } = useFocusPreferences();

  const enabled = useMemo(() => {
    if (!preferences?.low_stimulation_mode_enabled) return false;
    return activeSession?.status === "running" || activeSession?.status === "paused";
  }, [activeSession?.status, preferences?.low_stimulation_mode_enabled]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle(LOW_STIMULATION_ROOT_CLASS, enabled);
    return () => {
      root.classList.remove(LOW_STIMULATION_ROOT_CLASS);
    };
  }, [enabled]);

  return {
    enabled,
    activeSession,
    preferences,
  };
}
