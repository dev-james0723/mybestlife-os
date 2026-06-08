"use client";

import { BarChart3, CheckCircle2, Gauge, Play, Sparkles, TimerReset } from "lucide-react";

import { ActiveFocusDock } from "@/components/daily-planner/focus/active-focus-dock";
import { Badge } from "@/components/ui/badge";
import {
  OSControl,
  OSFrostedPanel,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import { cn } from "@/lib/utils";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import type {
  DailyPlanQualityReport,
  DailyPlanReview,
  PlannerFocusSession,
} from "@/types/database";

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-700 dark:text-emerald-300";
  if (score >= 60) return "text-amber-700 dark:text-amber-300";
  return "text-rose-700 dark:text-rose-300";
}

export function TodayFocusStrip({
  copy,
  planExists,
  qualityReport,
  activeSession,
  review,
  focusTargetText,
  analyzing,
  onAnalyze,
  onImprove,
  onStartFirstFocus,
  onOpenDetails,
  onOpenReview,
  onPause,
  onResume,
  onFinish,
  onDistracted,
}: {
  copy: DailyPlannerUiCopy;
  planExists: boolean;
  qualityReport: DailyPlanQualityReport | null | undefined;
  activeSession: PlannerFocusSession | null | undefined;
  review: DailyPlanReview | null | undefined;
  focusTargetText: string;
  analyzing?: boolean;
  onAnalyze: () => void;
  onImprove: () => void;
  onStartFirstFocus: () => void;
  onOpenDetails: () => void;
  onOpenReview: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onDistracted: () => void;
}) {
  return (
    <OSFrostedPanel
      as="section"
      className="border-emerald-500/20 p-4 sm:p-5"
      data-reduced-during-focus="true"
    >
        {activeSession ? (
          <ActiveFocusDock
            copy={copy}
            session={activeSession}
            onPause={onPause}
            onResume={onResume}
            onFinish={onFinish}
            onDistracted={onDistracted}
          />
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1.5">
                  <Gauge className="h-3.5 w-3.5" />
                  {copy.todayFocus}
                </Badge>
                {review ? (
                  <Badge variant="secondary" className="gap-1.5 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {copy.openReview}
                  </Badge>
                ) : null}
              </div>

              {!planExists ? (
                <p className="text-sm text-muted-foreground">{copy.noPlanFocusHint}</p>
              ) : qualityReport ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className={cn("font-semibold", scoreTone(qualityReport.score))}>
                    {copy.planQualityScore(qualityReport.score)}
                  </span>
                  <span className="text-muted-foreground">
                    {copy.focusTargetLabel(focusTargetText)}
                  </span>
                  <span className="text-muted-foreground">
                    {copy.breakStatusLabel(qualityReport.break_status)}
                  </span>
                  <span className="text-muted-foreground">
                    {copy.riskLabel(qualityReport.stimulation_risk)}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{copy.planQualityUnchecked}</p>
              )}

              {qualityReport?.top_issue ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {qualityReport.top_issue}
                </p>
              ) : planExists && qualityReport ? (
                <p className="text-xs text-muted-foreground">{copy.noQualityIssue}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {!planExists ? null : qualityReport ? (
                <>
                  <OSControl
                    type="button"
                    className="h-11 min-h-11 gap-1.5 rounded-xl"
                    onClick={onImprove}
                    disabled={qualityReport.suggested_changes.length === 0}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {copy.improvePlan}
                  </OSControl>
                  <OSControl
                    type="button"
                    className="h-11 min-h-11 gap-1.5 rounded-xl"
                    onClick={onOpenDetails}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    {copy.openDetails}
                  </OSControl>
                  <OSPrimaryAction
                    type="button"
                    className="h-11 min-h-11 gap-1.5 rounded-xl"
                    onClick={onStartFirstFocus}
                  >
                    <Play className="h-3.5 w-3.5" />
                    {copy.startFirstFocus}
                  </OSPrimaryAction>
                </>
              ) : (
                <OSPrimaryAction
                  type="button"
                  className="h-11 min-h-11 gap-1.5 rounded-xl"
                  onClick={onAnalyze}
                  disabled={analyzing}
                >
                  <TimerReset className="h-3.5 w-3.5" />
                  {copy.analyzePlan}
                </OSPrimaryAction>
              )}
              {review ? (
                <OSControl
                  type="button"
                  className="h-11 min-h-11 rounded-xl"
                  onClick={onOpenReview}
                >
                  {copy.openReview}
                </OSControl>
              ) : planExists ? (
                <OSControl
                  type="button"
                  className="h-11 min-h-11 rounded-xl"
                  onClick={onOpenReview}
                >
                  {copy.reviewDay}
                </OSControl>
              ) : null}
            </div>
          </div>
        )}
    </OSFrostedPanel>
  );
}
