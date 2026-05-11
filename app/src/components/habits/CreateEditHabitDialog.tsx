"use client";

import { useState } from "react";
import type { Habit, HabitFrequency, HabitType, TimeOfDay, Weekday } from "@/lib/habits/types";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import { habitTypeLabel, timeOfDayLabel } from "@/lib/i18n/habits-ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateHabit, useUpdateHabit } from "@/hooks/use-habits";

type FreqForm =
  | { kind: "daily" }
  | { kind: "weekly_count"; count: number }
  | { kind: "weekdays"; days: Weekday[] }
  | { kind: "every_n_days"; n: number };

function freqFromHabit(f: HabitFrequency): FreqForm {
  if (f.kind === "weekdays") {
    return { kind: "weekdays", days: [...f.days] as Weekday[] };
  }
  return f;
}

function getInitialFormState(habit: Habit | null) {
  if (!habit) {
    return {
      name: "",
      description: "",
      type: "checkbox" as HabitType,
      targetStr: "",
      freq: { kind: "daily" } as FreqForm,
      timeOfDay: "anytime" as TimeOfDay,
      isActive: true,
    };
  }
  let targetStr = "";
  if (habit.type === "duration" && habit.target_value != null) {
    targetStr = String(Math.round(habit.target_value / 60));
  } else if (habit.target_value != null) {
    targetStr = String(habit.target_value);
  }
  return {
    name: habit.name,
    description: habit.description ?? "",
    type: habit.type,
    targetStr,
    freq: freqFromHabit(habit.frequency),
    timeOfDay: habit.time_of_day,
    isActive: habit.is_active,
  };
}

function toHabitFrequency(f: FreqForm): HabitFrequency {
  switch (f.kind) {
    case "daily":
      return { kind: "daily" };
    case "weekly_count":
      return { kind: "weekly_count", count: Math.min(7, Math.max(1, f.count)) };
    case "weekdays":
      return {
        kind: "weekdays",
        days: f.days.length ? f.days : ([1, 2, 3, 4, 5] as Weekday[]),
      };
    case "every_n_days":
      return { kind: "every_n_days", n: Math.min(30, Math.max(2, f.n)) };
  }
}

const TYPES: HabitType[] = ["checkbox", "counter", "duration", "negative"];
const TODS: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];

export interface CreateEditHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit | null;
  copy: HabitsUiCopy;
}

