import type { Habit, HabitCompletion, StreakFreeze } from "./types";
import { calendarDayFromInstant, eachIsoDayInclusive } from "./calendar-iso";
import { completionIntensity, isSuccessfulCompletion } from "./completion-success";
import { isRequiredDay } from "./streak-requirements";

export type HeatmapCellStatus =
  | "done"
  | "skipped"
  | "missed"
  | "future"
  | "frozen";

export type HeatmapCell = {
  date: string;
  status: HeatmapCellStatus;
  intensity: number;
  label: string;
};

export type HeatmapInput = {
  completions: readonly HabitCompletion[];
  freezes: readonly StreakFreeze[];
  fromDay: string;
  toDay: string;
  /** User's "today" in the same calendar basis as `fromDay` / `toDay`. */
  todayDay: string;
  timeZone: string;
  habit: Pick<Habit, "type" | "target_value" | "frequency" | "created_at">;
};

const STATUS_RANK: Record<HeatmapCellStatus, number> = {
  frozen: 5,
  done: 4,
  skipped: 3,
  missed: 2,
  future: 1,
};

function pickRicherStatus(
  a: HeatmapCellStatus,
  b: HeatmapCellStatus,
): HeatmapCellStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

function cellForDay(
  day: string,
  input: HeatmapInput,
  byDate: Map<string, HabitCompletion>,
  freeze: Set<string>,
): HeatmapCell {
  const { habit, todayDay } = input;
  const habitStart = calendarDayFromInstant(habit.created_at, input.timeZone);
  const c = byDate.get(day);
  const int = completionIntensity(habit, c);

  if (day > todayDay) {
    return { date: day, status: "future", intensity: 0, label: "Future" };
  }
  if (freeze.has(day)) {
    return { date: day, status: "frozen", intensity: 0, label: "Freeze" };
  }

  if (!isRequiredDay(habit.frequency, day, habitStart)) {
    return {
      date: day,
      status: "future",
      intensity: 0,
      label: "Off day",
    };
  }

  if (c?.status === "skipped") {
    return { date: day, status: "skipped", intensity: 0, label: "Skipped" };
  }
  if (day === todayDay && !c) {
    return { date: day, status: "future", intensity: 0, label: "Pending" };
  }
  if (isSuccessfulCompletion(habit, c)) {
    return { date: day, status: "done", intensity: int, label: "Done" };
  }
  return { date: day, status: "missed", intensity: 0, label: "Missed" };
}

export function deriveHeatmap(input: HeatmapInput): HeatmapCell[] {
  const byDate = new Map<string, HabitCompletion>();
  for (const c of input.completions) {
    const ex = byDate.get(c.completion_date);
    if (!ex || ex.completed_at < c.completed_at) byDate.set(c.completion_date, c);
  }
  const freeze = new Set(input.freezes.map((f) => f.freeze_date));

  return eachIsoDayInclusive(input.fromDay, input.toDay).map((day) =>
    cellForDay(day, input, byDate, freeze),
  );
}

export function deriveCompositeHeatmap(
  inputs: readonly HeatmapInput[],
): HeatmapCell[] {
  if (inputs.length === 0) return [];
  const per = inputs.map((i) => deriveHeatmap(i));
  const n = per[0]!.length;
  const out: HeatmapCell[] = [];
  for (let j = 0; j < n; j++) {
    let status: HeatmapCellStatus = "future";
    let intensity = 0;
    let date = per[0]![j]!.date;
    for (const row of per) {
      const c = row[j]!;
      date = c.date;
      status = pickRicherStatus(status, c.status);
      intensity = Math.max(intensity, c.intensity);
    }
    out.push({
      date,
      status,
      intensity,
      label: `${date}: ${status}`,
    });
  }
  return out;
}
