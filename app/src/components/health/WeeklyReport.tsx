"use client";

import { useMemo } from "react";
import { Smile, Frown, BarChart3 } from "lucide-react";
import { HealthCard } from "./primitives/HealthCard";
import {
  useHealthDailyLogsRange,
  useHealthMetricsRange,
} from "@/hooks/use-health-v2";
import { bucketByDay } from "@/lib/health/metricsDerived";
import { useAppStore } from "@/stores/app-store";
import { getHealthUiCopy } from "@/lib/i18n/health-ui";

interface Props {
  todayISO: string;
  className?: string;
}

/**
 * Tidy 7-day recap: best/worst mood days, total steps, avg sleep,
 * workout count. Sits above correlations so users see both the summary
 * and the insights.
 */
export function WeeklyReport({ todayISO, className }: Props) {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getHealthUiCopy(language).weeklyReport, [language]);

  const { fromDate, toDate, fromISO, toISO } = useMemo(() => {
    const end = new Date(todayISO);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return {
      fromDate: toLocalDate(start),
      toDate: toLocalDate(end),
      fromISO: new Date(start.setHours(0, 0, 0, 0)).toISOString(),
      toISO: new Date(end.setHours(23, 59, 59, 999)).toISOString(),
    };
  }, [todayISO]);

  const logs = useHealthDailyLogsRange(fromDate, toDate);
  const sleep = useHealthMetricsRange("sleep_duration", fromISO, toISO);
  const steps = useHealthMetricsRange("steps", fromISO, toISO);
  const workouts = useHealthMetricsRange("workout_minutes", fromISO, toISO);

  const summary = useMemo(() => {
    const logList = logs.data ?? [];
    const avgSleepHours = averageValue(bucketByDay(sleep.data ?? []).map((b) => b.value));
    const totalSteps = sumValues(bucketByDay(steps.data ?? []).map((b) => b.value));
    const workoutBuckets = bucketByDay(workouts.data ?? []);
    const workoutCount = workoutBuckets.filter((b) => b.value >= 15).length;

    const withMood = logList.filter((l) => l.mood_valence !== null);
    withMood.sort((a, b) => (a.mood_valence ?? 0) - (b.mood_valence ?? 0));
    const lowestMood = withMood[0] ?? null;
    const highestMood = withMood[withMood.length - 1] ?? null;

    return { avgSleepHours, totalSteps, workoutCount, lowestMood, highestMood };
  }, [logs.data, sleep.data, steps.data, workouts.data]);

  return (
    <HealthCard className={className}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold">{ui.title}</h2>
          <p className="text-xs text-muted-foreground">{ui.subtitle(fromDate, toDate)}</p>
        </div>
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label={ui.avgSleep} value={summary.avgSleepHours !== null ? `${summary.avgSleepHours.toFixed(1)}h` : "—"} />
        <Stat label={ui.totalSteps} value={summary.totalSteps !== null ? formatThousands(summary.totalSteps) : "—"} />
        <Stat label={ui.workoutCount} value={`${summary.workoutCount}`} />
        <div className="flex flex-col gap-1">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{ui.highestMoodDay}</dt>
          <dd className="flex items-center gap-1 text-sm font-semibold">
            <Smile className="h-4 w-4 text-green-500" />
            {summary.highestMood ? summary.highestMood.log_date.slice(5) : "—"}
          </dd>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{ui.lowestMoodDay}</dt>
          <dd className="flex items-center gap-1 text-sm font-semibold">
            <Frown className="h-4 w-4 text-red-500" />
            {summary.lowestMood ? summary.lowestMood.log_date.slice(5) : "—"}
          </dd>
        </div>
      </dl>
    </HealthCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function averageValue(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sumValues(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0);
}

function formatThousands(v: number): string {
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(2)}k`;
  return v.toFixed(0);
}

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
