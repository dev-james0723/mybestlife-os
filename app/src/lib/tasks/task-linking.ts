/**
 * Cross-module task linking — the single place that connects a `tasks` row to
 * the rest of the Life OS (projects, goals, daily planner / calendar, habits,
 * ideas, knowledge).
 *
 * Wiring policy (mirrors migration 20270918000000):
 *   - task <-> goal / knowledge          → `brain_relations`
 *   - task <-> idea                      → `ideas.linked_task_ids` (idea owns the array)
 *   - task <-> habit                     → `habit_links` (target_kind = 'task')
 *   - task -> daily planner / calendar   → `daily_plans.tasks[].taskId` (+ task calendar cols)
 *
 * Pure builders (no I/O) feed the task list/board indicators; the async actions
 * perform the actual writes through existing repositories so there is no
 * parallel data layer.
 */
import type { DailyPlan, DailyPlanTask, Idea, Task } from "@/types/database";
import type { BrainRelationRow } from "@/types/brain";
import type { ConstellationNodeType } from "@/types/constellation";
import type { HabitLink } from "@/lib/habits/types";
import type { TaskLinkFlags } from "./task-filters";

import { dailyPlansRepository } from "@/lib/repositories/daily-plans";
import { tasksRepository } from "@/lib/repositories/tasks";
import { brainRelationsRepository } from "@/lib/brain/queries";
import { parseTaskLinkMetadata } from "./task-link-metadata";

export type { TaskLinkFlags };

/** Relation type used for the goal <-> task edge in `brain_relations`. */
export const GOAL_TASK_RELATION = "goal_task" as const;

/** Relation type used for a manually-created task <-> knowledge edge. */
export const TASK_KNOWLEDGE_RELATION = "explicit_link" as const;

const DEFAULT_PLAN_START = "06:00";
const DEFAULT_PLAN_END = "22:00";
const DEFAULT_TASK_BLOCKS = 3;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export type ProjectTaskProgress = {
  total: number;
  done: number;
  active: number;
  cancelled: number;
  /** done / (total - cancelled), rounded to a 0..100 integer. */
  completionPct: number;
};

/** Completion ratio for a set of tasks (e.g. a project's tasks). */
export function computeProjectTaskProgress(tasks: Task[]): ProjectTaskProgress {
  let done = 0;
  let cancelled = 0;
  let active = 0;
  for (const t of tasks) {
    if (t.status === "done") done += 1;
    else if (t.status === "cancelled") cancelled += 1;
    else active += 1;
  }
  const denom = tasks.length - cancelled;
  return {
    total: tasks.length,
    done,
    active,
    cancelled,
    completionPct: denom > 0 ? Math.round((done / denom) * 100) : 0,
  };
}

/** Every `tasks.id` referenced by a day plan (time-block + free lists). */
export function collectPlannerTaskIds(plans: DailyPlan[]): Set<string> {
  const ids = new Set<string>();
  for (const plan of plans) {
    for (const block of plan.tasks ?? []) {
      if (block.taskId) ids.add(block.taskId);
    }
    for (const free of plan.free_tasks ?? []) {
      if (free.taskId) ids.add(free.taskId);
    }
  }
  return ids;
}

/** Goal ids linked to a task via `brain_relations` (`goal_task`, either direction). */
export function goalIdsForTask(
  relations: BrainRelationRow[],
  taskId: string,
): string[] {
  const ids = new Set<string>();
  for (const r of relations) {
    if (r.relation_type !== GOAL_TASK_RELATION) continue;
    if (r.target_type === "task" && r.target_id === taskId) {
      if (r.source_type === "goal") ids.add(r.source_id);
    } else if (r.source_type === "task" && r.source_id === taskId) {
      if (r.target_type === "goal") ids.add(r.target_id);
    }
  }
  return [...ids];
}

/** Task ids linked to a goal — used for "related tasks" on the goal detail. */
export function taskIdsForGoal(
  relations: BrainRelationRow[],
  goalId: string,
): string[] {
  const ids = new Set<string>();
  for (const r of relations) {
    if (r.relation_type !== GOAL_TASK_RELATION) continue;
    if (r.source_type === "goal" && r.source_id === goalId) {
      if (r.target_type === "task") ids.add(r.target_id);
    } else if (r.target_type === "goal" && r.target_id === goalId) {
      if (r.source_type === "task") ids.add(r.source_id);
    }
  }
  return [...ids];
}

