"use client";

import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { useCareerVaultFiles } from "@/hooks/use-career-vault";
import { countFilesByCategory } from "@/lib/dashboard/aggregators";

const COLORS = [
  "#f59e0b",
  "#60a5fa",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#fb923c",
  "#22d3ee",
  "#f87171",
];

export function FileBreakdownChart() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).analytics.fileBreakdown;

  const filesQ = useCareerVaultFiles();
  const data = useMemo(() => {
    const counts = countFilesByCategory(filesQ.data ?? []);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filesQ.data]);

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 className="text-sm font-semibold">{copy.title}</h2>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {copy.empty}
        </p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
