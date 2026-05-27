"use client";

import { PageShell } from "@/components/shared/page-shell";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { TransitionProgressWidget } from "@/components/career-dashboard/TransitionProgress";
import { NextActionWidget } from "@/components/career-dashboard/NextAction";
import { StatsOverviewWidget } from "@/components/career-dashboard/StatsOverview";
import { UpcomingWeekWidget } from "@/components/career-dashboard/UpcomingWeek";
import { HotPipelineWidget } from "@/components/career-dashboard/HotPipeline";
import { ColdRelationshipsWidget } from "@/components/career-dashboard/ColdRelationships";
import { SkillsGapWidget } from "@/components/career-dashboard/SkillsGap";
import { AISuggestionsWidget } from "@/components/career-dashboard/AISuggestions";
import { OmnisearchTrigger } from "@/components/career/Omnisearch";

/**
 * Career Command Center — replaces the former link-grid landing. Widgets
 * are stacked mobile-first (single column) and expand into a responsive
 * grid on larger viewports.
 */
export default function CareerCommandCenterPage() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).dashboard;

  return (
    <PageShell
      title={copy.pageTitle}
      description={copy.pageDescription}
      actions={<OmnisearchTrigger />}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <TransitionProgressWidget />
          <div className="grid gap-4 sm:grid-cols-2">
            <NextActionWidget />
            <UpcomingWeekWidget />
          </div>
          <StatsOverviewWidget />
        </div>

        <div className="space-y-4">
          <AISuggestionsWidget />
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.sections.intelligence}
            </h2>
            <div className="mt-3 space-y-2">
              <HotPipelineWidget />
              <ColdRelationshipsWidget />
              <SkillsGapWidget />
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
