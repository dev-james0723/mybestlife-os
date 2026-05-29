"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Brain,
  HeartPulse,
  Target,
  type LucideIcon,
} from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";
import type { LifePulseScore, PulseScoreKey } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const SCORE_ICONS: Record<PulseScoreKey, LucideIcon> = {
  completion_momentum: Activity,
  focus_consistency: Target,
  emotional_load: HeartPulse,
  system_coherence: Brain,
};

const TONE_CLASS: Record<LifePulseScore["tone"], string> = {
  positive: "text-emerald-600 bg-emerald-500/12 dark:text-emerald-300",
  watch: "text-amber-700 bg-amber-500/12 dark:text-amber-300",
  neutral: "text-sky-700 bg-sky-500/12 dark:text-sky-300",
  load: "text-rose-700 bg-rose-500/12 dark:text-rose-300",
};

function TrendIcon({ score }: { score: LifePulseScore }) {
  if (score.trend === "up") return <ArrowUpRight className="size-3.5" />;
  if (score.trend === "down") return <ArrowDownRight className="size-3.5" />;
  return <ArrowRight className="size-3.5" />;
}

export function LifePulseCards({ scores }: { scores: LifePulseScore[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {scores.map((score, index) => {
        const Icon = SCORE_ICONS[score.key];
        return (
          <motion.div
            key={score.key}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.04 }}
          >
            <GlassPanel className="h-full p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                    {score.label}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tabular-nums">
                      {score.score}
                    </span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                </div>
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    TONE_CLASS[score.tone],
                  )}
                >
                  <Icon className="size-5" />
                </div>
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted/70">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    score.tone === "positive" && "bg-emerald-500",
                    score.tone === "watch" && "bg-amber-500",
                    score.tone === "neutral" && "bg-sky-500",
                    score.tone === "load" && "bg-rose-500",
                  )}
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: `${score.score}%` }}
                  transition={{ duration: 0.5, delay: index * 0.04 }}
                />
              </div>

              <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendIcon score={score} />
                <span>{score.trendLabel}</span>
              </div>
              <p className="mt-2 text-sm leading-5 text-foreground/82">
                {score.interpretation}
              </p>
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {score.signal}
              </p>
            </GlassPanel>
          </motion.div>
        );
      })}
    </div>
  );
}
