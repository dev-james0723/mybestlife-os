"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { useTheme } from "@/lib/theme-context";
import { useNextStepSuggestion } from "@/hooks/use-next-step-suggestion";
import {
  getBioLabCompletionCopy,
  type ResolvedNextStepCopy,
} from "@/lib/i18n/bio-lab-completion-ui";
import type {
  ToolCompletionData,
  StateScanResult,
  MindSweepResult,
  FocusSprintResult,
  SystemResetResult,
  ToolType,
} from "@/lib/bio-lab/completion-types";
import type { NextStepContext } from "@/lib/bio-lab/next-step-rules";
import { getBioLabToolDefinition } from "@/lib/bio-lab/tools-metadata";
import { getBioLabVisualTokens } from "@/lib/bio-lab/visual-tokens";
import { cn } from "@/lib/utils";

export type ToolCompletionCardProps = {
  /** What just happened. The discriminator (`tool`) drives the summary slot. */
  completion: ToolCompletionData;
  /** Cross-tool context the rule engine can use. Optional. */
  context?: NextStepContext;
  /**
   * Called when the user accepts the suggested next step. Receives the
   * recommended tool id (never null — the button is hidden when `nextTool` is null).
   */
  onOpenNext?: (next: ToolType) => void;
  /** Called when the user dismisses the card without taking the next step. */
  onDismiss?: () => void;
  /** When true, skip the entrance animation (e.g. server-rendered preview). */
  noEnter?: boolean;
  className?: string;
};

/**
 * Post-completion card shown by every Bio Lab tool. Visually consistent;
 * tool-specific summary content is rendered via the inner switch.
 *
 * - Pure presentation: it does not write to Supabase. The owning panel is
 *   responsible for persisting its session before mounting this card.
 * - Suggestion text comes from {@link useNextStepSuggestion}; this component
 *   never composes display copy itself.
 */
export function ToolCompletionCard({
  completion,
  context,
  onOpenNext,
  onDismiss,
  noEnter,
  className,
}: ToolCompletionCardProps) {
  const language = useAppStore((s) => s.language);
  const { uiTheme } = useTheme();
  const reduceMotion = useReducedMotion() ?? false;
  const shouldAnimate = !noEnter && !reduceMotion;
  const titleId = useId();

  const copy = getBioLabCompletionCopy(language);
  const suggestion = useNextStepSuggestion(completion, context);

  const tokens = getBioLabVisualTokens(completion.tool, uiTheme);
  const toolDef = getBioLabToolDefinition(completion.tool);
  const ToolIcon = toolDef?.icon ?? Sparkles;

  return (
    <motion.section
      initial={shouldAnimate ? { opacity: 0, y: 10, scale: 0.985 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.36, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-border/70 p-5 shadow-sm",
        "sm:p-6",
        tokens.cardSurface,
        className,
      )}
      aria-labelledby={titleId}
    >
      <div
        className={cn("pointer-events-none absolute inset-0 rounded-2xl", tokens.cardGradient)}
        aria-hidden
      />

      {shouldAnimate ? <SparkleBurst colorClass={tokens.sparkleColor} /> : null}

      <div className="relative space-y-4">
        <header className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              tokens.iconChip,
            )}
            aria-hidden
          >
            <ToolIcon className={cn("size-4", tokens.iconForeground)} />
          </span>
          <div className="space-y-1">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {copy.card.eyebrow}
            </p>
            <h3
              id={titleId}
              className="text-base font-semibold tracking-tight text-foreground sm:text-lg"
            >
              {summaryTitleFor(completion, copy)}
            </h3>
          </div>
        </header>

        <CompletionSummary completion={completion} copy={copy} />

        {suggestion ? (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              "space-y-3 rounded-xl border bg-muted/10 p-4",
              "border-border/60 ring-1 ring-inset",
              tokens.accentRing,
            )}
          >
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {copy.card.nextStepLabel}
            </p>
            <NextStepBlock
              copy={suggestion.copy}
              cardCopy={copy.card}
              hasNextTool={suggestion.nextTool !== null}
              onOpenNext={() => {
                if (suggestion.nextTool && onOpenNext) onOpenNext(suggestion.nextTool);
              }}
              onDismiss={onDismiss}
            />
          </motion.div>
        ) : null}

        <p className="pt-1 text-xs italic text-muted-foreground/80">
          {copy.closingByTheme[uiTheme]}
        </p>
      </div>
    </motion.section>
  );
}

