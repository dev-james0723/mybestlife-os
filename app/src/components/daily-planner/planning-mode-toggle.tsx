"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Calendar, ListChecks } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PlanningMode } from "@/types/database";

export interface PlanningModeToggleProps {
  value: PlanningMode;
  onChange: (mode: PlanningMode) => void;
  ariaLabel: string;
  timeBlockLabel: string;
  freeLabel: string;
}

/**
 * Two-state segmented toggle for the Daily Planner mode. Liquid-Glass surface; the active
 * pill is a single layoutId animation so switching feels like sliding a lens, not jumping
 * between pages.
 */
export function PlanningModeToggle({
  value,
  onChange,
  ariaLabel,
  timeBlockLabel,
  freeLabel,
}: PlanningModeToggleProps) {
  const prefersReduced = useReducedMotion();
  const options: Array<{ id: PlanningMode; label: string; icon: typeof Calendar }> = [
    { id: "time-block", label: timeBlockLabel, icon: Calendar },
    { id: "free", label: freeLabel, icon: ListChecks },
  ];

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/40 p-0.5 backdrop-blur-md",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
      )}
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(opt.id)}
            className={cn(
              "relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/80",
            )}
          >
            {isActive ? (
              <motion.span
                layoutId="planning-mode-pill"
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 320, damping: 28 }
                }
                className="absolute inset-0 -z-10 rounded-full bg-foreground/[0.08] ring-1 ring-foreground/15"
                aria-hidden
              />
            ) : null}
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span className="whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
