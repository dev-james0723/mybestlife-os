"use client";

import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateFinanceBudget } from "@/hooks/use-finance";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { FinanceBudget, FinanceCategory } from "@/types/database";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type AddBudgetModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodStart: string;
  periodEnd: string;
  categories: FinanceCategory[] | undefined;
  existingBudgets: FinanceBudget[] | undefined;
  copy: FinanceUiCopy;
};

export function AddBudgetModal({
  open,
  onOpenChange,
  periodStart,
  periodEnd,
  categories,
  existingBudgets,
  copy,
}: AddBudgetModalProps) {
  const createBudget = useCreateFinanceBudget();

  const takenCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const b of existingBudgets ?? []) {
      if (b.period_start === periodStart && b.period_end === periodEnd) {
        ids.add(b.category_id);
      }
    }
    return ids;
  }, [existingBudgets, periodStart, periodEnd]);

  const expenseCategories = useMemo(() => {
    return (categories ?? []).filter((c) => c.type === "expense" && !takenCategoryIds.has(c.id));
  }, [categories, takenCategoryIds]);

  /** `null` = “use first available category” after open / list change. */
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [limit, setLimit] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const resolvedCategoryId = useMemo(() => {
    if (expenseCategories.length === 0) return "";
    if (categoryId && expenseCategories.some((c) => c.id === categoryId)) {
      return categoryId;
    }
    return expenseCategories[0]!.id;
  }, [expenseCategories, categoryId]);

  const selectedCategoryName = useMemo(
    () => expenseCategories.find((c) => c.id === resolvedCategoryId)?.name ?? "",
    [expenseCategories, resolvedCategoryId],
  );

  const handleSubmit = async () => {
    setFieldError(null);
    const lim = Number(limit);
    if (!limit.trim() || !Number.isFinite(lim) || lim < 0) {
      setFieldError(copy.validationLimitPositive);
      return;
    }
    if (!resolvedCategoryId) {
      return;
    }
    try {
      await createBudget.mutateAsync({
        category_id: resolvedCategoryId,
        period_start: periodStart,
        period_end: periodEnd,
        limit_amount: lim,
      });
      onOpenChange(false);
    } catch {
      /* toast in hook */
    }
  };

  const pending = createBudget.isPending;
  const noCategories = expenseCategories.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setCategoryId(null);
          setLimit("");
          setFieldError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{copy.formBudgetAddTitle}</DialogTitle>
        </DialogHeader>
        <div className={cn("grid gap-4 py-2", typography.body)}>
          {noCategories ? (
            <p className="text-sm text-muted-foreground">{copy.budgetEmptyDescription}</p>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="budget-cat">{copy.fieldBudgetCategory}</Label>
                <Select
                  value={resolvedCategoryId}
                  onValueChange={(v) => {
                    if (v) setCategoryId(v);
                  }}
                >
                  <SelectTrigger id="budget-cat" className="min-h-11 w-full">
                    <SelectValue>{selectedCategoryName}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" sideOffset={6}>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="budget-limit">{copy.fieldBudgetLimit}</Label>
                <Input
                  id="budget-limit"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="min-h-11"
                />
              </div>
            </>
          )}
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
          <Button type="button" onClick={handleSubmit} disabled={pending || noCategories} className="min-h-11">
            {pending ? copy.formSaving : copy.formSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
