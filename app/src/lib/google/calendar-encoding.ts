import { addDays, format, parseISO } from "date-fns";
import type { calendar_v3 } from "googleapis";
import type { DailyPlanTask, FreePlanTask } from "@/types/database";
import { GOOGLE_SYNC_SOURCE } from "@/lib/google/calendar-types";
import {
  computeSequentialSchedule,
  minutesToWallClockHhMm,
  minutesToWallClockIso,
  parseTimeToMinutes,
  utcRangeToPlanMinutes,
  wallClockIsoRange,
} from "@/lib/daily-planner/plan-schedule-math";
import { zonedWallClockToUtc } from "@/lib/google-calendar/zoned-time";
import { plannerEventReminders } from "@/lib/google/calendar-reminders";

export type PlannerGoogleEventArgs = {
  planDate: string;
  planStartTime: string;
  planId: string;
  userId: string;
  timeZone: string;
  blockMinutes: number;
  /** Optional description lines from linked Tasks row, etc. */
  notes?: string | null;
};

export const GOOGLE_SYNC_VERSION = "2";

export function buildPlannerExtendedProperties(args: {
  mode: "time-block" | "free";
  planDate: string;
  planId: string;
  plannerTaskId: string;
  linkedTaskId?: string;
  userId: string;
}): Record<string, string> {
  return {
    source: GOOGLE_SYNC_SOURCE,
    sourceType: "daily_planner",
    mode: args.mode,
    planDate: args.planDate,
    plannerDate: args.planDate,
    planId: args.planId,
    taskId: args.plannerTaskId,
    plannerTaskId: args.plannerTaskId,
    linkedTaskId: args.linkedTaskId ?? "",
    userId: args.userId,
    version: GOOGLE_SYNC_VERSION,
  };
}

export function buildEventDescription(args: {
  plannerTaskId: string;
  planDate: string;
  notes?: string | null;
}): string {
  const lines = [
    "Created from My Best Life OS Daily Planner",
    "",
    `Local planner task ID: ${args.plannerTaskId}`,
    `Planner date: ${args.planDate}`,
  ];
  if (args.notes?.trim()) {
    lines.push("", args.notes.trim());
  }
  return lines.join("\n");
}

/** Product naming alias for {@link dailyPlanTaskToGoogleEvent}. */
export function taskToGoogleCalendarEvent(
  task: DailyPlanTask,
  slot: { startMinFromPlanMidnight: number; endMinFromPlanMidnight: number },
  base: PlannerGoogleEventArgs,
): calendar_v3.Schema$Event {
  return dailyPlanTaskToGoogleEvent(task, slot, base);
}

export function dailyPlanTaskToGoogleEvent(
  task: DailyPlanTask,
  slot: { startMinFromPlanMidnight: number; endMinFromPlanMidnight: number },
  base: PlannerGoogleEventArgs,
): calendar_v3.Schema$Event {
  const plannerTaskId = task.plannerTaskId?.trim();
  if (!plannerTaskId) {
    throw new Error("dailyPlanTaskToGoogleEvent: missing plannerTaskId");
  }
  const { start, end } = wallClockIsoRange(
    base.planDate,
    slot.startMinFromPlanMidnight,
    slot.endMinFromPlanMidnight,
  );
  const title = (task.taskName ?? "").trim() || "Untitled";
  return {
    summary: title,
    description: buildEventDescription({
      plannerTaskId,
      planDate: base.planDate,
      notes: base.notes ?? null,
    }),
    start: { dateTime: start, timeZone: base.timeZone },
    end: { dateTime: end, timeZone: base.timeZone },
    reminders: plannerEventReminders(),
    extendedProperties: {
      private: buildPlannerExtendedProperties({
        mode: "time-block",
        planDate: base.planDate,
        planId: base.planId,
        plannerTaskId,
        linkedTaskId: task.taskId,
        userId: base.userId,
      }),
    },
  };
}

export function freePlanTaskToGoogleEvent(
  task: FreePlanTask,
  base: Pick<PlannerGoogleEventArgs, "planDate" | "planId" | "userId" | "timeZone">,
): calendar_v3.Schema$Event {
  const plannerTaskId = task.id.trim();
  const endDate = format(addDays(parseISO(base.planDate), 1), "yyyy-MM-dd");
  const descLines = [
    "Created from My Best Life OS Daily Planner",
    "mode: Free Plan",
    `plan date: ${base.planDate}`,
    `planner task ID: ${plannerTaskId}`,
  ];
  if (task.notes?.trim()) descLines.push("", task.notes.trim());
  return {
    summary: task.title.trim() || "Untitled",
    description: descLines.join("\n"),
    start: { date: base.planDate },
    end: { date: endDate },
    extendedProperties: {
      private: buildPlannerExtendedProperties({
        mode: "free",
        planDate: base.planDate,
        planId: base.planId,
        plannerTaskId,
        linkedTaskId: task.taskId,
        userId: base.userId,
      }),
    },
  };
}

