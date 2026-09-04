import type { DailyPlanTask } from "@/types/database";

export type ScheduleImageRequestKeyInput = {
  planDate: string;
  startTime: string;
  endTime: string;
  styleId: string;
  blockMinutes: number;
  tasks: ReadonlyArray<DailyPlanTask>;
};

/** Fingerprints every schedule input whose change makes an in-flight image stale. */
export function scheduleImageRequestKey({
  planDate,
  startTime,
  endTime,
  styleId,
  blockMinutes,
  tasks,
}: ScheduleImageRequestKeyInput): string {
  return JSON.stringify({
    planDate,
    startTime,
    endTime,
    styleId,
    blockMinutes,
    tasks: tasks.map((task) => ({
      plannerTaskId: task.plannerTaskId,
      taskId: task.taskId,
      taskName: task.taskName ?? "",
      blocks: task.blocks ?? 1,
      gapBlocks: task.gapBlocks ?? 0,
      order: task.order,
      startTime: task.start_time,
      endTime: task.end_time,
    })),
  });
}
