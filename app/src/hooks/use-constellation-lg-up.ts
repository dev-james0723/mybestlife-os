"use client";

import { useSyncExternalStore } from "react";

/** Match Tailwind `lg` (1024px) — used for side-by-side constellation inspector vs. bottom bar. */
const QUERY = "(min-width: 1024px)";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/** Prefer desktop layout for SSR; mobile hydrates to the real width without duplicate inspectors. */
function getServerSnapshot() {
  return true;
}

/**
 * `true` when the viewport is wide enough for the right-side constellation inspector
 * (same as Tailwind `lg:` and `hidden lg:block` on the desktop panel).
 */
export function useIsConstellationLgUp(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
