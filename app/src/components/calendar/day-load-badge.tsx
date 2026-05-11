"use client";

import { cn } from "@/lib/utils";
import type { DayLoad } from "@/lib/calendar/types";

type Props = {
  load: DayLoad;
  label: string;
  className?: string;
};

const CLASS_MAP: Record<DayLoad, string> = {
  Light:
    "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  Balanced:
    "bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "Focus-heavy":
    "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  "Deadline-heavy":
    "bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  Recovery:
    "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
};

const DOT_MAP: Record<DayLoad, string> = {
  Light: "bg-emerald-500",
  Balanced: "bg-sky-500",
  "Focus-heavy": "bg-indigo-500",
  "Deadline-heavy": "bg-rose-500",
  Recovery: "bg-amber-500",
};

export function DayLoadBadge({ load, label, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        CLASS_MAP[load],
        className
      )}
      aria-label={label}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_MAP[load])} aria-hidden />
      {label}
    </span>
  );
}

export function DayLoadDot({
  load,
  className,
}: {
  load: DayLoad;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", DOT_MAP[load], className)}
      aria-hidden
    />
  );
}
