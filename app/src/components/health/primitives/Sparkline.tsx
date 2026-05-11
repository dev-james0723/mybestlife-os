"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeClassName?: string;
  fillClassName?: string;
  showLastDot?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * Lightweight SVG sparkline. Renders 30-90 points cheaply with no Recharts
 * overhead. Baseline is the mean of the series; the line above/below is
 * implicitly a simple min-max scale. Use for the VitalsGrid mini-charts.
 */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  strokeClassName = "stroke-primary",
  fillClassName = "fill-primary/15",
  showLastDot = true,
  ariaLabel,
  className,
}: SparklineProps) {
  const { pathD, areaD, lastX, lastY, empty } = useMemo(() => {
    if (!data || data.length === 0) return { pathD: "", areaD: "", lastX: 0, lastY: 0, empty: true };
    const clean = data.map((d) => (Number.isFinite(d) ? d : null));
    const values = clean.filter((v): v is number => v !== null);
    if (values.length === 0) return { pathD: "", areaD: "", lastX: 0, lastY: 0, empty: true };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const stepX = data.length > 1 ? width / (data.length - 1) : 0;
    const pad = 2;
    const usableH = height - pad * 2;
    const points: Array<[number, number]> = [];
    clean.forEach((v, i) => {
      if (v === null) return;
      const x = i * stepX;
      const y = pad + usableH - ((v - min) / span) * usableH;
      points.push([x, y]);
    });
    if (points.length === 0) return { pathD: "", areaD: "", lastX: 0, lastY: 0, empty: true };
    const pathD = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
      .join(" ");
    const [firstX] = points[0];
    const [lastX] = points[points.length - 1];
    const areaD = `${pathD} L${lastX.toFixed(2)},${height} L${firstX.toFixed(2)},${height} Z`;
    return {
      pathD,
      areaD,
      lastX,
      lastY: points[points.length - 1][1],
      empty: false,
    };
  }, [data, width, height]);

  if (empty) {
    return (
      <div
        className={cn("text-[10px] text-muted-foreground", className)}
        aria-label={ariaLabel}
        style={{ width, height }}
      >
        —
      </div>
    );
  }

  return (
    <svg
      className={cn("overflow-visible", className)}
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path d={areaD} className={cn("stroke-none", fillClassName)} />
      <path d={pathD} className={cn("fill-none stroke-2", strokeClassName)} strokeLinecap="round" strokeLinejoin="round" />
      {showLastDot && (
        <circle cx={lastX} cy={lastY} r={2.5} className={cn("fill-current", strokeClassName)} />
      )}
    </svg>
  );
}
