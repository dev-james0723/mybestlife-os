"use client";

import { useMemo } from "react";
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import type { Habit, HabitCompletion, StreakFreeze } from "@/lib/habits/types";
import {
  deriveCompositeHeatmap,
  type HeatmapCell,
  type HeatmapCellStatus,
} from "@/lib/habits/heatmap";
import { cn } from "@/lib/utils";

export interface HeatmapPlaceholderProps {
  habits: readonly Habit[];
  /** ISO `yyyy-MM-dd` */
  from: string;
  to: string;
  /** Same calendar basis as `from` / `to`. */
  today: string;
  timeZone: string;
  copy: HabitsUiCopy;
  completions: readonly HabitCompletion[];
  freezes: readonly StreakFreeze[];
}

function cellClass(cell: HeatmapCell, maxIntensity: number): string {
  const { status, intensity } = cell;
  if (status === "future") {
    return "bg-muted/40 ring-1 ring-border/30";
  }
  if (status === "frozen") {
    return "bg-sky-500/25 ring-1 ring-sky-500/30";
  }
  if (status === "skipped") {
    return "bg-amber-500/20 ring-1 ring-amber-500/25";
  }
  if (status === "missed") {
    return "bg-destructive/25 ring-1 ring-destructive/30";
  }
  if (status === "done") {
    if (maxIntensity <= 0) return "bg-primary ring-1 ring-primary/30";
    const t = intensity / maxIntensity;
    if (t < 0.34) return "bg-primary/35 ring-1 ring-primary/20";
    if (t < 0.67) return "bg-primary/55 ring-1 ring-primary/25";
    return "bg-primary ring-1 ring-primary/30";
  }
  return "bg-muted/80 ring-1 ring-border/40";
}

function tooltipDetail(cell: HeatmapCell): string {
  const bits = [cell.label];
  if (cell.status === "done" && cell.intensity > 0 && cell.intensity < 1) {
    bits.push(`${Math.round(cell.intensity * 100)}%`);
  }
  return bits.join(" · ");
}

function statusRank(s: HeatmapCellStatus): number {
  switch (s) {
    case "frozen":
      return 5;
    case "done":
      return 4;
    case "skipped":
      return 3;
    case "missed":
      return 2;
    default:
      return 0;
  }
}

/**
 * GitHub-style week columns (Mon → Sun), colored from composite habit heatmap.
 */
export function HeatmapPlaceholder({
  habits,
  from,
  to,
  today,
  timeZone,
  copy,
  completions,
  freezes,
}: HeatmapPlaceholderProps) {
  const { columns, maxIntensity } = useMemo(() => {
    const start = parseISO(from);
    const end = parseISO(to);
    if (start > end) {
      return { columns: [] as HeatmapCell[][], maxIntensity: 0 };
    }

    const active = habits.filter((h) => !h.archived_at);
    const inputs = active.map((habit) => ({
      habit,
      completions: completions.filter((c) => c.habit_id === habit.id),
      freezes: freezes.filter((f) => f.habit_id === habit.id),
      fromDay: from,
      toDay: to,
      todayDay: today,
      timeZone,
    }));

    const cells =
      inputs.length === 0 ? [] : deriveCompositeHeatmap(inputs);

    const maxInt = cells.reduce(
      (m, c) => (c.status === "done" ? Math.max(m, c.intensity) : m),
      0,
    );

    const days = eachDayOfInterval({ start, end }).map((d) =>
      format(d, "yyyy-MM-dd"),
    );
    const cellByDate = new Map<string, HeatmapCell>();
    for (const c of cells) {
      cellByDate.set(c.date, c);
    }

    const gridStart = startOfWeek(start, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(end, { weekStartsOn: 1 });
    const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd }).map(
      (d) => format(d, "yyyy-MM-dd"),
    );

    const cols: HeatmapCell[][] = [];
    for (let i = 0; i < gridDays.length; i += 7) {
      const week: HeatmapCell[] = [];
      for (let j = 0; j < 7; j++) {
        const date = gridDays[i + j];
        if (!date) break;
        const inRange = date >= days[0]! && date <= days[days.length - 1]!;
        if (!inRange) {
          week.push({
            date,
            status: "future",
            intensity: 0,
            label: "",
          });
          continue;
        }
        week.push(
          cellByDate.get(date) ?? {
            date,
            status: "future",
            intensity: 0,
            label: "",
          },
        );
      }
      cols.push(week);
    }

    return { columns: cols, maxIntensity: maxInt };
  }, [habits, from, to, today, timeZone, completions, freezes]);

  const visibleColumns = useMemo(() => {
    return columns.filter((week) =>
      week.some((c) => {
        if (c.status === "future" && !c.label) return false;
        return statusRank(c.status) >= 2 || c.intensity > 0;
      }),
    );
  }, [columns]);

  if (columns.length === 0) {
    return (
      <div
        data-testid="habits-heatmap"
        className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted-foreground"
      >
        {copy.heatmapPlaceholder}
      </div>
    );
  }

  return (
    <div data-testid="habits-heatmap" className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5">
        {(visibleColumns.length > 0 ? visibleColumns : columns).map(
          (week, wi) => (
            <div
              key={wi}
              className="flex shrink-0 flex-col gap-1"
              aria-hidden={week.every(
                (c) =>
                  (c.status === "future" && !c.label) || c.intensity === 0,
              )}
            >
              {week.map((cell) => (
                <div
                  key={cell.date}
                  title={copy.heatmapTooltip(cell.date, tooltipDetail(cell))}
                  className={cn(
                    "size-3.5 rounded-sm transition-colors",
                    cellClass(cell, maxIntensity),
                  )}
                />
              ))}
            </div>
          ),
        )}
      </div>
      <div className="flex items-center justify-end gap-2 text-[0.65rem] text-muted-foreground">
        <span>{copy.heatmapLess}</span>
        <div className="flex gap-0.5">
          <span className="size-3.5 rounded-sm bg-muted/40 ring-1 ring-border/30" />
          <span className="size-3.5 rounded-sm bg-primary/35 ring-1 ring-primary/20" />
          <span className="size-3.5 rounded-sm bg-primary/55 ring-1 ring-primary/25" />
          <span className="size-3.5 rounded-sm bg-primary ring-1 ring-primary/30" />
        </div>
        <span>{copy.heatmapMore}</span>
      </div>
    </div>
  );
}
