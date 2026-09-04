import type {
  AutoPlanBusyWindow,
  AutoPlanCandidateTask,
  AutoPlanLockedTask,
  AutoPlanPriority,
  AutoPlanSchedule,
} from "@/lib/daily-planner/auto-plan-scheduler";
import type { DailyPlanTask, FreePlanTask, Task } from "@/types/database";

const DEFAULT_AUTO_PLAN_DURATION_MINUTES = 30;

export type AutoPlanCandidateSource = "free" | "timed";

function positiveMinutes(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function taskPriorityToAutoPlan(priority: Task["priority"] | undefined): AutoPlanPriority {
  if (priority === "urgent" || priority === "high") return "must";
  if (priority === "low") return "could";
  return "should";
}

export function selectAutoPlanCandidates(args: {
  freeTasks: readonly FreePlanTask[];
  timedTasks: readonly DailyPlanTask[];
  linkedTasks: readonly Task[];
  blockMinutes: number;
}): { source: AutoPlanCandidateSource; candidates: AutoPlanCandidateTask[] } {
  const safeBlockMinutes = positiveMinutes(args.blockMinutes, 10);
  const linkedById = new Map(args.linkedTasks.map((task) => [task.id, task]));
  const unfinishedFreeTasks = args.freeTasks.filter(
    (
      task,
    ): task is FreePlanTask & {
      priority: Exclude<FreePlanTask["priority"], "done">;
    } => task.priority !== "done",
  );

  if (unfinishedFreeTasks.length > 0) {
    return {
      source: "free",
      candidates: unfinishedFreeTasks.map((task) => {
        const linked = task.taskId ? linkedById.get(task.taskId) : undefined;
        const linkedDuration = linked?.estimated_blocks
          ? linked.estimated_blocks * safeBlockMinutes
          : DEFAULT_AUTO_PLAN_DURATION_MINUTES;
        return {
          id: task.id,
          title: task.title,
          durationMinutes: positiveMinutes(task.estimatedMinutes, linkedDuration),
          priority: task.priority,
          order: task.order,
          ...(task.taskId ? { taskId: task.taskId } : {}),
        };
      }),
    };
  }

  return {
    source: "timed",
    candidates: args.timedTasks.map((task, index) => {
      const linked = task.taskId ? linkedById.get(task.taskId) : undefined;
      const order = typeof task.order === "number" ? task.order : index;
      return {
        id: task.plannerTaskId ?? `auto-timed-${task.taskId ?? index}-${order}`,
        title: task.taskName?.trim() || linked?.title || "Untitled task",
        durationMinutes:
          positiveMinutes(task.blocks, 1) * safeBlockMinutes,
        priority: taskPriorityToAutoPlan(linked?.priority),
        order,
        ...(task.taskId ? { taskId: task.taskId } : {}),
      };
    }),
  };
}

/**
 * Auto Plan normally keeps Free Plan as its durable, untimed candidate pool.
 * When a day only has Time Block rows, materialize every timed candidate into
 * that pool before accepting so tasks that did not fit are not discarded.
 */
export function materializeAutoPlanCandidatePool(args: {
  source: AutoPlanCandidateSource;
  existingFreeTasks: readonly FreePlanTask[];
  candidates: readonly AutoPlanCandidateTask[];
}): FreePlanTask[] {
  if (args.source === "free") return [...args.existingFreeTasks];

  const candidateIds = new Set(args.candidates.map((candidate) => candidate.id));
  const retained = args.existingFreeTasks.filter((task) => !candidateIds.has(task.id));
  const nextOrder: Record<AutoPlanPriority, number> = {
    must: 0,
    should: 0,
    could: 0,
  };
  for (const task of retained) {
    if (task.priority === "done") continue;
    nextOrder[task.priority] = Math.max(nextOrder[task.priority], task.order + 1);
  }

  const materialized = [...args.candidates]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((candidate): FreePlanTask => ({
      id: candidate.id,
      title: candidate.title,
      priority: candidate.priority,
      order: nextOrder[candidate.priority]++,
      ...(candidate.taskId ? { taskId: candidate.taskId } : {}),
      estimatedMinutes: candidate.durationMinutes,
    }));

  return [...retained, ...materialized];
}

function parseClock(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function planRange(startTime: string, endTime: string) {
  const start = parseClock(startTime);
  let end = parseClock(endTime);
  const crossesMidnight = end <= start;
  if (crossesMidnight) end += 1440;
  return { start, end, crossesMidnight };
}

function slotOffsets(startTime: string, endTime: string, planStart: string, planEnd: string) {
  const range = planRange(planStart, planEnd);
  const startClock = parseClock(startTime);
  const endClock = parseClock(endTime);
  const startDayOffset = range.crossesMidnight && startClock < range.start ? 1 : 0;
  const endDayOffset = startDayOffset + (endClock <= startClock ? 1 : 0);
  return {
    startClock,
    endClock,
    startDayOffset,
    endDayOffset,
    startMinute: startClock + startDayOffset * 1440,
    endMinute: endClock + endDayOffset * 1440,
  };
}

function planMinuteToLocalDateTime(planDate: string, minute: number): string {
  const base = new Date(`${planDate}T00:00:00.000Z`);
  if (!Number.isFinite(base.getTime())) throw new RangeError("planDate must use YYYY-MM-DD");
  base.setUTCMinutes(base.getUTCMinutes() + minute);
  return base.toISOString().slice(0, 16);
}

export function calendarBusyMinutesToSchedulerWindows(
  planDate: string,
  busy: ReadonlyArray<{ startMin: number; endMin: number }>,
): AutoPlanBusyWindow[] {
  return busy
    .filter(
      (window) =>
        Number.isFinite(window.startMin) &&
        Number.isFinite(window.endMin) &&
        window.endMin > window.startMin,
    )
    .map((window) => ({
      start: planMinuteToLocalDateTime(planDate, window.startMin),
      end: planMinuteToLocalDateTime(planDate, window.endMin),
    }));
}

export function scheduledTasksToDailyPlanTasks(
  schedule: AutoPlanSchedule,
  planStartTime: string,
  blockMinutes: number,
): DailyPlanTask[] {
  const safeBlockMinutes = positiveMinutes(blockMinutes, 10);
  let previousEnd = parseClock(planStartTime);

  return schedule.scheduledTasks.map((task, index) => {
    const startMinute = parseClock(task.startTime) + task.startDayOffset * 1440;
    const endMinute = parseClock(task.endTime) + task.endDayOffset * 1440;
    const gapMinutes = Math.max(0, startMinute - previousEnd);
    previousEnd = endMinute;

    return {
      plannerTaskId: task.id,
      scheduleSource: "adaptive",
      locked: task.locked,
      taskName: task.title,
      ...(task.taskId ? { taskId: task.taskId } : {}),
      blocks: Math.max(1, Math.ceil(task.durationMinutes / safeBlockMinutes)),
      order: index,
      gapBlocks: Math.max(0, Math.round(gapMinutes / safeBlockMinutes)),
      start_time: task.startTime,
      end_time: task.endTime,
    };
  });
}

export function dailyPlanTasksToLockedTasks(
  tasks: readonly DailyPlanTask[],
  planDate: string,
  planStartTime: string,
  planEndTime: string,
): AutoPlanLockedTask[] {
  return tasks.flatMap((task) => {
    if (!task.locked || !task.plannerTaskId || !task.start_time || !task.end_time) return [];
    const slot = slotOffsets(
      task.start_time,
      task.end_time,
      planStartTime,
      planEndTime,
    );
    return [
      {
        id: task.plannerTaskId,
        title: task.taskName?.trim() || "Untitled task",
        start: planMinuteToLocalDateTime(planDate, slot.startMinute),
        end: planMinuteToLocalDateTime(planDate, slot.endMinute),
        ...(task.taskId ? { taskId: task.taskId } : {}),
      },
    ];
  });
}

export function reconstructAcceptedAutoPlanSchedule(args: {
  tasks: readonly DailyPlanTask[];
  candidates: readonly AutoPlanCandidateTask[];
  startTime: string;
  endTime: string;
  blockMinutes: number;
}): AutoPlanSchedule {
  const range = planRange(args.startTime, args.endTime);
  const safeBlockMinutes = positiveMinutes(args.blockMinutes, 10);
  const candidateById = new Map(args.candidates.map((candidate) => [candidate.id, candidate]));
  const scheduledTasks = [...args.tasks]
    .filter(
      (task) =>
        task.scheduleSource === "adaptive" &&
        Boolean(task.plannerTaskId && task.start_time && task.end_time),
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((task, index) => {
      const candidate = candidateById.get(task.plannerTaskId!);
      const slot = slotOffsets(
        task.start_time!,
        task.end_time!,
        args.startTime,
        args.endTime,
      );
      const exactDuration = slot.endMinute - slot.startMinute;
      return {
        id: task.plannerTaskId!,
        title: task.taskName?.trim() || candidate?.title || "Untitled task",
        ...(task.taskId ? { taskId: task.taskId } : {}),
        priority: candidate?.priority ?? ("should" as const),
        order: task.order ?? index,
        requestedDurationMinutes: candidate?.durationMinutes,
        durationMinutes:
          exactDuration > 0
            ? exactDuration
            : positiveMinutes(task.blocks, 1) * safeBlockMinutes,
        startTime: task.start_time!,
        endTime: task.end_time!,
        startDayOffset: slot.startDayOffset,
        endDayOffset: slot.endDayOffset,
        locked: task.locked === true,
      };
    });
  const plannedMinutes = scheduledTasks.reduce(
    (total, task) => total + task.durationMinutes,
    0,
  );
  const availableMinutes = range.end - range.start;
  const scheduledIds = new Set(scheduledTasks.map((task) => task.id));

  return {
    scheduledTasks,
    unscheduledTasks: args.candidates
      .filter((candidate) => !scheduledIds.has(candidate.id))
      .map((candidate) => ({
        ...candidate,
        reason: "insufficient-contiguous-time" as const,
      })),
    availableMinutes,
    plannedMinutes,
    reservedBufferMinutes: 0,
    remainingMinutes: Math.max(0, availableMinutes - plannedMinutes),
  };
}
