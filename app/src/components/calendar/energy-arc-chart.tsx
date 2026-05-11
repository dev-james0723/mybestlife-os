"use client";

import { useMemo } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";
import type { PlanSuggestion } from "@/lib/calendar/types";

type Props = {
  title: string;
  suggestions: readonly PlanSuggestion[];
  legendDeep: string;
  legendShallow: string;
  legendRecovery: string;
  className?: string;
};

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

const ENERGY_COLORS: Record<PlanSuggestion["energy"], string> = {
  deep: "var(--calendar-lime)",
  shallow: "rgba(59, 130, 246, 0.80)",
  recovery: "rgba(234, 179, 8, 0.80)",
};

const DAY_START = 6 * 60; // 06:00
const DAY_END = 22 * 60; // 22:00

/**
 * Simple SVG energy arc — a horizontal strip showing a half-circle arc
 * peaking mid-day with colored segments matching the suggested plan's
 * energy distribution (deep / shallow / recovery).
 *
 * Decorative: doesn't require Recharts (avoids adding a dependency for
 * such a small visualization). Purely semantic segments with ARIA
 * coverage below.
 */
export function EnergyArcChart({
  title,
  suggestions,
  legendDeep,
  legendShallow,
  legendRecovery,
  className,
}: Props) {
  const segments = useMemo(() => {
    return suggestions
      .map((s) => ({
        id: s.id,
        color: ENERGY_COLORS[s.energy],
        energy: s.energy,
        start: Math.max(DAY_START, timeToMinutes(s.slot.start)),
        end: Math.min(DAY_END, timeToMinutes(s.slot.end)),
        title: s.title,
      }))
      .filter((seg) => seg.end > seg.start);
  }, [suggestions]);

  const width = 800;
  const height = 140;
  const padX = 30;
  const curveTop = 30;
  const curveBottom = height - 40;

  // Quadratic arc from top-left to top-right peaking at the center bottom
  const arcPath = useMemo(() => {
    const sx = padX;
    const ex = width - padX;
    const mx = (sx + ex) / 2;
    // quadratic: rise to center, fall to right
    return `M ${sx} ${curveBottom} Q ${mx} ${curveTop - 20} ${ex} ${curveBottom}`;
  }, [width, curveTop, curveBottom, padX]);

  function segmentToX(mins: number): number {
    const ratio = (mins - DAY_START) / (DAY_END - DAY_START);
    return padX + ratio * (width - padX * 2);
  }

  return (
    <GlassPanel className={cn("calendar-specular-highlight p-4", className)}>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-28 w-full"
        role="img"
        aria-label={title}
      >
        {/* Background arc (muted) */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={3}
        />
        {/* Colored segments along the arc */}
        {segments.map((seg) => {
          const x1 = segmentToX(seg.start);
          const x2 = segmentToX(seg.end);
          return (
            <rect
              key={seg.id}
              x={x1}
              y={curveBottom - 4}
              width={Math.max(2, x2 - x1)}
              height={8}
              rx={3}
              fill={seg.color}
              opacity={0.85}
            >
              <title>{`${seg.title} (${seg.energy})`}</title>
            </rect>
          );
        })}
        {/* Hour ticks */}
        {[6, 9, 12, 15, 18, 21].map((h) => {
          const x = segmentToX(h * 60);
          return (
            <g key={h}>
              <line
                x1={x}
                y1={curveBottom + 6}
                x2={x}
                y2={curveBottom + 12}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1}
              />
              <text
                x={x}
                y={curveBottom + 26}
                textAnchor="middle"
                fontSize={10}
                fill="rgba(255,255,255,0.55)"
              >
                {h}:00
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: ENERGY_COLORS.deep }}
            aria-hidden
          />
          {legendDeep}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: ENERGY_COLORS.shallow }}
            aria-hidden
          />
          {legendShallow}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: ENERGY_COLORS.recovery }}
            aria-hidden
          />
          {legendRecovery}
        </span>
      </div>
    </GlassPanel>
  );
}