// ============================================================
// Internal: micro-celebration sparkle burst
// ============================================================

/**
 * One-shot sparkle burst. Renders five small sparkle glyphs at fixed
 * positions inside the card, each fading in / out with a slight drift.
 *
 * Pure decoration — `aria-hidden` and pointer-events disabled. The whole
 * burst lasts ~1.6s then becomes invisible (it stays mounted but at zero
 * opacity, which is cheaper than animating-out the DOM nodes).
 *
 * Caller is responsible for honoring `prefers-reduced-motion` and skipping
 * this component entirely.
 */
function SparkleBurst({ colorClass }: { colorClass: string }) {
  // Fixed positions chosen to feel scattered without crowding the title or
  // the next-step block. Positions are percentages of the card.
  const sparkles: { top: string; left: string; size: number; delay: number; drift: number }[] = [
    { top: "8%", left: "62%", size: 12, delay: 0.05, drift: -6 },
    { top: "22%", left: "84%", size: 9, delay: 0.18, drift: -4 },
    { top: "44%", left: "92%", size: 11, delay: 0.32, drift: -8 },
    { top: "12%", left: "78%", size: 7, delay: 0.42, drift: -3 },
    { top: "32%", left: "70%", size: 8, delay: 0.55, drift: -5 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      {sparkles.map((s, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0.4, y: 0 }}
          animate={{
            opacity: [0, 0.85, 0.85, 0],
            scale: [0.4, 1.05, 1, 0.85],
            y: [0, s.drift * 0.4, s.drift, s.drift * 1.4],
          }}
          transition={{
            duration: 1.6,
            delay: s.delay,
            ease: "easeOut",
            times: [0, 0.25, 0.6, 1],
          }}
          style={{ top: s.top, left: s.left }}
          className={cn("absolute", colorClass)}
        >
          <Sparkles style={{ width: s.size, height: s.size }} aria-hidden />
        </motion.span>
      ))}
    </div>
  );
}

// ============================================================
// Internal: per-tool summary slot
// ============================================================

type CompletionCopy = ReturnType<typeof getBioLabCompletionCopy>;

function summaryTitleFor(
  completion: ToolCompletionData,
  copy: CompletionCopy,
): string {
  switch (completion.tool) {
    case "state-scan":
      return copy.summaries["state-scan"].title;
    case "mind-sweep":
      return copy.summaries["mind-sweep"].title;
    case "focus-sprint":
      return copy.summaries["focus-sprint"].title;
    case "system-reset":
      return copy.summaries["system-reset"].title;
    default:
      return "";
  }
}

function CompletionSummary({
  completion,
  copy,
}: {
  completion: ToolCompletionData;
  copy: CompletionCopy;
}) {
  switch (completion.tool) {
    case "state-scan":
      return <StateScanSummary data={completion.data} copy={copy} />;
    case "mind-sweep":
      return <MindSweepSummary data={completion.data} copy={copy} />;
    case "focus-sprint":
      return <FocusSprintSummary data={completion.data} copy={copy} />;
    case "system-reset":
      return <SystemResetSummary data={completion.data} copy={copy} />;
    default:
      return null;
  }
}

// ----------------- State Scan summary -----------------

