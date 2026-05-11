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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateFinanceCategory, useUpdateFinanceCategory } from "@/hooks/use-finance";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { FinanceCategory } from "@/types/database";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type CategoryFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: FinanceCategory | null;
  /** Used when creating a category (ignored when `initial` is set). */
  defaultType: FinanceCategory["type"];
  copy: FinanceUiCopy;
};

function categoryFormDefaults(initial: FinanceCategory | null, defaultType: FinanceCategory["type"]) {
  if (initial) {
    return { name: initial.name, type: initial.type };
  }
  return { name: "", type: defaultType };
}

export function CategoryFormModal({
  open,
  onOpenChange,
  initial,
  defaultType,
  copy,
}: CategoryFormModalProps) {
  const createCategory = useCreateFinanceCategory();
  const updateCategory = useUpdateFinanceCategory();

  const d0 = categoryFormDefaults(initial, defaultType);
  const [name, setName] = useState(d0.name);
  const [type, setType] = useState<FinanceCategory["type"]>(d0.type);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const isEdit = !!initial;

  const handleSubmit = async () => {
    setFieldError(null);
    if (!name.trim()) {
      setFieldError(copy.validationNameRequired);
      return;
    }
    try {
      if (initial) {
        await updateCategory.mutateAsync({
          id: initial.id,
          input: { name: name.trim() },
        });
      } else {
        await createCategory.mutateAsync({
          name: name.trim(),
          type,
        });
      }
      onOpenChange(false);
    } catch {
      /* toast in hooks */
    }
  };

  const pending = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? copy.formCategoryEditTitle : copy.formCategoryAddTitle}</DialogTitle>
        </DialogHeader>
        <div className={cn("grid gap-4 py-2", typography.body)}>
          <div className="grid gap-2">
            <Label htmlFor="cat-name">{copy.fieldName}</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-11"
            />
          </div>
          {!isEdit ? (
            <div className="grid gap-2">
              <Label htmlFor="cat-type">{copy.fieldType}</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  if (v === "income" || v === "expense") setType(v);
                }}
              >
                <SelectTrigger id="cat-type" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">{copy.categoriesIncomeTab}</SelectItem>
                  <SelectItem value="expense">{copy.categoriesExpenseTab}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
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
