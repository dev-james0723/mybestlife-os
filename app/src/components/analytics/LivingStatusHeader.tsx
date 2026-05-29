"use client";

import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Sparkles } from "lucide-react";

import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import { Button } from "@/components/ui/button";
import type { AnalyticsRangeKey, LifeAnalytics } from "@/lib/analytics/types";
import { LifePulseCards } from "./LifePulseCards";
import { TimeLensControl } from "./TimeLensControl";

type LivingStatusHeaderProps = {
  analytics: LifeAnalytics;
  range: AnalyticsRangeKey;
  onRangeChange: (range: AnalyticsRangeKey) => void;
};

export function LivingStatusHeader({
  analytics,
  range,
  onRangeChange,
}: LivingStatusHeaderProps) {
  const updatedLabel = formatDistanceToNow(new Date(analytics.generatedAt), {
    addSuffix: true,
  });

  return (
    <GlassTintPanel tint="teal" className="p-5 sm:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur-md dark:border-white/10">
              <Sparkles className="size-3.5 text-primary" />
              Life Pulse Center · {analytics.range.label}
            </div>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
              {analytics.statusSummary}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {analytics.range.behavior}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <TimeLensControl value={range} onChange={onRangeChange} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {analytics.range.startISO} to {analytics.range.endISO}
              </span>
              <span className="hidden sm:inline">·</span>
              <span>Updated {updatedLabel}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-0 gap-1 bg-background/45 lg:ml-2"
                title="AI refresh will use the analytics insight API when connected."
              >
                <RefreshCw className="size-3.5" />
                Refresh insight
              </Button>
            </div>
          </div>
        </div>

        <LifePulseCards scores={analytics.pulseScores} />
      </div>
    </GlassTintPanel>
  );
}