export function buildEventsForTimeBlockPlan(
  tasks: DailyPlanTask[],
  base: PlannerGoogleEventArgs,
): { plannerTaskId: string; event: calendar_v3.Schema$Event; slot: { start: number; end: number } }[] {
  const schedule = computeSequentialSchedule(
    base.planDate,
    base.planStartTime,
    tasks,
    base.blockMinutes,
  );
  return schedule
    .map((row) => {
      const id = row.task.plannerTaskId?.trim();
      if (!id) return null;
      const event = dailyPlanTaskToGoogleEvent(
        row.task,
        {
          startMinFromPlanMidnight: row.startMinFromPlanMidnight,
          endMinFromPlanMidnight: row.endMinFromPlanMidnight,
        },
        base,
      );
      return {
        plannerTaskId: id,
        event,
        slot: {
          start: row.startMinFromPlanMidnight,
          end: row.endMinFromPlanMidnight,
        },
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

function parseGoogleDateTimeValue(value: string, timeZone?: string | null): Date | null {
  const naive = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
    value,
  );
  if (naive && timeZone) {
    const [, date, hours, minutes, seconds = "0", milliseconds = "0"] = naive;
    const instant = zonedWallClockToUtc(date, Number(hours), Number(minutes), timeZone);
    instant.setUTCSeconds(Number(seconds), Number(milliseconds.padEnd(3, "0")));
    return instant;
  }

  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

function parseGoogleDateTime(
  ev: calendar_v3.Schema$Event,
): { start: Date; end: Date } | null {
  const s = ev.start;
  const e = ev.end;
  if (!s || !e) return null;
  if (s.date && e.date) {
    const start = new Date(`${s.date}T00:00:00.000Z`);
    const end = new Date(`${e.date}T00:00:00.000Z`);
    return { start, end };
  }
  if (s.dateTime && e.dateTime) {
    const start = parseGoogleDateTimeValue(s.dateTime, s.timeZone);
    const end = parseGoogleDateTimeValue(e.dateTime, e.timeZone ?? s.timeZone);
    if (!start || !end) return null;
    return { start, end };
  }
  return null;
}

export type GoogleEventPlannerPatch = {
  taskName?: string;
  blocks?: number;
  gapBlocks?: number;
  start_time?: string;
  end_time?: string;
  googleDurationRounded?: boolean;
};

export function plannerTaskMatchesGooglePatch(
  task: DailyPlanTask,
  patch: GoogleEventPlannerPatch,
): boolean {
  if (patch.taskName != null && (task.taskName ?? "").trim() !== String(patch.taskName).trim()) {
    return false;
  }
  if (patch.blocks != null && (task.blocks ?? 1) !== patch.blocks) return false;
  if (patch.gapBlocks != null && (task.gapBlocks ?? 0) !== patch.gapBlocks) return false;
  if (patch.start_time != null && task.start_time !== patch.start_time) return false;
  if (patch.end_time != null && task.end_time !== patch.end_time) return false;
  return true;
}

/**
 * Maps a Google Calendar timed event back onto planner JSON fields.
 * Caller supplies `planStartMin` = parseTimeToMinutes(plan.start_time) and blockMinutes.
 */
export function googleTimedEventToPlannerPatch(
  ev: calendar_v3.Schema$Event,
  args: {
    planDate: string;
    timeZone: string;
    planStartMin: number;
    blockMinutes: number;
    /** Minutes on planner timeline for the end of the previous task (same origin as utcRangeToPlanMinutes). */
    previousEndMin: number;
  },
): GoogleEventPlannerPatch {
  const range = parseGoogleDateTime(ev);
  if (!range) {
    return {};
  }
  const { startMin, endMin } = utcRangeToPlanMinutes(
    args.planDate,
    range.start,
    range.end,
    args.timeZone,
  );
  const durationMin = Math.max(0, endMin - startMin);
  const rawBlocks = durationMin / args.blockMinutes;
  const blocks = Math.max(1, Math.round(rawBlocks));
  const googleDurationRounded = Math.abs(rawBlocks - blocks) > 1e-6;
  const gapMin = Math.max(0, startMin - args.previousEndMin);
  const gapBlocks = Math.round(gapMin / args.blockMinutes);
  return {
    taskName: ev.summary?.trim() || undefined,
    blocks,
    gapBlocks: Number.isFinite(gapBlocks) ? gapBlocks : 0,
    start_time: minutesToWallClockHhMm(startMin),
    end_time: minutesToWallClockHhMm(endMin),
    googleDurationRounded,
  };
}

export type FreePlanGooglePatch = {
  title?: string;
  notes?: string;
};

export function googleFreePlanEventToPatch(ev: calendar_v3.Schema$Event): FreePlanGooglePatch {
  const title = ev.summary?.trim();
  const raw = ev.description?.trim() ?? "";
  const marker = "Created from My Best Life OS Daily Planner";
  const idx = raw.indexOf(marker);
  let notes: string | undefined;
  if (idx >= 0) {
    const afterMeta = raw.slice(idx + marker.length).replace(/^\s*\n+/, "");
    const trimmed = afterMeta.trim();
    notes = trimmed.length > 0 ? trimmed : undefined;
  } else if (raw.length > 0) {
    notes = raw;
  }
  return {
    ...(title ? { title } : {}),
    ...(notes !== undefined ? { notes } : {}),
  };
}

export function freePlanTaskMatchesGooglePatch(
  task: FreePlanTask,
  patch: FreePlanGooglePatch,
): boolean {
  if (patch.title != null && task.title.trim() !== patch.title.trim()) return false;
  const localNotes = task.notes?.trim() ?? "";
  const remoteNotes = patch.notes?.trim() ?? "";
  if (patch.notes !== undefined && localNotes !== remoteNotes) return false;
  return true;
}

/** Alias for {@link googleTimedEventToPlannerPatch} — matches product naming. */
export function googleCalendarEventToTaskPatch(
  ev: calendar_v3.Schema$Event,
  args: Parameters<typeof googleTimedEventToPlannerPatch>[1],
): GoogleEventPlannerPatch {
  return googleTimedEventToPlannerPatch(ev, args);
}

export function isOurPlannerGoogleEvent(ev: calendar_v3.Schema$Event): boolean {
  const priv = ev.extendedProperties?.private ?? {};
  return priv.source === GOOGLE_SYNC_SOURCE && typeof priv.taskId === "string" && !!priv.taskId;
}

export function getPlannerTaskIdFromGoogleEvent(ev: calendar_v3.Schema$Event): string | null {
  const priv = ev.extendedProperties?.private ?? {};
  if (priv.source !== GOOGLE_SYNC_SOURCE) return null;
  const id =
    (typeof priv.plannerTaskId === "string" && priv.plannerTaskId.trim()) ||
    (typeof priv.taskId === "string" && priv.taskId.trim()) ||
    "";
  return id || null;
}

export function getPlannerModeFromGoogleEvent(
  ev: calendar_v3.Schema$Event,
): "time-block" | "free" | null {
  const priv = ev.extendedProperties?.private ?? {};
  if (priv.source !== GOOGLE_SYNC_SOURCE) return null;
  if (priv.mode === "free" || priv.mode === "time-block") return priv.mode;
  if (ev.start?.date && !ev.start?.dateTime) return "free";
  return "time-block";
}

export function getPlannerDateFromGoogleEvent(ev: calendar_v3.Schema$Event): string | null {
  const priv = ev.extendedProperties?.private ?? {};
  const d = priv.plannerDate;
  return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

/** Calendar date (YYYY-MM-DD) for an instant in a specific IANA timezone. */
export function resolvePlannerDateFromDateTime(isoUtc: string, timeZone: string): string {
  const d = new Date(isoUtc);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Prefer the event's real start date in the user's timezone (handles moves in Google).
 * Falls back to extendedProperties.private.plannerDate for legacy / all-day payloads.
 */
export function resolvePlannerDateFromGoogleEvent(
  ev: calendar_v3.Schema$Event,
  timeZone: string,
): string | null {
  if (ev.start?.dateTime) {
    return resolvePlannerDateFromDateTime(ev.start.dateTime, timeZone);
  }
  if (ev.start?.date) {
    const d = ev.start.date;
    return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  }
  return getPlannerDateFromGoogleEvent(ev);
}

/** @deprecated Use computeSequentialSchedule + dailyPlanTaskToGoogleEvent */
export function legacyMinutesToWallClockIso(
  planDate: string,
  totalMinutesFromPlanMidnight: number,
): string {
  return minutesToWallClockIso(planDate, totalMinutesFromPlanMidnight);
}

export { parseTimeToMinutes };

export function calculateTimeBlocksFromDateRange(
  start: Date,
  end: Date,
  blockSizeMinutes: number,
): { blocks: number; rounded: boolean } {
  const ms = end.getTime() - start.getTime();
  const mins = Math.max(0, Math.round(ms / 60_000));
  const raw = mins / blockSizeMinutes;
  const blocks = Math.max(1, Math.round(raw));
  return { blocks, rounded: Math.abs(raw - blocks) > 1e-6 };
}

export function normalizeCrossDayTaskTimes(
  startMin: number,
  endMin: number,
): { startMin: number; endMin: number } {
  const s = startMin;
  let e = endMin;
  if (e <= s) {
    e += 24 * 60;
  }
  return { startMin: s, endMin: e };
}
