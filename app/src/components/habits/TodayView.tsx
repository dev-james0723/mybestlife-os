"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type {
  Habit,
  HabitCompletion,
  RoutineWithSteps,
  TimeOfDay,
} from "@/lib/habits/types";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import { cn } from "@/lib/utils";
import { HabitCard, type HabitCardProps } from "./HabitCard";
import { RoutineCard } from "./RoutineCard";

export interface TodayViewProps {
  habits: Habit[];
  routines: RoutineWithSteps[];
  /** ISO `YYYY-MM-DD` the view is focused on. */
  date: string;
  copy: HabitsUiCopy;
  /** Today's completion per habit (at most one row per habit for `date`). */
  completionByHabitId?: ReadonlyMap<string, { status: "done" | "skipped" }>;
  /** Full completion row when loaded (notes). */
  todayCompletionByHabitId?: ReadonlyMap<string, HabitCompletion | undefined>;
  onToggleHabit?: (habit: Habit) => void;
  onOpenHabit?: (habit: Habit) => void;
  onOpenRoutine?: (routine: RoutineWithSteps) => void;
  onSaveTodayNote?: HabitCardProps["onSaveTodayNote"];
  saveNotePending?: boolean;
  onSaveTodayNumeric?: HabitCardProps["onSaveTodayNumeric"];
  saveValuePending?: boolean;
  onStartRoutine?: (routine: RoutineWithSteps) => void;
  onStartHabitTimer?: (habit: Habit) => void;
  visualByHabitId?: ReadonlyMap<string, string>;
}

const BUCKET_ORDER: TimeOfDay[] = [
  "morning",
  "afternoon",
  "evening",
  "anytime",
];

function bucketLabel(tod: TimeOfDay, copy: HabitsUiCopy): string {
  switch (tod) {
    case "morning":
      return copy.todayGroupMorning;
    case "afternoon":
      return copy.todayGroupAfternoon;
    case "evening":
      return copy.todayGroupEvening;
    default:
      return copy.todayGroupAnytime;
  }
}

function isInTodayList(h: Habit): boolean {
  return h.is_active && !h.archived_at;
}

function isRoutineVisible(r: RoutineWithSteps): boolean {
  return r.is_active && !r.archived_at;
}

export function TodayView({
  habits,
  routines,
  date,
  copy,
  completionByHabitId,
  todayCompletionByHabitId,
  onToggleHabit,
  onOpenHabit,
  onOpenRoutine,
  onSaveTodayNote,
  saveNotePending,
  onSaveTodayNumeric,
  saveValuePending,
  onStartRoutine,
  onStartHabitTimer,
  visualByHabitId,
}: TodayViewProps) {
  const reduceMotion = useReducedMotion();

  const { buckets, hasAny } = useMemo(() => {
    const dayHabits = habits.filter(isInTodayList).sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });
    const dayRoutines = routines.filter(isRoutineVisible).sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });

    const map = new Map<TimeOfDay, { habits: Habit[]; routines: RoutineWithSteps[] }>();
    for (const tod of BUCKET_ORDER) {
      map.set(tod, { habits: [], routines: [] });
    }
    for (const h of dayHabits) {
      const slot = map.get(h.time_of_day) ?? map.get("anytime")!;
      slot.habits.push(h);
    }
    for (const r of dayRoutines) {
      const slot = map.get(r.time_of_day) ?? map.get("anytime")!;
      slot.routines.push(r);
    }

    return {
      buckets: BUCKET_ORDER.map((tod) => ({
        tod,
        label: bucketLabel(tod, copy),
        ...map.get(tod)!,
      })).filter((b) => b.habits.length + b.routines.length > 0),
      hasAny: dayHabits.length + dayRoutines.length > 0,
    };
  }, [habits, routines, copy]);

  if (!hasAny) {
    return (
      <div
        data-testid="habits-today-view"
        className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground"
      >
        {copy.todayEmpty}
      </div>
    );
  }

  return (
    <div data-testid="habits-today-view" className="space-y-6">
      {buckets.map((bucket, bi) => (
        <motion.section
          key={bucket.tod}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: bi * 0.04 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {bucket.label}
            </span>
            <div className="h-px flex-1 bg-border/70" />
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {bucket.habits.map((h) => (
              <li key={h.id} data-habit-id={h.id}>
                <HabitCard
                  habit={h}
                  variant="today"
                  date={date}
                  completion={completionByHabitId?.get(h.id)}
                  todayCompletion={todayCompletionByHabitId?.get(h.id)}
                  copy={copy}
                  onClick={onOpenHabit}
                  onToggle={onToggleHabit}
                  onSaveTodayNote={onSaveTodayNote}
                  saveNotePending={saveNotePending}
                  onSaveTodayNumeric={onSaveTodayNumeric}
                  saveValuePending={saveValuePending}
                  visualUrl={visualByHabitId?.get(h.id)}
                  onStartTimer={onStartHabitTimer}
                />
              </li>
            ))}
            {bucket.routines.map((r) => (
              <li key={r.id} data-routine-id={r.id}>
                <RoutineCard
                  routine={r}
                  copy={copy}
                  onClick={onOpenRoutine}
                  onStart={onStartRoutine}
                />
              </li>
            ))}
          </ul>
        </motion.section>
      ))}
    </div>
  );
}

export function timeOfDayPillClass(tod: TimeOfDay): string {
  return cn(
    "shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium ring-1 ring-inset",
    tod === "morning" &&
      "bg-amber-500/10 text-amber-950 ring-amber-500/25 dark:text-amber-100",
    tod === "afternoon" &&
      "bg-sky-500/10 text-sky-950 ring-sky-500/25 dark:text-sky-100",
    tod === "evening" &&
      "bg-violet-500/10 text-violet-950 ring-violet-500/25 dark:text-violet-100",
    tod === "anytime" && "bg-muted text-muted-foreground ring-border",
  );
}
