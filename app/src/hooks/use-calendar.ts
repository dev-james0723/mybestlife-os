"use client";

import { useMemo } from "react";
import { addDays, format, subDays } from "date-fns";

import { useTasks } from "@/hooks/use-tasks";
import { useGoals } from "@/hooks/use-goals";
import { useHabits, useAllCompletions } from "@/hooks/use-habits";
import { buildMockSources } from "@/lib/calendar/mock/week";
import {
  buildDayContext,
  daysBetween,
  itemsForDate,
  itemsPerDate,
  projectToCalendarItems,
} from "@/lib/calendar/projection";
import { mapTaskRowsToCalendarTasks } from "@/lib/calendar/sources/tasks";
import { mapGoalRowsToMilestones } from "@/lib/calendar/sources/milestones";
import { expandHabitsToOccurrences } from "@/lib/calendar/sources/habits";
import type {
  CalendarHabitOccurrence,
  CalendarItem,
  CalendarMilestone,
  CalendarReminder,
  CalendarTask,
  DayContext,
} from "@/lib/calendar/types";

/**
 * Range covered by the calendar projection at any given time. The
 * upcoming agenda scrolls 14 days forward and the Orbital view uses
 * ±5 days, so the projection must cover at minimum ±14 days from today.
 */
const PAST_DAYS = 14;
const FUTURE_DAYS = 30;

const CALENDAR_QUERY_KEY = ["calendar", "items"] as const;

type UseCalendarItemsReturn = {
  data: CalendarItem[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
};

/**
 * Central data hook. Reads from the existing domain hooks
 * (`useTasks`, `useGoals`, `useHabits`, `useAllHabitCompletions`) and
 * composes the projection. When any source hook is still loading, we
 * fall through to the mock week so the UI is never blank during first
 * paint or for users with a pristine account.
 *
 * All mock-to-real seams are annotated with `TODO: replace with …` so
 * grep finds them for future backend work.
 */
export function useCalendarItems(): UseCalendarItemsReturn {
  const today = useMemo(() => new Date(), []);

  // Real source hooks — each encapsulates its own Supabase query.
  //
  // TODO: replace with Supabase query — shape in lib/calendar/sources/tasks.ts
  const { data: taskRows, isLoading: tasksLoading } = useTasks();
  // TODO: replace with Supabase query — shape in lib/calendar/sources/milestones.ts
  const { data: goalRows, isLoading: goalsLoading } = useGoals();
  // TODO: replace with Supabase query — shape in lib/calendar/sources/habits.ts
  const { data: habitRows, isLoading: habitsLoading } = useHabits();
  const rangeStart = useMemo(() => subDays(today, PAST_DAYS), [today]);
  const rangeEnd = useMemo(() => addDays(today, FUTURE_DAYS), [today]);
  const { data: habitCompletionRows, isLoading: completionsLoading } =
    useAllCompletions({
      from: format(rangeStart, "yyyy-MM-dd"),
      to: format(rangeEnd, "yyyy-MM-dd"),
    });

  const isLoading =
    tasksLoading || goalsLoading || habitsLoading || completionsLoading;

  const data = useMemo<CalendarItem[] | undefined>(() => {
    // If any source hook errors / returns undefined, fall back to mock.
    // This keeps the Orbital / Today views visually useful during
    // development and on fresh accounts.
    if (!taskRows && !goalRows && !habitRows) {
      const sources = buildMockSources(today);
      return projectToCalendarItems(sources);
    }

    const tasks: CalendarTask[] = taskRows
      ? mapTaskRowsToCalendarTasks(taskRows)
      : [];

    const milestones: CalendarMilestone[] = goalRows
      ? mapGoalRowsToMilestones(goalRows)
      : [];

    const habitOccurrences: CalendarHabitOccurrence[] =
      habitRows && habitCompletionRows
        ? expandHabitsToOccurrences(
            habitRows,
            habitCompletionRows,
            rangeStart,
            rangeEnd
          )
        : [];

    // Reminders: derived from tasks with `reminder_date` set. We piggy-
    // back on the existing tasks query — no separate query yet.
    //
    // TODO: if/when a dedicated `reminders` table ships, read it here
    // via `lib/calendar/sources/reminders.ts`.
    const reminders: CalendarReminder[] = (taskRows ?? [])
      .filter((t) => t.reminder_date)
      .map((t) => ({
        id: `task-reminder-${t.id}`,
        title: t.title,
        remind_at: t.reminder_date!,
        source_task_id: t.id,
      }));

    // If a real user has no sources at all, seed with the mock week so
    // the UI demonstrates its full capabilities instead of showing empty.
    if (
      tasks.length === 0 &&
      milestones.length === 0 &&
      habitOccurrences.length === 0
    ) {
      const sources = buildMockSources(today);
      return projectToCalendarItems(sources);
    }

    return projectToCalendarItems({
      tasks,
      habitOccurrences,
      milestones,
      reminders,
    });
  }, [taskRows, goalRows, habitRows, habitCompletionRows, today, rangeStart, rangeEnd]);

  return { data, isLoading, isFetching: isLoading };
}

// React Query key kept for cross-feature invalidation.
export { CALENDAR_QUERY_KEY };

// ──────────────────────────────────────────────────────────────────────
// Derived hooks (unchanged API)
// ──────────────────────────────────────────────────────────────────────

export function useItemsForDate(date: string) {
  const { data, isLoading } = useCalendarItems();
  const items = useMemo(() => (data ? itemsForDate(data, date) : []), [data, date]);
  return { items, isLoading };
}

export function useDayContext(date: string): {
  context: DayContext | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useCalendarItems();
  const context = useMemo(() => {
    if (!data) return null;
    return buildDayContext(date, data);
  }, [data, date]);
  return { context, isLoading };
}

export function useItemsPerDate(from: Date, to: Date) {
  const { data, isLoading } = useCalendarItems();
  const dates = useMemo(() => daysBetween(from, to), [from, to]);
  const perDate = useMemo(
    () => (data ? itemsPerDate(data, dates) : dates.map((d) => ({ date: d, items: [] }))),
    [data, dates]
  );
  return { perDate, dates, isLoading };
}

export function useUpcomingItems(days = 7) {
  const { data, isLoading } = useCalendarItems();
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const upcoming = useMemo(() => {
    if (!data) return [];
    const horizon = format(addDays(new Date(), days), "yyyy-MM-dd");
    return data.filter((i) => i.date >= today && i.date <= horizon);
  }, [data, today, days]);
  return { items: upcoming, isLoading };
}

/** Week range anchored on Monday (ISO). */
export function useWeekItems(anchor: Date) {
  const start = useMemo(() => subDays(anchor, (anchor.getDay() + 6) % 7), [anchor]);
  const end = useMemo(() => addDays(start, 6), [start]);
  return useItemsPerDate(start, end);
}
