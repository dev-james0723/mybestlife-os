"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
} from "recharts";
import { Compass } from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";
import type { DomainRadarPoint } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";
import { useChartSize } from "./useChartSize";

type RadarTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: DomainRadarPoint }>;
};

function RadarTooltip({ active, payload }: RadarTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as DomainRadarPoint | undefined;
  if (!point) return null;
  return (
    <div className="max-w-64 rounded-xl border border-border bg-background/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="font-medium">{point.domain}</p>
      <p className="mt-1 text-muted-foreground">{point.signal}</p>
      <p className="mt-2 text-muted-foreground">Confidence: {point.confidence}</p>
    </div>
  );
}

export function LifeDomainRadar({
  data,
  interpretation,
}: {
  data: DomainRadarPoint[];
  interpretation: string;
}) {
  const { containerRef, chartWidth } = useChartSize<HTMLDivElement>();

  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="size-4 text-primary" />
            <h2 className="text-base font-semibold tracking-normal">Life Domain Radar</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{interpretation}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div ref={containerRef} className="h-[300px] min-w-0">
          {chartWidth > 0 ? (
            <RadarChart width={chartWidth} height={300} data={data} outerRadius="72%">
              <PolarGrid stroke="hsl(var(--border) / 0.5)" />
              <PolarAngleAxis
                dataKey="domain"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                dataKey="score"
                name="Signal"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.22)"
                strokeWidth={2}
              />
              <Tooltip content={<RadarTooltip />} />
            </RadarChart>
          ) : (
            <div className="h-full rounded-xl bg-muted/20" />
          )}
        </div>
        <div className="grid content-center gap-2">
          {data.map((point) => (
            <div key={point.key} className="flex items-center gap-3 text-sm">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${point.score}%` }}
                />
              </div>
              <span className="w-24 truncate text-muted-foreground">{point.domain}</span>
              <span
                className={cn(
                  "w-10 text-right text-xs tabular-nums",
                  point.confidence === "low" && "text-muted-foreground",
                )}
              >
                {point.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}
