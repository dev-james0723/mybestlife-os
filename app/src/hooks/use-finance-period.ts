"use client";

import { useMemo, useState } from "react";
import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import type { FinancePeriodPreset, FinancePeriodRange } from "@/types/finance";

export function computeFinancePeriodRange(preset: FinancePeriodPreset): FinancePeriodRange {
  const today = new Date();
  if (preset === "this_month") {
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    return {
      preset,
      from: format(start, "yyyy-MM-dd"),
      to: format(end, "yyyy-MM-dd"),
    };
  }
  if (preset === "last_3_months") {
    const end = endOfMonth(today);
    const start = startOfMonth(subMonths(today, 2));
    return {
      preset,
      from: format(start, "yyyy-MM-dd"),
      to: format(end, "yyyy-MM-dd"),
    };
  }
  if (preset === "this_year") {
    const start = startOfYear(today);
    const end = endOfYear(today);
    return {
      preset,
      from: format(start, "yyyy-MM-dd"),
      to: format(end, "yyyy-MM-dd"),
    };
  }
  return computeFinancePeriodRange("this_month");
}

export function useFinancePeriod() {
  const [preset, setPreset] = useState<FinancePeriodPreset>("this_month");
  const range = useMemo(() => computeFinancePeriodRange(preset), [preset]);
  return { preset, setPreset, range };
}
