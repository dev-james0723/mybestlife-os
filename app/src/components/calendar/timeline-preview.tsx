"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { CalendarEventTile } from "./calendar-event-tile";
import type { CalendarItem } from "@/lib/calendar/types";

type Props = {
  items: readonly CalendarItem[];
  max?: number;
  className?: string;
  onItemClick?: (item: CalendarItem) => void;
  emptyLabel: string;
};

/**
 * Compact mini-timeline for the homepage Today block.
 *
 * Boxed items (with start_time) render first, sorted chronologically;
 * all-day and anytime items render after as "pinned" chips.
 */
export function TimelinePreview({
  items,
  max = 5,
  className,
  onItemClick,
  emptyLabel,
}: Props) {
  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const at = a.start_time ?? "99:99";
      const bt = b.start_time ?? "99:99";
      return at.localeCompare(bt);
    });
    return arr.slice(0, max);
  }, [items, max]);

  if (sorted.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground",
          className
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {sorted.map((item) => (
        <li key={item.id}>
          <CalendarEventTile
            item={item}
            variant="row"
            onClick={onItemClick ? () => onItemClick(item) : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
