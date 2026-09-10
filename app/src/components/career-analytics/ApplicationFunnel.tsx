"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { useCareerOpportunities } from "@/hooks/use-career-opportunities";
import { computeFunnel } from "@/lib/analytics/funnel";

export function ApplicationFunnelChart() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).analytics.funnel;

  const oppsQ = useCareerOpportunities();
  const data = useMemo(() => {
    const entries = computeFunnel(oppsQ.data ?? []);
    return entries.map((e) => ({
      stage: copy.stages[e.stage] ?? e.stage,
      count: e.count,
    }));
  }, [oppsQ.data, copy.stages]);

  const hasData = data.some((d) => d.count > 0);

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 className="text-sm font-semibold">{copy.title}</h2>
      {oppsQ.isLoading ? <p role="status">{language.startsWith("zh") ? "載入中…" : "Loading…"}</p> : oppsQ.isError ? <button className="min-h-11 text-sm underline" onClick={() => void oppsQ.refetch()}>{language.startsWith("zh") ? "未能載入，按此重試" : "Could not load. Try again"}</button> : !hasData ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {copy.empty}
        </p>
      ) : (
        <div>
        <div className="h-64 w-full" aria-hidden="true">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {data.map((row) => <div key={row.stage} className="flex justify-between gap-2"><dt>{row.stage}</dt><dd className="tabular-nums">{row.count}</dd></div>)}
        </dl>
        </div>
      )}
    </section>
  );
}