function StateScanSummary({
  data,
  copy,
}: {
  data: StateScanResult;
  copy: CompletionCopy;
}) {
  const sumCopy = copy.summaries["state-scan"];
  const dims: { key: "mood" | "energy" | "focus" | "stress"; value: number }[] = [
    { key: "mood", value: data.mood },
    { key: "energy", value: data.energy },
    { key: "focus", value: data.focus },
    { key: "stress", value: data.stress },
  ];

  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {dims.map((d) => (
          <li
            key={d.key}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-lg border border-border/60 bg-background/60 px-3 py-2",
            )}
          >
            <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              {sumCopy.pillLabel(d.key)}
            </span>
            <span className="tabular-nums text-base font-semibold text-foreground">
              {d.value}
              <span className="text-xs font-normal text-muted-foreground">/5</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        {data.note.trim() ? data.note : sumCopy.noteFallback}
      </p>
    </div>
  );
}

// ----------------- Mind Sweep summary -----------------

function MindSweepSummary({
  data,
  copy,
}: {
  data: MindSweepResult;
  copy: CompletionCopy;
}) {
  const sumCopy = copy.summaries["mind-sweep"];
  if (data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">{sumCopy.empty}</p>;
  }
  const counts = countByKind(data.items);
  return (
    <div className="space-y-2">
      <p className="text-sm tabular-nums text-foreground">{sumCopy.breakdown(counts)}</p>
      {data.triageInsight ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {data.triageInsight}
        </p>
      ) : null}
    </div>
  );
}

// ----------------- Focus Sprint summary -----------------

function FocusSprintSummary({
  data,
  copy,
}: {
  data: FocusSprintResult;
  copy: CompletionCopy;
}) {
  const sumCopy = copy.summaries["focus-sprint"];
  const workMin = Math.round(data.workSeconds / 60);
  const breakMin = Math.round(data.breakSeconds / 60);
  return (
    <div className="space-y-1.5">
      <p className="text-sm text-foreground">{sumCopy.durationLine(workMin, breakMin)}</p>
      <p className="text-sm text-muted-foreground">
        {sumCopy.outcomeLabel(data.outcome)}
        {data.focusRating !== null ? (
          <>
            <span aria-hidden> · </span>
            {sumCopy.ratingLine(data.focusRating)}
          </>
        ) : null}
      </p>
      {data.intention.trim() ? (
        <p className="text-sm italic text-muted-foreground/90">
          “{data.intention.trim()}”
        </p>
      ) : null}
    </div>
  );
}

// ----------------- System Reset summary -----------------

function SystemResetSummary({
  data,
  copy,
}: {
  data: SystemResetResult;
  copy: CompletionCopy;
}) {
  const sumCopy = copy.summaries["system-reset"];
  const completed = data.steps.filter((s) => !s.skipped).length;
  return (
    <div className="space-y-1.5">
      <p className="text-sm text-foreground">
        {sumCopy.stepsLine(completed, data.steps.length)}
      </p>
      {data.aiAdaptive ? (
        <p className="text-sm text-muted-foreground">{sumCopy.adaptiveLine}</p>
      ) : null}
    </div>
  );
}

// ============================================================
// Internal: next-step block
// ============================================================

function NextStepBlock({
  copy,
  cardCopy,
  hasNextTool,
  onOpenNext,
  onDismiss,
}: {
  copy: ResolvedNextStepCopy;
  cardCopy: CompletionCopy["card"];
  hasNextTool: boolean;
  onOpenNext: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{copy.headline}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {hasNextTool ? (
          <Button type="button" className="min-h-11 flex-1" onClick={onOpenNext}>
            {copy.ctaLabel}
          </Button>
        ) : null}
        {onDismiss ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1"
            onClick={onDismiss}
          >
            {hasNextTool ? cardCopy.skipLabel : cardCopy.closeLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function countByKind(
  items: MindSweepResult["items"],
): { task: number; worry: number; idea: number; reminder: number } {
  const out = { task: 0, worry: 0, idea: 0, reminder: 0 };
  for (const item of items) out[item.kind] += 1;
  return out;
}
