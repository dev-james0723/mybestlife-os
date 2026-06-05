"use client";

import { useCallback, useMemo, useState } from "react";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentEnergyLevelId } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentActionPreviewCard } from "@/lib/life-agent/action-types";
import type { LifeAgentMemoryUsedItem } from "@/lib/life-agent/context-types";
import type {
  LifeBriefResponse,
  OpenLoopDisposition,
  OpenLoopsResponse,
  PlanMyDayResponse,
  WeeklyReviewResponse,
} from "@/lib/life-agent/workflow-types";
import {
  mergeActionPreviews,
  useClearOpenLoops,
  useDailyBrief,
  useOpenLoopsAnalyze,
  usePlanMyDay,
  useWeeklyReview,
} from "@/hooks/use-life-agent-workflows";
import { LifeAgentWorkflowCard } from "@/components/life-agent/LifeAgentWorkflowCard";
import { LifeBriefPanel } from "@/components/life-agent/LifeBriefPanel";
import { ClearOpenLoopsEditor, OpenLoopRadar } from "@/components/life-agent/OpenLoopRadar";
import { PlanMyDayPanel } from "@/components/life-agent/PlanMyDayPanel";
import { WeeklyReviewPanel } from "@/components/life-agent/WeeklyReviewPanel";
import { cn } from "@/lib/utils";

export type FlagshipWorkflowId =
  | "lifeBrief"
  | "whatAmIMissing"
  | "openLoopRadar"
  | "planMyDay"
  | "clearOpenLoops"
  | "weeklyReview";

const FLAGSHIP_ORDER: FlagshipWorkflowId[] = [
  "lifeBrief",
  "whatAmIMissing",
  "openLoopRadar",
  "planMyDay",
  "clearOpenLoops",
  "weeklyReview",
];

type LifeAgentOrchestrationHubProps = {
  ui: LifeAgentUiCopy;
  displayName: string | null;
  conversationId: string | null;
  onMemoryUsed: (items: LifeAgentMemoryUsedItem[]) => void;
  onActionPreviews: (previews: LifeAgentActionPreviewCard[]) => void;
  className?: string;
};

