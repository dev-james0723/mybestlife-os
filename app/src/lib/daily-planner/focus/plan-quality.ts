import type { CalendarItem } from "@/lib/calendar/types";
import {
  computeSequentialSchedule,
  resolvePlanRange,
} from "@/lib/daily-planner/plan-schedule-math";
import type {
  BreakStatus,
  DailyPlanQualityReport,
  DailyPlanTask,
  FocusPreference,
  FreePlanTask,
  PlanQualityIssue,
  PlanQualityIssueSeverity,
  PlanQualityIssueType,
  PlanQualityRiskLevel,
  PlanQualitySuggestedChange,
  PlanningMode,
  StimulationRisk,
  Task,
} from "@/types/database";
import {
  classifiableFromDailyPlanTask,
  classifiableFromFreePlanTask,
  classifyPlannerTask,
  isDeepWorkCategory,
  isHighStimulationCategory,
  isRecoveryCategory,
  type PlannerTaskCategory,
} from "./task-classification";

export type BuildPlanQualityInput = {
  planDate: string;
  startTime: string;
  endTime: string;
  blockMinutes: number;
  tasks: DailyPlanTask[];
  freeTasks: FreePlanTask[];
  mode: PlanningMode;
  linkedTasks: Task[];
  calendarEvents?: CalendarItem[];
  focusPreferences: FocusPreference;
};

export type DeterministicPlanQualityReport = Omit<
  DailyPlanQualityReport,
  "id" | "user_id" | "daily_plan_id" | "created_at" | "updated_at"
>;

type ScoredIssue = PlanQualityIssue & {
  penalty: number;
};

