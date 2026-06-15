"use client";

import { useEffect, useState } from "react";

type DeferredClientMountOptions = {
  timeoutMs?: number;
  fallbackDelayMs?: number;
};

type WindowWithOptionalIdleCallback = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

export function useDeferredClientMount({
  timeoutMs = 2_000,
  fallbackDelayMs = 1_200,
}: DeferredClientMountOptions = {}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const markReady = () => {
      if (!cancelled) setReady(true);
    };

    const idleWindow = window as WindowWithOptionalIdleCallback;
    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(markReady, { timeout: timeoutMs });
    } else {
      timeoutId = window.setTimeout(markReady, fallbackDelayMs);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [fallbackDelayMs, ready, timeoutMs]);

  return ready;
}
