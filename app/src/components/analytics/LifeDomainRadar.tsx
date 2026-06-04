"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
} from "recharts";
import { BarChart3, CircleDot, Compass } from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";
import type { DomainRadarPoint } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";
import { useChartSize } from "./useChartSize";

type DomainView = "orbit" | "bars" | "radar";

const VIEW_OPTIONS: Array<{
  value: DomainView;
  label: string;
  icon: typeof Compass;
}> = [
  { value: "orbit", label: "Orbit", icon: CircleDot },
  { value: "bars", label: "Bars", icon: BarChart3 },
  { value: "radar", label: "Radar", icon: Compass },
];

const DOMAIN_COLORS = [
  "hsl(155 70% 44%)",
  "hsl(205 84% 55%)",
  "hsl(265 72% 62%)",
  "hsl(38 90% 52%)",
  "hsl(335 70% 58%)",
  "hsl(178 72% 38%)",
  "hsl(18 82% 56%)",
  "hsl(225 70% 58%)",
];

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

function ViewSwitch({
  value,
  onChange,
}: {
  value: DomainView;
  onChange: (view: DomainView) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border/60 bg-background/35 p-1 backdrop-blur">
      {VIEW_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors sm:h-8 sm:min-w-0 sm:px-2.5 sm:text-xs",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            aria-pressed={active}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function OrbitView({ data }: { data: DomainRadarPoint[] }) {
  const reduceMotion = useReducedMotion();
  const shape = useMemo(() => {
    const center = { x: 180, y: 160 };
    const maxRadius = 110;
    const nodes = data.map((point, index) => {
      const angle = -Math.PI / 2 + (index / data.length) * Math.PI * 2;
      const orbitX = center.x + Math.cos(angle) * maxRadius;
      const orbitY = center.y + Math.sin(angle) * maxRadius;
      const radius = 32 + (point.score / 100) * (maxRadius - 32);
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;
      return { point, index, angle, orbitX, orbitY, x, y };
    });
    const path =
      nodes.length > 0
        ? `${nodes
            .map((node, index) =>
              index === 0 ? `M ${node.x} ${node.y}` : `L ${node.x} ${node.y}`,
            )
            .join(" ")} Z`
        : "";
    return { center, maxRadius, nodes, path };
  }, [data]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="overflow-hidden rounded-xl border border-border/55 bg-[radial-gradient(circle_at_50%_46%,hsl(var(--primary)/0.15),transparent_34%),linear-gradient(180deg,hsl(var(--background)/0.38),hsl(var(--muted)/0.20))]">
        <svg viewBox="0 0 360 320" className="h-[320px] w-full" role="img" aria-label="Domain orbit view">
          <defs>
            <filter id="domain-orbit-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((scale) => (
            <circle
              key={scale}
              cx={shape.center.x}
              cy={shape.center.y}
              r={shape.maxRadius * scale}
              fill="none"
              stroke="hsl(var(--border) / 0.36)"
              strokeDasharray={scale === 1 ? "none" : "4 7"}
            />
          ))}
          {shape.nodes.map((node) => (
            <line
              key={`axis-${node.point.key}`}
              x1={shape.center.x}
              y1={shape.center.y}
              x2={node.orbitX}
              y2={node.orbitY}
              stroke="hsl(var(--border) / 0.35)"
            />
          ))}
          <motion.path
            d={shape.path}
            fill="hsl(var(--primary) / 0.12)"
            stroke="hsl(var(--primary) / 0.68)"
            strokeWidth="2"
            filter="url(#domain-orbit-glow)"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            style={{ transformOrigin: `${shape.center.x}px ${shape.center.y}px` }}
          />
          {shape.nodes.map((node, index) => {
            const color = DOMAIN_COLORS[index % DOMAIN_COLORS.length];
            const labelX = shape.center.x + Math.cos(node.angle) * 138;
            const labelY = shape.center.y + Math.sin(node.angle) * 138;
            return (
              <motion.g
                key={node.point.key}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
                animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.035, duration: 0.18 }}
              >
                <circle cx={node.x} cy={node.y} r={7} fill={color} />
                <circle cx={node.x} cy={node.y} r={15} fill={color} opacity="0.12" />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={labelX < shape.center.x - 8 ? "end" : labelX > shape.center.x + 8 ? "start" : "middle"}
                  dominantBaseline="middle"
                  fill="hsl(var(--muted-foreground))"
                  fontSize="10"
                >
                  {node.point.domain}
                </text>
              </motion.g>
            );
          })}
          <circle cx={shape.center.x} cy={shape.center.y} r="4" fill="hsl(var(--primary))" />
        </svg>
      </div>
      <DomainSignalList data={data} />
    </div>
  );
}

function BarsView({ data }: { data: DomainRadarPoint[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {[...data]
        .sort((a, b) => b.score - a.score)
        .map((point, index) => (
          <motion.div
            key={point.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.025, duration: 0.18 }}
            className="rounded-xl border border-border/55 bg-background/30 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: DOMAIN_COLORS[index % DOMAIN_COLORS.length] }}
                />
                <span className="truncate text-sm font-medium">{point.domain}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">{point.score}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted/65">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: DOMAIN_COLORS[index % DOMAIN_COLORS.length] }}
                initial={{ width: 0 }}
                animate={{ width: `${point.score}%` }}
                transition={{ duration: 0.42, delay: index * 0.025 }}
              />
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {point.signal}
            </p>
          </motion.div>
        ))}
    </div>
  );
}

function RadarView({ data }: { data: DomainRadarPoint[] }) {
  const { containerRef, chartWidth } = useChartSize<HTMLDivElement>();

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div ref={containerRef} className="h-[320px] min-w-0">
        {chartWidth > 0 ? (
          <RadarChart width={chartWidth} height={320} data={data} outerRadius="72%">
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
      <DomainSignalList data={data} />
    </div>
  );
}

function DomainSignalList({ data }: { data: DomainRadarPoint[] }) {
  return (
    <div className="grid content-center gap-2">
      {data.map((point, index) => (
        <div key={point.key} className="flex items-center gap-3 text-sm">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${point.score}%`,
                backgroundColor: DOMAIN_COLORS[index % DOMAIN_COLORS.length],
              }}
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
  );
}

export function LifeDomainRadar({
  data,
  interpretation,
}: {
  data: DomainRadarPoint[];
  interpretation: string;
}) {
  const [view, setView] = useState<DomainView>("orbit");
  const reduceMotion = useReducedMotion();

  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="size-4 text-primary" />
            <h2 className="text-base font-semibold tracking-normal">Life Domain Radar</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{interpretation}</p>
        </div>
        <ViewSwitch value={view} onChange={setView} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {view === "orbit" ? (
            <OrbitView data={data} />
          ) : view === "bars" ? (
            <BarsView data={data} />
          ) : (
            <RadarView data={data} />
          )}
        </motion.div>
      </AnimatePresence>
    </GlassPanel>
  );
}
