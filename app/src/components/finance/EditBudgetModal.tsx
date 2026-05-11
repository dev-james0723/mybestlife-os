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
import { useUpdateFinanceBudget } from "@/hooks/use-finance";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { FinanceBudget } from "@/types/database";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type EditBudgetModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: FinanceBudget;
  categoryName: string;
  copy: FinanceUiCopy;
};

function limitFromBudget(b: FinanceBudget): string {
  const n = Number(b.limit_amount);
  return Number.isFinite(n) ? String(n) : "";
}

export function EditBudgetModal({ open, onOpenChange, budget, categoryName, copy }: EditBudgetModalProps) {
  const updateBudget = useUpdateFinanceBudget();
  const [limit, setLimit] = useState(() => limitFromBudget(budget));
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleClose = (next: boolean) => {
    if (!next) {
      setLimit(limitFromBudget(budget));
      setFieldError(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    setFieldError(null);
    const v = Number(limit);
    if (!limit.trim() || !Number.isFinite(v) || v < 0) {
      setFieldError(copy.validationLimitPositive);
      return;
    }
    try {
      await updateBudget.mutateAsync({
        id: budget.id,
        input: { limit_amount: v },
      });
      handleClose(false);
    } catch {
      /* toast in hook */
    }
  };

  const pending = updateBudget.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{copy.formBudgetEditTitle}</DialogTitle>
        </DialogHeader>
        <div className={cn("grid gap-4 py-2", typography.body)}>
          <p className="text-sm font-medium text-foreground">{categoryName}</p>
          <div className="grid gap-2">
            <Label htmlFor="edit-budget-limit">{copy.fieldBudgetLimit}</Label>
            <Input
              id="edit-budget-limit"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="min-h-11"
            />
          </div>
          {fieldError ? (
            <p className="text-sm text-destructive" role="alert">
              {fieldError}
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={pending}>
            {copy.formCancel}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={pending} className="min-h-11">
            {pending ? copy.formSaving : copy.formSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
