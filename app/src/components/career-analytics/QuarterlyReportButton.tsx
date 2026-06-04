"use client";

import { useState } from "react";
import { Download, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { useCareerVaultFiles } from "@/hooks/use-career-vault";
import { useCareerOpportunities } from "@/hooks/use-career-opportunities";
import { useCareerEvents } from "@/hooks/use-career-events";
import { useCareerDecisions } from "@/hooks/use-career-decisions";
import {
  currentQuarter,
  formatQuarter,
  generateQuarterlyReport,
} from "@/lib/reports/quarterly";

export function QuarterlyReportButton() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).analytics.report;

  const filesQ = useCareerVaultFiles();
  const oppsQ = useCareerOpportunities();
  const eventsQ = useCareerEvents();
  const decisionsQ = useCareerDecisions();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quarter = currentQuarter();
  const quarterLabel = formatQuarter(quarter);

  const onGenerate = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await generateQuarterlyReport({
        files: filesQ.data ?? [],
        opportunities: oppsQ.data ?? [],
        events: eventsQ.data ?? [],
        decisions: decisionsQ.data ?? [],
        quarter,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border bg-muted/40 p-2">
          <FileText className="h-5 w-5" aria-hidden />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">{copy.quarterlyTitle}</h2>
          <p className="text-xs text-muted-foreground">
            {copy.quarterlyDescription}
          </p>
          <p className="mt-1 text-xs font-medium">
            {copy.currentQuarter(quarterLabel)}
          </p>
        </div>
      </div>
      <Button
        onClick={onGenerate}
        disabled={busy}
        className="!h-11 w-full sm:!h-8 sm:w-auto"
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            {copy.generating}
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            {copy.generate}
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
