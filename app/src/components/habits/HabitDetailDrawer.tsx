"use client";

import { useMemo } from "react";
import { format, subDays } from "date-fns";
import type { Habit, RoutineWithSteps } from "@/lib/habits/types";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import {
  formatHabitFrequency,
  habitTypeLabel,
  timeOfDayLabel,
} from "@/lib/i18n/habits-ui";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHabitCompletions, useStreakFreezes } from "@/hooks/use-habits";
import { computeStreak } from "@/lib/habits/streak";
import { timeOfDayPillClass } from "./TodayView";

export interface HabitDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit | null;
  /** Include `steps` for the routine branch. */
  routine?: RoutineWithSteps | null;
  copy: HabitsUiCopy;
  /** IANA zone for streak math; defaults to the browser zone. */
  timeZone?: string;
  onEditHabit?: (habit: Habit) => void;
  onArchiveHabit?: (habit: Habit) => void;
}

export function HabitDetailDrawer({
  open,
  onOpenChange,
  habit,
  routine,
  copy,
  timeZone: timeZoneProp,
  onEditHabit,
  onArchiveHabit,
}: HabitDetailDrawerProps) {
  const timeZone =
    timeZoneProp ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const to = format(new Date(), "yyyy-MM-dd");
  const from = format(subDays(new Date(), 120), "yyyy-MM-dd");
  const habitId = open && habit ? habit.id : "";

  const { data: habitCompletions, isLoading: habitLogsLoading } =
    useHabitCompletions(habitId, { from, to });

  const { data: streakFreezes } = useStreakFreezes(habitId);

  const streakLine = useMemo(() => {
    if (!habit) return null;
    const r = computeStreak({
      habit,
      completions: habitCompletions ?? [],
      freezes: streakFreezes ?? [],
      timeZone,
      now: new Date(),
    });
    return copy.formatStreakSummary(
      r.currentStreak,
      r.bestStreak,
      r.lastActiveDate,
    );
  }, [habit, habitCompletions, streakFreezes, timeZone, copy]);

  const sortedHabitLogs = [...(habitCompletions ?? [])].sort((a, b) =>
    b.completion_date.localeCompare(a.completion_date),
  );

  const steps = routine
    ? [...routine.steps].sort((a, b) => a.position - b.position)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        {habit && (
          <>
            <SheetHeader className="border-b border-border/60 p-4 text-left">
              <SheetTitle className="pr-8 text-lg leading-snug">
                {habit.name}
              </SheetTitle>
              {habit.description && (
                <SheetDescription className="text-sm leading-relaxed">
                  {habit.description}
                </SheetDescription>
              )}
            </SheetHeader>
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap gap-1.5">
                <span className={timeOfDayPillClass(habit.time_of_day)}>
                  {timeOfDayLabel(habit.time_of_day, copy)}
                </span>
                <Badge variant="secondary" className="font-normal">
                  {habitTypeLabel(habit.type, copy)}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {formatHabitFrequency(habit.frequency, copy)}
                </Badge>
                {habit.archived_at && (
                  <Badge variant="outline">{copy.archivedBadge}</Badge>
                )}
                {!habit.is_active && (
                  <Badge variant="outline">{copy.habitsPaused}</Badge>
                )}
              </div>
              {streakLine && (
                <p className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  {streakLine}
                </p>
              )}
              {(onEditHabit || onArchiveHabit) && (
                <div className="flex flex-wrap gap-2">
                  {onEditHabit && !habit.archived_at && (
                    <Button type="button" size="sm" variant="outline" onClick={() => onEditHabit(habit)}>
                      {copy.detailEditHabit}
                    </Button>
                  )}
                  {onArchiveHabit && !habit.archived_at && (
                    <Button type="button" size="sm" variant="secondary" onClick={() => onArchiveHabit(habit)}>
                      {copy.detailArchiveHabit}
                    </Button>
                  )}
                </div>
              )}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {copy.detailRecentTitle}
                </p>
                {habitLogsLoading ? (
                  <p className="text-sm text-muted-foreground">{copy.insightLoading}</p>
                ) : sortedHabitLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{copy.detailNoCompletions}</p>
                ) : (
                  <ScrollArea className="h-64 pr-3">
                    <ul className="space-y-2">
                      {sortedHabitLogs.map((log) => (
                        <li
                          key={log.id}
                          className="rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium tabular-nums">
                              {log.completion_date}
                            </span>
                            <Badge
                              variant={log.status === "done" ? "default" : "secondary"}
                              className="text-[0.65rem] capitalize"
                            >
                              {log.status}
                            </Badge>
                          </div>
                          {log.note && (
                            <p className="mt-1 text-xs text-muted-foreground">{log.note}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </div>
            </div>
          </>
        )}

        {routine && !habit && (
          <>
            <SheetHeader className="border-b border-border/60 p-4 text-left">
              <SheetTitle className="pr-8 text-lg leading-snug">
                {routine.name}
              </SheetTitle>
              {routine.description && (
                <SheetDescription className="text-sm leading-relaxed">
                  {routine.description}
                </SheetDescription>
              )}
            </SheetHeader>
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap gap-1.5">
                <span className={timeOfDayPillClass(routine.time_of_day)}>
                  {timeOfDayLabel(routine.time_of_day, copy)}
                </span>
                <Badge variant="secondary" className="font-normal">
                  {copy.routineStepsLabel(steps.length)}
                </Badge>
                {routine.archived_at && (
                  <Badge variant="outline">{copy.archivedBadge}</Badge>
                )}
                {!routine.is_active && (
                  <Badge variant="outline">{copy.habitsPaused}</Badge>
                )}
              </div>
              <Separator />
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {copy.detailStepsTitle}
                </p>
                {steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{copy.detailNoCompletions}</p>
                ) : (
                  <ol className="space-y-2">
                    {steps.map((s, i) => (
                      <li
                        key={s.id}
                        className="flex gap-2 rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-sm"
                      >
                        <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">
                          {i + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-tight">{s.title}</p>
                          {s.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {s.description}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
