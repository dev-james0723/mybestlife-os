import type { FinanceTransactionWithRelations } from "@/lib/repositories/finance";
import type { FinanceCategory } from "@/types/database";

/** Preset ranges for server-filtered queries (custom uses explicit from/to). */
export type FinancePeriodPreset = "this_month" | "last_3_months" | "this_year" | "custom";

/** Resolved period passed to Supabase filters. */
export type FinancePeriodRange = {
  preset: FinancePeriodPreset;
  /** Inclusive `YYYY-MM-DD` */
  from: string;
  /** Inclusive `YYYY-MM-DD` */
  to: string;
};

/** Aggregated headline figures in the user’s display currency (Phase 2+ UI). */
export type FinancialSummary = {
  netWorthDisplay: number;
  totalIncomeDisplay: number;
  totalExpenseDisplay: number;
  displayCurrency: string;
};

/** DB category plus spent/limit for budget UI (limit from `finance_budgets`). */
export type BudgetCategoryRow = FinanceCategory & {
  spent: number;
  limit: number;
};

export type TransactionRow = FinanceTransactionWithRelations;

export type { FinanceBudget as Budget, FinanceTransaction as Transaction, SavingsGoal } from "@/types/database";