type ClassifiedPlanTask = {
  plannerTaskId: string | null;
  title: string;
  category: PlannerTaskCategory;
  startMin: number | null;
  endMin: number | null;
  durationMin: number;
  blocks: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function makeId(prefix: string, seed: string): string {
  return `${prefix}-${seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48)}`;
}

function issue(params: {
  type: PlanQualityIssueType;
  severity: PlanQualityIssueSeverity;
  title: string;
  description: string;
  penalty: number;
  affectedPlannerTaskIds?: string[];
}): ScoredIssue {
  return {
    id: makeId(params.type, params.title),
    type: params.type,
    severity: params.severity,
    title: params.title,
    description: params.description,
    affectedPlannerTaskIds: params.affectedPlannerTaskIds ?? [],
    penalty: params.penalty,
  };
}

function scoreRisk(score: number): PlanQualityRiskLevel {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  return "high";
}

function sourceHash(input: BuildPlanQualityInput): string {
  const payload = JSON.stringify({
    planDate: input.planDate,
    startTime: input.startTime,
    endTime: input.endTime,
    blockMinutes: input.blockMinutes,
    mode: input.mode,
    tasks: input.tasks,
    freeTasks: input.freeTasks,
    calendarEvents: (input.calendarEvents ?? []).map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time,
      source_type: event.source_type,
    })),
    preferences: {
      high_stimulation_routes: input.focusPreferences.high_stimulation_routes,
      default_focus_minutes: input.focusPreferences.default_focus_minutes,
    },
  });
  let hash = 5381;
  for (let i = 0; i < payload.length; i += 1) {
    hash = (hash * 33) ^ payload.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function classifyScheduledTasks(input: BuildPlanQualityInput): ClassifiedPlanTask[] {
  if (input.mode === "free") {
    return input.freeTasks.map((task) => {
      const category = classifyPlannerTask(classifiableFromFreePlanTask(task, input.linkedTasks));
      const durationMin =
        task.estimatedMinutes && task.estimatedMinutes > 0
          ? task.estimatedMinutes
          : input.focusPreferences.default_focus_minutes;
      return {
        plannerTaskId: task.id,
        title: task.title,
        category,
        startMin: null,
        endMin: null,
        durationMin,
        blocks: Math.max(1, Math.ceil(durationMin / input.blockMinutes)),
      };
    });
  }

  const schedule = computeSequentialSchedule(
    input.planDate,
    input.startTime,
    input.tasks,
    input.blockMinutes,
  );
  return schedule.map((row) => {
    const category = classifyPlannerTask(
      classifiableFromDailyPlanTask(row.task, input.linkedTasks),
    );
    const durationMin = row.endMinFromPlanMidnight - row.startMinFromPlanMidnight;
    return {
      plannerTaskId: row.task.plannerTaskId ?? null,
      title: row.task.taskName ?? "",
      category,
      startMin: row.startMinFromPlanMidnight,
      endMin: row.endMinFromPlanMidnight,
      durationMin,
      blocks: Math.max(1, Math.round(durationMin / input.blockMinutes)),
    };
  });
}

function calendarEventMinutes(event: CalendarItem): { startMin: number; endMin: number } | null {
  if (!event.start_time || !event.end_time) return null;
  const [sh, sm] = event.start_time.split(":").map(Number);
  const [eh, em] = event.end_time.split(":").map(Number);
  if (!Number.isFinite(sh) || !Number.isFinite(eh)) return null;
  const startMin = sh * 60 + (sm || 0);
  let endMin = eh * 60 + (em || 0);
  if (endMin <= startMin) endMin += 24 * 60;
  return { startMin, endMin };
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function detectCalendarConflicts(
  tasks: ClassifiedPlanTask[],
  calendarEvents: readonly CalendarItem[],
): ScoredIssue[] {
  const blockingEvents = calendarEvents.filter(
    (event) => event.source_type === "external" && event.start_time && event.end_time,
  );
  const affected = new Set<string>();
  for (const task of tasks) {
    if (task.startMin == null || task.endMin == null || !isDeepWorkCategory(task.category)) {
      continue;
    }
    for (const event of blockingEvents) {
      const range = calendarEventMinutes(event);
      if (!range) continue;
      if (overlaps(task.startMin, task.endMin, range.startMin, range.endMin)) {
        if (task.plannerTaskId) affected.add(task.plannerTaskId);
      }
    }
  }
  if (affected.size === 0) return [];
  return [
    issue({
      type: "calendar_conflict",
      severity: "critical",
      title: "Deep work overlaps calendar commitments",
      description: "Calendar events should be treated as immovable unless you explicitly move them.",
      penalty: Math.min(20, 8 + affected.size * 4),
      affectedPlannerTaskIds: [...affected],
    }),
  ];
}

function detectLongRuns(tasks: ClassifiedPlanTask[]): ScoredIssue[] {
  let runMinutes = 0;
  let runIds: string[] = [];
  let worstRun = { minutes: 0, ids: [] as string[] };
  for (const task of tasks) {
    if (isRecoveryCategory(task.category)) {
      if (runMinutes > worstRun.minutes) worstRun = { minutes: runMinutes, ids: runIds };
      runMinutes = 0;
      runIds = [];
      continue;
    }
    runMinutes += task.durationMin;
    if (task.plannerTaskId) runIds.push(task.plannerTaskId);
  }
  if (runMinutes > worstRun.minutes) worstRun = { minutes: runMinutes, ids: runIds };
  if (worstRun.minutes < 90) return [];
  return [
    issue({
      type: worstRun.minutes > 120 ? "missing_break" : "long_work_run",
      severity: worstRun.minutes > 120 ? "critical" : "warning",
      title: worstRun.minutes > 120 ? "Recovery is missing after a long run" : "Work run is getting long",
      description: `${worstRun.minutes} minutes of work-like tasks appear without a meaningful break.`,
      penalty: worstRun.minutes > 120 ? 15 : 9,
      affectedPlannerTaskIds: worstRun.ids,
    }),
  ];
}

function detectContextSwitching(tasks: ClassifiedPlanTask[]): ScoredIssue[] {
  const meaningful = tasks.filter((task) => !isRecoveryCategory(task.category));
  let switches = 0;
  for (let i = 1; i < meaningful.length; i += 1) {
    if (meaningful[i - 1]?.category !== meaningful[i]?.category) switches += 1;
  }
  if (switches < 5) return [];
  return [
    issue({
      type: "context_switching",
      severity: switches >= 7 ? "critical" : "warning",
      title: "Too many context switches",
      description: `${switches} category switches make the day harder to execute calmly.`,
      penalty: Math.min(15, 7 + switches),
      affectedPlannerTaskIds: meaningful
        .map((task) => task.plannerTaskId)
        .filter((id): id is string => Boolean(id)),
    }),
  ];
}

function detectWeakDeepWork(tasks: ClassifiedPlanTask[], plannedMinutes: number): ScoredIssue[] {
  if (plannedMinutes < 180) return [];
  const hasProtectedBlock = tasks.some(
    (task) => isDeepWorkCategory(task.category) && task.durationMin >= 45,
  );
  if (hasProtectedBlock) return [];
  return [
    issue({
      type: "weak_deep_work_protection",
      severity: "warning",
      title: "No protected deep-work block",
      description: "A meaningful work day needs at least one 45+ minute protected block.",
      penalty: 15,
      affectedPlannerTaskIds: tasks
        .filter((task) => isDeepWorkCategory(task.category))
        .map((task) => task.plannerTaskId)
        .filter((id): id is string => Boolean(id)),
    }),
  ];
}

function detectHighStimulationTiming(
  tasks: ClassifiedPlanTask[],
  planEndMin: number,
): ScoredIssue[] {
  const vulnerable = tasks.filter((task) => {
    if (!isHighStimulationCategory(task.category)) return false;
    if (task.startMin == null) return true;
    return task.startMin >= 20 * 60 || task.endMin != null && task.endMin >= planEndMin - 90;
  });
  if (vulnerable.length === 0) return [];
  return [
    issue({
      type: "high_stimulation",
      severity: vulnerable.length >= 2 ? "critical" : "warning",
      title: "High-stimulation work is in a vulnerable slot",
      description: "Late or loosely bounded high-stimulation tasks can turn into escape loops.",
      penalty: Math.min(15, 8 + vulnerable.length * 3),
      affectedPlannerTaskIds: vulnerable
        .map((task) => task.plannerTaskId)
        .filter((id): id is string => Boolean(id)),
    }),
  ];
}

function detectTinyTaskLoad(tasks: ClassifiedPlanTask[], mode: PlanningMode): ScoredIssue[] {
  if (mode === "free" || tasks.length < 8) return [];
  const tiny = tasks.filter((task) => task.blocks <= 1);
  if (tiny.length < 6 || tiny.length / tasks.length < 0.4) return [];
  return [
    issue({
      type: "context_switching",
      severity: "warning",
      title: "Tiny tasks are fragmenting the plan",
      description: `${tiny.length} one-block tasks may be better batched into admin or recovery windows.`,
      penalty: 10,
      affectedPlannerTaskIds: tiny
        .map((task) => task.plannerTaskId)
        .filter((id): id is string => Boolean(id)),
    }),
  ];
}

function computeBreakStatus(issues: readonly ScoredIssue[], tasks: readonly ClassifiedPlanTask[]): BreakStatus {
  const hasRecovery = tasks.some((task) => isRecoveryCategory(task.category));
  const longRun = issues.find(
    (item) => item.type === "missing_break" || item.type === "long_work_run",
  );
  if (!longRun && hasRecovery) return "good";
  if (longRun?.type === "long_work_run") return "thin";
  if (longRun?.type === "missing_break" || !hasRecovery) return "missing";
  return "unknown";
}

function computeStimulationRisk(tasks: readonly ClassifiedPlanTask[]): StimulationRisk {
  const highStim = tasks.filter((task) => isHighStimulationCategory(task.category));
  if (highStim.length === 0) return "low";
  if (
    highStim.some(
      (task) => task.startMin == null || task.startMin >= 20 * 60 || task.durationMin >= 60,
    )
  ) {
    return "high";
  }
  return "medium";
}

function buildSuggestedChanges(
  issues: readonly ScoredIssue[],
  tasks: readonly ClassifiedPlanTask[],
  blockMinutes: number,
): PlanQualitySuggestedChange[] {
  const changes: PlanQualitySuggestedChange[] = [];
  for (const item of issues) {
    if (item.type === "missing_break" || item.type === "long_work_run") {
      changes.push({
        id: "add-break-after-long-run",
        type: "add_break",
        title: "Add a recovery break",
        description: "Insert a short recovery block after the longest uninterrupted work run.",
        patch: {
          action: "add_break",
          afterPlannerTaskId: item.affectedPlannerTaskIds.at(-1),
          blocks: Math.max(1, Math.ceil(15 / blockMinutes)),
          title: "Recovery break",
        },
        safeToAutoApply: true,
      });
    }
    if (item.type === "overload") {
      const lastWork = [...tasks]
        .reverse()
        .find((task) => !isRecoveryCategory(task.category) && task.plannerTaskId);
      if (lastWork?.plannerTaskId) {
        changes.push({
          id: "reduce-last-work-block",
          type: "reduce_scope",
          title: "Reduce the last work block",
          description: "Trim the least protected late-day task before changing earlier commitments.",
          patch: {
            action: "reduce_scope",
            plannerTaskId: lastWork.plannerTaskId,
            targetBlocks: Math.max(1, lastWork.blocks - 1),
          },
          safeToAutoApply: true,
        });
      }
    }
    if (item.type === "weak_deep_work_protection") {
      const firstDeep = tasks.find((task) => isDeepWorkCategory(task.category) && task.plannerTaskId);
      if (firstDeep?.plannerTaskId) {
        changes.push({
          id: "protect-first-deep-work",
          type: "protect_deep_work",
          title: "Protect the first deep-work task",
          description: "Move the best deep-work candidate to the top of the plan.",
          patch: {
            action: "protect_deep_work",
            plannerTaskId: firstDeep.plannerTaskId,
            minMinutes: 45,
          },
          safeToAutoApply: true,
        });
      }
    }
  }
  return changes.filter(
    (change, index, all) => all.findIndex((candidate) => candidate.id === change.id) === index,
  );
}

function addBonuses(tasks: readonly ClassifiedPlanTask[], availableMin: number, plannedMin: number): number {
  let bonus = 0;
  if (
    tasks.some(
      (task) =>
        isDeepWorkCategory(task.category) &&
        task.durationMin >= 60 &&
        task.durationMin <= 120,
    )
  ) {
    bonus += 5;
  }
  if (tasks.some((task) => isRecoveryCategory(task.category))) bonus += 5;
  const adminRuns = tasks.filter((task) => task.category === "admin" || task.category === "communication");
  if (adminRuns.length >= 2) {
    const adminIndexes = adminRuns.map((task) => tasks.indexOf(task)).sort((a, b) => a - b);
    const batched = adminIndexes.every(
      (index, i) => i === 0 || index - (adminIndexes[i - 1] ?? index) <= 1,
    );
    if (batched) bonus += 5;
  }
  if (availableMin - plannedMin >= 30) bonus += 5;
  return bonus;
}

export function buildPlanQualityReport(
  input: BuildPlanQualityInput,
): DeterministicPlanQualityReport {
  const classifiedTasks = classifyScheduledTasks(input);
  const plannedMinutes = classifiedTasks.reduce((sum, task) => sum + task.durationMin, 0);
  const planRange = resolvePlanRange(input.startTime, input.endTime);
  const issues: ScoredIssue[] = [];

  const utilization = plannedMinutes / Math.max(planRange.durationMin, 1);
  if (utilization > 0.9) {
    issues.push(
      issue({
        type: "overload",
        severity: utilization > 1 ? "critical" : "warning",
        title: utilization > 1 ? "Plan exceeds the available window" : "Plan is tightly packed",
        description: `${plannedMinutes} planned minutes in a ${planRange.durationMin} minute window leaves too little buffer.`,
        penalty: Math.round(clamp((utilization - 0.9) / 0.25, 0, 1) * 25),
        affectedPlannerTaskIds: classifiedTasks
          .map((task) => task.plannerTaskId)
          .filter((id): id is string => Boolean(id)),
      }),
    );
  }

  issues.push(...detectCalendarConflicts(classifiedTasks, input.calendarEvents ?? []));
  issues.push(...detectLongRuns(classifiedTasks));
  issues.push(...detectContextSwitching(classifiedTasks));
  issues.push(...detectWeakDeepWork(classifiedTasks, plannedMinutes));
  issues.push(...detectHighStimulationTiming(classifiedTasks, planRange.endMin));
  issues.push(...detectTinyTaskLoad(classifiedTasks, input.mode));

  const penalty = issues.reduce((sum, item) => sum + item.penalty, 0);
  const bonus = addBonuses(classifiedTasks, planRange.durationMin, plannedMinutes);
  const score = Math.round(clamp(100 - penalty + bonus, 0, 100));
  const topIssue =
    [...issues].sort((a, b) => b.penalty - a.penalty)[0]?.title ?? null;
  const focusTargetMinutes = classifiedTasks
    .filter((task) => isDeepWorkCategory(task.category))
    .reduce((sum, task) => sum + task.durationMin, 0);
  const breakStatus = computeBreakStatus(issues, classifiedTasks);
  const stimulationRisk = computeStimulationRisk(classifiedTasks);

  return {
    plan_date: input.planDate,
    score,
    risk_level: scoreRisk(score),
    summary:
      topIssue == null
        ? "This plan has a realistic shape for focused execution."
        : `Plan quality is limited by: ${topIssue}.`,
    top_issue: topIssue,
    focus_target_minutes: focusTargetMinutes,
    break_status: breakStatus,
    stimulation_risk: stimulationRisk,
    issues: issues.map((item) => ({
      id: item.id,
      type: item.type,
      severity: item.severity,
      title: item.title,
      description: item.description,
      affectedPlannerTaskIds: item.affectedPlannerTaskIds,
    })),
    suggested_changes: buildSuggestedChanges(issues, classifiedTasks, input.blockMinutes),
    source_hash: sourceHash(input),
  };
}

function resequence(tasks: DailyPlanTask[]): DailyPlanTask[] {
  return tasks.map((task, order) => ({ ...task, order }));
}

export function applyPlanQualitySuggestedChange(
  tasks: readonly DailyPlanTask[],
  change: PlanQualitySuggestedChange,
): DailyPlanTask[] {
  const next = tasks.map((task) => ({ ...task }));
  const patch = change.patch;
  if (patch.action === "add_break") {
    const insertAfter = patch.afterPlannerTaskId
      ? next.findIndex((task) => task.plannerTaskId === patch.afterPlannerTaskId)
      : next.length - 1;
    const insertAt = Math.max(0, insertAfter + 1);
    next.splice(insertAt, 0, {
      plannerTaskId: makeId("focus-break", `${change.id}-${insertAt}`),
      taskName: patch.title ?? "Recovery break",
      blocks: Math.max(1, patch.blocks ?? 1),
      order: insertAt,
    });
    return resequence(next);
  }
  if (patch.action === "reduce_scope") {
    return resequence(
      next.map((task) =>
        task.plannerTaskId === patch.plannerTaskId
          ? { ...task, blocks: Math.max(1, patch.targetBlocks ?? (task.blocks ?? 1) - 1) }
          : task,
      ),
    );
  }
  if (patch.action === "protect_deep_work" && patch.plannerTaskId) {
    const index = next.findIndex((task) => task.plannerTaskId === patch.plannerTaskId);
    if (index <= 0) return resequence(next);
    const [task] = next.splice(index, 1);
    if (task) next.unshift(task);
    return resequence(next);
  }
  if (patch.action === "move_task") {
    const index = next.findIndex((task) => task.plannerTaskId === patch.plannerTaskId);
    if (index < 0 || patch.targetOrder == null) return resequence(next);
    const [task] = next.splice(index, 1);
    if (!task) return resequence(next);
    next.splice(clamp(patch.targetOrder, 0, next.length), 0, task);
    return resequence(next);
  }
  return resequence(next);
}
