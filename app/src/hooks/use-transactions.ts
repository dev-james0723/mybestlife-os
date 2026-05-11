"use client";

import { useFinanceTransactions, type FinanceTransactionFilters } from "@/hooks/use-finance";

export type { FinanceTransactionFilters };

/** Server-filtered transactions for the selected period (and optional type filter). */
export function useTransactions(filters: FinanceTransactionFilters | undefined) {
  return useFinanceTransactions(filters);
}
