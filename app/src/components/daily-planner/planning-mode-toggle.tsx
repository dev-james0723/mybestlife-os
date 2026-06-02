"use client";

import { Calendar, ListChecks } from "lucide-react";

import { OSSegmentedControl } from "@/components/ui/os-primitives";
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
  const options: Array<{ id: PlanningMode; label: string; icon: typeof Calendar }> = [
    { id: "time-block", label: timeBlockLabel, icon: Calendar },
    { id: "free", label: freeLabel, icon: ListChecks },
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
