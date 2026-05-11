"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { financeRepository } from "@/lib/repositories/finance";

/** Runs once per session to create default categories when the user has none. */
export function useFinanceCategorySeed() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["finance-category-seed"],
    queryFn: () => financeRepository.ensureDefaultFinanceCategories(),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data === true) {
      queryClient.invalidateQueries({ queryKey: ["finance-categories"] });
    }
  }, [query.data, queryClient]);

  return query;
}
