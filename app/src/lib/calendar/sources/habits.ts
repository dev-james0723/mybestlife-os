/**
 * Source mapper: Habit rows → expanded CalendarHabitOccurrence[].
 *
 * Habits have a frequency rule (daily, weekly_count, weekdays, every_n_days);
 * the calendar needs one concrete occurrence per active day. This module
 * encapsulates that expansion so consumers can ignore frequency semantics.
 *
 * TODO: replace with real Supabase query — shape:
 *   SELECT habits.*, completions.* FROM habits
 *   LEFT JOIN habit_completions ON habit_completions.habit_id = habits.id
 *     AND habit_completions.completion_date BETWEEN :from AND :to
 *   WHERE habits.user_id = auth.uid() AND habits.is_active = true
 */

import { addDays, format, parseISO } from "date-fns";
import type { Habit, HabitCompletion } from "@/lib/habits/types";
import type {
  CalendarHabitOccurrence,
} from "../types";

function isActiveOn(habit: Habit, date: Date): boolean {
  switch (habit.frequency.kind) {
    case "daily":
      return true;
    case "weekly_count":
      // Show every day — UI surfaces progress toward the count.
      return true;
    case "weekdays":
      return habit.frequency.days.includes(date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    case "every_n_days": {
      // Use created_at as anchor; occur every N days from there.
      const start = parseISO(habit.created_at.slice(0, 10));
      const diff = Math.round((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff % habit.frequency.n === 0;
    }
    default:
      return false;
  }
}

/**
 * Expand a habit into a list of per-day occurrences for the given date range.
 * `completions` is the full completion log — filtered per day inside.
 */
export function expandHabitOccurrences(
  habit: Habit,
  completions: readonly HabitCompletion[],
  from: Date,
  to: Date
): CalendarHabitOccurrence[] {
  const out: CalendarHabitOccurrence[] = [];
  const completionByDate = new Map<string, HabitCompletion>();
  for (const c of completions) {
    if (c.habit_id !== habit.id) continue;
    completionByDate.set(c.completion_date, c);
  }
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
    if (!isActiveOn(habit, d)) continue;
    const iso = format(d, "yyyy-MM-dd");
    const c = completionByDate.get(iso);
    out.push({
      id: `${habit.id}:${iso}`,
      habit_id: habit.id,
      date: iso,
      name: habit.name,
      time_of_day: habit.time_of_day,
      color: habit.color,
      icon: habit.icon,
      completed: c?.status === "done",
    });
  }
  return out;
}

export function expandHabitsToOccurrences(
  habits: readonly Habit[],
  completions: readonly HabitCompletion[],
  from: Date,
  to: Date
): CalendarHabitOccurrence[] {
  return habits.flatMap((h) => expandHabitOccurrences(h, completions, from, to));
}
