import { addDays, format, parseISO } from "date-fns";
import type { DailyPlanTask } from "@/types/database";
import { zonedWallClockToUtc } from "@/lib/google-calendar/zoned-time";

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Formats minutes-from-midnight as HH:mm (may exceed 24:00 for cross-midnight display). */
export function minutesToWallClockHhMm(totalMinutes: number): string {
  const wrap = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrap / 60);
  const m = wrap % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function taskHasExactSchedule(task: DailyPlanTask): boolean {
  return (
    typeof task.start_time === "string" &&
    task.start_time.length > 0 &&
    typeof task.end_time === "string" &&
    task.end_time.length > 0
  );
}

export function resolvePlanRange(startTime: string, endTime: string): {
  startMin: number;
  endMin: number;
  durationMin: number;
  endDayOffset: number;
} {
  const startMin = parseTimeToMinutes(startTime);
  let endMin = parseTimeToMinutes(endTime);
  let endDayOffset = 0;
  if (endMin <= startMin) {
    endMin += 24 * 60;
    endDayOffset = 1;
  }
  return { startMin, endMin, durationMin: endMin - startMin, endDayOffset };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Wall-clock instant as ISO local string (no offset) for Google Calendar `dateTime` + `timeZone`.
 * `totalMinutesFromPlanMidnight` may exceed 24h — day advances automatically.
 */
export function minutesToWallClock(
  planDate: string,
  totalMinutesFromPlanMidnight: number,
): { date: string; time: string } {
  const dayOffset = Math.floor(totalMinutesFromPlanMidnight / (24 * 60));
  const wrap = ((totalMinutesFromPlanMidnight % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrap / 60);
  const m = wrap % 60;
  const adjusted = addDays(parseISO(planDate), dayOffset);
  return {
    date: format(adjusted, "yyyy-MM-dd"),
    time: `${pad2(h)}:${pad2(m)}`,
  };
}

export function minutesToWallClockIso(
  planDate: string,
  totalMinutesFromPlanMidnight: number,
): string {
  const { date, time } = minutesToWallClock(planDate, totalMinutesFromPlanMidnight);
  return `${date}T${time}:00`;
}

export type ScheduledPlannerTask = {
  task: DailyPlanTask;
  index: number;
  /** Minutes from plan_date 00:00 along the planner timeline (may exceed 1440). */
  startMinFromPlanMidnight: number;
  endMinFromPlanMidnight: number;
};

/**
 * Sequential Time Block layout: optional gap blocks before each task, then contiguous blocks.
 */
export function computeSequentialSchedule(
  planDate: string,
  planStartTime: string,
  tasks: DailyPlanTask[],
  blockMinutes: number,
): ScheduledPlannerTask[] {
  const startMin = parseTimeToMinutes(planStartTime);
  const allExact = tasks.length > 0 && tasks.every(taskHasExactSchedule);
  const sorted = [...tasks].sort((a, b) => {
    if (allExact) {
      return parseTimeToMinutes(a.start_time!) - parseTimeToMinutes(b.start_time!);
    }
    return (a.order ?? 0) - (b.order ?? 0);
  });

  if (allExact) {
    return sorted.map((t, index) => {
      const taskStart = parseTimeToMinutes(t.start_time!);
      let taskEnd = parseTimeToMinutes(t.end_time!);
      if (taskEnd <= taskStart) taskEnd += 24 * 60;
      return {
        task: t,
        index,
        startMinFromPlanMidnight: taskStart,
        endMinFromPlanMidnight: taskEnd,
      };
    });
  }

  let cum = 0;
  const out: ScheduledPlannerTask[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (taskHasExactSchedule(t)) {
      const taskStart = parseTimeToMinutes(t.start_time!);
      let taskEnd = parseTimeToMinutes(t.end_time!);
      if (taskEnd <= taskStart) taskEnd += 24 * 60;
      out.push({
        task: t,
        index: i,
        startMinFromPlanMidnight: taskStart,
        endMinFromPlanMidnight: taskEnd,
      });
      cum = taskEnd - startMin;
      continue;
    }
    const gap = (t.gapBlocks ?? 0) * blockMinutes;
    cum += gap;
    const blocks = t.blocks ?? 1;
    const dur = blocks * blockMinutes;
    const taskStart = startMin + cum;
    const taskEnd = taskStart + dur;
    cum += dur;
    out.push({
      task: t,
      index: i,
      startMinFromPlanMidnight: taskStart,
      endMinFromPlanMidnight: taskEnd,
    });
  }
  return out;
}

export function wallClockIsoRange(
  planDate: string,
  startMinFromPlanMidnight: number,
  endMinFromPlanMidnight: number,
): { start: string; end: string } {
  return {
    start: minutesToWallClockIso(planDate, startMinFromPlanMidnight),
    end: minutesToWallClockIso(planDate, endMinFromPlanMidnight),
  };
}

/**
 * Converts absolute instants (UTC) into minutes on the same linear planner timeline as
 * {@link minutesToWallClockIso} (origin = plan_date 00:00 in `timeZone`).
 */
export function utcRangeToPlanMinutes(
  planDate: string,
  startUtc: Date,
  endUtc: Date,
  timeZone: string,
): { startMin: number; endMin: number } {
  const origin = zonedWallClockToUtc(planDate, 0, 0, timeZone).getTime();
  const startMin = Math.round((startUtc.getTime() - origin) / 60_000);
  const endMin = Math.round((endUtc.getTime() - origin) / 60_000);
  return { startMin, endMin };
}
