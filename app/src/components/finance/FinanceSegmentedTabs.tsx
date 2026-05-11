"use client";

import type { ComponentProps } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** Shared layout for Month/Year, Income/Expense, and similar two-option controls. */
export const financeSegmentedTabsListClassName =
  "grid h-11 w-full grid-cols-2 gap-1 p-1 sm:flex sm:h-11 sm:min-w-[13.5rem]";

export const financeSegmentedTabClassName =
  "flex h-full min-h-0 w-full items-center justify-center rounded-md px-4 py-0 text-sm font-medium data-active:shadow-sm";

export function FinanceSegmentedTabsList({ className, ...props }: ComponentProps<typeof TabsList>) {
  return <TabsList className={cn(financeSegmentedTabsListClassName, className)} {...props} />;
}

export function FinanceSegmentedTab({ className, ...props }: ComponentProps<typeof TabsTrigger>) {
  return <TabsTrigger className={cn(financeSegmentedTabClassName, className)} {...props} />;
}
