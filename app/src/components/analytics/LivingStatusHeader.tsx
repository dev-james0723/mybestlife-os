"use client";

import { formatDistanceToNow } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, Sparkles } from "lucide-react";

import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import { OSControl } from "@/components/ui/os-primitives";
import type { AnalyticsRangeSelection, LifeAnalytics } from "@/lib/analytics/types";
import { LifePulseCards } from "./LifePulseCards";
import { TimeLensControl } from "./TimeLensControl";

type LivingStatusHeaderProps = {
  analytics: LifeAnalytics;
  rangeSelection: AnalyticsRangeSelection;
  onRangeSelectionChange: (range: AnalyticsRangeSelection) => void;
};

export function LivingStatusHeader({
  analytics,
  rangeSelection,
  onRangeSelectionChange,
}: LivingStatusHeaderProps) {
  const reduceMotion = useReducedMotion();
  const updatedLabel = formatDistanceToNow(new Date(analytics.generatedAt), {
    addSuffix: true,
  });

  return (
    <GlassTintPanel tint="teal" className="relative overflow-hidden p-5 sm:p-6">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent"
        initial={reduceMotion ? false : { opacity: 0.25, x: "-18%" }}
        animate={reduceMotion ? undefined : { opacity: [0.25, 0.8, 0.25], x: ["-18%", "18%", "-18%"] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur-md dark:border-white/10">
              <span className="relative flex size-2">
                <motion.span
                  className="absolute inline-flex size-full rounded-full bg-primary/45"
                  animate={reduceMotion ? undefined : { scale: [1, 1.8, 1], opacity: [0.35, 0, 0.35] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
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
            <TimeLensControl value={rangeSelection} onChange={onRangeSelectionChange} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {analytics.range.startISO} to {analytics.range.endISO}
              </span>
              <span className="hidden sm:inline">·</span>
              <span>Updated {updatedLabel}</span>
              <OSControl
                type="button"
                osSize="compact"
                className="ml-0 gap-1 lg:ml-2"
                title="AI refresh will use the analytics insight API when connected."
              >
                <RefreshCw className="size-3.5" />
                Refresh insight
              </OSControl>
            </div>
          </div>
        </div>

        <LifePulseCards scores={analytics.pulseScores} />
      </div>
    </GlassTintPanel>
  );
}