export function CreateEditHabitDialog({
  open,
  onOpenChange,
  habit,
  copy,
}: CreateEditHabitDialogProps) {
  const create = useCreateHabit();
  const update = useUpdateHabit();

  const [name, setName] = useState(() => getInitialFormState(habit).name);
  const [description, setDescription] = useState(
    () => getInitialFormState(habit).description,
  );
  const [type, setType] = useState<HabitType>(() => getInitialFormState(habit).type);
  const [targetStr, setTargetStr] = useState(() => getInitialFormState(habit).targetStr);
  const [freq, setFreq] = useState<FreqForm>(() => getInitialFormState(habit).freq);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(
    () => getInitialFormState(habit).timeOfDay,
  );
  const [isActive, setIsActive] = useState(() => getInitialFormState(habit).isActive);

  const applyInitialForm = (h: Habit | null) => {
    const s = getInitialFormState(h);
    setName(s.name);
    setDescription(s.description);
    setType(s.type);
    setTargetStr(s.targetStr);
    setFreq(s.freq);
    setTimeOfDay(s.timeOfDay);
    setIsActive(s.isActive);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) applyInitialForm(habit);
    onOpenChange(next);
  };

  const toggleWeekday = (d: Weekday) => {
    if (freq.kind !== "weekdays") return;
    const set = new Set(freq.days);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    const next = Array.from(set).sort((a, b) => a - b) as Weekday[];
    setFreq({ kind: "weekdays", days: next.length ? next : [d] });
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    let target_value: number | null = null;
    if (type === "counter") {
      const n = parseInt(targetStr, 10);
      target_value = Number.isFinite(n) && n > 0 ? n : 1;
    } else if (type === "duration") {
      const min = parseFloat(targetStr);
      target_value =
        Number.isFinite(min) && min > 0 ? Math.round(min * 60) : 60;
    }

    const frequency = toHabitFrequency(freq);

    if (habit) {
      update.mutate(
        {
          id: habit.id,
          data: {
            name: trimmed,
            description: description.trim() || null,
            type,
            target_value,
            frequency,
            time_of_day: timeOfDay,
            is_active: isActive,
          },
        },
        { onSuccess: () => handleOpenChange(false) },
      );
    } else {
      create.mutate(
        {
          name: trimmed,
          description: description.trim() || null,
          type,
          target_value,
          frequency,
          time_of_day: timeOfDay,
          is_active: isActive,
        },
        { onSuccess: () => handleOpenChange(false) },
      );
    }
  };

  const pending = create.isPending || update.isPending;
  const showTarget = type === "counter" || type === "duration";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {habit ? copy.dialogEditHabitTitle : copy.dialogCreateHabitTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="habit-name">{copy.formName}</Label>
            <Input
              id="habit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="habit-desc">{copy.formDescription}</Label>
            <Input
              id="habit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={240}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>{copy.formType}</Label>
            <select
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as HabitType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {habitTypeLabel(t, copy)}
                </option>
              ))}
            </select>
          </div>

          {showTarget && (
            <div className="grid gap-1.5">
              <Label htmlFor="habit-target">{copy.formTarget}</Label>
              <Input
                id="habit-target"
                type="number"
                min={1}
                step={type === "duration" ? 0.5 : 1}
                value={targetStr}
                onChange={(e) => setTargetStr(e.target.value)}
              />
              <p className="text-[0.7rem] text-muted-foreground">
                {type === "counter"
                  ? copy.formTargetCounterHint
                  : copy.formTargetDurationHint}
              </p>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label>{copy.formFrequency}</Label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["daily", copy.formFrequencyDaily],
                  ["weekly_count", copy.formFrequencyWeekly],
                  ["weekdays", copy.formFrequencyWeekdays],
                  ["every_n_days", copy.formFrequencyEveryNDays],
                ] as const
              ).map(([k, label]) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={freq.kind === k ? "default" : "outline"}
                  onClick={() => {
                    if (k === "daily") setFreq({ kind: "daily" });
                    if (k === "weekly_count") setFreq({ kind: "weekly_count", count: 3 });
                    if (k === "weekdays")
                      setFreq({ kind: "weekdays", days: [1, 2, 3, 4, 5] as Weekday[] });
                    if (k === "every_n_days") setFreq({ kind: "every_n_days", n: 2 });
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {freq.kind === "weekly_count" && (
            <div className="grid gap-1.5">
              <Label htmlFor="weekly-c">{copy.formWeeklyCount}</Label>
              <Input
                id="weekly-c"
                type="number"
                min={1}
                max={7}
                value={freq.count}
                onChange={(e) =>
                  setFreq({
                    kind: "weekly_count",
                    count: Math.min(7, Math.max(1, parseInt(e.target.value, 10) || 1)),
                  })
                }
              />
            </div>
          )}

          {freq.kind === "every_n_days" && (
            <div className="grid gap-1.5">
              <Label htmlFor="every-n">{copy.formEveryN}</Label>
              <Input
                id="every-n"
                type="number"
                min={2}
                max={30}
                value={freq.n}
                onChange={(e) =>
                  setFreq({
                    kind: "every_n_days",
                    n: Math.min(30, Math.max(2, parseInt(e.target.value, 10) || 2)),
                  })
                }
              />
            </div>
          )}

          {freq.kind === "weekdays" && (
            <div className="flex flex-wrap gap-1">
              {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={freq.days.includes(d) ? "default" : "outline"}
                  className="min-w-9 px-2"
                  onClick={() => toggleWeekday(d)}
                >
                  {copy.weekdayShort[d]}
                </Button>
              ))}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label>{copy.formTimeOfDay}</Label>
            <select
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
            >
              {TODS.map((t) => (
                <option key={t} value={t}>
                  {timeOfDayLabel(t, copy)}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
            {copy.formActive}
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {copy.formCancel}
          </Button>
          <Button type="button" disabled={pending || !name.trim()} onClick={handleSubmit}>
            {habit ? copy.formSaveChanges : copy.formSaveNew}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
