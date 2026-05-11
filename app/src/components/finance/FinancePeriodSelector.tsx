"use client";

import type { FinancePeriodPreset } from "@/types/finance";
import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function presetLabel(copy: FinanceUiCopy, preset: FinancePeriodPreset): string {
  switch (preset) {
    case "this_month":
      return copy.periodThisMonth;
    case "last_3_months":
      return copy.periodLast3Months;
    case "this_year":
      return copy.periodThisYear;
    case "custom":
      return copy.periodCustom;
    default:
      return copy.periodThisMonth;
  }
}

export type FinancePeriodSelectorProps = {
  value: FinancePeriodPreset;
  onChange: (preset: FinancePeriodPreset) => void;
  copy: FinanceUiCopy;
};

export function FinancePeriodSelector({ value, onChange, copy }: FinancePeriodSelectorProps) {
  return (
    <div className="flex flex-col gap-2 min-w-[10rem]">
      <Label htmlFor="finance-period" className="text-muted-foreground">
        {copy.periodLabel}
      </Label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === "this_month" || v === "last_3_months" || v === "this_year" || v === "custom") {
            onChange(v);
          }
        }}
      >
        <SelectTrigger id="finance-period" aria-label={copy.ariaPeriodSelect} className="w-full min-w-0">
          <SelectValue>{presetLabel(copy, value)}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" sideOffset={6}>
          <SelectItem value="this_month">{copy.periodThisMonth}</SelectItem>
          <SelectItem value="last_3_months">{copy.periodLast3Months}</SelectItem>
          <SelectItem value="this_year">{copy.periodThisYear}</SelectItem>
          <SelectItem value="custom" disabled>
            {copy.periodCustom}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
