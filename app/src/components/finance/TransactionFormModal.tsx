"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateFinanceTransaction,
  useUpdateFinanceTransaction,
} from "@/hooks/use-finance";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { FinanceAccount, FinanceCategory, FinanceTransaction } from "@/types/database";
import type { FinanceTransactionWithRelations } from "@/lib/repositories/finance";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type TransactionFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: FinanceTransactionWithRelations | null;
  accounts: FinanceAccount[] | undefined;
  categories: FinanceCategory[] | undefined;
  copy: FinanceUiCopy;
};

function transactionFormDefaults(initial: FinanceTransactionWithRelations | null) {
  if (initial) {
    return {
      type: initial.type,
      amount: String(initial.amount),
      transactionDate: initial.transaction_date,
      description: initial.description ?? "",
      accountId: initial.account_id ?? "",
      categoryId: initial.category_id ?? "",
    };
  }
  return {
    type: "expense" as FinanceTransaction["type"],
    amount: "",
    transactionDate: format(new Date(), "yyyy-MM-dd"),
    description: "",
    accountId: "",
    categoryId: "",
  };
}

export function TransactionFormModal({
  open,
  onOpenChange,
  initial,
  accounts,
  categories,
  copy,
}: TransactionFormModalProps) {
  const createTx = useCreateFinanceTransaction();
  const updateTx = useUpdateFinanceTransaction();

  const d0 = transactionFormDefaults(initial);
  const [type, setType] = useState<FinanceTransaction["type"]>(d0.type);
  const [amount, setAmount] = useState(d0.amount);
  const [transactionDate, setTransactionDate] = useState(d0.transactionDate);
  const [description, setDescription] = useState(d0.description);
  const [accountId, setAccountId] = useState<string>(d0.accountId);
  const [categoryId, setCategoryId] = useState<string>(d0.categoryId);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const isEdit = !!initial;

  const categoriesForType = useMemo(() => {
    if (!categories?.length || type === "transfer") return [];
    return categories.filter((c) => c.type === type);
  }, [categories, type]);

  const handleSubmit = async () => {
    setFieldError(null);
    const amt = Number(amount);
    if (!amount.trim() || !Number.isFinite(amt) || amt <= 0) {
      setFieldError(copy.validationAmountPositive);
      return;
    }

    const payload = {
      account_id: accountId || null,
      category_id: type === "transfer" ? null : categoryId || null,
      type,
      amount: amt,
      description: description.trim() || null,
      transaction_date: transactionDate,
    };

    try {
      if (initial) {
        await updateTx.mutateAsync({ id: initial.id, input: payload });
      } else {
        await createTx.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      /* toast handled in hook */
    }
  };

  const pending = createTx.isPending || updateTx.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? copy.formTxEditTitle : copy.formTxAddTitle}</DialogTitle>
        </DialogHeader>
        <div className={cn("grid gap-4 py-2", typography.body)}>
          <div className="grid gap-2">
            <Label htmlFor="tx-type">{copy.fieldType}</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                if (v === "income" || v === "expense" || v === "transfer") {
                  setType(v);
                  setCategoryId("");
                }
              }}
            >
              <SelectTrigger id="tx-type" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">{copy.typeIncome}</SelectItem>
                <SelectItem value="expense">{copy.typeExpense}</SelectItem>
                <SelectItem value="transfer">{copy.typeTransfer}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tx-amount">{copy.fieldAmount}</Label>
              <Input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="min-h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tx-date">{copy.fieldDate}</Label>
              <DatePickerInput value={transactionDate} onChange={setTransactionDate} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tx-note">{copy.fieldNote}</Label>
            <Input
              id="tx-note"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-11"
            />
          </div>
          {accounts && accounts.length > 0 ? (
            <div className="grid gap-2">
              <Label>{copy.fieldAccount}</Label>
              <Select
                value={accountId || "none"}
                onValueChange={(v) => setAccountId(v === "none" ? "" : (v ?? ""))}
              >
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{copy.fieldAccountNone}</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {categoriesForType.length > 0 ? (
            <div className="grid gap-2">
              <Label>
                {copy.fieldCategory}{" "}
                <span className="text-muted-foreground font-normal">({copy.fieldCategoryOptional})</span>
              </Label>
              <Select
                value={categoryId || "none"}
                onValueChange={(v) => setCategoryId(v === "none" ? "" : (v ?? ""))}
              >
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{copy.fieldCategoryOptional}</SelectItem>
                  {categoriesForType.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
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
