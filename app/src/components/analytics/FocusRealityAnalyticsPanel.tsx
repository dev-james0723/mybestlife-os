"use client";

import { useMemo, type ReactNode } from "react";
import { Activity, Gauge, Shield, Timer } from "lucide-react";

import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import { Badge } from "@/components/ui/badge";
import { useDailyPlanReviewsRange } from "@/hooks/use-daily-plan-review";
import { getDailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import { useAppStore } from "@/stores/app-store";
import type { AnalyticsRange } from "@/lib/analytics/types";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-background/35 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function FocusRealityAnalyticsPanel({ range }: { range: AnalyticsRange }) {
  const language = useAppStore((state) => state.language);
  const copy = useMemo(() => getDailyPlannerUiCopy(language), [language]);
  const { data: reviews = [] } = useDailyPlanReviewsRange(range.startISO, range.endISO);

  const metrics = useMemo(() => {
    const focusIntegrity = average(reviews.map((review) => review.focus_integrity_score));
    const stimulationLoad = average(reviews.map((review) => review.stimulation_load_score));
    const actualMinutes = reviews.reduce((sum, review) => sum + review.actual_focus_minutes, 0);
    const planAccuracy =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.plan_accuracy_ratio, 0) / reviews.length
        : 0;
    const leaks = reviews.reduce((sum, review) => sum + review.stimulation_leak_count, 0);
    const bestWindow = reviews.find((review) => review.best_focus_window)?.best_focus_window;
    return {
      focusIntegrity,
      stimulationLoad,
      actualMinutes,
      planAccuracy,
      leaks,
      bestWindow,
    };
  }, [reviews]);

  return (
    <GlassTintPanel tint="teal" className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="size-4 text-emerald-500" />
            <h2 className="text-base font-semibold tracking-normal">
              {copy.focusRealityTitle}
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {reviews.length > 0 ? copy.endOfDayReview : copy.reviewNotGenerated}
          </p>
        </div>
        <Badge variant="secondary">{reviews.length}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={<Activity className="h-3.5 w-3.5" />}
          label={copy.focusIntegrity}
          value={String(metrics.focusIntegrity)}
        />
        <Metric
          icon={<Shield className="h-3.5 w-3.5" />}
          label={copy.stimulationLoad}
          value={String(metrics.stimulationLoad)}
        />
        <Metric
          icon={<Timer className="h-3.5 w-3.5" />}
          label={copy.actualTimeline}
          value={copy.formatMinutes(metrics.actualMinutes)}
        />
        <Metric
          icon={<Gauge className="h-3.5 w-3.5" />}
          label={copy.planAccuracy}
          value={percent(metrics.planAccuracy)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">
          {copy.stimulationLeak}: {metrics.leaks}
        </Badge>
        <Badge variant="outline">
          {copy.bestFocusWindow}:{" "}
          {metrics.bestWindow
            ? `${metrics.bestWindow.start} - ${metrics.bestWindow.end}`
            : copy.noBestFocusWindow}
        </Badge>
      </div>
    </GlassTintPanel>
  );
}
