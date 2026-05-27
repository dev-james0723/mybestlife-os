"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [activeIndex, setActiveIndex] = useState(0);

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
      if (!next) {
        setChecked(new Set());
        setActiveIndex(0);
      }
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
  const activeStep = steps[activeIndex] ?? null;
  const progress = steps.length === 0 ? 0 : Math.round((checked.size / steps.length) * 100);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{copy.routineRunTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <p className="text-sm font-medium">{routine.name}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {activeStep && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <p className="text-xs text-muted-foreground tabular-nums">
                {activeIndex + 1} / {steps.length}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{activeStep.title}</h3>
              {activeStep.description && (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {activeStep.description}
                </p>
              )}
              {activeStep.duration_seconds != null && (
                <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                  {Math.round(activeStep.duration_seconds / 60)} min target
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => toggle(activeStep.id, !checked.has(activeStep.id))}
                >
                  {checked.has(activeStep.id) ? "Undo step" : "Complete step"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Previous step"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Next step"
                  disabled={activeIndex >= steps.length - 1}
                  onClick={() => setActiveIndex((i) => Math.min(steps.length - 1, i + 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </section>
          )}

          <ol className="max-h-48 space-y-2 overflow-y-auto pr-1">
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
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setActiveIndex(i)}
                >
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {i + 1}.{" "}
                  </span>
                  <span className="text-sm font-medium">{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
            {["Easy", "Fine", "Too hard", "Bad timing", "Modify next time"].map((label) => (
              <Button key={label} type="button" variant="outline" size="xs">
                {label}
              </Button>
            ))}
          </div>
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
