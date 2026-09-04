"use client";

import { Calendar, ListChecks, Sparkles } from "lucide-react";

import { OSSegmentedControl } from "@/components/ui/os-primitives";
import type { PlanningMode } from "@/types/database";

export interface PlanningModeToggleProps {
  value: PlanningMode;
  onChange: (mode: PlanningMode) => void;
  ariaLabel: string;
  timeBlockLabel: string;
  freeLabel: string;
  adaptiveLabel: string;
}

/**
 * Three-state segmented toggle for the Daily Planner mode. Liquid-Glass surface; the active
 * pill is a single layoutId animation so switching feels like sliding a lens, not jumping
 * between pages.
 */
export function PlanningModeToggle({
  value,
  onChange,
  ariaLabel,
  timeBlockLabel,
  freeLabel,
  adaptiveLabel,
}: PlanningModeToggleProps) {
  const options: Array<{ id: PlanningMode; label: string; icon: typeof Calendar }> = [
    { id: "time-block", label: timeBlockLabel, icon: Calendar },
    { id: "free", label: freeLabel, icon: ListChecks },
    { id: "adaptive", label: adaptiveLabel, icon: Sparkles },
  ];

  return (
    <OSSegmentedControl
      items={options}
      value={value}
      onValueChange={onChange}
      ariaLabel={ariaLabel}
      layoutId="planning-mode-pill"
    />
  );
}
