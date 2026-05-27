"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Ban,
  CheckCircle2,
  ImageIcon,
  MoreHorizontal,
  Play,
  StickyNote,
  Timer,
} from "lucide-react";
import type { Habit, HabitCompletion } from "@/lib/habits/types";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import {
  formatHabitFrequency,
  habitTypeLabel,
  timeOfDayLabel,
} from "@/lib/i18n/habits-ui";
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  visualUrl?: string | null;
  secretaryNote?: string | null;
  onStartTimer?: (habit: Habit) => void;
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
  visualUrl,
  secretaryNote,
  onStartTimer,
}: HabitCardProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [draftNote, setDraftNote] = useState("");

  const done = completion?.status === "done";
  const canToggle =
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

  const canAct = habit.is_active && !archived && variant === "today";
  const mainAction = (() => {
    if (!canAct) return null;
    if (habit.type === "duration" && onStartTimer) {
      const minutes = habit.target_value ? Math.max(1, Math.round(habit.target_value / 60)) : 5;
      return {
        label: `${copy.timerStart} ${minutes} min`,
        icon: Play,
        onClick: () => onStartTimer(habit),
      };
    }
    if (habit.type === "duration") return null;
    if (habit.type === "counter") return null;
    if (habit.type === "negative") {
      return {
        label: done ? copy.timerComplete : copy.habitActionStillAvoided,
        icon: Ban,
        onClick: () => onToggle?.(habit),
      };
    }
    return {
      label: done ? copy.timerComplete : copy.habitActionMarkDone,
      icon: CheckCircle2,
      onClick: () => onToggle?.(habit),
    };
  })();

  return (
    <GlassPanel
      data-testid="habit-card"
      data-habit-id={habit.id}
      className={cn(
        "group overflow-hidden transition-colors",
        archived && "opacity-70",
        onClick && "cursor-pointer",
      )}
      interactive={!!onClick}
      onClick={() => onClick?.(habit)}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-black/30">
        {visualUrl ? (
          <Image
            src={visualUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            loading="lazy"
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(200,229,58,0.20),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.02))]">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
              {habit.type === "duration" ? (
                <Timer className="size-7" />
              ) : (
                <ImageIcon className="size-7" />
              )}
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className={cn(timeOfDayPillClass(habit.time_of_day), "bg-black/45 text-white ring-white/20 backdrop-blur-md")}>
            {timeOfDayLabel(habit.time_of_day, copy)}
          </span>
          <Badge className="border-white/15 bg-black/45 text-white backdrop-blur-md" variant="outline">
            {habitTypeLabel(habit.type, copy)}
          </Badge>
        </div>
        <div className="absolute bottom-3 right-3">
          {typeof currentStreak === "number" && currentStreak > 0 && (
            <Badge className="border-primary/30 bg-primary/20 text-primary" variant="outline">
              {copy.habitStreakShort(currentStreak)}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3 p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
                {habit.name}
              </h3>
              {archived && (
                <Badge variant="outline" className="text-[0.65rem] font-normal">
                  {copy.archivedBadge}
                </Badge>
              )}
            </div>
            {habit.description && (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {habit.description}
              </p>
            )}
            {targetLine && (
              <p className="mt-1 text-[0.7rem] text-muted-foreground tabular-nums">
                {targetLine}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${habit.name} actions`}
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onClick?.(habit)}>
                  {copy.detailEditHabit}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {!habit.is_active && (
          <Badge variant="outline" className="text-[0.65rem] font-normal">
            {copy.habitsPaused}
          </Badge>
        )}

        {secretaryNote && (
          <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-muted-foreground">
            {secretaryNote}
          </p>
        )}

        {mainAction && (
          <Button
            type="button"
            size="sm"
            className={cn("w-full", done && canToggle && "bg-primary/70")}
            disabled={habit.type === "counter" ? false : !onToggle && habit.type !== "duration"}
            onClick={(e) => {
              e.stopPropagation();
              mainAction.onClick();
            }}
          >
            <mainAction.icon className="size-3.5" />
            {mainAction.label}
          </Button>
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
      </div>
    </GlassPanel>
  );
}
