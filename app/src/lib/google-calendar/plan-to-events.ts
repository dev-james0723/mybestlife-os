import { addDays, format, parseISO } from "date-fns";
import type { DailyPlanTask, FreePlanTask } from "@/types/database";
import { MYLIFEOS_SYNC_PROP_KEY } from "./constants";

export type GoogleCalendarEventBody = {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  extendedProperties?: { private?: Record<string, string> };
};

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Resolves a wall-clock instant N minutes after `planDate` 00:00 (in `planDate`'s local day),
 * advancing the calendar date as the offset crosses each midnight. Used for cross-day plans
 * where Start = 11:00 PM and End = 4:00 AM should produce events on `planDate` AND `planDate + 1`.
 */
function minutesToWallClockIso(
  planDate: string,
  totalMinutesFromPlanMidnight: number,
): string {
  const dayOffset = Math.floor(totalMinutesFromPlanMidnight / (24 * 60));
  const wrap = ((totalMinutesFromPlanMidnight % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrap / 60);
  const m = wrap % 60;
  const adjusted = addDays(parseISO(planDate), dayOffset);
  const dateStr = format(adjusted, "yyyy-MM-dd");
  return `${dateStr}T${pad2(h)}:${pad2(m)}:00`;
}

/**
 * Maps the daily planner timeline (sequential blocks from `start_time`) to Google Calendar events.
 *
 * Tasks are placed cumulatively from the planner's Start Time. When the schedule extends past
 * midnight, individual events are emitted with the correct calendar date — no date wrapping.
 */
export function buildPlannerGoogleEvents(
  planDate: string,
  startTime: string,
  tasks: DailyPlanTask[],
  blockMinutes: number,
  timeZone: string,
  titlePrefix: string,
): GoogleCalendarEventBody[] {
  const startMin = parseTimeToMinutes(startTime);
  const propVal = planDate;

  const out: GoogleCalendarEventBody[] = [];
  let cum = 0;
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const blocks = t.blocks ?? 1;
    const name = (t.taskName ?? "").trim() || "Untitled";
    const durMin = blocks * blockMinutes;
    const taskStart = startMin + cum;
    const taskEnd = taskStart + durMin;
    cum += durMin;

    const startDt = minutesToWallClockIso(planDate, taskStart);
    const endDt = minutesToWallClockIso(planDate, taskEnd);

    out.push({
      summary: `${titlePrefix}: ${name}`,
      description: "Synced from My Best Life OS — Daily Planner.",
      start: { dateTime: startDt, timeZone },
      end: { dateTime: endDt, timeZone },
      extendedProperties: {
        private: { [MYLIFEOS_SYNC_PROP_KEY]: propVal },
      },
    });
  }
  return out;
}

const FREE_PRIORITY_HEADINGS: Record<FreePlanTask["priority"], string> = {
  must: "Must Do",
  should: "Should Do",
  could: "Could Do",
  done: "Done",
};

export interface FreePlanGoogleEventArgs {
  planDate: string;
  startTime: string;
  endTime: string;
  /** `1` when End Time wraps past midnight; passes through to event end-date. */
  endDayOffset: number;
  freeTasks: FreePlanTask[];
  timeZone: string;
  /** Localized event-title prefix, e.g. "Free Planning". */
  titlePrefix: string;
}

/**
 * Builds a SINGLE Google Calendar event for a Free Planning day.
 *
 * Free Planning tasks intentionally have no scheduled times — emitting one event per task
 * would invent fake slots. Instead we sync one event over the loose planning window with the
 * task list grouped by priority in the description.
 */
export function buildFreePlanGoogleEvent(
  args: FreePlanGoogleEventArgs,
): GoogleCalendarEventBody | null {
  if (args.freeTasks.length === 0) return null;
  const startMin = parseTimeToMinutes(args.startTime);
  const endMin = parseTimeToMinutes(args.endTime) + args.endDayOffset * 24 * 60;
  if (endMin <= startMin) return null;
  const startDt = minutesToWallClockIso(args.planDate, startMin);
  const endDt = minutesToWallClockIso(args.planDate, endMin);

  const grouped: Record<FreePlanTask["priority"], FreePlanTask[]> = {
    must: [],
    should: [],
    could: [],
    done: [],
  };
  for (const t of args.freeTasks) grouped[t.priority].push(t);
  const lines: string[] = [];
  for (const p of ["must", "should", "could", "done"] as const) {
    const items = grouped[p].sort((a, b) => a.order - b.order);
    if (items.length === 0) continue;
    lines.push(FREE_PRIORITY_HEADINGS[p]);
    for (const t of items) {
      const checkbox = p === "done" ? "[x]" : "[ ]";
      lines.push(`${checkbox} ${t.title}`);
    }
    lines.push("");
  }
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const description =
    lines.join("\n") +
    "\n\nSynced from My Best Life OS — Free Planning Mode.";

  return {
    summary: `${titlePrefix(args.titlePrefix)}: ${args.planDate}`,
    description,
    start: { dateTime: startDt, timeZone: args.timeZone },
    end: { dateTime: endDt, timeZone: args.timeZone },
    extendedProperties: {
      private: { [MYLIFEOS_SYNC_PROP_KEY]: args.planDate },
    },
  };
}

function titlePrefix(raw: string): string {
  // Trim any trailing colon from caller-supplied prefix to avoid `Foo:: 2026-05-08`.
  return raw.replace(/[:\s]+$/u, "");
}
