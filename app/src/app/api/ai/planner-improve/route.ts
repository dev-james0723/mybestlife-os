import { NextResponse } from "next/server";
import { getLlmResponseLanguageDirective } from "@/lib/ai/llm-response-locale";
import { fetchPlannerFocusJson, isRecord } from "@/lib/ai/planner-focus-route-utils";
import { applyPlanQualitySuggestedChange } from "@/lib/daily-planner/focus/plan-quality";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import type {
  DailyPlan,
  DailyPlanTask,
  FreePlanTask,
  PlanQualitySuggestedChange,
} from "@/types/database";

export const runtime = "nodejs";

type PlannerImproveRequest = {
  locale?: string;
  planDate?: string;
  currentPlan?: DailyPlan;
  qualityReport?: {
    suggested_changes?: PlanQualitySuggestedChange[];
    summary?: string;
    top_issue?: string | null;
  };
  constraints?: {
    preserveCalendarEvents?: boolean;
    preserveMealsAndRecovery?: boolean;
    maxTaskMoves?: number;
  };
};

type PlannerImproveResponse = {
  explanation: string;
  proposedTasks: DailyPlanTask[];
  proposedFreeTasks?: FreePlanTask[];
  changes: PlanQualitySuggestedChange[];
  source: "ai" | "deterministic";
};

function deterministicImprove(body: PlannerImproveRequest): PlannerImproveResponse {
  const currentTasks = body.currentPlan?.tasks ?? [];
  const changes = (body.qualityReport?.suggested_changes ?? []).filter(
    (change) => change.safeToAutoApply,
  );
  const proposedTasks = changes.reduce(
    (acc, change) => applyPlanQualitySuggestedChange(acc, change),
    currentTasks,
  );
  return {
    explanation:
      changes.length > 0
        ? "Applied safe deterministic improvements without deleting tasks or changing linked task IDs."
        : "No safe automatic plan changes were available. Review the detected issues before changing the plan.",
    proposedTasks,
    proposedFreeTasks: body.currentPlan?.free_tasks,
    changes,
    source: "deterministic",
  };
}

function taskIdsPreserved(before: readonly DailyPlanTask[], after: readonly DailyPlanTask[]): boolean {
  const beforeIds = before
    .map((task) => task.plannerTaskId)
    .filter((id): id is string => Boolean(id));
  const afterIds = new Set(
    after.map((task) => task.plannerTaskId).filter((id): id is string => Boolean(id)),
  );
  return beforeIds.every((id) => afterIds.has(id));
}

function parseAiImprove(
  parsed: unknown,
  body: PlannerImproveRequest,
  fallback: PlannerImproveResponse,
): PlannerImproveResponse {
  if (!isRecord(parsed)) return fallback;
  const explanation = typeof parsed.explanation === "string" ? parsed.explanation.trim() : "";
  const proposedTasks = Array.isArray(parsed.proposedTasks)
    ? (parsed.proposedTasks as DailyPlanTask[])
    : Array.isArray(parsed.proposed_tasks)
      ? (parsed.proposed_tasks as DailyPlanTask[])
      : null;
  if (!explanation || !proposedTasks) return fallback;
  if (!taskIdsPreserved(body.currentPlan?.tasks ?? [], proposedTasks)) return fallback;
  return {
    explanation,
    proposedTasks,
    proposedFreeTasks: Array.isArray(parsed.proposedFreeTasks)
      ? (parsed.proposedFreeTasks as FreePlanTask[])
      : fallback.proposedFreeTasks,
    changes: Array.isArray(parsed.changes)
      ? (parsed.changes as PlanQualitySuggestedChange[])
      : fallback.changes,
    source: "ai",
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as PlannerImproveRequest;
  const fallback = deterministicImprove(body);
  const locale = parseAppLocale(body.locale);

  try {
    const parsed = await fetchPlannerFocusJson({
      system: [
        "You propose safe Daily Planner improvements for a personal operating system.",
        "Return only JSON: { explanation, proposedTasks, proposedFreeTasks, changes }.",
        "Never delete tasks. Preserve plannerTaskId and taskId. Do not move Google Calendar events unless constraints explicitly allow it.",
        "Prefer adding recovery, reducing scope, batching admin, and protecting deep work.",
        getLlmResponseLanguageDirective(locale),
      ].join("\n"),
      user: JSON.stringify({
        planDate: body.planDate,
        currentPlan: body.currentPlan,
        qualityReport: body.qualityReport,
        constraints: {
          preserveCalendarEvents: true,
          preserveMealsAndRecovery: true,
          maxTaskMoves: 2,
          ...(body.constraints ?? {}),
        },
      }),
    });
    if (!parsed) return NextResponse.json(fallback);
    return NextResponse.json(parseAiImprove(parsed, body, fallback));
  } catch {
    return NextResponse.json(fallback);
  }
}
