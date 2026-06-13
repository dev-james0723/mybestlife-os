"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CalendarClock, CloudSun, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
import { useTodayContext } from "@/hooks/use-today-context";
import { useWeather } from "@/hooks/use-weather";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { DayLoadBadge } from "@/components/calendar/day-load-badge";
import { DashboardWeatherWidget } from "@/components/calendar/dashboard-weather-widget";
import { TimelinePreview } from "@/components/calendar/timeline-preview";
import { FreeWindowChips } from "@/components/calendar/free-window-chips";
import { AISummaryCard } from "@/components/calendar/ai-summary-card";
import type { TodayContextState } from "@/hooks/use-today-context";

/**
 * Homepage "Today" block — premium calm summary.
 *
 * Layout:
 *   ┌─ glass outer container ─────────────────────────────────┐
 *   │  header: date · tz chip · weather chip · DayLoad badge  │
 *   │  alert strip (overdue / conflicts) — only when relevant │
 *   │  AI summary card (async, skeleton → fade-in)            │
 *   │  timeline preview + free window chips                   │
 *   │  quick action buttons                                   │
 *   └─────────────────────────────────────────────────────────┘
 */
type TodayBlockViewProps = {
  today: TodayContextState;
  showWeatherWidget?: boolean;
};

export function TodayBlock() {
  const today = useTodayContext();

  return <TodayBlockView today={today} />;
}

export function TodayBlockView({ today, showWeatherWidget = true }: TodayBlockViewProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getCalendarUiCopy(language), [language]);
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);

  const calendarHref = useLocalizedPath("/calendar");
  const plannerHref = useLocalizedPath("/daily-planner");

  const { context, summary, conflicts, isLoadingSummary, isLoadingCalendar } = today;

  const { result: weather } = useWeather();

  const todayDate = useMemo(() => new Date(), []);
  const timezoneLabel = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  }, []);

  const items = context?.items ?? [];
  const overdueCount = context?.overdue_count ?? 0;
  const conflictCount = conflicts.length;
  const load = context?.load ?? "Balanced";
  const freeWindows = context?.free_windows ?? [];

  // Outdoor commitments today → weather suggestion can flag commute/timing.
  const hasOutdoorEvents = items.some(
    (item) => item.source_type === "external" && !!item.location,
  );

  const weatherLabel =
    weather?.status === "ok"
      ? `${Math.round(weather.tempC)}°C${weather.city ? ` · ${weather.city}` : ""}`
      : null;

  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      data-calendar-surface
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
    <GlassPanel
      className={cn(
        "calendar-specular-highlight relative overflow-hidden",
        "px-5 py-5 sm:px-6 sm:py-6"
      )}
      aria-label={copy.todayBlockTitle}
    >
      <div className="space-y-5">
        {/* Header row */}
        <header className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {copy.todayBlockTitle}
              </p>
              <p className="text-lg font-semibold tracking-tight text-foreground">
                {format(todayDate, "EEEE, MMMM d", { locale: dateLocale })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            {timezoneLabel && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {timezoneLabel}
              </span>
            )}
            {weatherLabel && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <CloudSun className="h-3 w-3" />
                {weatherLabel}
              </span>
            )}
            <DayLoadBadge load={load} label={copy.dayLoadLabels[load]} />
          </div>
        </header>

        {/* Weather widget — glanceable today status, links to Weather page */}
        {showWeatherWidget && (
          <DashboardWeatherWidget load={load} hasOutdoorEvents={hasOutdoorEvents} />
        )}

        {/* Alert strip */}
        {(overdueCount > 0 || conflictCount > 0) && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/50 bg-amber-100/50 px-3 py-2 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {overdueCount > 0 && (
              <span className="font-medium">{copy.todayOverdueLabel(overdueCount)}</span>
            )}
            {overdueCount > 0 && conflictCount > 0 && <span className="opacity-60">·</span>}
            {conflictCount > 0 && (
              <span className="font-medium">
                {copy.todayConflictLabel(conflictCount)}
              </span>
            )}
          </div>
        )}

        {/* AI summary */}
        <AISummaryCard
          summary={summary}
          isLoading={isLoadingSummary || isLoadingCalendar}
          skeletonLabel={copy.todaySummarySkeleton}
        />

        {/* Timeline + free windows */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {copy.todayTimelineTitle}
            </p>
            <TimelinePreview
              items={items}
              emptyLabel={copy.todayNoItems}
            />
          </div>

          <div className="space-y-2">
            {freeWindows.length > 0 ? (
              <FreeWindowChips
                windows={freeWindows}
                title={copy.todayFreeWindowsTitle}
              />
            ) : (
              <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
                {copy.todayNoFreeWindows}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
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
            render={<Link href={`${calendarHref}?tab=ai-plan`} />}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {copy.planMyDay}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-11 min-h-11 gap-1.5 rounded-xl px-3"
            render={<Link href={`${calendarHref}?tab=today`} />}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            {copy.openCalendar}
          </Button>
        </div>
      </div>
    </GlassPanel>
    </motion.div>
  );
}
