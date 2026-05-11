"use client";

import { Clock, Plus } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FreeWindow } from "@/lib/calendar/types";

type Props = {
  title: string;
  scheduleCta: string;
  windows: readonly FreeWindow[];
  onSchedule?: (window: FreeWindow) => void;
  emptyLabel: string;
  className?: string;
};

export function FreeWindowPanel({
  title,
  scheduleCta,
  windows,
  onSchedule,
  emptyLabel,
  className,
}: Props) {
  return (
    <GlassPanel className={cn("calendar-specular-highlight p-4", className)}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        {title}
      </h3>
      {windows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2">
          {windows.map((w) => (
            <li
              key={`${w.date}-${w.start}`}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300">
                <Clock className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">
                {w.label}
              </span>
              <Button
                size="xs"
                variant="outline"
                className="gap-1"
                onClick={() => onSchedule?.(w)}
              >
                <Plus className="h-3 w-3" />
                {scheduleCta}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}
