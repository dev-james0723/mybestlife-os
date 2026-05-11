"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SparklineCell } from "@/lib/bio-lab/history-summary";

/**
 * Tiny 7-day usage chart for the Bio Lab tool cards.
 *
 * Why CSS bars instead of SVG / Recharts:
 *   - Bundle: zero new dependencies; nothing to tree-shake.
 *   - Render cost: 7 divs total per card, no path math, no resize observers.
 *   - Theming: bars inherit `currentColor` so callers can pass any Tailwind
 *     text-color class (we recommend the per-tool `iconForeground` token).
 *
 * Accessibility:
 *   - The cells are decorative; the whole strip is `role="img"` with an
 *     `aria-label` so screen readers get one short sentence ("3 sessions
 *     in the last 7 days, most recently today") instead of seven cell
 *     descriptions.
 *   - When there is zero usage in the window we still render the empty grid
 *     (so card layout stays identical) and the aria-label says "no usage".
 */
export type MiniSparklineProps = {
  cells: SparklineCell[];
  /** ARIA summary the parent computes (i18n-aware). */
  ariaLabel: string;
  /**
   * Tailwind class applied to today's accent bar via `text-` (we use
   * `currentColor` internally). Pass a tool-tinted class like
   * `text-amber-500 dark:text-amber-300`.
   */
  accentClassName?: string;
  className?: string;
};

const BAR_MIN_PX = 2;
const BAR_MAX_PX = 18;

export function MiniSparkline({
  cells,
  ariaLabel,
  accentClassName,
  className,
}: MiniSparklineProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const max = cells.reduce((acc, c) => (c.count > acc ? c.count : acc), 0);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn(
        "flex h-5 items-end gap-[3px]",
        accentClassName ?? "text-muted-foreground",
        className,
      )}
    >
      {cells.map((cell, idx) => {
        const heightPx =
          max === 0
            ? BAR_MIN_PX
            : Math.max(
                BAR_MIN_PX,
                Math.round((cell.count / max) * BAR_MAX_PX),
              );

        const isAccent = cell.isToday && cell.count > 0;

        return (
          <motion.span
            key={cell.dayKey}
            aria-hidden
            initial={
              reduceMotion
                ? false
                : { scaleY: 0.4, opacity: 0.2 }
            }
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{
              duration: 0.32,
              delay: reduceMotion ? 0 : idx * 0.03,
              ease: [0.2, 0.8, 0.2, 1],
            }}
            style={{ height: `${heightPx}px`, transformOrigin: "bottom" }}
            className={cn(
              "block w-[3px] rounded-[1px] transition-colors duration-200",
              isAccent
                ? "bg-current"
                : cell.count > 0
                  ? "bg-current/45"
                  : "bg-current/15",
            )}
          />
        );
      })}
    </div>
  );
}
