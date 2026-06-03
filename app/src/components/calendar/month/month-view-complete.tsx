"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import {
  buildDayContext,
  itemsForDate,
} from "@/lib/calendar/projection";
import { DayLoadDot } from "@/components/calendar/day-load-badge";
import { CalendarEventTile } from "@/components/calendar/calendar-event-tile";
import type { CalendarItem, CalendarItemTask } from "@/lib/calendar/types";

type Props = {
  items: readonly CalendarItem[];
  isLoading: boolean;
};

const WEEK_START: 0 | 1 = 1;
const MAX_VISIBLE_TILES = 3;

function hasOverdue(items: readonly CalendarItem[]): boolean {
  return items.some((i) => i.source_type === "task" && (i as CalendarItemTask).overdue);
}

/**
 * Complete Month variant — dense but organized grid.
 *
 * Each cell: date number + up to 3 tiles + "+N more" overflow chip,
 * a DayLoad dot top-right and an overdue red pip when relevant.
 * Clicking a cell opens a right-side slide-in panel with the full
 * agenda for that day.
 */
export function MonthViewComplete({ items, isLoading }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getCalendarUiCopy(language), [language]);
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const prefersReduced = useReducedMotion();

  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { cells, monthLabel } = useMemo(() => {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_START });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_START });
    const out: Array<{ date: Date; iso: string; inMonth: boolean }> = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
      out.push({
        date: d,
        iso: format(d, "yyyy-MM-dd"),
        inMonth: isSameMonth(d, anchor),
      });
    }
    return {
      cells: out,
      monthLabel: format(anchor, "MMMM yyyy", { locale: dateLocale }),
    };
  }, [anchor, dateLocale]);

  const todayIso = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const weekdayLabels = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: WEEK_START });
    return Array.from({ length: 7 }, (_, i) =>
      format(addDays(start, i), "EEE", { locale: dateLocale })
    );
  }, [dateLocale]);

  const selectedDayContext = useMemo(() => {
    if (!selectedDate) return null;
    return buildDayContext(selectedDate, [...items]);
  }, [selectedDate, items]);

  return (
    <div data-calendar-surface className="relative">
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <Button
          size="icon-sm"
          variant="outline"
          className="h-11 min-h-11 w-11 rounded-xl"
          aria-label="Previous month"
          onClick={() => setAnchor((d) => subMonths(d, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          className="h-11 min-h-11 w-11 rounded-xl"
          aria-label="Next month"
          onClick={() => setAnchor((d) => addMonths(d, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-11 min-h-11 rounded-xl px-3"
          onClick={() => setAnchor(new Date())}
        >
          {copy.today}
        </Button>
        <span className="ml-auto text-base font-semibold tabular-nums">
          {monthLabel}
        </span>
      </div>

      <GlassPanel className="calendar-specular-highlight overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border/30">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map(({ date, iso, inMonth }) => {
            const dayItems = itemsForDate([...items], iso);
            const visible = dayItems.slice(0, MAX_VISIBLE_TILES);
            const overflow = Math.max(0, dayItems.length - visible.length);
            const ctx = buildDayContext(iso, [...items]);
            const isToday = iso === todayIso;
            const overdue = hasOverdue(dayItems);
            const isSelected = selectedDate === iso;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                aria-label={`${iso}, ${dayItems.length} items`}
                className={cn(
                  "relative min-h-[118px] border-b border-r border-border/20 px-1.5 py-1.5 text-left transition-colors",
                  "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calendar-lime)]/60",
                  !inMonth && "opacity-45",
                  isToday && "bg-[var(--calendar-lime-soft)]",
                  isSelected && "ring-2 ring-[var(--calendar-lime)]/70 ring-offset-[-2px]"
                )}
              >
                <div className="mb-1 flex items-start justify-between gap-1">
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      isToday &&
                        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--calendar-lime)] px-1 text-[#0d0d0d]"
                    )}
                  >
                    {format(date, "d")}
                  </span>
                  <span className="flex items-center gap-0.5">
                    {overdue && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-rose-500"
                        aria-label="Overdue"
                      />
                    )}
                    {dayItems.length > 0 && <DayLoadDot load={ctx.load} />}
                  </span>
                </div>

                {isLoading ? (
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[70%]" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {visible.map((item) => (
                      <CalendarEventTile
                        key={item.id}
                        item={item}
                        variant="tile"
                        fullWidth
                      />
                    ))}
                    {overflow > 0 && (
                      <span className="inline-block rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        + {overflow} more
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </GlassPanel>

      {/* Right-side slide-in panel */}
      <AnimatePresence>
        {selectedDate && (
          <motion.aside
            key={selectedDate}
            initial={prefersReduced ? false : { x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { x: "100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed right-0 top-0 z-[60] flex h-[100dvh] w-full max-w-[380px] flex-col pt-[env(safe-area-inset-top,0px)]"
            aria-label={`Agenda for ${selectedDate}`}
          >
            <GlassPanel className="calendar-specular-highlight m-3 flex h-full flex-col overflow-hidden rounded-2xl">
              <header className="flex items-center justify-between gap-2 border-b border-border/30 px-4 py-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {copy.minimalAgendaTitle}
                  </p>
                  <h3 className="text-lg font-semibold tabular-nums">
                    {format(new Date(selectedDate + "T00:00:00"), "EEE, MMM d", {
                      locale: dateLocale,
                    })}
                  </h3>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="h-11 min-h-11 w-11 rounded-xl"
                  onClick={() => setSelectedDate(null)}
                  aria-label={copy.close}
                >
                  <X className="h-4 w-4" />
                </Button>
              </header>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {selectedDayContext && selectedDayContext.items.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedDayContext.items.map((item) => (
                      <li key={item.id}>
                        <CalendarEventTile item={item} variant="row" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {copy.todayNoItems}
                  </p>
                )}
              </div>
            </GlassPanel>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
