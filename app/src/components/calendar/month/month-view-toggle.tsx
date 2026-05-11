"use client";

import { cn } from "@/lib/utils";
import type { MonthViewMode } from "@/lib/calendar/types";

type Props = {
  value: MonthViewMode;
  onChange: (mode: MonthViewMode) => void;
  labels: Record<MonthViewMode, string>;
  className?: string;
};

const OPTIONS: MonthViewMode[] = ["complete", "minimal", "orbital"];

/**
 * Segmented pill toggle — lime accent for the active option.
 * Matches the liquid-glass spec (filter tab group § 6.10, lime CTA § 8.4).
 */
export function MonthViewToggle({ value, onChange, labels, className }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Month view mode"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 backdrop-blur-sm",
        className
      )}
    >
      {OPTIONS.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option)}
            className={cn(
              "relative rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-all duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calendar-lime)]/70",
              active
                ? "bg-[var(--calendar-lime)] text-[#0d0d0d] shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}