/** The `brain_relations` row id for a specific goal<->task edge (for unlinking). */
export function findGoalTaskRelationId(
  relations: BrainRelationRow[],
  taskId: string,
  goalId: string,
): string | null {
  for (const r of relations) {
    if (r.relation_type !== GOAL_TASK_RELATION) continue;
    const isGoal = r.source_id === goalId || r.target_id === goalId;
    const isTask = r.source_id === taskId || r.target_id === taskId;
    if (isGoal && isTask) return r.id;
  }
  return null;
}

function isVisibleRelation(relation: BrainRelationRow): boolean {
  return relation.status !== "hidden" && relation.status !== "dismissed";
}

/**
 * Entity ids connected to a task through a visible `brain_relations` edge.
 * Both edge directions are accepted because older graph writers did not use a
 * single canonical direction.
 */
export function linkedEntityIdsForTask(
  relations: BrainRelationRow[],
  taskId: string,
  entityType: ConstellationNodeType,
): string[] {
  const ids = new Set<string>();
  for (const relation of relations) {
    if (!isVisibleRelation(relation)) continue;
    if (
      relation.source_type === "task" &&
      relation.source_id === taskId &&
      relation.target_type === entityType
    ) {
      ids.add(relation.target_id);
    } else if (
      relation.target_type === "task" &&
      relation.target_id === taskId &&
      relation.source_type === entityType
    ) {
      ids.add(relation.source_id);
    }
  }
  return [...ids];
}

/** Every visible relation row joining one task and one concrete entity. */
export function findTaskEntityRelationIds(
  relations: BrainRelationRow[],
  taskId: string,
  entityType: ConstellationNodeType,
  entityId: string,
): string[] {
  return relations
    .filter((relation) => {
      if (!isVisibleRelation(relation)) return false;
      const forward =
        relation.source_type === "task" &&
        relation.source_id === taskId &&
        relation.target_type === entityType &&
        relation.target_id === entityId;
      const reverse =
        relation.target_type === "task" &&
        relation.target_id === taskId &&
        relation.source_type === entityType &&
        relation.source_id === entityId;
      return forward || reverse;
    })
    .map((relation) => relation.id);
}

type TaskReferenceFields = Pick<Task, "id" | "tags" | "description">;

/** Idea ids from the canonical idea arrays plus legacy task metadata. */
export function ideaIdsForTask(
  ideas: Idea[],
  task: TaskReferenceFields,
): string[] {
  const ids = new Set(
    parseTaskLinkMetadata(task.tags, task.description).ideaIds,
  );
  for (const idea of ideas) {
    if ((idea.linked_task_ids ?? []).includes(task.id)) ids.add(idea.id);
  }
  return [...ids];
}

/** Knowledge ids from graph edges plus legacy task metadata. */
export function knowledgeIdsForTask(
  relations: BrainRelationRow[],
  task: TaskReferenceFields,
): string[] {
  const ids = new Set(linkedEntityIdsForTask(relations, task.id, "knowledge"));
  for (const id of parseTaskLinkMetadata(task.tags, task.description)
    .knowledgeIds) {
    ids.add(id);
  }
  return [...ids];
}

/** Note links currently exist only as legacy task metadata. */
export function noteIdsForTask(task: TaskReferenceFields): string[] {
  return parseTaskLinkMetadata(task.tags, task.description).noteIds;
}

export type TaskLinkIndexInput = {
  tasks: Task[];
  dailyPlans?: DailyPlan[];
  brainRelations?: BrainRelationRow[];
  habitLinks?: HabitLink[];
  ideas?: Idea[];
};

/**
 * Build a `taskId -> TaskLinkFlags` lookup from every cross-module source. The
 * task list/board/detail views consume this through `TaskFilterContext`.
 */
