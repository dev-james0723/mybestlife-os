"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { Activity, BarChart3, Waves } from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";
import type { MomentumWavePoint } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";
import { useChartSize } from "./useChartSize";

type MomentumWaveChartProps = {
  data: MomentumWavePoint[];
  interpretation: string;
  hasData: boolean;
};

type MomentumView = "pulse" | "bars" | "wave";

const VIEW_OPTIONS: Array<{
  value: MomentumView;
  label: string;
  icon: typeof Activity;
}> = [
  { value: "pulse", label: "Pulse", icon: Waves },
  { value: "bars", label: "Bars", icon: BarChart3 },
  { value: "wave", label: "Wave", icon: Activity },
];

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

function ViewSwitch({
  value,
  onChange,
}: {
  value: MomentumView;
  onChange: (view: MomentumView) => void;
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

function PulseStrip({ data }: { data: MomentumWavePoint[] }) {
  const reduceMotion = useReducedMotion();
  const shape = useMemo(() => {
    const maxScore = Math.max(1, ...data.map((point) => point.activityScore));
    const maxWork = Math.max(
      1,
      ...data.map((point) => point.completedTasks + point.plannedItems),
    );
    const width = 640;
    const padX = 34;
    const top = 30;
    const bottom = 204;
    const span = Math.max(1, data.length - 1);
    const points = data.map((point, index) => {
      const x = padX + (index / span) * (width - padX * 2);
      const normalized = point.activityScore / maxScore;
      const y = bottom - normalized * (bottom - top);
      const workHeight =
        ((point.completedTasks + point.plannedItems) / maxWork) * 72;
      const journalY =
        point.journalIntensity == null
          ? null
          : bottom - (point.journalIntensity / 10) * (bottom - top);
      return { ...point, x, y, workHeight, journalY };
    });
    const line =
      points.length === 1
        ? `M ${points[0]?.x ?? padX} ${points[0]?.y ?? bottom} L ${width - padX} ${
            points[0]?.y ?? bottom
          }`
        : points
            .map((point, index) =>
              index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
            )
            .join(" ");
    const fill = `${line} L ${width - padX} ${bottom} L ${padX} ${bottom} Z`;
    return { points, line, fill };
  }, [data]);

  return (
    <div className="h-[310px] overflow-hidden rounded-xl border border-border/55 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.14),transparent_34%),linear-gradient(180deg,hsl(var(--background)/0.42),hsl(var(--muted)/0.22))]">
      <svg viewBox="0 0 640 260" className="h-full w-full" role="img" aria-label="Pulse momentum view">
        <defs>
          <linearGradient id="momentum-pulse-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.34)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.02)" />
          </linearGradient>
          <filter id="momentum-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[58, 102, 146, 190].map((y) => (
          <line
            key={y}
            x1="34"
            x2="606"
            y1={y}
            y2={y}
            stroke="hsl(var(--border) / 0.36)"
            strokeDasharray="5 7"
          />
        ))}
        {shape.points.map((point) => (
          <g key={`bar-${point.date}`}>
            <rect
              x={point.x - 8}
              y={220 - point.workHeight}
              width="6"
              height={point.workHeight}
              rx="3"
              fill="hsl(155 70% 45% / 0.55)"
            />
            <rect
              x={point.x + 2}
              y={220 - Math.min(78, point.plannedItems * 9)}
              width="6"
              height={Math.min(78, point.plannedItems * 9)}
              rx="3"
              fill="hsl(205 85% 55% / 0.34)"
            />
            {point.overduePressure > 0 ? (
              <circle
                cx={point.x}
                cy={229}
                r={Math.min(8, 3 + point.overduePressure)}
                fill="hsl(38 90% 52% / 0.48)"
              />
            ) : null}
          </g>
        ))}
        <motion.path
          d={shape.fill}
          fill="url(#momentum-pulse-fill)"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reduceMotion ? undefined : { opacity: 1 }}
          transition={{ duration: 0.35 }}
        />
        <motion.path
          d={shape.line}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          filter="url(#momentum-glow)"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={reduceMotion ? undefined : { pathLength: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
        {shape.points.map((point, index) => (
          <motion.g
            key={`point-${point.date}`}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.035, duration: 0.2 }}
          >
            <circle cx={point.x} cy={point.y} r="4.5" fill="hsl(var(--primary))" />
            {point.journalY != null ? (
              <circle
                cx={point.x}
                cy={point.journalY}
                r="3"
                fill="hsl(335 70% 58% / 0.72)"
              />
            ) : null}
          </motion.g>
        ))}
        <g transform="translate(36 242)" className="text-[10px]">
          <text fill="hsl(var(--muted-foreground))">completed</text>
          <circle cx="76" cy="-3" r="3" fill="hsl(335 70% 58% / 0.72)" />
          <text x="86" fill="hsl(var(--muted-foreground))">journal intensity</text>
          <circle cx="184" cy="-3" r="4" fill="hsl(38 90% 52% / 0.48)" />
          <text x="196" fill="hsl(var(--muted-foreground))">overdue pressure</text>
        </g>
      </svg>
    </div>
  );
}

function RechartsMomentum({
  data,
  view,
}: {
  data: MomentumWavePoint[];
  view: Exclude<MomentumView, "pulse">;
}) {
  const { containerRef, chartWidth } = useChartSize<HTMLDivElement>();

  return (
    <div ref={containerRef} className="h-[310px] min-w-0">
      {chartWidth > 0 ? (
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
          {view === "wave" ? (
            <Area
              type="basis"
              dataKey="activityScore"
              name="Activity score"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.16)"
              strokeWidth={2}
            />
          ) : null}
          <Bar
            dataKey="completedTasks"
            name="Completed"
            fill="hsl(155 70% 45% / 0.72)"
            radius={[5, 5, 0, 0]}
            barSize={view === "bars" ? 14 : 8}
          />
          <Bar
            dataKey="plannedItems"
            name="Planned"
            fill="hsl(205 85% 55% / 0.38)"
            radius={[5, 5, 0, 0]}
            barSize={view === "bars" ? 14 : 8}
          />
          <Line
            type={view === "wave" ? "basis" : "monotone"}
            dataKey="activityScore"
            name="Activity score"
            stroke="hsl(var(--primary))"
            strokeWidth={view === "bars" ? 2 : 1.5}
            dot={false}
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
  );
}

export function MomentumWaveChart({
  data,
  interpretation,
  hasData,
}: MomentumWaveChartProps) {
  const [view, setView] = useState<MomentumView>("pulse");

  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h2 className="text-base font-semibold tracking-normal">Momentum Wave</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{interpretation}</p>
        </div>
        {hasData ? <ViewSwitch value={view} onChange={setView} /> : null}
      </div>

      {!hasData ? (
        <div className="flex h-[310px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
          Add completed tasks, daily plans, study sessions, or journal entries to generate a real momentum wave.
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {view === "pulse" ? (
              <PulseStrip data={data} />
            ) : (
              <RechartsMomentum data={data} view={view} />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </GlassPanel>
  );
}
