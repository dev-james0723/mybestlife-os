"use client";

import { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useAppStore } from "@/stores/app-store";
import {
  getCategoryHex,
} from "@/lib/quote-library/categories";
import { getQuoteCategoryLabel } from "@/lib/i18n/quote-library-ui";
import type { QuoteCategory } from "@/types/quote";

interface WisdomChartProps {
  distribution: Record<string, number>;
}

export function WisdomChart({ distribution }: WisdomChartProps) {
  const language = useAppStore((s) => s.language);

  const data = useMemo(() => {
    const entries = Object.entries(distribution)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);
    const top = entries.slice(0, 8);
    const rest = entries.slice(8);
    const mapped = top.map(([category, count]) => {
      const qc = category as QuoteCategory;
      return {
        key: category,
        name: getQuoteCategoryLabel(language, qc),
        value: count,
        color: getCategoryHex(qc),
      };
    });
    if (rest.length > 0) {
      const sum = rest.reduce((acc, [, n]) => acc + n, 0);
      mapped.push({
        key: "__other",
        name: "…",
        value: sum,
        color: "#94a3b8",
      });
    }
    return mapped;
  }, [distribution, language]);

  if (data.length === 0) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="45%"
            outerRadius="85%"
            strokeWidth={2}
            stroke="var(--color-background)"
          >
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              background: "var(--color-popover)",
              color: "var(--color-popover-foreground)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
