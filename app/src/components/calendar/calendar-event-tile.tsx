"use client";

import { Calendar, CheckCircle2, Flag, MapPin, Repeat, Target, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarItem, CalendarItemTask } from "@/lib/calendar/types";

type Variant = "tile" | "row" | "chip";

const SOURCE_ICONS: Record<CalendarItem["source_type"], LucideIcon> = {
  task: CheckCircle2,
  habit: Repeat,
  milestone: Flag,
  reminder: Zap,
  external: Calendar,
};

type Props = {
  item: CalendarItem;
  variant?: Variant;
  /** When true, force the tile to take the full width. */
  fullWidth?: boolean;
  className?: string;
  onClick?: () => void;
};

function isTaskOverdue(item: CalendarItem): boolean {
  return item.source_type === "task" && (item as CalendarItemTask).overdue;
}

export function CalendarEventTile({
  item,
  variant = "tile",
  fullWidth,
  className,
  onClick,
}: Props) {
  const Icon = SOURCE_ICONS[item.source_type];
  const overdue = isTaskOverdue(item);
  const color = item.color ?? "#64748b";
  const timeLabel =
    item.start_time && item.end_time && item.start_time !== item.end_time
      ? `${item.start_time}–${item.end_time}`
      : item.start_time ?? null;

  if (variant === "chip") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
          "border-transparent text-foreground",
          className
        )}
        style={{ backgroundColor: `${color}1f`, color }}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="max-w-[10rem] truncate">{item.title}</span>
      </span>
    );
  }

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-left transition-colors",
          "hover:border-border hover:bg-card",
          className
        )}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}24`, color }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {item.title}
          </span>
          {(item.subtitle || timeLabel) && (
            <span className="block truncate text-xs text-muted-foreground">
              {[timeLabel, item.subtitle].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
        {overdue && (
          <span className="ml-auto inline-block h-2 w-2 rounded-full bg-rose-500" aria-label="Overdue" />
        )}
      </button>
    );
  }

  const sharedClass = cn(
    "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] leading-tight",
    "transition-colors hover:brightness-105",
    fullWidth && "w-full",
    className
  );
  const sharedStyle = {
    backgroundColor: `${color}22`,
    color: color,
    borderLeft: `3px solid ${color}`,
  } as const;
  const inner = (
    <>
      {item.source_type === "milestone" ? (
        <Target className="h-3 w-3 shrink-0" />
      ) : item.start_time ? (
        <span className="shrink-0 text-[10px] font-medium tabular-nums opacity-80">
          {item.start_time}
        </span>
      ) : (
        <Icon className="h-3 w-3 shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
        {item.title}
      </span>
      {item.source_type === "external" && (item as { location: string | null }).location && (
        <MapPin className="h-2.5 w-2.5 shrink-0 opacity-70" />
      )}
    </>
  );

  // Avoid <button> inside a parent <button> (e.g. month day cells) — use a div for presentational tiles.
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={item.title}
        className={sharedClass}
        style={sharedStyle}
      >
        {inner}
      </button>
    );
  }
  return (
    <div title={item.title} className={sharedClass} style={sharedStyle}>
      {inner}
    </div>
  );
}
