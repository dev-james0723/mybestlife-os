"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  financeRepository,
  type CreateFinanceAccountInput,
  type CreateFinanceBudgetInput,
  type CreateFinanceCategoryInput,
  type CreateFinanceTransactionInput,
  type CreateSavingsGoalInput,
  type UpdateFinanceAccountInput,
  type UpdateFinanceBudgetInput,
  type UpdateFinanceCategoryInput,
  type UpdateFinanceTransactionInput,
  type UpdateSavingsGoalInput,
} from "@/lib/repositories/finance";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useFinanceAccounts() {
  return useQuery({
    queryKey: ["finance-accounts"],
    queryFn: financeRepository.getAccounts,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateFinanceAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFinanceAccountInput) => financeRepository.createAccount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-accounts"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.accountCreated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.accountCreateFailed);
    },
  });
}

export function useUpdateFinanceAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFinanceAccountInput }) =>
      financeRepository.updateAccount(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.accountUpdated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.accountUpdateFailed);
    },
  });
}

export function useDeleteFinanceAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeRepository.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.accountDeleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.accountDeleteFailed);
    },
  });
}

export type FinanceTransactionFilters = {
  type?: string;
  from?: string;
  to?: string;
};

export function useFinanceTransactions(filters?: FinanceTransactionFilters) {
  return useQuery({
    queryKey: [
      "finance-transactions",
      filters?.from ?? "",
      filters?.to ?? "",
      filters?.type ?? "",
    ] as const,
    queryFn: () => financeRepository.getTransactions(filters),
    placeholderData: keepPreviousData,
  });
}

export function useFinanceCategories() {
  return useQuery({
    queryKey: ["finance-categories"],
    queryFn: financeRepository.getCategories,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateFinanceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFinanceCategoryInput) => financeRepository.createCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-categories"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.categoryCreated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.categoryCreateFailed);
    },
  });
}

export function useUpdateFinanceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFinanceCategoryInput }) =>
      financeRepository.updateCategory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-categories"] });
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.categoryUpdated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.categoryUpdateFailed);
    },
  });
}

export function useDeleteFinanceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeRepository.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-categories"] });
      queryClient.invalidateQueries({ queryKey: ["finance-budgets"] });
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.categoryDeleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.categoryDeleteFailed);
    },
  });
}

export function useCreateFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFinanceTransactionInput) => financeRepository.createTransaction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-accounts"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.transactionCreated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.transactionCreateFailed);
    },
  });
}

export function useUpdateFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFinanceTransactionInput }) =>
      financeRepository.updateTransaction(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-accounts"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.transactionUpdated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.transactionUpdateFailed);
    },
  });
}

export function useDeleteFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeRepository.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-accounts"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.transactionDeleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.transactionDeleteFailed);
    },
  });
}

export function useCreateFinanceBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFinanceBudgetInput) => financeRepository.createBudget(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-budgets"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.budgetCreated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.budgetCreateFailed);
    },
  });
}

export function useUpdateFinanceBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFinanceBudgetInput }) =>
      financeRepository.updateBudget(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-budgets"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.budgetUpdated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.budgetUpdateFailed);
    },
  });
}

export function useDeleteFinanceBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeRepository.deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-budgets"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.budgetDeleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.budgetDeleteFailed);
    },
  });
}

export function useSavingsGoals() {
  return useQuery({
    queryKey: ["finance-savings-goals"],
    queryFn: financeRepository.getSavingsGoals,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSavingsGoalInput) => financeRepository.createSavingsGoal(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.savingsGoalCreated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.savingsGoalCreateFailed);
    },
  });
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSavingsGoalInput }) =>
      financeRepository.updateSavingsGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.savingsGoalUpdated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.savingsGoalUpdateFailed);
    },
  });
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeRepository.deleteSavingsGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.success(ui.savingsGoalDeleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.finance;
      toast.error(ui.savingsGoalDeleteFailed);
    },
  });
}
