"use client";

import { BarChart3, Lightbulb, RefreshCw } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import type { DailyPlanReview } from "@/types/database";

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function EndOfDayReviewDrawer({
  copy,
  open,
  review,
  pending,
  onOpenChange,
  onRegenerate,
  onSave,
}: {
  copy: DailyPlannerUiCopy;
  open: boolean;
  review: DailyPlanReview | null | undefined;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onRegenerate: () => void;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom-card" className="max-h-[92vh] overflow-hidden p-0 sm:max-w-4xl">
        <SheetHeader className="border-b border-border/50 px-4 pt-4 pb-3 sm:px-6">
          <SheetTitle>{copy.endOfDayReview}</SheetTitle>
          <SheetDescription>
            {review?.ai_summary ?? copy.reviewNotGenerated}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {review ? (
            <div className="space-y-5">
              <div className="grid gap-2 sm:grid-cols-4">
                <Metric
                  label={copy.plannedVsActual}
                  value={`${copy.formatMinutes(review.actual_focus_minutes)} / ${copy.formatMinutes(review.planned_minutes)}`}
                />
                <Metric
                  label={copy.focusIntegrity}
                  value={String(review.focus_integrity_score)}
                />
                <Metric
                  label={copy.planAccuracy}
                  value={percent(review.plan_accuracy_ratio)}
                />
                <Metric
                  label={copy.stimulationLoad}
                  value={String(review.stimulation_load_score)}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-4">
                <Metric label={copy.deepWorkLabel} value={copy.formatMinutes(review.deep_work_minutes)} />
                <Metric label={copy.meetingLabel} value={copy.formatMinutes(review.meeting_minutes)} />
                <Metric label={copy.recoveryRatio} value={percent(review.recovery_ratio)} />
                <Metric
                  label={copy.stimulationLeak}
                  value={String(review.stimulation_leak_count)}
                />
              </div>

              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">{copy.actualTimeline}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {copy.interruptionCountLabel(review.interruption_count)}
                  </Badge>
                  {review.best_focus_window ? (
                    <Badge variant="secondary">
                      {copy.bestFocusWindow}: {review.best_focus_window.start} - {review.best_focus_window.end}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{copy.noBestFocusWindow}</Badge>
                  )}
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-card/50 p-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-600" />
                    <h3 className="text-sm font-semibold">{copy.topFailurePattern}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {review.top_failure_pattern ?? copy.noQualityIssue}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card/50 p-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold">{copy.tomorrowSuggestion}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {review.tomorrow_suggestion ?? copy.noQualityIssue}
                  </p>
                </div>
              </section>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.reviewNotGenerated}</p>
          )}
        </div>

        <SheetFooter className="border-t border-border/50 bg-popover/95 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled className="h-11 min-h-11 rounded-xl">
              {copy.createTomorrowImprovement}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled className="h-11 min-h-11 rounded-xl">
              {copy.sendSummaryToJournal}
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 gap-1.5 rounded-xl"
              onClick={onRegenerate}
              disabled={pending}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {copy.regenerateAiInsight}
            </Button>
            <Button
              type="button"
              className="h-11 min-h-11 rounded-xl"
              onClick={onSave}
              disabled={!review}
            >
              {copy.saveReview}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
