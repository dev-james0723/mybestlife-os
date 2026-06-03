"use client";

import { useSyncExternalStore } from "react";
import {
  getPrefersReducedMotion,
  subscribeToReducedMotion,
} from "@/lib/motion/reduced-motion";

export function useReducedMotion(defaultReduced = true) {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => getPrefersReducedMotion(defaultReduced),
    () => defaultReduced,
  );
}

