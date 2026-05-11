"use client";

import { useCallback, useEffect, useState } from "react";
import type { MonthViewMode } from "@/lib/calendar/types";

const STORAGE_KEY = "mylifeos.calendar.monthViewMode";
const VALID: readonly MonthViewMode[] = ["complete", "minimal", "orbital"];

function readStored(): MonthViewMode {
  if (typeof window === "undefined") return "complete";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && (VALID as readonly string[]).includes(raw)) {
      return raw as MonthViewMode;
    }
  } catch {
    /* ignore quota / privacy errors */
  }
  return "complete";
}

/**
 * Manages the active Month tab variant and persists it to localStorage.
 *
 * Server-render safe — always initializes to `"complete"` and hydrates
 * to the stored value after mount to avoid hydration mismatch.
 */
export function useMonthViewMode(): readonly [
  MonthViewMode,
  (mode: MonthViewMode) => void,
] {
  const [mode, setMode] = useState<MonthViewMode>("complete");

  useEffect(() => {
    // Hydrate from localStorage after mount — cannot run during SSR. A
    // setState here is unavoidable (no external subscription to bind to).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(readStored());
  }, []);

  const setAndPersist = useCallback((next: MonthViewMode) => {
    setMode(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    }
  }, []);

  return [mode, setAndPersist] as const;
}
