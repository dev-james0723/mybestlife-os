/**
 * Streak computation — pure functions over ISO calendar days + completions.
 *
 * * **Skip** on a required day preserves the chain (does not increment).
 * **Freeze** passes through (no break, no increment).
 * **Today** with no row yet is treated as *pending* (does not break).
 * **weekly_count**: consecutive ISO weeks (Mon–Sun) with enough `done` hits;
 *   the current week is skipped in the backward walk until it meets quota.
 */

import type { Habit, HabitCompletion, StreakFreeze } from "./types";
import {
  addDaysIso,
  calendarDayFromInstant,
  eachIsoDayInclusive,
  formatTodayInTimeZone,
  startOfIsoWeekMonday,
} from "./calendar-iso";
import { isSuccessfulCompletion } from "./completion-success";
import { isRequiredDay } from "./streak-requirements";

export type StreakInput = {
  habit: Pick<Habit, "id" | "frequency" | "created_at" | "type" | "target_value">;
  completions: readonly HabitCompletion[];
  freezes: readonly StreakFreeze[];
  timeZone: string;
  now: Date;
};

export type StreakResult = {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null;
};

function byCompletionDate(
  completions: readonly HabitCompletion[],
): Map<string, HabitCompletion> {
  const m = new Map<string, HabitCompletion>();
  for (const c of completions) {
    const ex = m.get(c.completion_date);
    if (!ex || ex.completed_at < c.completed_at) m.set(c.completion_date, c);
  }
  return m;
}

function freezeSet(freezes: readonly StreakFreeze[]): Set<string> {
  return new Set(freezes.map((f) => f.freeze_date));
}

function countSuccessesInWeek(
  weekMonday: string,
  byDate: Map<string, HabitCompletion>,
  habit: Pick<Habit, "type" | "target_value">,
): number {
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDaysIso(weekMonday, i);
    const c = byDate.get(d);
    if (isSuccessfulCompletion(habit, c)) n++;
  }
  return n;
}

function streakWeeklyCount(input: StreakInput): StreakResult {
  const { habit, completions, timeZone, now } = input;
  if (habit.frequency.kind !== "weekly_count") {
    return streakStandard(input);
  }
  const habitStart = calendarDayFromInstant(habit.created_at, timeZone);
  const today = formatTodayInTimeZone(now, timeZone);
  const byDate = byCompletionDate(completions);
  const need = Math.max(1, habit.frequency.count);

  const habitFirstMonday = startOfIsoWeekMonday(habitStart);
  const thisMonday = startOfIsoWeekMonday(today);
  const thisWeekEnd = addDaysIso(thisMonday, 6);

  let curMon = thisMonday;
  if (
    countSuccessesInWeek(thisMonday, byDate, habit) < need &&
    today <= thisWeekEnd
  ) {
    curMon = addDaysIso(thisMonday, -7);
  }

  let current = 0;
  while (curMon >= habitFirstMonday) {
    if (countSuccessesInWeek(curMon, byDate, habit) >= need) {
      current++;
      curMon = addDaysIso(curMon, -7);
    } else {
      break;
    }
  }

  let best = 0;
  let run = 0;
  let mon = habitFirstMonday;
  while (mon <= thisMonday) {
    const met = countSuccessesInWeek(mon, byDate, habit) >= need;
    if (met) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    mon = addDaysIso(mon, 7);
  }
  best = Math.max(best, current);

  let lastActive: string | null = null;
  for (const c of completions) {
    if (isSuccessfulCompletion(habit, byDate.get(c.completion_date))) {
      if (!lastActive || c.completion_date > lastActive) lastActive = c.completion_date;
    }
  }

  return {
    currentStreak: current,
    bestStreak: best,
    lastActiveDate: lastActive,
  };
}

function streakStandard(input: StreakInput): StreakResult {
  const { habit, completions, freezes, timeZone, now } = input;
  const freq = habit.frequency;
  if (freq.kind === "weekly_count") return streakWeeklyCount(input);

  const habitStart = calendarDayFromInstant(habit.created_at, timeZone);
  const today = formatTodayInTimeZone(now, timeZone);
  const byDate = byCompletionDate(completions);
  const frozen = freezeSet(freezes);

  let current = 0;
  let d = today;
  while (d >= habitStart) {
    if (frozen.has(d)) {
      d = addDaysIso(d, -1);
      continue;
    }
    if (!isRequiredDay(freq, d, habitStart)) {
      d = addDaysIso(d, -1);
      continue;
    }
    const c = byDate.get(d);
    if (c?.status === "skipped") {
      d = addDaysIso(d, -1);
      continue;
    }
    if (d === today && !c) {
      d = addDaysIso(d, -1);
      continue;
    }
    if (isSuccessfulCompletion(habit, c)) {
      current++;
      d = addDaysIso(d, -1);
    } else {
      break;
    }
  }

  let best = 0;
  let run = 0;
  for (const day of eachIsoDayInclusive(habitStart, today)) {
    if (frozen.has(day)) continue;
    if (!isRequiredDay(freq, day, habitStart)) continue;
    const c = byDate.get(day);
    if (c?.status === "skipped") continue;
    if (isSuccessfulCompletion(habit, c)) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  best = Math.max(best, current);

  let lastActive: string | null = null;
  for (const day of eachIsoDayInclusive(habitStart, today)) {
    const c = byDate.get(day);
    if (isSuccessfulCompletion(habit, c)) lastActive = day;
  }

  return { currentStreak: current, bestStreak: best, lastActiveDate: lastActive };
}

export function computeStreak(input: StreakInput): StreakResult {
  if (input.habit.frequency.kind === "weekly_count") {
    return streakWeeklyCount(input);
  }
  return streakStandard(input);
}

/** Same success semantics as {@link computeStreak} for “avoid” habits. */
export function computeNegativeStreak(input: StreakInput): StreakResult {
  return computeStreak(input);
}
