"use client";

import { useCallback, useMemo, useState } from "react";
import type { RoutineWithSteps } from "@/lib/habits/types";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpsertRoutineCompletion } from "@/hooks/use-routines";

export interface RoutineRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine: RoutineWithSteps | null;
  completionDate: string;
  copy: HabitsUiCopy;
}

export function RoutineRunDialog({
  open,
  onOpenChange,
  routine,
  completionDate,
  copy,
}: RoutineRunDialogProps) {
  const upsert = useUpsertRoutineCompletion();
  const steps = useMemo(() => {
    if (!routine) return [];
    return [...routine.steps].sort((a, b) => a.position - b.position);
  }, [routine]);

  const [checked, setChecked] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string, next: boolean) => {
    setChecked((prev) => {
      const n = new Set(prev);
      if (next) n.add(id);
      else n.delete(id);
      return n;
    });
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setChecked(new Set());
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const handleFinish = useCallback(() => {
    if (!routine) return;
    const completed_step_ids = steps
      .filter((s) => checked.has(s.id))
      .map((s) => s.id);
    upsert.mutate(
      {
        routine_id: routine.id,
        completion_date: completionDate,
        completed_step_ids,
      },
      {
        onSuccess: () => handleOpenChange(false),
      },
    );
  }, [routine, steps, checked, completionDate, upsert, handleOpenChange]);

  if (!routine) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{copy.routineRunTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <p className="text-sm text-muted-foreground">{routine.name}</p>
          <ol className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {steps.map((s, i) => (
              <li
                key={s.id}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-2"
              >
                <Checkbox
                  checked={checked.has(s.id)}
                  onCheckedChange={(v) => toggle(s.id, v === true)}
                  className="mt-0.5"
                  aria-label={s.title}
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {i + 1}.{" "}
                  </span>
                  <span className="text-sm font-medium">{s.title}</span>
                  {s.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            {copy.routineRunCancel}
          </Button>
          <Button
            type="button"
            onClick={handleFinish}
            disabled={upsert.isPending}
          >
            {copy.routineRunDone}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
