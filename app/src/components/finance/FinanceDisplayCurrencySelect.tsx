"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateDisplayCurrency } from "@/hooks/use-finance-display-currency";
import {
  FINANCE_DISPLAY_CURRENCY_CODES,
  isFinanceDisplayCurrencyCode,
  normalizeDisplayCurrencyCode,
} from "@/lib/finance/display-currencies";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";

export type FinanceDisplayCurrencySelectProps = {
  value: string;
  copy: FinanceUiCopy;
};

export function FinanceDisplayCurrencySelect({ value, copy }: FinanceDisplayCurrencySelectProps) {
  const mutation = useUpdateDisplayCurrency();
  const safe = normalizeDisplayCurrencyCode(value);

  return (
    <div className="flex flex-col gap-2 min-w-[10rem]">
      <Label htmlFor="finance-display-currency" className="text-muted-foreground">
        {copy.displayCurrencyLabel}
      </Label>
      <Select
        value={safe}
        disabled={mutation.isPending}
        onValueChange={(v) => {
          if (v !== null && isFinanceDisplayCurrencyCode(v)) mutation.mutate(v);
        }}
      >
        <SelectTrigger
          id="finance-display-currency"
          aria-label={copy.ariaDisplayCurrencySelect}
          className="w-full min-w-0"
        >
          <SelectValue>{safe}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" sideOffset={6}>
          {FINANCE_DISPLAY_CURRENCY_CODES.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
