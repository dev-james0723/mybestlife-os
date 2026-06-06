"use client";

import { BarChart3, FileText } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { CareerHelpPanel } from "@/components/career/career-page-ui";
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
      <div className="space-y-5">
        <CareerHelpPanel icon={BarChart3} title="How to read this">
          These charts connect Pipeline movement, Vault assets, and decision history.
          Low or empty data means the next best step is to track more opportunities,
          attach the resume versions you use, and keep stage changes current.
        </CareerHelpPanel>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Search performance</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
              Use these views to understand where opportunities stall, which files
              earn responses, and what your asset library contains.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ApplicationFunnelChart />
            <StageTimeTable />
            <ResumeResponseRatesTable />
            <FileBreakdownChart />
          </div>
        </section>

        <section className="max-w-3xl space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Quarterly career report
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Package the quarter into a shareable snapshot of wins, learnings,
              pipeline movement, and focus.
            </p>
          </div>
          <div className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
            <FileText className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Generate this after you have enough Career Vault files, opportunities,
              timeline events, and decisions for a meaningful review.
            </p>
          </div>
          <QuarterlyReportButton />
        </section>
      </div>
    </PageShell>
  );
}
