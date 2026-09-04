import type { DailyPlanTask } from "@/types/database";
import {
  minutesToWallClockHhMm,
  parseTimeToMinutes,
} from "./plan-schedule-math";

export type TimeBlockSequenceOptions = {
  planStartTime: string;
  blockMinutes: number;
};

/** Immutable remove-then-insert movement shared by UI and schedule tests. */
export function moveTimeBlockTask<T extends DailyPlanTask>(
  tasks: ReadonlyArray<T>,
  fromIndex: number,
  toIndex: number,
): T[] {
  const reordered = [...tasks];
  const validFrom = fromIndex >= 0 && fromIndex < reordered.length;
  const validTo = toIndex >= 0 && toIndex < reordered.length;

  if (validFrom && validTo && fromIndex !== toIndex) {
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
  }

  return reordered;
}

/**
 * Rebuilds a time-block list in its current array order.
 *
 * A task's `gapBlocks` remain the gap immediately before that task, while
 * `blocks` remains its duration. If the plan already contains exact calendar
 * slots, those slots are rebuilt so timeline/calendar consumers cannot restore
 * the pre-drag order. A derived-only plan stays derived-only.
 */
export function resequenceTimeBlockTasks(
  tasks: ReadonlyArray<DailyPlanTask>,
  options: TimeBlockSequenceOptions,
): DailyPlanTask[] {
  const { planStartTime, blockMinutes } = options;
  const hasExactSchedule = tasks.some(
    (task) =>
      typeof task.start_time === "string" &&
      task.start_time.length > 0 &&
      typeof task.end_time === "string" &&
      task.end_time.length > 0,
  );

  // Ordinary planner rows are derived from order + blocks. Keep them derived
  // so a later duration/edit cannot leave newly-created exact slots stale.
  if (!hasExactSchedule) {
    return tasks.map((task, order) => ({ ...task, order }));
  }

  let cursor = parseTimeToMinutes(planStartTime);

  return tasks.map((task, order) => {
    cursor += (task.gapBlocks ?? 0) * blockMinutes;
    const start = cursor;
    cursor += (task.blocks ?? 1) * blockMinutes;

    return {
      ...task,
      order,
      start_time: minutesToWallClockHhMm(start),
      end_time: minutesToWallClockHhMm(cursor),
    };
  });
}

/**
 * Applies the same remove-then-insert semantics as a sortable list, then
 * atomically rebuilds order and exact time fields.
 */
export function moveAndResequenceTimeBlockTasks(
  tasks: ReadonlyArray<DailyPlanTask>,
  fromIndex: number,
  toIndex: number,
  options: TimeBlockSequenceOptions,
): DailyPlanTask[] {
  return resequenceTimeBlockTasks(moveTimeBlockTask(tasks, fromIndex, toIndex), options);
}
