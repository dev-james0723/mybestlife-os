"use client";

import { useState } from "react";
import { StickyNote } from "lucide-react";
import type { Habit, HabitCompletion } from "@/lib/habits/types";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import {
  formatHabitFrequency,
  habitTypeLabel,
  timeOfDayLabel,
} from "@/lib/i18n/habits-ui";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { timeOfDayPillClass } from "./TodayView";

export interface HabitCardProps {
  habit: Habit;
  variant?: "default" | "today";
  /** Required when `variant === "today"` — calendar day for the note popover. */
  date?: string;
  completion?: { status: "done" | "skipped" } | null;
  /** Full row for today when available (note editing). */
  todayCompletion?: HabitCompletion | null;
  copy: HabitsUiCopy;
  onClick?: (habit: Habit) => void;
  onToggle?: (habit: Habit) => void;
  onSaveTodayNote?: (input: {
    habit_id: string;
    completion_date: string;
    status: "done" | "skipped";
    value: number | null;
    note: string | null;
  }) => void;
  saveNotePending?: boolean;
  /** When set, show a compact streak line (habits list). */
  currentStreak?: number;
  /** Log numeric value for today (counter = count, duration = seconds). */
  onSaveTodayNumeric?: (habit: Habit, value: number) => void;
  saveValuePending?: boolean;
}

function formatTargetLine(habit: Habit, copy: HabitsUiCopy): string | null {
  if (habit.type === "checkbox" || habit.type === "negative") return null;
  if (habit.type === "counter" && habit.target_value != null) {
    return `${habit.target_value}× / ${formatHabitFrequency(habit.frequency, copy)}`;
  }
  if (habit.type === "duration" && habit.target_value != null) {
    const sec = Math.round(habit.target_value);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const dur =
      m > 0 ? `${m}m${s > 0 ? ` ${s}s` : ""}` : s > 0 ? `${s}s` : "0s";
    return `${dur} / ${formatHabitFrequency(habit.frequency, copy)}`;
  }
  return formatHabitFrequency(habit.frequency, copy);
}

function initialNumericDraft(
  habitType: "counter" | "duration",
  todayCompletion: HabitCompletion | null | undefined,
): string {
  if (todayCompletion?.value == null) return "";
  if (habitType === "duration") {
    return String(Math.round((todayCompletion.value / 60) * 10) / 10);
  }
  return String(todayCompletion.value);
}

function TodayNumericLogBlock({
  habit,
  habitType,
  todayCompletion,
  copy,
  onSaveTodayNumeric,
  saveValuePending,
}: {
  habit: Habit;
  habitType: "counter" | "duration";
  todayCompletion: HabitCompletion | null | undefined;
  copy: HabitsUiCopy;
  onSaveTodayNumeric: (habit: Habit, value: number) => void;
  saveValuePending?: boolean;
}) {
  const [numericDraft, setNumericDraft] = useState(() =>
    initialNumericDraft(habitType, todayCompletion),
  );

  const handleSaveNumeric = () => {
    const n = parseFloat(numericDraft);
    if (!Number.isFinite(n) || n < 0) return;
    if (habitType === "duration") {
      onSaveTodayNumeric(habit, Math.round(n * 60));
    } else {
      onSaveTodayNumeric(habit, Math.round(n));
    }
  };

  return (
    <div
      className="flex flex-col gap-2 border-t border-border/50 pt-2 sm:flex-row sm:items-end"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid flex-1 gap-1">
        <span className="text-[0.65rem] text-muted-foreground">
          {habitType === "counter" ? copy.todayLogValue : copy.todayDurationMinutes}
        </span>
        <Input
          type="number"
          min={0}
          step={habitType === "duration" ? 0.5 : 1}
          className="h-8 text-sm"
          value={numericDraft}
          onChange={(e) => setNumericDraft(e.target.value)}
          disabled={saveValuePending}
        />
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0"
        disabled={saveValuePending}
        onClick={handleSaveNumeric}
      >
        {copy.todayLogSave}
      </Button>
    </div>
  );
}

