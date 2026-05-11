"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type FocusPhase = "work" | "break";

export type FocusClockDisplayProps = {
  phase: FocusPhase;
  /** Seconds remaining in the current phase. */
  remainingSec: number;
  /** Total seconds for this phase (used to compute the progress ring). */
  totalSec: number;
  /** When true, suppresses the breathing pulse (e.g. user paused). */
  paused: boolean;
  /** Localized label shown above the time (e.g. "Remaining"). */
  remainingLabel: string;
};

/**
 * Phase-aware timer display for the Focus Sprint.
 *
 * Visual treatment:
 *   - Work: warm amber halo, breathing pulse on the outer card.
 *   - Break: cool emerald halo, steady (no pulse).
 *   - Paused: pulse pauses; ring stops "ticking" (still shows progress).
 *
 * The ring is a CSS conic-gradient — a single-element solution that runs
 * smoothly without a per-second SVG redraw. It updates whenever
 * `remainingSec` changes, which already happens at 1Hz in the parent.
 *
 * Honors `prefers-reduced-motion`: when reduced, no pulse, no scale; the
 * static styling still differentiates work vs break.
 */
export function FocusClockDisplay({
  phase,
  remainingSec,
  totalSec,
  paused,
  remainingLabel,
}: FocusClockDisplayProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const elapsed = Math.max(0, totalSec - remainingSec);
  const progress = totalSec > 0 ? Math.min(1, elapsed / totalSec) : 0;
  const progressDeg = Math.round(progress * 360);

  const isWork = phase === "work";
  const ringPrimary = isWork
    ? "rgba(245, 158, 11, 0.55)" // amber-500
    : "rgba(16, 185, 129, 0.55)"; // emerald-500
  const ringTrack = "rgba(127, 127, 127, 0.18)";

  // Breathing pulse: only during un-paused work, only when motion allowed.
  const animate =
    !reduceMotion && !paused && isWork
      ? { scale: [1, 1.012, 1] }
      : { scale: 1 };

  return (
    <motion.div
      animate={animate}
      transition={
        !reduceMotion && !paused && isWork
          ? { duration: 4.2, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.3 }
      }
      className={cn(
        "relative overflow-hidden rounded-2xl border px-4 py-8 text-center",
        "motion-safe:transition-colors motion-safe:duration-500",
        isWork
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/[0.10] via-card to-amber-500/[0.04] dark:border-amber-300/30"
          : "border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.10] via-card to-emerald-500/[0.04] dark:border-emerald-300/30",
      )}
      role="timer"
      aria-label={`${remainingLabel} ${formatClock(remainingSec)}`}
      aria-live="off"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: `conic-gradient(${ringPrimary} 0deg, ${ringPrimary} ${progressDeg}deg, ${ringTrack} ${progressDeg}deg, ${ringTrack} 360deg)`,
          mask: "radial-gradient(circle at center, transparent 60%, black 62%, black 70%, transparent 72%)",
          WebkitMask:
            "radial-gradient(circle at center, transparent 60%, black 62%, black 70%, transparent 72%)",
          opacity: 0.55,
          transition: "background 0.6s linear",
        }}
        aria-hidden
      />
      <p className="relative text-xs text-muted-foreground">{remainingLabel}</p>
      <p className="relative mt-1 font-mono text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
        {formatClock(remainingSec)}
      </p>
    </motion.div>
  );
}

function formatClock(totalSec: number): string {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
