"use client";

import { AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { ConflictSeverity, ConflictWarning } from "@/lib/calendar/types";

const SEVERITY_STYLES: Record<
  ConflictSeverity,
  { icon: typeof AlertTriangle; chip: string; text: string }
> = {
  info: {
    icon: Info,
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    text: "text-sky-800 dark:text-sky-200",
  },
  warn: {
    icon: AlertTriangle,
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    text: "text-amber-800 dark:text-amber-200",
  },
  critical: {
    icon: AlertOctagon,
    chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    text: "text-rose-800 dark:text-rose-200",
  },
};

type Props = {
  title: string;
  conflicts: readonly ConflictWarning[];
  className?: string;
};

export function ConflictWarningPanel({ title, conflicts, className }: Props) {
  if (conflicts.length === 0) return null;
  return (
    <GlassPanel className={cn("calendar-specular-highlight p-4", className)}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        {title}
      </h3>
      <ul className="space-y-2">
        {conflicts.map((c) => {
          const { icon: Icon, chip, text } = SEVERITY_STYLES[c.severity];
          return (
            <li
              key={c.id}
              className="rounded-xl border border-border/60 bg-card/60 p-3"
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                    chip
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", text)}>{c.message}</p>
                  {c.suggestion && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}
