"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity } from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";
import type { MomentumWavePoint } from "@/lib/analytics/types";
import { useChartSize } from "./useChartSize";

type MomentumWaveChartProps = {
  data: MomentumWavePoint[];
  interpretation: string;
  hasData: boolean;
};

type MomentumTooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    name?: string | number;
    value?: string | number;
  }>;
  label?: string | number;
};

function MomentumTooltip({ active, payload, label }: MomentumTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-background/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-2 font-medium">{label}</p>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">{item.name}</span>
          <span className="font-medium tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function MomentumWaveChart({
  data,
  interpretation,
  hasData,
}: MomentumWaveChartProps) {
  const { containerRef, chartWidth } = useChartSize<HTMLDivElement>();

  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h2 className="text-base font-semibold tracking-normal">Momentum Wave</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{interpretation}</p>
        </div>
      </div>

      <div ref={containerRef} className="h-[310px] min-w-0">
        {!hasData ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Add completed tasks, daily plans, study sessions, or journal entries to generate a real momentum wave.
          </div>
        ) : chartWidth > 0 ? (
          <ComposedChart
            width={chartWidth}
            height={310}
            data={data}
            margin={{ top: 10, right: 8, bottom: 0, left: -18 }}
          >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.45)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                minTickGap={18}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<MomentumTooltip />} />
              <Area
                type="monotone"
                dataKey="activityScore"
                name="Activity score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.16)"
                strokeWidth={2}
              />
              <Bar
                dataKey="completedTasks"
                name="Completed"
                fill="hsl(155 70% 45% / 0.72)"
                radius={[5, 5, 0, 0]}
                barSize={8}
              />
              <Bar
                dataKey="plannedItems"
                name="Planned"
                fill="hsl(205 85% 55% / 0.38)"
                radius={[5, 5, 0, 0]}
                barSize={8}
              />
              <Line
                type="monotone"
                dataKey="overduePressure"
                name="Overdue"
                stroke="hsl(38 90% 48%)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="journalIntensity"
                name="Journal intensity"
                stroke="hsl(335 70% 58%)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
          </ComposedChart>
        ) : (
          <div className="h-full rounded-xl bg-muted/20" />
        )}
      </div>
    </GlassPanel>
  );
}
