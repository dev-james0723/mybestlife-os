"use client";

import * as React from "react";

import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import type { CareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";

export type WizardProgressProps = {
  /** 1-based index of the current step. */
  current: number;
  total: number;
  progress: { answered: number; total: number; percent: number };
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
  progress,
  ui,
  className,
}: WizardProgressProps) {
  const chinese = useAppStore((s) => s.language).startsWith("zh");
  const safeTotal = Math.max(total, 1);
  const clamped = Math.min(Math.max(current, 1), safeTotal);
  const percent = progress.percent;

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
          className="h-full rounded-full bg-[linear-gradient(135deg,var(--accent-pink-from),var(--accent-pink-to))] transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          {chinese ? `第 ${clamped}/${safeTotal} 節 · 已答 ${progress.answered}/${progress.total} 條核心問題` : `Section ${clamped}/${safeTotal} · ${progress.answered}/${progress.total} core questions answered`}
        </span>
        <span className="tabular-nums">{ui.hero.progressLabel(percent)}</span>
      </div>
    </div>
  );
}

export default WizardProgress;
