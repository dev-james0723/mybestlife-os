"use client";

import { useState } from "react";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import { timeOfDayLabel } from "@/lib/i18n/habits-ui";
import type { TimeOfDay } from "@/lib/habits/types";
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
import { useCreateRoutine, useCreateRoutineStep } from "@/hooks/use-routines";

type StepRow = { id: string; title: string; minutes: string };

function newStepRow(): StepRow {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    title: "",
    minutes: "",
  };
}

const TODS: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];

export interface CreateRoutineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: HabitsUiCopy;
}

export function CreateRoutineDialog({
  open,
  onOpenChange,
  copy,
}: CreateRoutineDialogProps) {
  const createRoutine = useCreateRoutine();
  const createStep = useCreateRoutineStep();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("anytime");
  const [steps, setSteps] = useState<StepRow[]>(() => [newStepRow()]);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName("");
      setDescription("");
      setTimeOfDay("anytime");
      setSteps([newStepRow()]);
    }
    onOpenChange(next);
  };

  const addStep = () => setSteps((s) => [...s, newStepRow()]);
  const removeStep = (i: number) =>
    setSteps((s) => (s.length <= 1 ? s : s.filter((_, j) => j !== i)));

  const updateStep = (i: number, patch: Partial<StepRow>) =>
    setSteps((s) => s.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const filled = steps
      .map((r) => ({ title: r.title.trim(), minutes: r.minutes.trim() }))
      .filter((r) => r.title.length > 0);
    if (filled.length === 0) return;

    try {
      const routine = await createRoutine.mutateAsync({
        name: trimmed,
        description: description.trim() || null,
        time_of_day: timeOfDay,
      });
      for (let i = 0; i < filled.length; i++) {
        const m = parseFloat(filled[i]!.minutes);
        const duration_seconds =
          Number.isFinite(m) && m > 0 ? Math.round(m * 60) : null;
        await createStep.mutateAsync({
          routine_id: routine.id,
          position: i,
          title: filled[i]!.title,
          description: null,
          duration_seconds,
        });
      }
      handleOpenChange(false);
    } catch {
      /* toasts from hooks */
    }
  };

  const pending = createRoutine.isPending || createStep.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{copy.dialogCreateRoutineTitle}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="rt-name">{copy.formName}</Label>
            <Input
              id="rt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rt-desc">{copy.formDescription}</Label>
            <Input
              id="rt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={240}
            />
          </div>
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

          <div className="space-y-2">
            <Label>{copy.detailStepsTitle}</Label>
            {steps.map((row, i) => (
              <div key={row.id} className="flex flex-col gap-2 rounded-lg border border-border/60 p-2 sm:flex-row sm:items-end">
                <div className="grid flex-1 gap-1">
                  <span className="text-[0.65rem] text-muted-foreground">
                    {copy.routineStepTitle}
                  </span>
                  <Input
                    value={row.title}
                    onChange={(e) => updateStep(i, { title: e.target.value })}
                    maxLength={120}
                  />
                </div>
                <div className="grid w-full gap-1 sm:w-28">
                  <span className="text-[0.65rem] text-muted-foreground">
                    {copy.routineStepMinutes}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={row.minutes}
                    onChange={(e) => updateStep(i, { minutes: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => removeStep(i)}
                >
                  {copy.routineRemoveStep}
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              {copy.routineAddStep}
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {copy.formCancel}
          </Button>
          <Button
            type="button"
            disabled={pending || !name.trim()}
            onClick={() => void handleSubmit()}
          >
            {copy.routineSubmitCreate}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
