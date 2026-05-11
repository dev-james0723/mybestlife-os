"use client";

import { useEffect, useState } from "react";

/**
 * Tick the returned Date once every second, aligned to the next wall-
 * clock second so the visible digits change at the same moment as the
 * OS clock rather than drifting by whatever fraction React mounted at.
 *
 * Intentionally NOT using rAF — a 1 Hz setInterval is cheaper and we
 * don't need sub-second precision for the clock pill / panel.
 */
export function useCurrentTime(): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const firstDelay = 1000 - (Date.now() % 1000);
    const firstTimer = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 1000);
    }, firstDelay);
    return () => {
      clearTimeout(firstTimer);
      if (interval) clearInterval(interval);
    };
  }, []);
  return now;
}
