"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { financeRepository } from "@/lib/repositories/finance";

export function useBudgets(range: { from: string; to: string } | undefined) {
  return useQuery({
    queryKey: ["finance-budgets", range?.from, range?.to],
    queryFn: () => financeRepository.getBudgets(range),
    placeholderData: keepPreviousData,
  });
}
