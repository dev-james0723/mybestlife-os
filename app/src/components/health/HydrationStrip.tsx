"use client";

import { useMemo } from "react";
import { Coffee, Droplet, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HealthCard } from "./primitives/HealthCard";
import {
  useCreateHealthMetric,
  useHealthGoals,
  useHealthMetricsRange,
} from "@/hooks/use-health-v2";
import { useAppStore } from "@/stores/app-store";
import { getHealthUiCopy } from "@/lib/i18n/health-ui";
import type { HealthMetricType } from "@/types/database";

interface Props {
  todayISO: string;
  className?: string;
}

const QUICK_WATER = [250, 500, 750];

const COFFEE_PRESETS = [
  { key: "espresso" as const, mg: 70 },
  { key: "coffee" as const, mg: 120 },
  { key: "tea" as const, mg: 40 },
];

export function HydrationStrip({ todayISO, className }: Props) {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getHealthUiCopy(language).hydration, [language]);

  const { dayStartISO, dayEndISO } = useMemo(() => {
    const start = new Date(todayISO);
    start.setHours(0, 0, 0, 0);
    const end = new Date(todayISO);
    end.setHours(23, 59, 59, 999);
    return { dayStartISO: start.toISOString(), dayEndISO: end.toISOString() };
  }, [todayISO]);

  const water = useHealthMetricsRange("water_ml", dayStartISO, dayEndISO);
  const caffeine = useHealthMetricsRange("caffeine_mg", dayStartISO, dayEndISO);
  const alcohol = useHealthMetricsRange("alcohol_units", dayStartISO, dayEndISO);
  const goals = useHealthGoals();
  const waterGoal =
    goals.data?.find((g) => g.metric_type === "water_ml" && g.period === "daily")?.target_value ??
    2000;

  const waterTotal = totalForToday(water.data ?? []);
  const caffeineTotal = totalForToday(caffeine.data ?? []);
  const alcoholTotal = totalForToday(alcohol.data ?? []);

  return (
    <section className={className} aria-label={ui.sectionTitle}>
      <h2 className="mb-3 text-lg font-semibold">{ui.sectionTitle}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <WaterTile
          title={ui.waterLabel}
          total={waterTotal}
          goal={waterGoal}
          goalCopy={ui.waterGoal(waterGoal)}
          quickCopy={ui.waterAdd}
        />
        <CaffeineTile title={ui.caffeineLabel} total={caffeineTotal} ui={ui} />
        <AlcoholTile title={ui.alcoholLabel} total={alcoholTotal} />
      </div>
    </section>
  );
}

function WaterTile({
  title,
  total,
  goal,
  goalCopy,
  quickCopy,
}: {
  title: string;
  total: number;
  goal: number;
  goalCopy: string;
  quickCopy: (ml: number) => string;
}) {
  const create = useCreateHealthMetric();
  const pct = goal > 0 ? Math.min(100, (total / goal) * 100) : 0;
  return (
    <HealthCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplet className="h-5 w-5 text-blue-500" />
          <span className="font-semibold">{title}</span>
        </div>
        <span className="text-xs text-muted-foreground">{goalCopy}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">{total}</span>
        <span className="text-xs text-muted-foreground">ml</span>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="flex flex-wrap gap-2">
        {QUICK_WATER.map((ml) => (
          <Button
            key={ml}
            size="sm"
            variant="outline"
            className="h-11 min-w-11 px-4 sm:h-7 sm:px-2.5"
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                metric_type: "water_ml" as HealthMetricType,
                value: ml,
                unit: "ml",
                recorded_at: new Date().toISOString(),
                source: "manual",
              })
            }
          >
            {quickCopy(ml)}
          </Button>
        ))}
      </div>
    </HealthCard>
  );
}

function CaffeineTile({
  title,
  total,
  ui,
}: {
  title: string;
  total: number;
  ui: ReturnType<typeof getHealthUiCopy>["hydration"];
}) {
  const create = useCreateHealthMetric();
  const presetLabels: Record<"espresso" | "coffee" | "tea", string> = {
    espresso: ui.quickAddEspresso,
    coffee: ui.quickAddCoffee,
    tea: ui.quickAddTea,
  };
  return (
    <HealthCard className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Coffee className="h-5 w-5 text-amber-700" />
        <span className="font-semibold">{title}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">{total}</span>
        <span className="text-xs text-muted-foreground">mg</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {COFFEE_PRESETS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant="outline"
            className="h-11 min-w-11 px-4 sm:h-7 sm:px-2.5"
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                metric_type: "caffeine_mg" as HealthMetricType,
                value: p.mg,
                unit: "mg",
                recorded_at: new Date().toISOString(),
                source: "manual",
              })
            }
          >
            {presetLabels[p.key]} +{p.mg}mg
          </Button>
        ))}
      </div>
    </HealthCard>
  );
}

function AlcoholTile({
  title,
  total,
}: {
  title: string;
  total: number;
}) {
  const create = useCreateHealthMetric();
  return (
    <HealthCard className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Wine className="h-5 w-5 text-purple-500" />
        <span className="font-semibold">{title}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">{total}</span>
        <span className="text-xs text-muted-foreground">units</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2].map((units) => (
          <Button
            key={units}
            size="sm"
            variant="outline"
            className="h-11 min-w-11 px-4 sm:h-7 sm:px-2.5"
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                metric_type: "alcohol_units" as HealthMetricType,
                value: units,
                unit: "units",
                recorded_at: new Date().toISOString(),
                source: "manual",
              })
            }
          >
            +{units}
          </Button>
        ))}
      </div>
    </HealthCard>
  );
}

function totalForToday(metrics: { value: number; recorded_at: string }[]): number {
  const sum = metrics.reduce((a, m) => a + m.value, 0);
  return Math.round(sum);
}
