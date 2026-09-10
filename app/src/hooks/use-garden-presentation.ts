"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  GARDEN_PRESENTATION_EVENT,
  gardenPresentationKey,
  normalizeGardenPresentation,
  type GardenPresentation,
} from "@/lib/garden/presentation";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(GARDEN_PRESENTATION_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(GARDEN_PRESENTATION_EVENT, onChange);
  };
}
const transient = new Map<string, string>();
function read(key: string) {
  try {
    return localStorage.getItem(key) ?? transient.get(key) ?? "";
  } catch {
    return transient.get(key) ?? "";
  }
}
export function useGardenPresentation(userId: string) {
  const key = gardenPresentationKey(userId);
  const getSnapshot = useCallback(() => read(key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const presentation = useMemo(() => {
    try {
      return normalizeGardenPresentation(JSON.parse(raw || "{}"));
    } catch {
      return normalizeGardenPresentation(null);
    }
  }, [raw]);
  const update = useCallback(
    (patch: Partial<GardenPresentation>) => {
      let previous = {};
      try {
        previous = JSON.parse(read(key) || "{}");
      } catch {
        /* Repair invalid optional preferences. */
      }
      const value = JSON.stringify(
        normalizeGardenPresentation({
          ...normalizeGardenPresentation(previous),
          ...patch,
        }),
      );
      transient.set(key, value);
      try {
        localStorage.setItem(key, value);
      } catch {
        /* Current session remains functional without storage. */
      }
      window.dispatchEvent(new Event(GARDEN_PRESENTATION_EVENT));
    },
    [key],
  );
  return { presentation, update };
}
