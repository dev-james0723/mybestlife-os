"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3 } from "lucide-react";
import { subDays } from "date-fns";
import type { Habit, HabitCompletion, StreakFreeze, TimeOfDay } from "@/lib/habits/types";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Badge } from "@/components/ui/badge";
import { HeatmapPlaceholder } from "./HeatmapPlaceholder";

export interface HabitAnalyticsPanelProps {
  habits: readonly Habit[];
  completions: readonly HabitCompletion[];
  freezes: readonly StreakFreeze[];
  from: string;
  to: string;
  today: string;
  timeZone: string;
  copy: HabitsUiCopy;
  aiNarrative?: string;
  loading?: boolean;
}

function rateForWindow(
  habits: readonly Habit[],
  completions: readonly HabitCompletion[],
  today: string,
  days: number,
): number | null {
  const active = habits.filter((h) => h.is_active && !h.archived_at);
  if (!active.length) return null;
  const start = subDays(new Date(`${today}T00:00:00`), days - 1)
    .toISOString()
    .slice(0, 10);
  const done = completions.filter(
    (c) => c.status === "done" && c.completion_date >= start && c.completion_date <= today,
  ).length;
  return done / Math.max(1, active.length * days);
}

function timeOfDayLabel(copy: HabitsUiCopy, value: string): string {
  switch (value as TimeOfDay) {
    case "morning":
      return copy.timeMorning;
    case "afternoon":
      return copy.timeAfternoon;
    case "evening":
      return copy.timeEvening;
    case "anytime":
      return copy.timeAnytime;
    default:
      return value;
  }
}

export function HabitAnalyticsPanel({
  habits,
  completions,
  freezes,
  from,
  to,
  today,
  timeZone,
  copy,
  aiNarrative,
  loading,
}: HabitAnalyticsPanelProps) {
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const activeHabits = habits.filter((h) => h.is_active && !h.archived_at);
  const filteredHabits =
    timeFilter === "all"
      ? activeHabits
      : activeHabits.filter((h) => h.time_of_day === timeFilter);

  const metrics = useMemo(() => {
    const seven = rateForWindow(activeHabits, completions, today, 7);
    const thirty = rateForWindow(activeHabits, completions, today, 30);
    const skipped = completions.filter((c) => c.status === "skipped").length;
    const byTime = new Map<string, { done: number; total: number }>();
    for (const h of activeHabits) byTime.set(h.time_of_day, { done: 0, total: 0 });
    for (const h of activeHabits) {
      const bucket = byTime.get(h.time_of_day) ?? { done: 0, total: 0 };
      bucket.total += 30;
      bucket.done += completions.filter(
        (c) => c.habit_id === h.id && c.status === "done",
      ).length;
      byTime.set(h.time_of_day, bucket);
    }
    const ranked = [...byTime.entries()]
      .filter(([, v]) => v.total > 0)
      .map(([tod, v]) => ({ tod, rate: v.done / v.total }))
      .sort((a, b) => b.rate - a.rate);
    return {
      seven,
      thirty,
      skipped,
      best: ranked[0]?.tod ?? "anytime",
      weakest: ranked[ranked.length - 1]?.tod ?? "anytime",
      volatility:
        seven != null && thirty != null ? Math.abs(seven - thirty) : null,
      tooAmbitious: activeHabits.length > 0 && seven != null && seven < 0.35,
    };
  }, [activeHabits, completions, today]);

  const formatRate = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);

  return (
    <GlassPanel className="space-y-5 p-4 sm:p-5" variant="strong">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <h2 className="text-lg font-semibold">{copy.analyticsTitle}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.heatmapSectionDescription}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {["all", "morning", "afternoon", "evening", "anytime"].map((key) => (
            <button
              key={key}
              type="button"
              className={`rounded-full px-2.5 py-1 text-xs transition ${
                timeFilter === key
                  ? "bg-primary text-primary-foreground"
                  : "border border-white/10 bg-white/[0.05] text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTimeFilter(key)}
            >
              {key === "all" ? copy.analyticsFilterAll : timeOfDayLabel(copy, key)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <Metric label={copy.analyticsMetric7Days} value={formatRate(metrics.seven)} />
        <Metric label={copy.analyticsMetric30Days} value={formatRate(metrics.thirty)} />
        <Metric label={copy.analyticsMetricSkipped} value={String(metrics.skipped)} />
        <Metric
          label={copy.analyticsMetricVolatility}
          value={
            metrics.volatility == null
              ? "—"
              : copy.analyticsVolatilityPoints(Math.round(metrics.volatility * 100))
          }
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <HeatmapPlaceholder
          habits={filteredHabits}
          from={from}
          to={to}
          today={today}
          timeZone={timeZone}
          copy={copy}
          completions={completions}
          freezes={freezes}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">{copy.analyticsNarrativeTitle}</h3>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {loading
              ? copy.insightLoading
              : aiNarrative ||
                copy.analyticsFallbackNarrative(
                  timeOfDayLabel(copy, metrics.best),
                  timeOfDayLabel(copy, metrics.weakest),
                )}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-300" />
            <h3 className="text-sm font-semibold">{copy.analyticsDifficultyTitle}</h3>
          </div>
          {metrics.tooAmbitious ? (
            <Badge className="border-amber-300/30 bg-amber-300/10 text-amber-100" variant="outline">
              {copy.analyticsTooAmbitious}
            </Badge>
          ) : (
            <p className="text-sm text-muted-foreground">
              {copy.analyticsNoOverreach}
            </p>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <p className="text-[0.68rem] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
