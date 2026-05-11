"use client";

import { useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  CalendarRange,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";
import type { BioLabWeeklyInsightCopy } from "@/lib/i18n/bio-lab-weekly-insight-ui";
import type { WeeklyInsightResponse } from "@/lib/ai/bio-lab/clients";

/**
 * Weekly insight card for the Garden hub.
 *
 * State machine (driven entirely by the parent's `useWeeklyInsight()`):
 *   - idle      → no fetch yet (off-Sunday, or user opted out): show CTA.
 *   - loading   → spinner + soft "looking back…" body.
 *   - error     → small inline error + retry button.
 *   - empty     → "no activity in the last 7 days" empty state.
 *   - ok        → headline + 2–4 observations + optional next-step.
 *
 * Why a single component (not a sub-component per state):
 *   - Each state is small and shares the same chrome (icon, header, footer).
 *   - Parent passes one boolean (`shouldShow`) to decide whether to render
 *     the card at all — we never render the idle state on weekdays unless
 *     the user explicitly asks (handled outside this component).
 */
export type WeeklyInsightCardProps = {
  copy: BioLabWeeklyInsightCopy;
  data: WeeklyInsightResponse | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  /** Triggers an LLM call — used by both idle CTA and error retry. */
  onReflect: () => void;
  /** When `true`, the card renders the idle CTA even without data. */
  showIdleCta: boolean;
  /** Optional className override. */
  className?: string;
};

export function WeeklyInsightCard({
  copy,
  data,
  isLoading,
  isRefreshing,
  error,
  onReflect,
  showIdleCta,
  className,
}: WeeklyInsightCardProps) {
  const reduceMotion = useReducedMotion() ?? false;
  // Stable per-instance IDs so multiple cards (or HMR remounts) don't collide.
  const headingId = useId();
  const observationsId = useId();
  const nextStepId = useId();

  const generatedLabel = useMemo(() => {
    if (!data || data.result !== "ok") return null;
    try {
      const d = new Date(data.generatedAt);
      const fmt = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return copy.generatedAt(fmt.format(d));
    } catch {
      return null;
    }
  }, [data, copy]);

  // ============================================================
  // Visibility gating: render nothing when there's nothing to show
  // ============================================================
  const shouldRender =
    isLoading || error !== null || data !== undefined || showIdleCta;
  if (!shouldRender) return null;

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
      role="region"
      aria-labelledby={headingId}
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-4 shadow-none sm:p-5",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/[0.05] via-transparent to-sky-500/[0.04]"
        aria-hidden
      />
      <div className="relative space-y-3">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/25 dark:bg-violet-500/15 dark:text-violet-300"
              aria-hidden
            >
              <Sparkles className="size-3.5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
                )}
              >
                {copy.eyebrow}
              </p>
              <h3
                id={headingId}
                className={cn(
                  "mt-0.5 text-balance text-sm font-semibold tracking-tight text-foreground sm:text-base",
                  typography.heading,
                )}
              >
                {data?.result === "ok"
                  ? data.content.headline
                  : data?.result === "empty"
                    ? copy.emptyTitle
                    : error
                      ? copy.errorTitle
                      : copy.idleTitle}
              </h3>
            </div>
          </div>

          {data?.result === "ok" ? (
            <div className="flex shrink-0 items-center gap-1.5">
              {data.cached ? (
                <span
                  className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[0.625rem] font-medium text-muted-foreground ring-1 ring-border/60"
                  aria-hidden
                >
                  {copy.cachedBadge}
                </span>
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onReflect}
                disabled={isRefreshing}
                aria-label={copy.refreshAriaLabel}
                className="size-7"
              >
                {isRefreshing ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="size-3.5" aria-hidden />
                )}
              </Button>
            </div>
          ) : null}
        </header>

        {/* Body — branches by state */}
        {isLoading && !data ? (
          <p
            className={cn(
              typography.body,
              "flex items-center gap-2 text-sm text-muted-foreground",
            )}
            aria-live="polite"
          >
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {copy.loading}
          </p>
        ) : error ? (
          <ErrorBlock copy={copy} onRetry={onReflect} isRetrying={isRefreshing} />
        ) : data?.result === "empty" ? (
          <EmptyBlock copy={copy} />
        ) : data?.result === "ok" ? (
          <OkBlock
            data={data}
            copy={copy}
            generatedLabel={generatedLabel}
            observationsId={observationsId}
            nextStepId={nextStepId}
          />
        ) : (
          <IdleBlock copy={copy} onReflect={onReflect} isLoading={isLoading} />
        )}
      </div>
    </motion.section>
  );
}

// ============================================================
// Sub-blocks
// ============================================================

function IdleBlock({
  copy,
  onReflect,
  isLoading,
}: {
  copy: BioLabWeeklyInsightCopy;
  onReflect: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <p className={cn(typography.body, "text-sm text-muted-foreground")}>
        {copy.idleBody}
      </p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={onReflect}
        disabled={isLoading}
        className="min-h-9"
      >
        {isLoading ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="mr-1.5 size-3.5" aria-hidden />
        )}
        {copy.reflectCta}
      </Button>
    </div>
  );
}

function ErrorBlock({
  copy,
  onRetry,
  isRetrying,
}: {
  copy: BioLabWeeklyInsightCopy;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <p
        className={cn(
          typography.body,
          "flex items-start gap-2 text-sm text-muted-foreground",
        )}
      >
        <AlertCircle
          className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
        <span>{copy.errorBody}</span>
      </p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={onRetry}
        disabled={isRetrying}
        className="min-h-9"
      >
        {isRetrying ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
        )}
        {copy.retryCta}
      </Button>
    </div>
  );
}

function EmptyBlock({ copy }: { copy: BioLabWeeklyInsightCopy }) {
  return (
    <p
      className={cn(typography.body, "flex items-start gap-2 text-sm text-muted-foreground")}
    >
      <CalendarRange
        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/80"
        aria-hidden
      />
      <span>{copy.emptyBody}</span>
    </p>
  );
}

function OkBlock({
  data,
  copy,
  generatedLabel,
  observationsId,
  nextStepId,
}: {
  data: Extract<WeeklyInsightResponse, { result: "ok" }>;
  copy: BioLabWeeklyInsightCopy;
  generatedLabel: string | null;
  observationsId: string;
  nextStepId: string;
}) {
  const { content } = data;
  return (
    <div className="space-y-3">
      <section aria-labelledby={observationsId}>
        <p
          id={observationsId}
          className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          {copy.observationsLabel}
        </p>
        <ul className="mt-1.5 space-y-1.5">
          {content.observations.map((obs, idx) => (
            <li
              key={idx}
              className={cn(
                typography.body,
                "text-sm leading-relaxed text-foreground/95",
              )}
            >
              {obs}
            </li>
          ))}
        </ul>
      </section>

      {content.nextStep ? (
        <section
          aria-labelledby={nextStepId}
          className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5"
        >
          <p
            id={nextStepId}
            className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            {copy.nextStepLabel}
          </p>
          <p
            className={cn(
              typography.body,
              "mt-1 text-sm leading-relaxed text-foreground/95",
            )}
          >
            {content.nextStep}
          </p>
        </section>
      ) : null}

      {generatedLabel ? (
        <p
          className={cn(typography.caption, "pt-0.5 text-[0.6875rem] text-muted-foreground/80")}
        >
          {generatedLabel}
        </p>
      ) : null}
    </div>
  );
}
