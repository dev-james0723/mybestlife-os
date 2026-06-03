"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CalendarClock, CheckCircle2, Plus, Sparkles } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/stores/app-store";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { useTodayContext } from "@/hooks/use-today-context";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { DayLoadBadge } from "@/components/calendar/day-load-badge";
import { CalendarEventTile } from "@/components/calendar/calendar-event-tile";
import { FreeWindowChips } from "@/components/calendar/free-window-chips";
import { AISummaryCard } from "@/components/calendar/ai-summary-card";

/**
 * Today tab — expanded full-page view of the homepage `TodayBlock`.
 *
 * Differences vs the homepage block:
 *  - full timeline (not capped at 5)
 *  - overdue + conflicts each get a dedicated panel with item details
 *  - CTA row anchored at the bottom
 */
export function TodayTab() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getCalendarUiCopy(language), [language]);
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const prefersReduced = useReducedMotion();
  const plannerHref = useLocalizedPath("/daily-planner");

  const {
    context,
    summary,
    conflicts,
    isLoadingSummary,
    isLoadingCalendar,
    isLoadingConflicts,
  } = useTodayContext();

  const today = useMemo(() => new Date(), []);
  const items = context?.items ?? [];
  const overdue = items.filter(
    (i) => i.source_type === "task" && (i as { overdue: boolean }).overdue
  );

  return (
    <motion.div
      data-calendar-surface
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      {/* Left column */}
      <div className="space-y-4">
        <GlassPanel className="calendar-specular-highlight p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {copy.todayBlockTitle}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">
                {format(today, "EEEE, MMMM d", { locale: dateLocale })}
              </h2>
            </div>
            <div className="ml-auto">
              {context && (
                <DayLoadBadge load={context.load} label={copy.dayLoadLabels[context.load]} />
              )}
            </div>
          </div>
          <AISummaryCard
            summary={summary}
            isLoading={isLoadingSummary || isLoadingCalendar}
            skeletonLabel={copy.todaySummarySkeleton}
          />
        </GlassPanel>

        <GlassPanel className="calendar-specular-highlight p-5">
          <h3 className="mb-3 text-sm font-semibold">{copy.todayTimelineTitle}</h3>
          {isLoadingCalendar ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {copy.todayNoItems}
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <CalendarEventTile item={item} variant="row" />
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </div>

      {/* Right column */}
      <div className="space-y-4">
        {overdue.length > 0 && (
          <GlassPanel className="calendar-specular-highlight p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              {copy.overdueSectionTitle}
              <span className="ml-auto text-xs font-medium text-muted-foreground">
                {overdue.length}
              </span>
            </div>
            <ul className="space-y-2">
              {overdue.map((item) => (
                <li key={item.id}>
                  <CalendarEventTile item={item} variant="row" />
                </li>
              ))}
            </ul>
          </GlassPanel>
        )}

        <GlassPanel className="calendar-specular-highlight p-5">
          <h3 className="mb-3 text-sm font-semibold">{copy.todayFreeWindowsTitle}</h3>
          {context && context.free_windows.length > 0 ? (
            <FreeWindowChips windows={context.free_windows} title="" />
          ) : (
            <p className="text-sm text-muted-foreground">
              {copy.todayNoFreeWindows}
            </p>
          )}
        </GlassPanel>

        {isLoadingConflicts ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : conflicts.length > 0 ? (
          <GlassPanel className="calendar-specular-highlight p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              {copy.aiConflictsTitle}
            </h3>
            <ul className="space-y-2">
              {conflicts.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-border/60 bg-card/60 p-3 text-sm"
                >
                  <p className="font-medium">{c.message}</p>
                  {c.suggestion && (
                    <p className="mt-1 text-xs text-muted-foreground">{c.suggestion}</p>
                  )}
                </li>
              ))}
            </ul>
          </GlassPanel>
        ) : (
          <GlassPanel className="calendar-specular-highlight p-5">
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              {copy.todayNoConflicts}
            </div>
          </GlassPanel>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-11 min-h-11 gap-1.5 rounded-xl px-3"
            render={<Link href={`${plannerHref}#quick-add`} />}
          >
            <Plus className="h-3.5 w-3.5" />
            {copy.quickAdd}
          </Button>
          <Button
            size="sm"
            className="calendar-lime-cta h-11 min-h-11 gap-1.5 rounded-xl px-3"
            render={<Link href="?tab=ai-plan" />}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {copy.planMyDay}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-11 min-h-11 gap-1.5 rounded-xl px-3"
            render={<Link href={plannerHref} />}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            {copy.backToDailyPlanner}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
