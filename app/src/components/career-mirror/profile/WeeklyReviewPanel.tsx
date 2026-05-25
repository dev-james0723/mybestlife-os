"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Loader2,
  RefreshCw,
  CalendarCheck,
  TrendingUp,
  CheckCircle2,
  ShieldAlert,
  Flame,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { useAppStore } from "@/stores/app-store";
import { getCareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import type { CareerProfile } from "@/types/database";
import {
  useCareerWeeklyReview,
  useCareerMirrorAdvanced,
  type WeeklyReviewResultData,
} from "@/hooks/use-career-mirror-advanced";

function ReviewList({
  title,
  items,
  icon,
  accent,
}: {
  title: string;
  items?: string[];
  icon: React.ReactNode;
  accent: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className={cn("flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide", accent)}>
        {icon}
        {title}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm leading-snug text-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewBody({ review }: { review: WeeklyReviewResultData }) {
  const score =
    typeof review.momentum_score === "number"
      ? Math.round(Math.max(0, Math.min(100, review.momentum_score)))
      : null;

  return (
    <div className="space-y-4">
      {score != null ? (
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="size-3" /> Momentum
            </span>
            <span className="text-2xl font-bold tabular-nums">{score}</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <ReviewList
          title="Wins"
          items={review.wins}
          icon={<CheckCircle2 className="size-3" />}
          accent="text-emerald-600 dark:text-emerald-300"
        />
        <ReviewList
          title="Avoided"
          items={review.avoided}
          icon={<ShieldAlert className="size-3" />}
          accent="text-amber-600 dark:text-amber-300"
        />
      </div>

      {review.focus_next ? (
        <div className="rounded-lg border border-[var(--accent-pink)]/30 bg-[var(--accent-pink)]/5 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--accent-pink)]">
            Focus next
          </p>
          <p className="mt-1 text-sm leading-snug">{review.focus_next}</p>
        </div>
      ) : null}

      {review.uncomfortable_action ? (
        <div className="rounded-lg border border-[var(--border-glass)] bg-black/[0.03] p-3 dark:bg-white/[0.04]">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Flame className="size-3" /> The uncomfortable action
          </p>
          <p className="mt-1 text-sm leading-snug">{review.uncomfortable_action}</p>
        </div>
      ) : null}

      <ReviewList
        title="Nudges"
        items={review.nudges}
        icon={<CalendarCheck className="size-3" />}
        accent="text-muted-foreground"
      />
    </div>
  );
}

export type WeeklyReviewPanelProps = {
  profile: CareerProfile | null;
  className?: string;
};

export function WeeklyReviewPanel({ profile, className }: WeeklyReviewPanelProps) {
  const prefersReduced = useReducedMotion();
  const language = useAppStore((s) => s.language);
  const copy = getCareerMirrorUiCopy(language);

  const reviewQuery = useCareerWeeklyReview();
  const { generateWeeklyReview } = useCareerMirrorAdvanced();

  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    const result = await generateWeeklyReview();
    if (!result.ok) setError(copy.states.error);
    setGenerating(false);
  };

  const latest = reviewQuery.data ?? null;
  const review = (latest?.review ?? null) as WeeklyReviewResultData | null;
  const hasReview =
    review &&
    (review.wins?.length ||
      review.avoided?.length ||
      review.focus_next ||
      review.uncomfortable_action ||
      typeof review.momentum_score === "number");

  return (
    <GlassPanel className={cn("p-5", className)}>
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
        >
          <CalendarCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-semibold leading-tight">
            {copy.panels.weeklyReview}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            An honest read on the week — what moved, what you dodged.
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="gradient-pink" disabled={generating} onClick={onGenerate}>
          {generating ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {generating ? copy.states.loading : "Generate this week's review"}
        </Button>
        {!profile ? (
          <span className="text-xs text-muted-foreground">
            Tip: complete your mirror for a richer review.
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5">
        {reviewQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{copy.states.loading}</p>
        ) : reviewQuery.isError ? (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{copy.states.error}</p>
            <Button variant="ghost" size="sm" onClick={() => reviewQuery.refetch()}>
              <RefreshCw className="size-3.5" />
              {copy.states.retry}
            </Button>
          </div>
        ) : hasReview && review ? (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReduced ? REDUCED_MOTION_FADE : { duration: 0.4, ease: EASE_OUT_EXPO }}
            className="rounded-xl border border-[var(--border-glass)] bg-black/[0.02] p-4 dark:bg-white/[0.03]"
          >
            {latest?.week_start ? (
              <p className="mb-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                Week of {latest.week_start}
              </p>
            ) : null}
            <ReviewBody review={review} />
          </motion.div>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            {copy.states.emptyDescription}
          </p>
        )}
      </div>
    </GlassPanel>
  );
}

export default WeeklyReviewPanel;