export function LifeAgentOrchestrationHub({
  ui,
  displayName,
  conversationId,
  onMemoryUsed,
  onActionPreviews,
  className,
}: LifeAgentOrchestrationHubProps) {
  const [active, setActive] = useState<FlagshipWorkflowId>("lifeBrief");
  const [brief, setBrief] = useState<LifeBriefResponse | null>(null);
  const [openLoopsData, setOpenLoopsData] = useState<OpenLoopsResponse | null>(null);
  const [plan, setPlan] = useState<PlanMyDayResponse | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReviewResponse | null>(null);
  const [energyLevel, setEnergyLevel] = useState<LifeAgentEnergyLevelId>("normal");
  const [assignments, setAssignments] = useState<Record<string, OpenLoopDisposition>>({});
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const dailyBrief = useDailyBrief();
  const openLoopsAnalyze = useOpenLoopsAnalyze();
  const clearOpenLoops = useClearOpenLoops();
  const planMyDay = usePlanMyDay();
  const weeklyReview = useWeeklyReview();

  const workflowBody = useMemo(
    () => ({ displayName: displayName ?? undefined }),
    [displayName],
  );

  const applyWorkflowResult = useCallback(
    (memoryUsed: LifeAgentMemoryUsedItem[], actionPreviews: LifeAgentActionPreviewCard[]) => {
      onMemoryUsed(memoryUsed);
      if (actionPreviews.length) {
        onActionPreviews(actionPreviews);
      }
    },
    [onActionPreviews, onMemoryUsed],
  );

  const runBrief = useCallback(async () => {
    setWorkflowError(null);
    try {
      const result = await dailyBrief.mutateAsync(workflowBody);
      setBrief(result);
      applyWorkflowResult(result.memoryUsed, result.actionPreviews);
    } catch {
      setWorkflowError(ui.workflowError);
    }
  }, [applyWorkflowResult, dailyBrief, ui.workflowError, workflowBody]);

  const runOpenLoops = useCallback(async () => {
    setWorkflowError(null);
    try {
      const result = await openLoopsAnalyze.mutateAsync(workflowBody);
      setOpenLoopsData(result);
      applyWorkflowResult(result.memoryUsed, result.actionPreviews);
      const next: Record<string, OpenLoopDisposition> = {};
      for (const group of result.groups) {
        for (const loop of group.loops) {
          next[loop.id] = "clarify";
        }
      }
      setAssignments(next);
    } catch {
      setWorkflowError(ui.workflowError);
    }
  }, [applyWorkflowResult, openLoopsAnalyze, ui.workflowError, workflowBody]);

  const runWeekly = useCallback(async () => {
    setWorkflowError(null);
    try {
      const result = await weeklyReview.mutateAsync(workflowBody);
      setWeekly(result);
      applyWorkflowResult(result.memoryUsed, result.actionPreviews);
    } catch {
      setWorkflowError(ui.workflowError);
    }
  }, [applyWorkflowResult, ui.workflowError, weeklyReview, workflowBody]);

  const runPlan = useCallback(async () => {
    setWorkflowError(null);
    try {
      const result = await planMyDay.mutateAsync({ ...workflowBody, energyLevel });
      setPlan(result);
      applyWorkflowResult(result.memoryUsed, result.actionPreviews);
    } catch {
      setWorkflowError(ui.workflowError);
    }
  }, [applyWorkflowResult, energyLevel, planMyDay, ui.workflowError, workflowBody]);

  const handleSelectWorkflow = useCallback(
    (id: FlagshipWorkflowId) => {
      setActive(id);
      setWorkflowError(null);
      if (id === "lifeBrief" && !brief && !dailyBrief.isPending) void runBrief();
      if (
        (id === "whatAmIMissing" || id === "openLoopRadar" || id === "clearOpenLoops") &&
        !openLoopsData &&
        !openLoopsAnalyze.isPending
      ) {
        void runOpenLoops();
      }
      if (id === "weeklyReview" && !weekly && !weeklyReview.isPending) void runWeekly();
    },
    [
      brief,
      dailyBrief.isPending,
      openLoopsAnalyze.isPending,
      openLoopsData,
      runBrief,
      runOpenLoops,
      runWeekly,
      weekly,
      weeklyReview.isPending,
    ],
  );

  const handleClearSubmit = useCallback(async () => {
    if (!openLoopsData) return;
    const assignmentList = Object.entries(assignments).map(([loopId, disposition]) => ({
      loopId,
      disposition,
    }));
    setWorkflowError(null);
    try {
      const result = await clearOpenLoops.mutateAsync({
        assignments: assignmentList,
        conversationId: conversationId ?? undefined,
      });
      onMemoryUsed(result.memoryUsed);
      onActionPreviews(mergeActionPreviews([], result.actionPreviews));
    } catch {
      setWorkflowError(ui.workflowError);
    }
  }, [
    assignments,
    clearOpenLoops,
    conversationId,
    onActionPreviews,
    onMemoryUsed,
    openLoopsData,
    ui.workflowError,
  ]);

  const isLoading =
    dailyBrief.isPending ||
    openLoopsAnalyze.isPending ||
    clearOpenLoops.isPending ||
    planMyDay.isPending ||
    weeklyReview.isPending;

  const panelTitle = useMemo(() => {
    switch (active) {
      case "lifeBrief":
        return ui.lifeBriefTitle;
      case "whatAmIMissing":
        return ui.flagshipWorkflows.whatAmIMissing.title;
      case "openLoopRadar":
        return ui.openLoopRadarTitle;
      case "planMyDay":
        return ui.planMyDayTitle;
      case "clearOpenLoops":
        return ui.clearOpenLoopsTitle;
      case "weeklyReview":
        return ui.weeklyReviewTitle;
      default:
        return ui.orchestrationTitle;
    }
  }, [active, ui]);

  return (
    <section className={cn("space-y-4", className)} aria-labelledby="life-agent-orchestration-heading">
      <div>
        <h2 id="life-agent-orchestration-heading" className="text-sm font-semibold">
          {ui.orchestrationTitle}
        </h2>
        <p className="text-xs text-muted-foreground">{ui.orchestrationSubtitle}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {FLAGSHIP_ORDER.map((id, index) => (
          <LifeAgentWorkflowCard
            key={id}
            title={ui.flagshipWorkflows[id].title}
            description={ui.flagshipWorkflows[id].description}
            isActive={active === id}
            isLoading={active === id && isLoading}
            index={index}
            onClick={() => handleSelectWorkflow(id)}
          />
        ))}
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/20 p-1">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <h3 className="text-sm font-semibold">{panelTitle}</h3>
          {active !== "planMyDay" && active !== "clearOpenLoops" && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              disabled={isLoading}
              onClick={() => {
                if (active === "lifeBrief") void runBrief();
                else if (active === "whatAmIMissing" || active === "openLoopRadar") {
                  void runOpenLoops();
                } else if (active === "weeklyReview") void runWeekly();
              }}
            >
              {isLoading ? ui.workflowLoading : ui.workflowRun}
            </button>
          )}
        </div>

        {workflowError && (
          <p className="px-3 pb-2 text-xs text-destructive" role="alert">
            {workflowError}
          </p>
        )}

        <div className="px-2 pb-2">
          {active === "lifeBrief" && brief && <LifeBriefPanel ui={ui} brief={brief} />}
          {active === "lifeBrief" && !brief && isLoading && (
            <p className="p-3 text-sm text-muted-foreground">{ui.workflowLoading}</p>
          )}

          {(active === "whatAmIMissing" || active === "openLoopRadar") && openLoopsData && (
            <OpenLoopRadar
              ui={ui}
              groups={openLoopsData.groups}
              summary={openLoopsData.summary}
            />
          )}
          {(active === "whatAmIMissing" || active === "openLoopRadar") &&
            !openLoopsData &&
            isLoading && (
              <p className="p-3 text-sm text-muted-foreground">{ui.workflowLoading}</p>
            )}
          {active === "whatAmIMissing" && openLoopsData && (
            <p className="mt-2 px-1 text-xs text-muted-foreground">
              {ui.whatAmIMissingDescription}
            </p>
          )}

          {active === "clearOpenLoops" && openLoopsData && (
            <ClearOpenLoopsEditor
              ui={ui}
              groups={openLoopsData.groups}
              assignments={assignments}
              onAssignmentChange={(loopId, disposition) =>
                setAssignments((prev) => ({ ...prev, [loopId]: disposition }))
              }
              onSubmit={() => void handleClearSubmit()}
              isSubmitting={clearOpenLoops.isPending}
            />
          )}
          {active === "clearOpenLoops" && !openLoopsData && isLoading && (
            <p className="p-3 text-sm text-muted-foreground">{ui.workflowLoading}</p>
          )}

          {active === "planMyDay" && (
            <PlanMyDayPanel
              ui={ui}
              energyLevel={energyLevel}
              onEnergyChange={setEnergyLevel}
              onRun={() => void runPlan()}
              isLoading={planMyDay.isPending}
              plan={plan}
            />
          )}

          {active === "weeklyReview" && weekly && <WeeklyReviewPanel ui={ui} review={weekly} />}
          {active === "weeklyReview" && !weekly && isLoading && (
            <p className="p-3 text-sm text-muted-foreground">{ui.workflowLoading}</p>
          )}
        </div>
      </div>
    </section>
  );
}
