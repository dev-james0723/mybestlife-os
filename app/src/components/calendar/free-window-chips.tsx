"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FreeWindow } from "@/lib/calendar/types";

type Props = {
  windows: readonly FreeWindow[];
  title: string;
  className?: string;
  onSelect?: (window: FreeWindow) => void;
};

export function FreeWindowChips({ windows, title, className, onSelect }: Props) {
  if (windows.length === 0) return null;
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {windows.map((w) => (
          <button
            key={`${w.start}-${w.end}`}
            type="button"
            onClick={onSelect ? () => onSelect(w) : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs font-medium",
              "transition-colors hover:border-border hover:bg-card"
            )}
          >
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{w.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
