"use client";

import { useMemo } from "react";
import { format, parseISO, subDays } from "date-fns";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { QUADRANTS, QUADRANT_META } from "@/lib/journal/constants";
import type { JournalUiCopy } from "@/lib/i18n/journal-ui";
import type { JournalEntry } from "@/types/database";

interface MoodTrendsChartInnerProps {
  entries: JournalEntry[];
  rangeDays: 7 | 14;
  copy: JournalUiCopy;
}

type IntensityPoint = { date: string; label: string; value: number | null };
type QuadrantSlice = { name: string; value: number; color: string };

function MoodTrendsChartInner({
  entries,
  rangeDays,
  copy,
}: MoodTrendsChartInnerProps) {
  const { intensityData, quadrantData } = useMemo(() => {
    const today = new Date();
    const startMs = subDays(today, rangeDays - 1).getTime();

    // Filter to the window.
    const inWindow = entries.filter((e) => {
      try {
        const t = parseISO(e.entryDate).getTime();
        return t >= startMs;
      } catch {
        return false;
      }
    });

    // Intensity over time — daily average.
    const buckets = new Map<string, { sum: number; count: number }>();
    for (let i = 0; i < rangeDays; i++) {
      const d = subDays(today, rangeDays - 1 - i);
      const key = format(d, "yyyy-MM-dd");
      buckets.set(key, { sum: 0, count: 0 });
    }
    for (const e of inWindow) {
      const b = buckets.get(e.entryDate);
      if (b) {
        b.sum += e.intensity;
        b.count += 1;
      }
    }
    const intensityData: IntensityPoint[] = Array.from(buckets.entries()).map(
      ([key, { sum, count }]) => ({
        date: key,
        label: (() => {
          try {
            return format(parseISO(key), "MMM dd");
          } catch {
            return key;
          }
        })(),
        value: count > 0 ? Number((sum / count).toFixed(2)) : null,
      }),
    );

    // Quadrant distribution — counts in the window.
    const counts = new Map<string, number>();
    for (const q of QUADRANTS) counts.set(q, 0);
    for (const e of inWindow) {
      counts.set(e.quadrant, (counts.get(e.quadrant) ?? 0) + 1);
    }
    const quadrantData: QuadrantSlice[] = QUADRANTS.filter(
      (q) => (counts.get(q) ?? 0) > 0,
    ).map((q) => ({
      name: copy.quadrantName[q],
      value: counts.get(q) ?? 0,
      color: QUADRANT_META[q].sliceColor,
    }));

    return { intensityData, quadrantData };
  }, [entries, rangeDays, copy]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {copy.trendsIntensityHeading}
        </h3>
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <LineChart data={intensityData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
              />
              <YAxis
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value) =>
                  value == null ? ["—", "Intensity"] : [value, "Intensity"]
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                connectNulls
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {copy.trendsQuadrantHeading}
        </h3>
        <div className="h-56 w-full">
          {quadrantData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              —
            </p>
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Pie
                  data={quadrantData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {quadrantData.map((slice, idx) => (
                    <Cell key={idx} fill={slice.color} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default MoodTrendsChartInner;
