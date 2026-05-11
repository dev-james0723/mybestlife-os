"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import type { CareerDecision } from "@/types/database";

type Props = { decisions: CareerDecision[] };

export function DecisionQualityChart({ decisions }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).journal;

  const data = useMemo(() => {
    return decisions
      .filter(
        (d) =>
          d.decision_quality_score !== null &&
          d.decision_quality_score !== undefined,
      )
      .sort(
        (a, b) =>
          new Date(a.review_date ?? a.decided_at).getTime() -
          new Date(b.review_date ?? b.decided_at).getTime(),
      )
      .map((d) => ({
        date: (d.review_date ?? d.decided_at).slice(0, 7),
        score: d.decision_quality_score,
      }));
  }, [decisions]);

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 className="text-sm font-semibold">{copy.trendTitle}</h2>
      {data.length < 2 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {copy.trendEmpty}
        </p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
