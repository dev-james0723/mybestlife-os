"use client";

import { useMemo } from "react";
import { Activity, Brain, Dumbbell, Flame, Footprints, Heart, HeartPulse, Scale } from "lucide-react";
import { HealthCard } from "./primitives/HealthCard";
import { Sparkline } from "./primitives/Sparkline";
import { DeltaPill } from "./primitives/DeltaPill";
import { useHealthMetricsRange } from "@/hooks/use-health-v2";
import { bucketByDay, baselineAvg, fillDays } from "@/lib/health/metricsDerived";
import { useAppStore } from "@/stores/app-store";
import { getHealthUiCopy } from "@/lib/i18n/health-ui";
import type { HealthMetricType } from "@/types/database";
import { cn } from "@/lib/utils";

interface VitalConfig {
  metricType: HealthMetricType;
  icon: typeof Activity;
  label: (ui: ReturnType<typeof getHealthUiCopy>) => string;
  unit: string;
  goodIsUp: boolean;
  format: (v: number) => string;
  strokeClassName: string;
  fillClassName: string;
}

const VITALS: VitalConfig[] = [
  {
    metricType: "steps",
    icon: Footprints,
    label: (u) => u.vitals.steps,
    unit: "",
    goodIsUp: true,
    format: (v) => formatThousands(v),
    strokeClassName: "stroke-indigo-500",
    fillClassName: "fill-indigo-500/10",
  },
  {
    metricType: "rhr",
    icon: Heart,
    label: (u) => u.vitals.rhr,
    unit: "bpm",
    goodIsUp: false,
    format: (v) => v.toFixed(0),
    strokeClassName: "stroke-rose-500",
    fillClassName: "fill-rose-500/10",
  },
  {
    metricType: "hrv",
    icon: HeartPulse,
    label: (u) => u.vitals.hrv,
    unit: "ms",
    goodIsUp: true,
    format: (v) => v.toFixed(0),
    strokeClassName: "stroke-emerald-500",
    fillClassName: "fill-emerald-500/10",
  },
  {
    metricType: "spo2",
    icon: Activity,
    label: (u) => u.vitals.spo2,
    unit: "%",
    goodIsUp: true,
    format: (v) => v.toFixed(0),
    strokeClassName: "stroke-cyan-500",
    fillClassName: "fill-cyan-500/10",
  },
  {
    metricType: "active_energy",
    icon: Flame,
    label: (u) => u.vitals.activeEnergy,
    unit: "kcal",
    goodIsUp: true,
    format: (v) => v.toFixed(0),
    strokeClassName: "stroke-amber-500",
    fillClassName: "fill-amber-500/10",
  },
  {
    metricType: "workout_minutes",
    icon: Dumbbell,
    label: (u) => u.vitals.workouts,
    unit: "min",
    goodIsUp: true,
    format: (v) => v.toFixed(0),
    strokeClassName: "stroke-orange-500",
    fillClassName: "fill-orange-500/10",
  },
  {
    metricType: "weight",
    icon: Scale,
    label: (u) => u.vitals.weight,
    unit: "kg",
    goodIsUp: false,
    format: (v) => v.toFixed(1),
    strokeClassName: "stroke-slate-500",
    fillClassName: "fill-slate-500/10",
  },
  {
    metricType: "mindful_minutes",
    icon: Brain,
    label: (u) => u.vitals.mindful,
    unit: "min",
    goodIsUp: true,
    format: (v) => v.toFixed(0),
    strokeClassName: "stroke-violet-500",
    fillClassName: "fill-violet-500/10",
  },
];

function formatThousands(v: number): string {
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(2)}k`;
  return v.toFixed(0);
}

interface Props {
  todayISO: string;
  rangeStartISO: string; // 14 days ago
  rangeEndISO: string;   // now
  className?: string;
}

export function VitalsGrid({ todayISO, rangeStartISO, rangeEndISO, className }: Props) {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getHealthUiCopy(language), [language]);

  return (
    <section className={cn("flex flex-col gap-3", className)} aria-label={ui.vitals.sectionTitle}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{ui.vitals.sectionTitle}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {VITALS.map((config) => (
          <VitalTile
            key={config.metricType}
            config={config}
            todayISO={todayISO}
            rangeStartISO={rangeStartISO}
            rangeEndISO={rangeEndISO}
            ui={ui}
          />
        ))}
      </div>
    </section>
  );
}

function VitalTile({
  config,
  todayISO,
  rangeStartISO,
  rangeEndISO,
  ui,
}: {
  config: VitalConfig;
  todayISO: string;
  rangeStartISO: string;
  rangeEndISO: string;
  ui: ReturnType<typeof getHealthUiCopy>;
}) {
  const query = useHealthMetricsRange(config.metricType, rangeStartISO, rangeEndISO);
  const buckets = useMemo(() => bucketByDay(query.data ?? []), [query.data]);
  const filled = useMemo(() => fillDays(buckets, todayISO, 14), [buckets, todayISO]);

  const todayBucket = buckets.find((b) => b.date === toLocal(todayISO));
  const todayValue = todayBucket?.value ?? null;
  const baseline = baselineAvg(buckets, true);
  const delta = todayValue !== null && baseline !== null ? todayValue - baseline : null;

  const label = config.label(ui);
  const Icon = config.icon;

  return (
    <HealthCard className="flex flex-col gap-2" aria-label={label}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold tabular-nums">
          {todayValue !== null ? (
            <>
              {config.format(todayValue)}
              {config.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{config.unit}</span>}
            </>
          ) : (
            <span className="text-base font-normal text-muted-foreground">—</span>
          )}
        </p>
        <DeltaPill delta={delta} goodIsUp={config.goodIsUp} unit={config.unit} />
      </div>
      <Sparkline
        data={filled}
        width={220}
        height={28}
        strokeClassName={config.strokeClassName}
        fillClassName={config.fillClassName}
        ariaLabel={`${label} — last 14 days`}
      />
    </HealthCard>
  );
}

function toLocal(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