export function HabitCard({
  habit,
  variant = "default",
  date,
  completion,
  todayCompletion,
  copy,
  onClick,
  onToggle,
  onSaveTodayNote,
  saveNotePending,
  currentStreak,
  onSaveTodayNumeric,
  saveValuePending,
}: HabitCardProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [draftNote, setDraftNote] = useState("");

  const done = completion?.status === "done";
  const showCheck =
    (habit.type === "checkbox" || habit.type === "negative") &&
    habit.is_active &&
    !habit.archived_at;

  const targetLine = formatTargetLine(habit, copy);
  const archived = !!habit.archived_at;

  const showNoteTrigger =
    variant === "today" &&
    habit.is_active &&
    !habit.archived_at &&
    onSaveTodayNote &&
    date;

  const handleSaveNote = () => {
    if (!date || !onSaveTodayNote) return;
    onSaveTodayNote({
      habit_id: habit.id,
      completion_date: date,
      status: todayCompletion?.status ?? completion?.status ?? "done",
      value: todayCompletion?.value ?? null,
      note: draftNote.trim() ? draftNote.trim() : null,
    });
    setNoteOpen(false);
  };

  return (
    <Card
      data-testid="habit-card"
      data-habit-id={habit.id}
      className={cn(
        "overflow-hidden border-border/80 shadow-none transition-colors",
        archived && "opacity-70",
        onClick && "cursor-pointer hover:bg-muted/40",
      )}
      onClick={() => onClick?.(habit)}
    >
      <div className="flex items-stretch gap-0">
        {showCheck && variant === "today" && (
          <div
            className="flex w-11 shrink-0 items-center justify-center border-r border-border/60 bg-muted/15"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={done}
              disabled={!onToggle}
              onCheckedChange={() => onToggle?.(habit)}
              className="size-5 rounded-md"
              aria-label={habit.name}
            />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="truncate text-sm font-medium leading-tight">
                  {habit.name}
                </h3>
                {archived && (
                  <Badge variant="outline" className="text-[0.65rem] font-normal">
                    {copy.archivedBadge}
                  </Badge>
                )}
              </div>
              {habit.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {habit.description}
                </p>
              )}
            </div>
            <div
              className="flex shrink-0 items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {showNoteTrigger && (
                <Popover
                  open={noteOpen}
                  onOpenChange={(open) => {
                    setNoteOpen(open);
                    if (open) setDraftNote(todayCompletion?.note ?? "");
                  }}
                >
                  <PopoverTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={copy.addNote}
                      />
                    }
                  >
                    <StickyNote className="size-3.5" />
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 space-y-2">
                    <p className="text-xs font-medium text-foreground">{copy.addNote}</p>
                    <Textarea
                      placeholder={copy.notePlaceholder}
                      rows={3}
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      disabled={saveNotePending}
                      className="resize-none text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      disabled={saveNotePending}
                      onClick={handleSaveNote}
                    >
                      {copy.noteSave}
                    </Button>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={timeOfDayPillClass(habit.time_of_day)}>
              {timeOfDayLabel(habit.time_of_day, copy)}
            </span>
            <Badge variant="secondary" className="text-[0.65rem] font-normal">
              {habitTypeLabel(habit.type, copy)}
            </Badge>
            {!habit.is_active && (
              <Badge variant="outline" className="text-[0.65rem] font-normal">
                {copy.habitsPaused}
              </Badge>
            )}
          </div>
          {targetLine && (
            <p className="text-[0.7rem] text-muted-foreground tabular-nums">{targetLine}</p>
          )}
          {variant === "default" &&
            typeof currentStreak === "number" &&
            currentStreak > 0 && (
              <p className="text-[0.65rem] text-muted-foreground tabular-nums">
                {copy.habitStreakShort(currentStreak)}
              </p>
            )}

          {variant === "today" &&
            habit.is_active &&
            !habit.archived_at &&
            habit.type === "counter" &&
            onSaveTodayNumeric && (
              <TodayNumericLogBlock
                key={`${habit.id}-${todayCompletion?.id ?? "none"}-${todayCompletion?.value ?? ""}`}
                habit={habit}
                habitType="counter"
                todayCompletion={todayCompletion}
                copy={copy}
                onSaveTodayNumeric={onSaveTodayNumeric}
                saveValuePending={saveValuePending}
              />
            )}

          {variant === "today" &&
            habit.is_active &&
            !habit.archived_at &&
            habit.type === "duration" &&
            onSaveTodayNumeric && (
              <TodayNumericLogBlock
                key={`${habit.id}-${todayCompletion?.id ?? "none"}-${todayCompletion?.value ?? ""}`}
                habit={habit}
                habitType="duration"
                todayCompletion={todayCompletion}
                copy={copy}
                onSaveTodayNumeric={onSaveTodayNumeric}
                saveValuePending={saveValuePending}
              />
            )}
        </div>
      </div>
    </Card>
  );
}