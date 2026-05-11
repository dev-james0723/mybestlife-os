"use client";

import { PageShell } from "@/components/shared/page-shell";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { ApplicationFunnelChart } from "./ApplicationFunnel";
import { ResumeResponseRatesTable } from "./ResumeResponseRates";
import { FileBreakdownChart } from "./FileBreakdown";
import { StageTimeTable } from "./StageTime";
import { QuarterlyReportButton } from "./QuarterlyReportButton";

export function CareerAnalyticsView() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).analytics;

  return (
    <PageShell title={copy.pageTitle} description={copy.pageDescription}>
      <div className="grid gap-4 lg:grid-cols-2">
        <ApplicationFunnelChart />
        <StageTimeTable />
        <ResumeResponseRatesTable />
        <FileBreakdownChart />
      </div>
      <div className="mt-4">
        <QuarterlyReportButton />
      </div>
    </PageShell>
  );
}
