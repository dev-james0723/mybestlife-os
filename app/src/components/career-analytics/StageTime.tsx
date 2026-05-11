"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { useCareerOpportunities } from "@/hooks/use-career-opportunities";
import { computeStageTimes } from "@/lib/analytics/funnel";

export function StageTimeTable() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).analytics;
  const oppsQ = useCareerOpportunities();

  const rows = useMemo(() => computeStageTimes(oppsQ.data ?? []), [oppsQ.data]);

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">{copy.stageTime.title}</h2>
        <p className="text-xs text-muted-foreground">
          {copy.stageTime.description}
        </p>
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li
            key={r.stage}
            className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border bg-background/50 px-3 py-2"
          >
            <span className="text-sm">
              {copy.funnel.stages[r.stage] ?? r.stage}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {r.samples > 0 ? copy.stageTime.days(r.medianDays) : "—"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