export function buildTaskLinkIndex(
  input: TaskLinkIndexInput,
): Map<string, TaskLinkFlags> {
  const {
    tasks,
    dailyPlans = [],
    brainRelations = [],
    habitLinks = [],
    ideas = [],
  } = input;

  const plannerIds = collectPlannerTaskIds(dailyPlans);

  const habitTaskIds = new Set<string>();
  for (const link of habitLinks) {
    if (link.target_kind === "task") habitTaskIds.add(link.target_id);
  }

  const ideaTaskIds = new Set<string>();
  for (const idea of ideas) {
    for (const id of idea.linked_task_ids ?? []) ideaTaskIds.add(id);
  }

  const goalTaskIds = new Set<string>();
  for (const r of brainRelations) {
    if (r.relation_type !== GOAL_TASK_RELATION) continue;
    if (r.source_type === "task") goalTaskIds.add(r.source_id);
    if (r.target_type === "task") goalTaskIds.add(r.target_id);
  }

  const index = new Map<string, TaskLinkFlags>();
  for (const task of tasks) {
    const metadata = parseTaskLinkMetadata(task.tags, task.description);
    const flags: TaskLinkFlags = {
      planner: plannerIds.has(task.id),
      calendar: Boolean(task.calendar_event_id),
      goal: goalTaskIds.has(task.id),
      habit: habitTaskIds.has(task.id),
      idea: ideaTaskIds.has(task.id) || metadata.ideaIds.length > 0,
      knowledge:
        linkedEntityIdsForTask(brainRelations, task.id, "knowledge").length >
          0 || metadata.knowledgeIds.length > 0,
    };
    index.set(task.id, flags);
  }
  return index;
}

// ---------------------------------------------------------------------------
// Async actions (writes through existing repositories)
// ---------------------------------------------------------------------------

/** Create (or confirm) a goal <-> task link in `brain_relations`. */
export async function linkTaskToGoal(
  taskId: string,
  goalId: string,
): Promise<BrainRelationRow> {
  return brainRelationsRepository.upsert({
    source_id: goalId,
    source_type: "goal",
    target_id: taskId,
    target_type: "task",
    relation_type: GOAL_TASK_RELATION,
    status: "confirmed",
    is_manual: true,
  });
}

/** Create (or confirm) a task <-> knowledge link in `brain_relations`. */
export async function linkTaskToKnowledge(
  taskId: string,
  knowledgeId: string,
): Promise<BrainRelationRow> {
  return brainRelationsRepository.upsert({
    source_id: taskId,
    source_type: "task",
    target_id: knowledgeId,
    target_type: "knowledge",
    relation_type: TASK_KNOWLEDGE_RELATION,
    status: "confirmed",
    is_manual: true,
  });
}

/** Remove a `brain_relations` edge by row id. */
export async function unlinkRelation(relationId: string): Promise<void> {
  await brainRelationsRepository.delete(relationId);
}

export type AddToPlanResult = {
  plan: DailyPlan;
  /** The planner row id assigned to this task (for calendar linkage). */
  plannerTaskId: string | null;
  alreadyLinked: boolean;
};

/**
 * Add a task to a day's plan (time-block list), reusing the planner's
 * `taskId` linkage, and reflect the schedule back onto the task row
 * (`scheduled_date` + a local `calendar_event_id`) so the calendar projection
 * and the task indicators light up.
 */
export async function addTaskToDailyPlan(
  task: Pick<Task, "id" | "title" | "estimated_blocks">,
  planDate: string,
): Promise<AddToPlanResult> {
  const existing = await dailyPlansRepository.getByDate(planDate);

  const alreadyLinked =
    !!existing &&
    [...(existing.tasks ?? []), ...(existing.free_tasks ?? [])].some(
      (t) => t.taskId === task.id,
    );

  let plan = existing;
  if (!alreadyLinked) {
    const currentTasks = existing?.tasks ?? [];
    const nextTask: DailyPlanTask = {
      taskName: task.title,
      taskId: task.id,
      blocks: task.estimated_blocks ?? DEFAULT_TASK_BLOCKS,
      order: currentTasks.length,
    };
    plan = await dailyPlansRepository.upsertByDate({
      plan_date: planDate,
      start_time: existing?.start_time ?? DEFAULT_PLAN_START,
      end_time: existing?.end_time ?? DEFAULT_PLAN_END,
      tasks: [...currentTasks, nextTask],
    });
  }

  const plannerTaskId =
    plan?.tasks.find((t) => t.taskId === task.id)?.plannerTaskId ?? null;

  // Reflect onto the task row so the calendar + indicators recognise it.
  const calendarEventId = plan
    ? `planner-time:${plan.id}:${plannerTaskId ?? task.id}`
    : null;
  await tasksRepository.update(task.id, {
    scheduled_date: planDate,
    calendar_event_id: calendarEventId,
    calendar_provider: "local",
  });

  return {
    plan: plan as DailyPlan,
    plannerTaskId,
    alreadyLinked,
  };
}
