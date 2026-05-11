"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarRange, Check, History, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuggestedNextChip } from "@/components/bio-lab/suggested-next-chip";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";
import type { BioLabHistorySummary } from "@/lib/bio-lab/history-summary";
import type { HubSuggestion } from "@/lib/bio-lab/hub-suggestion-rules";
import type { BioLabHistoryCopy } from "@/lib/i18n/bio-lab-history-ui";
import type { UiTheme } from "@/types/database";

/**
 * Compact strip that summarises the user's recent Bio Lab activity, shown
 * above the tool grid on the Garden hub.
 *
 * Design intent (Phase 4):
 *   - Calm, not gamified. Streaks are surfaced but never pressured ("you'll
 *     lose your streak!"). The empty state encourages, doesn't shame.
 *   - Single line on mobile when possible, two on small screens, one wide
 *     row on tablet+.
 *   - The summary is *derived* (pure) from row arrays the parent already
 *     fetches with React Query — so no extra network round-trips.
 *   - Decoupled from the history sheet via a callback (`onOpenHistory`):
 *     the strip doesn't own modal state.
 */
export type RecentActivityStripProps = {
  summary: BioLabHistorySummary;
  copy: BioLabHistoryCopy;
  /** Show a small loading skeleton instead of content when true. */
  isLoading?: boolean;
  /** Open the unified history sheet. Hidden when `summary.hasAnyHistory` is false. */
  onOpenHistory: () => void;
  /**
   * Optional contextual nudge derived from the most recent session
   * ({@link computeHubSuggestion}). Renders as a chip below the main row.
   * When `null`, no chip is rendered — quietness is the default.
   */
  suggestion?: HubSuggestion | null;
  /** Called when the user accepts the suggestion chip. Required iff `suggestion` is set. */
  onAcceptSuggestion?: () => void;
  /** UI theme — used by the chip to pick a tool-tinted accent. */
  uiTheme?: UiTheme;
  /** Localised display name of the suggested tool (a11y).
   *  Required iff `suggestion` is set. */
  suggestionToolTitle?: string;
  className?: string;
};

export function RecentActivityStrip({
  summary,
  copy,
  isLoading,
  onOpenHistory,
  suggestion,
  onAcceptSuggestion,
  uiTheme,
  suggestionToolTitle,
  className,
}: RecentActivityStripProps) {
  const reduceMotion = useReducedMotion() ?? false;

  if (isLoading) {
    return <Skeleton className={className} />;
  }

  const stripCopy = copy.strip;

  // ============================================================
  // Empty state
  // ============================================================
  if (!summary.hasAnyHistory) {
    return (
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        aria-labelledby="bio-lab-recent-activity-heading"
        className={cn(
          "relative overflow-hidden rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 sm:px-5",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border/60"
            aria-hidden
          >
            <CalendarRange className="size-4 stroke-[1.6]" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p
              id="bio-lab-recent-activity-heading"
              className={cn(
                "text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
              )}
            >
              {stripCopy.eyebrow}
            </p>
            <p className={cn(typography.body, "text-foreground")}>
              {stripCopy.emptyHeadline}
            </p>
            <p className={cn(typography.caption, "text-muted-foreground")}>
              {stripCopy.emptySubline}
            </p>
          </div>
        </div>
      </motion.section>
    );
  }

  // ============================================================
  // Populated state
  // ============================================================
  const weekLine = stripCopy.weekSummary(summary.windowTotal);
  const streakLine = stripCopy.streakLine(summary.streakDays);

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      aria-labelledby="bio-lab-recent-activity-heading"
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/70 bg-card/90 px-4 py-3 sm:px-5",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.05] via-transparent to-muted/20"
        aria-hidden
      />
      <div className="relative space-y-2.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
            aria-hidden
          >
            <CalendarRange className="size-4 stroke-[1.6]" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p
              id="bio-lab-recent-activity-heading"
              className={cn(
                "text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
              )}
            >
              {stripCopy.eyebrow}
            </p>
            <p
              className={cn(
                typography.body,
                "font-medium text-foreground tabular-nums",
              )}
            >
              {weekLine}
              {streakLine ? (
                <>
                  <span aria-hidden className="mx-2 text-muted-foreground/50">
                    ·
                  </span>
                  <span className="text-muted-foreground">{streakLine}</span>
                </>
              ) : null}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {summary.didSomethingToday ? (
                <Chip
                  icon={<Check className="size-3" aria-hidden />}
                  label={stripCopy.todayDone}
                  tone="positive"
                />
              ) : null}
              {summary.anyAiAssistedRecently ? (
                <Chip
                  icon={<Sparkles className="size-3" aria-hidden />}
                  label={stripCopy.aiNote}
                  tone="ai"
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 sm:items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenHistory}
            className="h-8 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <History className="size-3.5" aria-hidden />
            {stripCopy.viewHistoryCta}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {suggestion && onAcceptSuggestion && uiTheme && suggestionToolTitle ? (
          <SuggestedNextChip
            key={suggestion.dismissKey}
            suggestion={suggestion}
            copy={copy}
            uiTheme={uiTheme}
            toolTitle={suggestionToolTitle}
            onAccept={onAcceptSuggestion}
          />
        ) : null}
      </AnimatePresence>
      </div>
    </motion.section>
  );
}

// ============================================================
// Internal: chips
// ============================================================

function Chip({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "positive" | "ai";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium leading-none",
        tone === "positive" &&
          "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-300/20",
        tone === "ai" &&
          "bg-violet-500/10 text-violet-700 ring-1 ring-violet-500/20 dark:text-violet-300 dark:ring-violet-300/20",
      )}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative h-[68px] overflow-hidden rounded-xl border border-border/60 bg-muted/20",
        "motion-safe:animate-pulse",
        className,
      )}
      aria-hidden
    />
  );
}
