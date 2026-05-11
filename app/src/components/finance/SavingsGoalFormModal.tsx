"use client";

import { useState } from "react";
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
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { useCreateSavingsGoal, useUpdateSavingsGoal } from "@/hooks/use-finance";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { SavingsGoal } from "@/types/database";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type SavingsGoalFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: SavingsGoal | null;
  copy: FinanceUiCopy;
};

function savingsGoalDefaults(initial: SavingsGoal | null) {
  if (initial) {
    return {
      name: initial.name,
      target: String(initial.target_amount),
      current: String(initial.current_amount),
      deadline: initial.deadline ?? "",
    };
  }
  return { name: "", target: "", current: "", deadline: "" };
}

export function SavingsGoalFormModal({ open, onOpenChange, initial, copy }: SavingsGoalFormModalProps) {
  const createGoal = useCreateSavingsGoal();
  const updateGoal = useUpdateSavingsGoal();

  const d0 = savingsGoalDefaults(initial);
  const [name, setName] = useState(d0.name);
  const [target, setTarget] = useState(d0.target);
  const [current, setCurrent] = useState(d0.current);
  const [deadline, setDeadline] = useState(d0.deadline);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const isEdit = !!initial;

  const handleSubmit = async () => {
    setFieldError(null);
    if (!name.trim()) {
      setFieldError(copy.validationNameRequired);
      return;
    }
    const tgt = Number(target);
    if (!target.trim() || !Number.isFinite(tgt) || tgt <= 0) {
      setFieldError(copy.validationTargetPositive);
      return;
    }
    const cur = current.trim() === "" ? 0 : Number(current);
    if (!Number.isFinite(cur) || cur < 0) {
      setFieldError(copy.validationNonNegative);
      return;
    }

    try {
      if (initial) {
        await updateGoal.mutateAsync({
          id: initial.id,
          data: {
            name: name.trim(),
            target_amount: tgt,
            current_amount: cur,
            deadline: deadline || null,
          },
        });
      } else {
        await createGoal.mutateAsync({
          name: name.trim(),
          target_amount: tgt,
          current_amount: cur,
          deadline: deadline || null,
        });
      }
      onOpenChange(false);
    } catch {
      /* toast in hook */
    }
  };

  const pending = createGoal.isPending || updateGoal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? copy.formGoalEditTitle : copy.formGoalAddTitle}</DialogTitle>
        </DialogHeader>
        <div className={cn("grid gap-4 py-2", typography.body)}>
          <div className="grid gap-2">
            <Label htmlFor="goal-name">{copy.fieldName}</Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={copy.goalNamePlaceholder}
              className="min-h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="goal-target">{copy.fieldTargetAmount}</Label>
              <Input
                id="goal-target"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="min-h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal-current">{copy.fieldCurrentSaved}</Label>
              <Input
                id="goal-current"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="min-h-11"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{copy.fieldDeadlineOptional}</Label>
            <DatePickerInput value={deadline} onChange={setDeadline} />
          </div>
          {fieldError ? (
            <p className="text-sm text-destructive" role="alert">
              {fieldError}
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {copy.formCancel}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending} className="min-h-11">
            {pending ? copy.formSaving : copy.formSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
