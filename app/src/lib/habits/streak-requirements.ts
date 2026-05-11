import type { HabitFrequency } from "./types";
import { calendarDaysBetween, utcWeekdaySun0 } from "./calendar-iso";

export function isRequiredDay(
  freq: HabitFrequency,
  date: string,
  habitStart: string,
): boolean {
  if (date < habitStart) return false;
  switch (freq.kind) {
    case "daily":
      return true;
    case "weekdays": {
      const wd = utcWeekdaySun0(date);
      return freq.days.includes(wd as (typeof freq.days)[number]);
    }
    case "every_n_days": {
      const n = Math.max(1, freq.n);
      const diff = calendarDaysBetween(habitStart, date);
      return diff >= 0 && diff % n === 0;
    }
    case "weekly_count":
      return true;
    default:
      return true;
  }
}
