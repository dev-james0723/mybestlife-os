"use client";

import { useMemo } from "react";
import { addDays, format, subDays } from "date-fns";

import { useTasks } from "@/hooks/use-tasks";
import { useGoals } from "@/hooks/use-goals";
import { useHabits, useAllCompletions } from "@/hooks/use-habits";
import { useDailyPlansInRange } from "@/hooks/use-daily-plans";
import { useProfile } from "@/hooks/use-settings";
import { buildMockSources } from "@/lib/calendar/mock/week";
import {
  buildDayContext,
  daysBetween,
  itemsForDate,
  itemsPerDate,
  projectToCalendarItems,
} from "@/lib/calendar/projection";
import { mapDailyPlansToCalendarItems } from "@/lib/calendar/sources/daily-plans";
import { mapTaskRowsToCalendarTasks } from "@/lib/calendar/sources/tasks";
import { mapGoalRowsToMilestones } from "@/lib/calendar/sources/milestones";
import { expandHabitsToOccurrences } from "@/lib/calendar/sources/habits";
import { CALENDAR_QUERY_KEY } from "@/lib/calendar/query-keys";
import type {
  CalendarHabitOccurrence,
  CalendarItem,
  CalendarMilestone,
  CalendarReminder,
  CalendarTask,
  DayContext,
} from "@/lib/calendar/types";

const DEFAULT_BLOCK_MINUTES = 10;

/**
 * Range covered by the calendar projection at any given time. The
 * upcoming agenda scrolls 14 days forward and the Orbital view uses
 * ±5 days, so the projection must cover at minimum ±14 days from today.
 */
const PAST_DAYS = 14;
const FUTURE_DAYS = 30;

type UseCalendarItemsReturn = {
  data: CalendarItem[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
};

function shouldUseMockCalendar(args: {
  taskRows: unknown;
  goalRows: unknown;
  habitRows: unknown;
  dailyPlanRows: unknown;
}): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.NEXT_PUBLIC_ENABLE_CALENDAR_MOCKS !== "true") return false;
  return !args.taskRows && !args.goalRows && !args.habitRows && !args.dailyPlanRows;
}

/**
 * Central data hook. Reads from domain hooks and composes the projection.
 * Daily Planner tasks are included via `mapDailyPlansToCalendarItems`.
 */
export function useCalendarItems(): UseCalendarItemsReturn {
  const today = useMemo(() => new Date(), []);

  const { data: taskRows, isLoading: tasksLoading } = useTasks();
  const { data: goalRows, isLoading: goalsLoading } = useGoals();
  const { data: habitRows, isLoading: habitsLoading } = useHabits();
  const { data: profile, isLoading: profileLoading } = useProfile();

  const rangeStart = useMemo(() => subDays(today, PAST_DAYS), [today]);
  const rangeEnd = useMemo(() => addDays(today, FUTURE_DAYS), [today]);
  const rangeFrom = format(rangeStart, "yyyy-MM-dd");
  const rangeTo = format(rangeEnd, "yyyy-MM-dd");

  const { data: habitCompletionRows, isLoading: completionsLoading } =
    useAllCompletions({
      from: rangeFrom,
      to: rangeTo,
    });

  const { data: dailyPlanRows, isLoading: dailyPlansLoading } = useDailyPlansInRange(
    rangeFrom,
    rangeTo,
  );

  const blockMinutes = profile?.block_minutes ?? DEFAULT_BLOCK_MINUTES;

  const isLoading =
    tasksLoading ||
    goalsLoading ||
    habitsLoading ||
    completionsLoading ||
    dailyPlansLoading ||
    profileLoading;

  const data = useMemo<CalendarItem[] | undefined>(() => {
    if (shouldUseMockCalendar({ taskRows, goalRows, habitRows, dailyPlanRows })) {
      const sources = buildMockSources(today);
      return projectToCalendarItems(sources);
    }

    const tasks: CalendarTask[] = taskRows ? mapTaskRowsToCalendarTasks(taskRows) : [];

    const milestones: CalendarMilestone[] = goalRows ? mapGoalRowsToMilestones(goalRows) : [];

    const habitOccurrences: CalendarHabitOccurrence[] =
      habitRows && habitCompletionRows
        ? expandHabitsToOccurrences(habitRows, habitCompletionRows, rangeStart, rangeEnd)
        : [];

    const reminders: CalendarReminder[] = (taskRows ?? [])
      .filter((t) => t.reminder_date)
      .map((t) => ({
        id: `task-reminder-${t.id}`,
        title: t.title,
        remind_at: t.reminder_date!,
        source_task_id: t.id,
      }));

    const plannerItems = mapDailyPlansToCalendarItems({
      dailyPlans: dailyPlanRows ?? [],
      taskRows: taskRows ?? [],
      blockMinutes,
    });

    const hasRealData =
      tasks.length > 0 ||
      milestones.length > 0 ||
      habitOccurrences.length > 0 ||
      reminders.length > 0 ||
      plannerItems.length > 0;

    if (!hasRealData) {
      return [];
    }

    return projectToCalendarItems({
      tasks,
      habitOccurrences,
      milestones,
      reminders,
      plannerItems,
    });
  }, [
    taskRows,
    goalRows,
    habitRows,
    habitCompletionRows,
    dailyPlanRows,
    today,
    rangeStart,
    rangeEnd,
    blockMinutes,
  ]);

  return { data, isLoading, isFetching: isLoading };
}

export { CALENDAR_QUERY_KEY };

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
