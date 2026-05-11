"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { HealthCard } from "./primitives/HealthCard";
import {
  useDeleteHealthGoal,
  useHealthGoals,
  useHealthMetricsRange,
  useUpsertHealthGoal,
} from "@/hooks/use-health-v2";
import { useAppStore } from "@/stores/app-store";
import { getHealthUiCopy } from "@/lib/i18n/health-ui";
import type { HealthGoal, HealthGoalPeriod, HealthMetricType } from "@/types/database";
import { bucketByDay } from "@/lib/health/metricsDerived";

interface Props {
  className?: string;
}

const GOAL_METRICS: HealthMetricType[] = [
  "steps",
  "active_energy",
  "workout_minutes",
  "mindful_minutes",
  "water_ml",
  "sleep_duration",
];

const DEFAULT_UNITS: Partial<Record<HealthMetricType, string>> = {
  steps: "count",
  active_energy: "kcal",
  workout_minutes: "minutes",
  mindful_minutes: "minutes",
  water_ml: "ml",
  sleep_duration: "hours",
};

export function HealthGoalsPanel({ className }: Props) {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getHealthUiCopy(language).goals, [language]);
  const vitalsUi = useMemo(() => getHealthUiCopy(language).vitals, [language]);

  const goals = useHealthGoals();
  const [isAdding, setIsAdding] = useState(false);

  return (
    <section className={className} aria-label={ui.sectionTitle}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{ui.sectionTitle}</h2>
        <Button size="sm" variant="outline" onClick={() => setIsAdding((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          {ui.addGoal}
        </Button>
      </div>
      {isAdding && <AddGoalForm onDone={() => setIsAdding(false)} />}
      {goals.data && goals.data.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {goals.data.map((g) => (
            <GoalRow key={g.id} goal={g} vitalsLabels={vitalsUi} labels={ui} />
          ))}
        </ul>
      ) : (
        !isAdding && (
          <HealthCard>
            <p className="text-sm text-muted-foreground">{ui.empty}</p>
          </HealthCard>
        )
      )}
    </section>
  );
}

function GoalRow({
  goal,
  vitalsLabels,
  labels,
}: {
  goal: HealthGoal;
  vitalsLabels: ReturnType<typeof getHealthUiCopy>["vitals"];
  labels: ReturnType<typeof getHealthUiCopy>["goals"];
}) {
  const { fromISO, toISO } = useMemo(() => windowForPeriod(goal.period), [goal.period]);
  const metricsQuery = useHealthMetricsRange(goal.metric_type, fromISO, toISO);
  const deleteGoal = useDeleteHealthGoal();

  const current = useMemo(() => {
    const buckets = bucketByDay(metricsQuery.data ?? []);
    if (buckets.length === 0) return 0;
    if (goal.period === "daily") return buckets[buckets.length - 1]?.value ?? 0;
    return buckets.reduce((a, b) => a + b.value, 0);
  }, [metricsQuery.data, goal.period]);

  const pct = goal.target_value > 0 ? Math.min(100, (current / goal.target_value) * 100) : 0;
  const label = metricLabel(goal.metric_type, vitalsLabels);

  return (
    <HealthCard className="flex items-center gap-3" aria-label={`${label}: ${current}/${goal.target_value} ${goal.unit}`}>
      <div className="flex-1">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {labels.progressLabel(roundSmart(current), goal.target_value, goal.unit)}
          </p>
        </div>
        <Progress value={pct} className="mt-2 h-2" />
      </div>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => deleteGoal.mutate(goal.id)}
        aria-label="Delete goal"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </HealthCard>
  );
}

function AddGoalForm({ onDone }: { onDone: () => void }) {
  const upsert = useUpsertHealthGoal();
  const [metric, setMetric] = useState<HealthMetricType>("steps");
  const [target, setTarget] = useState<string>("10000");
  const [period, setPeriod] = useState<HealthGoalPeriod>("daily");

  async function submit() {
    const target_value = Number(target);
    if (!Number.isFinite(target_value) || target_value <= 0) return;
    const unit = DEFAULT_UNITS[metric] ?? "count";
    await upsert.mutateAsync({ metric_type: metric, target_value, unit, period });
    onDone();
  }

  return (
    <HealthCard className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-xs font-medium">Metric</label>
        <Select value={metric} onValueChange={(v) => setMetric(v as HealthMetricType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GOAL_METRICS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1 sm:w-32">
        <label className="text-xs font-medium">Target</label>
        <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1 sm:w-32">
        <label className="text-xs font-medium">Period</label>
        <Select value={period} onValueChange={(v) => setPeriod(v as HealthGoalPeriod)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" onClick={submit} disabled={upsert.isPending}>
        Save
      </Button>
      <Button size="sm" variant="ghost" onClick={onDone}>
        Cancel
      </Button>
    </HealthCard>
  );
}

function windowForPeriod(period: HealthGoalPeriod): { fromISO: string; toISO: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  if (period === "daily") start.setHours(0, 0, 0, 0);
  else if (period === "weekly") {
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return { fromISO: start.toISOString(), toISO: end.toISOString() };
}

function metricLabel(
  metric: string,
  vitalsLabels: ReturnType<typeof getHealthUiCopy>["vitals"],
): string {
  switch (metric) {
    case "steps":
      return vitalsLabels.steps;
    case "active_energy":
      return vitalsLabels.activeEnergy;
    case "workout_minutes":
      return vitalsLabels.workouts;
    case "mindful_minutes":
      return vitalsLabels.mindful;
    default:
      return metric;
  }
}

function roundSmart(v: number): number {
  if (v >= 1000) return Math.round(v);
  if (v >= 10) return Math.round(v * 10) / 10;
  return Math.round(v * 100) / 100;
}
