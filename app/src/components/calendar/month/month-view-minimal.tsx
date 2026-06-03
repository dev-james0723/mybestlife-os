"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { itemsForDate } from "@/lib/calendar/projection";
import type { CalendarItem, CalendarItemSourceType } from "@/lib/calendar/types";

type Props = {
  items: readonly CalendarItem[];
  isLoading: boolean;
};

const WEEK_START: 0 | 1 = 1;

const SOURCE_DOT_COLOR: Record<CalendarItemSourceType, string> = {
  task: "#ef4444",
  habit: "#10b981",
  milestone: "#a855f7",
  reminder: "#eab308",
  external: "#3b82f6",
  planner_time_block: "#6366f1",
  planner_free_task: "#f97316",
};

function uniqueSourceTypes(items: readonly CalendarItem[]): CalendarItemSourceType[] {
  const set = new Set<CalendarItemSourceType>();
  for (const i of items) set.add(i.source_type);
  return [...set];
}

/**
 * Minimal Month variant — clean dots-only grid with persistent Agenda panel.
 *
 * Spec: "LIQUID PRECISION" reference. Dark-glass right panel stays
 * visible; left grid uses no text inside cells (only date number and
 * up to 3 source-color dots). Today gets a lime circle; the selected
 * day gets a lime bottom bar.
 */
export function MonthViewMinimal({ items, isLoading }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getCalendarUiCopy(language), [language]);
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const plannerHref = useLocalizedPath("/daily-planner");
  const prefersReduced = useReducedMotion();

  const [anchor, setAnchor] = useState(() => new Date());
  const todayIso = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [selectedIso, setSelectedIso] = useState<string>(todayIso);

  const { cells, monthLabel } = useMemo(() => {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_START });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_START });
    const out: Array<{ date: Date; iso: string; inMonth: boolean }> = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
      out.push({ date: d, iso: format(d, "yyyy-MM-dd"), inMonth: isSameMonth(d, anchor) });
    }
    return {
      cells: out,
      monthLabel: format(anchor, "MMMM yyyy", { locale: dateLocale }),
    };
  }, [anchor, dateLocale]);

  const weekdayLabels = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: WEEK_START });
    return Array.from({ length: 7 }, (_, i) =>
      format(addDays(start, i), "EEEEEE", { locale: dateLocale }).toUpperCase()
    );
  }, [dateLocale]);

  const tomorrowIso = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return format(t, "yyyy-MM-dd");
  }, []);

  // Agenda panel groups: selected day + next 3 days (skipping empties)
  const agendaGroups = useMemo(() => {
    const groups: Array<{ iso: string; label: string; items: CalendarItem[] }> = [];
    const startAnchor = parseISO(selectedIso);
    for (let i = 0; i < 7; i++) {
      const d = addDays(startAnchor, i);
      const iso = format(d, "yyyy-MM-dd");
      const dayItems = itemsForDate([...items], iso);
      if (dayItems.length === 0 && i > 0 && groups.length > 0) continue;
      let label: string;
      if (iso === todayIso) label = copy.agendaToday;
      else if (iso === tomorrowIso) label = copy.agendaTomorrow;
      else label = format(d, "EEE, MMM d", { locale: dateLocale }).toUpperCase();
      groups.push({ iso, label, items: dayItems });
    }
    return groups;
  }, [selectedIso, items, todayIso, tomorrowIso, copy, dateLocale]);

  return (
    <motion.div
      data-calendar-surface
      initial={prefersReduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
    >
      {/* LEFT — dots-only grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
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
          <span className="ml-auto text-base font-semibold tracking-wide tabular-nums">
            {monthLabel}
          </span>
        </div>

        <GlassPanel className="calendar-specular-highlight p-3 sm:p-4">
          <div className="mb-2 grid grid-cols-7 gap-1 text-center">
            {weekdayLabels.map((w) => (
              <div
                key={w}
                className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map(({ date, iso, inMonth }) => {
              const dayItems = itemsForDate([...items], iso);
              const types = uniqueSourceTypes(dayItems).slice(0, 3);
              const isToday = iso === todayIso;
              const isSelected = iso === selectedIso;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedIso(iso)}
                  aria-label={`${iso}, ${dayItems.length} items`}
                  className={cn(
                    "group relative flex aspect-square min-h-[56px] flex-col items-center justify-between rounded-xl p-2 text-xs transition-colors",
                    "hover:bg-[var(--calendar-lime-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calendar-lime)]/70",
                    !inMonth && "opacity-30"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full font-semibold tabular-nums",
                      isToday &&
                        "bg-[var(--calendar-lime)] text-[#0d0d0d] shadow-[0_0_12px_var(--calendar-lime-glow)]"
                    )}
                  >
                    {format(date, "d")}
                  </span>

                  {isLoading ? (
                    <span className="block h-1 w-10 rounded-full bg-muted/50" aria-hidden />
                  ) : (
                    <span className="flex items-center gap-1" aria-hidden>
                      {types.map((t) => (
                        <span
                          key={t}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: SOURCE_DOT_COLOR[t] }}
                        />
                      ))}
                    </span>
                  )}

                  {isSelected && (
                    <motion.span
                      layoutId="minimal-selected-bar"
                      className="absolute inset-x-2 bottom-1 h-0.5 rounded-full bg-[var(--calendar-lime)]"
                      transition={{
                        duration: prefersReduced ? 0 : 0.25,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </GlassPanel>
      </div>

      {/* RIGHT — persistent Agenda panel (dark glass) */}
      <aside
        className="calendar-glass-dark calendar-specular-highlight flex h-[calc(100vh-220px)] max-h-[780px] min-h-[520px] flex-col overflow-hidden"
        aria-label={copy.minimalAgendaTitle}
      >
        <header className="border-b border-white/10 px-4 py-3">
          <h3 className="text-base font-semibold">{copy.minimalAgendaTitle}</h3>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {agendaGroups.length === 0 || agendaGroups.every((g) => g.items.length === 0) ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {copy.todayNoItems}
            </p>
          ) : (
            agendaGroups.map((group) => (
              <section key={group.iso} className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {group.label}
                </p>
                {group.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground/70">—</p>
                ) : (
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <MinimalAgendaCard item={item} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))
          )}
        </div>

        <footer className="border-t border-white/10 px-4 py-3">
          <Button
            size="sm"
            variant="outline"
            className="h-11 min-h-11 w-full gap-1.5 rounded-xl px-3"
            render={<Link href={`${plannerHref}#quick-add`} />}
          >
            <Plus className="h-3.5 w-3.5" />
            {copy.newEvent}
          </Button>
        </footer>
      </aside>
    </motion.div>
  );
}

function MinimalAgendaCard({ item }: { item: CalendarItem }) {
  const timeLabel =
    item.start_time && item.end_time && item.start_time !== item.end_time
      ? `${item.start_time} – ${item.end_time}`
      : item.start_time ?? "All day";
  const location = item.source_type === "external" ? item.location : null;

  return (
    <article className="rounded-xl border border-white/5 bg-black/25 px-3 py-2.5 text-sm backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <span
          className="mt-1 block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: item.color ?? "#64748b" }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-muted-foreground tabular-nums">
            {timeLabel}
          </p>
          <p className="truncate font-semibold text-foreground">{item.title}</p>
          {(item.subtitle || location) && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              {location && <MapPin className="h-3 w-3 shrink-0" />}
              {item.subtitle ?? location}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
