"use client";

import { useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type MiniCalendarPopoverProps = {
  selectedDate: Date;
  onSelect: (date: Date) => void;
};

/** Minimal calendar grid icon (stroke-only, no browser date chrome). */
function CalendarGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
      aria-hidden
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
      <circle cx="8" cy="14" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

const WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function MiniCalendarPopover({
  selectedDate,
  onSelect,
}: MiniCalendarPopoverProps) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selectedDate),
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setVisibleMonth(startOfMonth(selectedDate));
    }
  };

  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const handlePick = (day: Date) => {
    onSelect(day);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Open calendar"
            title="Pick date"
            className="border-border/80 bg-muted/30 hover:bg-muted/60"
          />
        }
      >
        <CalendarGlyph />
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(calc(100vw-2rem),288px)] gap-0 p-3 shadow-lg ring-1 ring-foreground/10"
        align="start"
        sideOffset={6}
      >
        <div className="mb-3 flex items-center justify-between gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
            onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="min-w-0 truncate text-center text-sm font-semibold tracking-tight tabular-nums">
            {format(visibleMonth, "MMMM yyyy")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
            onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        <div className="mb-1.5 grid grid-cols-7 gap-0.5">
          {WEEK_LABELS.map((d, i) => (
            <div
              key={`${d}-${i}`}
              className="flex h-6 items-center justify-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const inMonth = isSameMonth(day, visibleMonth);
            const selected = isSameDay(day, selectedDate);
            const today = isToday(day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handlePick(day)}
                className={cn(
                  "flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition-colors",
                  !inMonth && "text-muted-foreground/40 hover:bg-muted/50",
                  inMonth &&
                    !selected &&
                    "text-foreground hover:bg-muted/70",
                  selected &&
                    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
                  today &&
                    !selected &&
                    "ring-1 ring-primary/35 ring-offset-1 ring-offset-popover",
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex justify-between gap-2 border-t border-border/60 pt-2.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="font-medium text-primary"
            onClick={() => {
              const t = new Date();
              t.setHours(0, 0, 0, 0);
              handlePick(t);
            }}
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
