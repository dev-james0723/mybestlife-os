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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateFinanceAccount, useUpdateFinanceAccount } from "@/hooks/use-finance";
import { FINANCE_ACCOUNT_TYPE_PRESETS, financeAccountTypeLabel } from "@/lib/finance/account-types";
import {
  FINANCE_DISPLAY_CURRENCY_CODES,
  isFinanceDisplayCurrencyCode,
  normalizeDisplayCurrencyCode,
} from "@/lib/finance/display-currencies";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import type { FinanceAccount } from "@/types/database";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

export type AccountFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: FinanceAccount | null;
  copy: FinanceUiCopy;
};

function normalizeAccountType(t: string): (typeof FINANCE_ACCOUNT_TYPE_PRESETS)[number] {
  return (FINANCE_ACCOUNT_TYPE_PRESETS as readonly string[]).includes(t)
    ? (t as (typeof FINANCE_ACCOUNT_TYPE_PRESETS)[number])
    : "other";
}

function accountFormDefaults(initial: FinanceAccount | null) {
  if (initial) {
    return {
      name: initial.name,
      accountType: normalizeAccountType(initial.account_type),
      balance: String(initial.balance),
      currency: normalizeDisplayCurrencyCode(initial.currency),
      isActive: initial.is_active,
    };
  }
  return {
    name: "",
    accountType: "checking" as const,
    balance: "",
    currency: normalizeDisplayCurrencyCode("USD"),
    isActive: true,
  };
}

export function AccountFormModal({ open, onOpenChange, initial, copy }: AccountFormModalProps) {
  const createAccount = useCreateFinanceAccount();
  const updateAccount = useUpdateFinanceAccount();

  const d0 = accountFormDefaults(initial);
  const [name, setName] = useState(d0.name);
  const [accountType, setAccountType] = useState<(typeof FINANCE_ACCOUNT_TYPE_PRESETS)[number]>(d0.accountType);
  const [balance, setBalance] = useState(d0.balance);
  const [currency, setCurrency] = useState(d0.currency);
  const [isActive, setIsActive] = useState(d0.isActive);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const isEdit = !!initial;

  const handleSubmit = async () => {
    setFieldError(null);
    if (!name.trim()) {
      setFieldError(copy.validationNameRequired);
      return;
    }
    const bal = balance.trim() === "" ? 0 : Number(balance);
    if (!Number.isFinite(bal)) {
      setFieldError(copy.validationLimitPositive);
      return;
    }
    const cur = currency.trim().toUpperCase();
    if (!isFinanceDisplayCurrencyCode(cur)) {
      setFieldError(copy.validationLimitPositive);
      return;
    }

    try {
      if (initial) {
        await updateAccount.mutateAsync({
          id: initial.id,
          input: {
            name: name.trim(),
            account_type: accountType,
            balance: bal,
            currency: cur,
            is_active: isActive,
          },
        });
      } else {
        await createAccount.mutateAsync({
          name: name.trim(),
          account_type: accountType,
          balance: bal,
          currency: cur,
          is_active: isActive,
        });
      }
      onOpenChange(false);
    } catch {
      /* toast in hooks */
    }
  };

  const pending = createAccount.isPending || updateAccount.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? copy.formAccountEditTitle : copy.formAccountAddTitle}</DialogTitle>
        </DialogHeader>
        <div className={cn("grid gap-4 py-2", typography.body)}>
          <div className="grid gap-2">
            <Label htmlFor="acc-name">{copy.fieldName}</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="acc-type">{copy.fieldAccountType}</Label>
            <Select
              value={accountType}
              onValueChange={(v) => {
                if ((FINANCE_ACCOUNT_TYPE_PRESETS as readonly string[]).includes(v ?? "")) {
                  setAccountType(v as (typeof FINANCE_ACCOUNT_TYPE_PRESETS)[number]);
                }
              }}
            >
              <SelectTrigger id="acc-type" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINANCE_ACCOUNT_TYPE_PRESETS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {financeAccountTypeLabel(copy, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="acc-currency">{copy.displayCurrencyLabel}</Label>
              <Select
                value={currency}
                onValueChange={(v) => {
                  if (v && isFinanceDisplayCurrencyCode(v)) setCurrency(v);
                }}
              >
                <SelectTrigger id="acc-currency" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCE_DISPLAY_CURRENCY_CODES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="acc-balance">{copy.fieldAccountBalance}</Label>
              <Input
                id="acc-balance"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="min-h-11"
              />
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
            <Checkbox
              id="acc-active"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(v === true)}
              className="mt-0.5"
            />
            <div className="grid gap-1">
              <Label htmlFor="acc-active" className="font-medium leading-none cursor-pointer">
                {copy.fieldAccountActiveLabel}
              </Label>
              <p className="text-xs text-muted-foreground">{copy.fieldAccountActiveHint}</p>
            </div>
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
