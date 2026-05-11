"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HealthCard } from "./primitives/HealthCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useHealthDailyLogsRange,
  useHealthMetricsRange,
} from "@/hooks/use-health-v2";
import { bucketByDay } from "@/lib/health/metricsDerived";
import { useAppStore } from "@/stores/app-store";
import { getHealthUiCopy } from "@/lib/i18n/health-ui";

type Range = "7d" | "30d" | "90d" | "1y";

const RANGE_DAYS: Record<Range, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

interface Props {
  className?: string;
}

/**
 * Multi-line trend chart with range tabs. Subjective pillars (1-10) are
 * plotted on the primary Y axis; objective metrics use scaled Y via
 * normalization (0-10 scale) so they share the same chart without a
 * second axis (simpler, still readable for a "vibe" view).
 */
export function TrendsSection({ className }: Props) {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getHealthUiCopy(language), [language]);
  const [range, setRange] = useState<Range>("30d");

  const { fromDate, toDate, fromISO, toISO } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(end.getDate() - (RANGE_DAYS[range] - 1));
    start.setHours(0, 0, 0, 0);
    return {
      fromDate: toLocalDate(start),
      toDate: toLocalDate(end),
      fromISO: start.toISOString(),
      toISO: end.toISOString(),
    };
  }, [range]);

  const logs = useHealthDailyLogsRange(fromDate, toDate);
  const hrv = useHealthMetricsRange("hrv", fromISO, toISO);
  const steps = useHealthMetricsRange("steps", fromISO, toISO);

  const chartData = useMemo(() => {
    const bucketedHrv = new Map(bucketByDay(hrv.data ?? []).map((b) => [b.date, b.value]));
    const bucketedSteps = new Map(bucketByDay(steps.data ?? []).map((b) => [b.date, b.value]));
    const hrvValues = [...bucketedHrv.values()];
    const stepValues = [...bucketedSteps.values()];
    const hrvMax = Math.max(1, ...hrvValues);
    const stepMax = Math.max(1, ...stepValues);

    const logsByDate = new Map((logs.data ?? []).map((l) => [l.log_date, l]));
    const allDates = fillRange(fromDate, toDate);
    return allDates.map((date) => {
      const l = logsByDate.get(date);
      const hrvRaw = bucketedHrv.get(date);
      const stepsRaw = bucketedSteps.get(date);
      return {
        date,
        shortDate: formatShort(date, range),
        isWeekend: isWeekend(date),
        sleep: l?.sleep_quality ?? null,
        energy: l?.energy_level ?? null,
        mood: l?.mood_valence ?? null,
        stress: l?.stress_level ?? null,
        hrvNormalized: hrvRaw !== undefined ? (hrvRaw / hrvMax) * 10 : null,
        stepsNormalized: stepsRaw !== undefined ? (stepsRaw / stepMax) * 10 : null,
      };
    });
  }, [logs.data, hrv.data, steps.data, fromDate, toDate, range]);

  return (
    <section className={className} aria-label={ui.trends.sectionTitle}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{ui.trends.sectionTitle}</h2>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList>
            <TabsTrigger value="7d">{ui.trends.range7d}</TabsTrigger>
            <TabsTrigger value="30d">{ui.trends.range30d}</TabsTrigger>
            <TabsTrigger value="90d">{ui.trends.range90d}</TabsTrigger>
            <TabsTrigger value="1y">{ui.trends.range1y}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <HealthCard>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-foreground/10" />
              <XAxis dataKey="shortDate" tick={{ fontSize: 11 }} minTickGap={16} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
              {chartData.map((d) =>
                d.isWeekend ? (
                  <ReferenceArea
                    key={`we-${d.date}`}
                    x1={d.shortDate}
                    x2={d.shortDate}
                    className="fill-foreground/[0.04]"
                    strokeOpacity={0}
                  />
                ) : null,
              )}
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Line
                type="monotone"
                dataKey="sleep"
                name={ui.trends.seriesSleep}
                stroke="hsl(243 75% 59%)"
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="energy"
                name={ui.trends.seriesEnergy}
                stroke="hsl(45 93% 47%)"
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="mood"
                name={ui.trends.seriesMood}
                stroke="hsl(160 84% 39%)"
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="stress"
                name={ui.trends.seriesStress}
                stroke="hsl(0 84% 60%)"
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="hrvNormalized"
                name={ui.trends.seriesHrv}
                stroke="hsl(171 77% 45%)"
                strokeDasharray="3 3"
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="stepsNormalized"
                name={ui.trends.seriesSteps}
                stroke="hsl(280 75% 60%)"
                strokeDasharray="3 3"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </HealthCard>
    </section>
  );
}

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fillRange(from: string, to: string): string[] {
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(toLocalDate(d));
  }
  return out;
}

function isWeekend(date: string): boolean {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

function formatShort(date: string, range: Range): string {
  const d = new Date(date + "T00:00:00");
  if (range === "7d") return d.toLocaleDateString(undefined, { weekday: "short" });
  if (range === "30d") return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
