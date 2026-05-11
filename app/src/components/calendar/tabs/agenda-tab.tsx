"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useAppStore } from "@/stores/app-store";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
import { useCalendarItems } from "@/hooks/use-calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassPanel } from "@/components/ui/glass-panel";
import { AlertTriangle } from "lucide-react";
import { CalendarEventTile } from "@/components/calendar/calendar-event-tile";
import type { CalendarItem, CalendarItemTask } from "@/lib/calendar/types";

const AGENDA_DAYS = 14;

function isTaskOverdue(i: CalendarItem): boolean {
  return i.source_type === "task" && (i as CalendarItemTask).overdue;
}

export function AgendaTab() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getCalendarUiCopy(language), [language]);
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const { data: items, isLoading } = useCalendarItems();

  const { grouped, overdueItems, dateKeys } = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const horizonTs = new Date();
    horizonTs.setDate(horizonTs.getDate() + AGENDA_DAYS);
    const horizon = format(horizonTs, "yyyy-MM-dd");

    const overdue: CalendarItem[] = [];
    const upcoming: CalendarItem[] = [];
    for (const i of items ?? []) {
      if (isTaskOverdue(i)) overdue.push(i);
      else if (i.date >= today && i.date <= horizon) upcoming.push(i);
    }

    const map = new Map<string, CalendarItem[]>();
    for (const i of upcoming) {
      const arr = map.get(i.date) ?? [];
      arr.push(i);
      map.set(i.date, arr);
    }
    return {
      grouped: map,
      overdueItems: overdue,
      dateKeys: [...map.keys()].sort(),
    };
  }, [items]);

  if (isLoading) {
    return (
      <div className="space-y-3" aria-label={copy.loadingAgenda}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-calendar-surface className="space-y-5">
      {overdueItems.length > 0 && (
        <GlassPanel className="calendar-specular-highlight p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            {copy.overdueSectionTitle}
            <span className="ml-auto text-xs font-medium text-muted-foreground">
              {overdueItems.length}
            </span>
          </div>
          <ul className="space-y-2">
            {overdueItems.map((item) => (
              <li key={item.id}>
                <CalendarEventTile item={item} variant="row" />
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}

      {dateKeys.length === 0 && overdueItems.length === 0 ? (
        <GlassPanel className="calendar-specular-highlight px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">{copy.todayNoItems}</p>
        </GlassPanel>
      ) : (
        <ul className="space-y-6">
          {dateKeys.map((date) => {
            const parsed = parseISO(date);
            const items = grouped.get(date) ?? [];
            return (
              <li key={date} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {format(parsed, "EEE, MMM d", { locale: dateLocale })}
                </p>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.id}>
                      <CalendarEventTile item={item} variant="row" />
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
