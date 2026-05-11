"use client";

import { useEffect, useRef, useState } from "react";
import type { OrbitalDay } from "@/lib/calendar/types";

/**
 * Drives the orbital bubbles' angular progression. Returns a map of
 * `date -> current angle (radians)` updated every animation frame.
 *
 * - Respects `prefers-reduced-motion` — freezes at initial angles.
 * - A bubble can be paused by passing its `date` in `pausedDates`
 *   (hover / selection). Others keep revolving.
 * - Automatically stops the loop when the document is hidden or the
 *   component unmounts.
 */
export function useOrbitalAnimation(
  days: readonly OrbitalDay[],
  pausedDates: ReadonlySet<string> = new Set(),
  options: { reducedMotion?: boolean } = {}
): Record<string, number> {
  const [angles, setAngles] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const d of days) out[d.date] = d.angle;
    return out;
  });
  const startRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const accumulatedRef = useRef<Record<string, number>>(
    Object.fromEntries(days.map((d) => [d.date, d.angle]))
  );
  // Re-seed accumulated angles when `days` identity changes (new layout).
  const daysKey = days.map((d) => d.date).join(",");

  useEffect(() => {
    accumulatedRef.current = Object.fromEntries(
      days.map((d) => [d.date, d.angle])
    );
    setAngles({ ...accumulatedRef.current });
    lastTimestampRef.current = 0;
    startRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysKey]);

  const reducedMotion = options.reducedMotion ?? false;

  useEffect(() => {
    if (reducedMotion) return; // keep initial angles
    if (days.length === 0) return;

    let raf = 0;
    let stopped = false;

    const loop = (timestamp: number) => {
      if (stopped) return;
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
        raf = requestAnimationFrame(loop);
        return;
      }
      const dt = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      const next = { ...accumulatedRef.current };
      let changed = false;
      for (const d of days) {
        if (pausedDates.has(d.date)) continue;
        // angular velocity = 2π / period_ms * direction
        const omega = ((2 * Math.PI) / d.period_ms) * d.direction;
        next[d.date] = (next[d.date] ?? d.angle) + omega * dt;
        changed = true;
      }
      accumulatedRef.current = next;
      if (changed) setAngles(next);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    const onVisibility = () => {
      if (document.hidden) {
        stopped = true;
        cancelAnimationFrame(raf);
      } else if (stopped) {
        stopped = false;
        lastTimestampRef.current = 0;
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [daysKey, pausedDates, reducedMotion, days]);

  return angles;
}
