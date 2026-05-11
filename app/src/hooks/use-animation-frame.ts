"use client";

import { useEffect, useState } from "react";

/**
 * Returns `Date.now()` refreshed once per animation frame while `active`
 * is true. Used by Timer / Stopwatch to drive millisecond-precision UI
 * without wasting CPU when the panel is closed.
 *
 * We intentionally don't pass `now` through a callback — consumers read
 * the returned timestamp and compute their own derived values (remaining
 * ms, elapsed ms) from it. Keeps derivation pure.
 */
export function useAnimationFrameTick(active: boolean): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return now;
}
