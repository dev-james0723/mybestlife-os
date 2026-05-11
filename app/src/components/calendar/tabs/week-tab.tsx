"use client";

import { useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/stores/app-store";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { useCalendarItems } from "@/hooks/use-calendar";
import { useIsMobile } from "@/hooks/use-mobile";
import { itemsForDate } from "@/lib/calendar/projection";
import { CalendarEventTile } from "@/components/calendar/calendar-event-tile";
import { AgendaTab } from "./agenda-tab";
import { cn } from "@/lib/utils";

const WEEK_START: 0 | 1 = 1; // Monday

export function WeekTab() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getCalendarUiCopy(language), [language]);
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const isMobile = useIsMobile();
  const prefersReduced = useReducedMotion();
  const { data: items, isLoading } = useCalendarItems();

  const [anchor, setAnchor] = useState(() => new Date());
  const weekStart = useMemo(
    () => startOfWeek(anchor, { weekStartsOn: WEEK_START }),
    [anchor]
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const todayIso = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  // On mobile, collapse to the Agenda view (keeps density legible
  // without a disastrous horizontal scroll).
  if (isMobile) {
    return (
      <div className="space-y-3">
        <GlassPanel className="calendar-specular-highlight p-3 text-xs text-muted-foreground">
          Week view collapses to Agenda on mobile for legibility. Flip to landscape or use a larger viewport for the 7-column grid.
        </GlassPanel>
        <AgendaTab />
      </div>
    );
  }

  return (
    <motion.div
      data-calendar-surface
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Previous week"
          onClick={() => setAnchor((d) => addDays(d, -7))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Next week"
          onClick={() => setAnchor((d) => addDays(d, 7))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setAnchor(new Date())}
        >
          {copy.today}
        </Button>
        <span className="ml-auto text-xs font-medium text-muted-foreground">
          {format(weekStart, "MMM d", { locale: dateLocale })}
          {" – "}
          {format(addDays(weekStart, 6), "MMM d, yyyy", { locale: dateLocale })}
        </span>
      </div>

      <GlassPanel className="calendar-specular-highlight overflow-hidden">
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const iso = format(d, "yyyy-MM-dd");
            const isToday = iso === todayIso;
            const dayItems = items ? itemsForDate(items, iso) : [];
            return (
              <div
                key={iso}
                className={cn(
                  "min-h-[420px] border-r border-border/30 px-2 pb-3 pt-2 last:border-r-0",
                  isToday && "bg-[var(--calendar-lime-soft)]"
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {format(d, "EEE", { locale: dateLocale })}
                  </span>
                  <span
                    className={cn(
                      "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                      isToday
                        ? "bg-[var(--calendar-lime)] text-[#0d0d0d]"
                        : "text-foreground"
                    )}
                  >
                    {format(d, "d")}
                  </span>
                </div>
                {isLoading ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-[80%]" />
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {dayItems.length === 0 ? (
                      <li className="pt-1 text-[10px] text-muted-foreground/70">—</li>
                    ) : (
                      dayItems.map((item) => (
                        <li key={item.id}>
                          <CalendarEventTile item={item} variant="tile" fullWidth />
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

