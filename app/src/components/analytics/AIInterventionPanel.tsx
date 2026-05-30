"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Eye,
  PauseCircle,
  ShieldCheck,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import type { AIAnalyticsInsight } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const CONFIDENCE_SCORE: Record<AIAnalyticsInsight["confidence"], number> = {
  low: 38,
  medium: 68,
  high: 88,
};

function ConfidenceOrb({ confidence }: { confidence: AIAnalyticsInsight["confidence"] }) {
  const score = CONFIDENCE_SCORE[confidence];
  return (
    <div
      className="grid size-11 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(hsl(var(--primary)) ${score * 3.6}deg, hsl(var(--muted) / 0.7) 0deg)`,
      }}
      aria-label={`AI confidence ${confidence}`}
    >
      <div className="grid size-8 place-items-center rounded-full bg-background/92">
        <span className="text-[0.6rem] font-semibold uppercase">{confidence}</span>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  icon: Icon,
  content,
  tone,
  index,
  featured,
}: {
  title: string;
  icon: LucideIcon;
  content: string;
  tone: "good" | "watch" | "action" | "quiet" | "protect";
  index: number;
  featured?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: index * 0.03 }}
      className={cn(
        "rounded-xl border border-border/60 bg-background/34 p-4",
        featured && "border-primary/25 bg-primary/[0.04]",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            tone === "good" && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
            tone === "watch" && "bg-amber-500/12 text-amber-800 dark:text-amber-300",
            tone === "action" && "bg-primary/12 text-primary",
            tone === "quiet" && "bg-muted text-muted-foreground",
            tone === "protect" && "bg-sky-500/12 text-sky-700 dark:text-sky-300",
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            {title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{content}</p>
        </div>
      </div>
    </motion.article>
  );
}

function SignalList({
  label,
  items,
  variant,
}: {
  label: string;
  items: string[];
  variant: "progress" | "blind";
}) {
  return (
    <section className="min-w-0 rounded-xl border border-border/55 bg-background/28 p-4">
      <h3 className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.slice(0, 3).map((item) => (
          <li
            key={item}
            className={cn(
              "rounded-lg px-3 py-2.5 text-sm leading-relaxed",
              variant === "progress"
                ? "bg-emerald-500/8 text-emerald-950 dark:text-emerald-100"
                : "bg-amber-500/8 text-amber-950 dark:text-amber-100",
            )}
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AIInterventionPanel({ insight }: { insight: AIAnalyticsInsight }) {
  return (
    <GlassTintPanel tint="pink" className="min-w-0 p-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-primary" />
            <h2 className="text-base font-semibold tracking-normal">AI Intervention</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{insight.summary}</p>
        </div>
        <div className="flex w-full shrink-0 items-center gap-3 rounded-xl border border-border/55 bg-background/28 p-3 md:w-auto">
          <ConfidenceOrb confidence={insight.confidence} />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Confidence
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Grounded in current computed signals.
            </p>
          </div>
        </div>
      </header>

      <div className="mt-5 space-y-4">
        <InsightCard
          title="Next best move"
          icon={Target}
          content={insight.nextBestMove}
          tone="action"
          index={0}
          featured
        />

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <SignalList label="What improved" items={insight.progress} variant="progress" />
          <SignalList label="Not improving" items={insight.blindSpots} variant="blind" />
        </div>

        <div className="grid min-w-0 gap-3 lg:grid-cols-3">
          <InsightCard
            title="Hidden pattern"
            icon={Eye}
            content={insight.hiddenPattern}
            tone="watch"
            index={1}
          />
          <InsightCard
            title="Stop"
            icon={PauseCircle}
            content={insight.stopDoing}
            tone="quiet"
            index={2}
          />
          <InsightCard
            title="Protect"
            icon={ShieldCheck}
            content={insight.protect}
            tone="protect"
            index={3}
          />
        </div>
      </div>
    </GlassTintPanel>
  );
}

