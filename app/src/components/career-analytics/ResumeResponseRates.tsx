"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { useCareerOpportunities } from "@/hooks/use-career-opportunities";
import { useCareerVaultFiles } from "@/hooks/use-career-vault";
import { computeResumeResponseRates } from "@/lib/analytics/funnel";

export function ResumeResponseRatesTable() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).analytics.responseRates;

  const oppsQ = useCareerOpportunities();
  const filesQ = useCareerVaultFiles();

  const rows = useMemo(() => {
    const files = filesQ.data ?? [];
    const resumeIdToLabel = new Map<string, string>();
    for (const f of files) {
      if (f.category === "resume") {
        resumeIdToLabel.set(f.id, f.filename);
      }
    }
    return computeResumeResponseRates(oppsQ.data ?? [], resumeIdToLabel);
  }, [oppsQ.data, filesQ.data]);

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">{copy.title}</h2>
        <p className="text-xs text-muted-foreground">{copy.description}</p>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {copy.empty}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3 font-medium">{copy.version}</th>
                <th className="py-2 px-3 text-right font-medium">
                  {copy.applications}
                </th>
                <th className="py-2 px-3 text-right font-medium">
                  {copy.interviews}
                </th>
                <th className="py-2 pl-3 text-right font-medium">
                  {copy.rate}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.resumeId} className="border-b last:border-b-0">
                  <td className="py-2 pr-3">
                    <span className="block max-w-[22ch] truncate">
                      {r.label}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {r.applications}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {r.interviews}
                  </td>
                  <td className="py-2 pl-3 text-right tabular-nums font-semibold">
                    {r.rate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
