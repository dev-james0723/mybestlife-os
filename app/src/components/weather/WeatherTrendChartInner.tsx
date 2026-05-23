"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HourlyForecastEntry } from "@/lib/weather/types";

export type TrendKind = "temperature" | "precipitation";

interface WeatherTrendChartInnerProps {
  hourly: HourlyForecastEntry[];
  kind: TrendKind;
}

/**
 * Two-mode trend chart shared by Temperature + Precipitation cards.
 * Lazy-loaded by `WeatherTrendChart` so Recharts isn't in the initial
 * page bundle.
 */
export default function WeatherTrendChartInner({
  hourly,
  kind,
}: WeatherTrendChartInnerProps) {
  const points = useMemo(() => {
    return hourly.slice(0, 8).map((h) => ({
      label: h.hourLabel,
      value:
        kind === "temperature" ? h.temperature : h.rainChance,
    }));
  }, [hourly, kind]);

  const yDomain: [number, number] = useMemo(() => {
    if (kind === "precipitation") return [0, 100];
    if (points.length === 0) return [0, 30];
    const values = points.map((p) => p.value);
    const min = Math.min(...values) - 2;
    const max = Math.max(...values) + 2;
    return [Math.floor(min), Math.ceil(max)];
  }, [kind, points]);

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer>
        <AreaChart
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
        >
          <defs>
            <linearGradient id={`fill-${kind}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c8e53a" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#c8e53a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.08)"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.55)" }}
            stroke="rgba(255,255,255,0.1)"
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.55)" }}
            stroke="rgba(255,255,255,0.1)"
            tickFormatter={(v) =>
              kind === "temperature" ? `${v}°` : `${v}%`
            }
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15,13,12,0.85)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              fontSize: 12,
              color: "white",
            }}
            formatter={(value) =>
              kind === "temperature" ? [`${value}°`, "Temp"] : [`${value}%`, "Rain"]
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#c8e53a"
            strokeWidth={2}
            fill={`url(#fill-${kind})`}
            dot={{ r: 2, fill: "#c8e53a" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
