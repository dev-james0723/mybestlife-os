"use client";

import { useSyncExternalStore } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Framer's reduced-motion preference is client-only. Returning a stable default
 * through hydration prevents server/client markup drift in shared chrome.
 */
export function useSsrSafeReducedMotion(defaultReduced = true): boolean {
  const prefersReducedMotion = useReducedMotion();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return defaultReduced;
  return prefersReducedMotion ?? defaultReduced;
}
