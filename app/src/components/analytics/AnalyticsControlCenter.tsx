"use client";

import type { AnalyticsRangeKey, LifeAnalytics } from "@/lib/analytics/types";
import { AIInterventionPanel } from "./AIInterventionPanel";
import { AudioOverviewPanel } from "./AudioOverviewPanel";
import { BrainHealthPanel } from "./BrainHealthPanel";
import { EmotionExecutionHeatmap } from "./EmotionExecutionHeatmap";
import { LifeDomainRadar } from "./LifeDomainRadar";
import { LivingStatusHeader } from "./LivingStatusHeader";
import { MomentumWaveChart } from "./MomentumWaveChart";
import { ProjectMomentumMap } from "./ProjectMomentumMap";

export function AnalyticsControlCenter({
  analytics,
  range,
  onRangeChange,
  failedBrainSlices,
}: {
  analytics: LifeAnalytics;
  range: AnalyticsRangeKey;
  onRangeChange: (range: AnalyticsRangeKey) => void;
  failedBrainSlices?: number;
}) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <LivingStatusHeader
        analytics={analytics}
        range={range}
        onRangeChange={onRangeChange}
      />

      {failedBrainSlices ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {failedBrainSlices} Brain data slice{failedBrainSlices === 1 ? "" : "s"} failed to load. The page is using partial coherence signals.
        </div>
      ) : null}

      <MomentumWaveChart
        data={analytics.momentumWave.points}
        interpretation={analytics.momentumWave.interpretation}
        hasData={analytics.momentumWave.hasData}
      />

      <div className="space-y-5">
        <AudioOverviewPanel metrics={analytics.aiContext} />
        <AIInterventionPanel insight={analytics.aiInsight} />
      </div>

      <ProjectMomentumMap
        projects={analytics.projectMomentum.projects}
        interpretation={analytics.projectMomentum.interpretation}
      />

      <EmotionExecutionHeatmap
        buckets={analytics.emotionExecution.buckets}
        interpretation={analytics.emotionExecution.interpretation}
        hasJournalData={analytics.emotionExecution.hasJournalData}
        hasExecutionData={analytics.emotionExecution.hasExecutionData}
        granularity={analytics.emotionExecution.granularity}
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <LifeDomainRadar
          data={analytics.domainRadar.points}
          interpretation={analytics.domainRadar.interpretation}
        />
        <BrainHealthPanel health={analytics.brainHealth} />
      </div>
    </div>
  );
}
