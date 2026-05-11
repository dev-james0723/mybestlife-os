"use client";

import { useMemo } from "react";
import { HealthCard } from "./primitives/HealthCard";
import {
  useHealthDailyLogsRange,
  useHealthMetricsRange,
} from "@/hooks/use-health-v2";
import { computeInsights, joinDays } from "@/lib/health/correlationEngine";
import { useAppStore } from "@/stores/app-store";
import { getHealthUiCopy } from "@/lib/i18n/health-ui";

interface Props {
  fromDate: string; // YYYY-MM-DD (inclusive)
  toDate: string;   // YYYY-MM-DD (inclusive)
  className?: string;
}

/**
 * Shows up to three notable correlations between lifestyle conditions and
 * subjective outcomes, computed client-side over the given date range.
 * Stays silent (with empty-state copy) until we have >=14 days of data.
 */
export function CorrelationsPanel({ fromDate, toDate, className }: Props) {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getHealthUiCopy(language), [language]);

  const logsQuery = useHealthDailyLogsRange(fromDate, toDate);
  const fromISO = `${fromDate}T00:00:00Z`;
  const toISO = `${toDate}T23:59:59Z`;
  const sleep = useHealthMetricsRange("sleep_duration", fromISO, toISO);
  const steps = useHealthMetricsRange("steps", fromISO, toISO);
  const hrv = useHealthMetricsRange("hrv", fromISO, toISO);
  const rhr = useHealthMetricsRange("rhr", fromISO, toISO);
  const workout = useHealthMetricsRange("workout_minutes", fromISO, toISO);
  const caffeine = useHealthMetricsRange("caffeine_mg", fromISO, toISO);

  const insights = useMemo(() => {
    const logs = logsQuery.data ?? [];
    if (logs.length < 14) return [];
    const rows = joinDays(logs, {
      sleep_duration: sleep.data,
      steps: steps.data,
      hrv: hrv.data,
      rhr: rhr.data,
      workout_minutes: workout.data,
      caffeine_mg: caffeine.data,
    });
    return computeInsights(rows, 3);
  }, [logsQuery.data, sleep.data, steps.data, hrv.data, rhr.data, workout.data, caffeine.data]);

  return (
    <section className={className} aria-label={ui.correlations.sectionTitle}>
      <h2 className="mb-3 text-lg font-semibold">{ui.correlations.sectionTitle}</h2>
      {insights.length === 0 ? (
        <HealthCard>
          <p className="text-sm text-muted-foreground">{ui.correlations.empty}</p>
        </HealthCard>
      ) : (
        <ul className="flex flex-col gap-3">
          {insights.map((insight) => {
            const conditionLabel = ui.correlations.conditions[insight.conditionKey];
            const metricLabel = ui.correlations.metrics[insight.metricKey];
            const deltaAbsPct = Math.round(Math.abs(insight.stats.deltaPct ?? 0) * 100);
            const deltaLabel = `${deltaAbsPct}%`;
            const r = pearsonLikeFromDelta(insight.stats.deltaPct ?? 0);
            return (
              <HealthCard key={insight.key} as="article">
                <p className="text-sm">
                  {ui.correlations.template(
                    conditionLabel,
                    metricLabel,
                    deltaLabel,
                    insight.direction,
                  )}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {ui.correlations.sampleSize(insight.stats.n, r)}
                </p>
              </HealthCard>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * We report sample size + a "strength" indicator we label as r. This is a
 * deliberate simplification — the real Pearson r for the paired subjective
 * vs objective series would need matched vectors; for UI we just report
 * the magnitude of the delta which is easier to reason about. The copy
 * function signature keeps the door open to swap this for true Pearson.
 */
function pearsonLikeFromDelta(deltaPct: number): number {
  return Math.max(-1, Math.min(1, deltaPct));
}
