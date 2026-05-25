"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { CareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";

export type WizardProgressProps = {
  /** 1-based index of the current step. */
  current: number;
  total: number;
  ui: CareerMirrorUiCopy;
  className?: string;
};

/**
 * Compact wizard progress: a single thin track + a localized "% complete"
 * caption. Keeps a small vertical footprint so it never crowds the active
 * input on mobile.
 */
export function WizardProgress({
  current,
  total,
  ui,
  className,
}: WizardProgressProps) {
  const safeTotal = Math.max(total, 1);
  const clamped = Math.min(Math.max(current, 1), safeTotal);
  const percent = Math.round((clamped / safeTotal) * 100);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={ui.hero.progressLabel(percent)}
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(135deg,var(--accent-pink-from),var(--accent-pink-to))] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          {clamped} / {safeTotal}
        </span>
        <span className="tabular-nums">{ui.hero.progressLabel(percent)}</span>
      </div>
    </div>
  );
}

export default WizardProgress;
