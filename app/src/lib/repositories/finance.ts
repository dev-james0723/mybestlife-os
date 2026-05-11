import { createClient } from "@/lib/supabase/client";
import { DEFAULT_FINANCE_CATEGORY_SEEDS } from "@/lib/finance/default-categories";
import type {
  FinanceAccount,
  FinanceBudget,
  FinanceCategory,
  FinanceTransaction,
  SavingsGoal,
} from "@/types/database";

export type FinanceTransactionWithRelations = FinanceTransaction & {
  account?: Pick<FinanceAccount, "id" | "name" | "currency"> | null;
  category?: Pick<FinanceCategory, "id" | "name"> | null;
};

export type CreateFinanceAccountInput = {
  name: string;
  account_type: string;
  balance?: number;
  currency?: string;
  is_active?: boolean;
};

export type UpdateFinanceAccountInput = Partial<
  Pick<CreateFinanceAccountInput, "name" | "account_type" | "balance" | "currency" | "is_active">
>;

export type CreateFinanceTransactionInput = {
  account_id?: string | null;
  category_id?: string | null;
  type: FinanceTransaction["type"];
  amount: number;
  description?: string | null;
  transaction_date: string;
  tags?: string[];
};

export type UpdateFinanceTransactionInput = Partial<CreateFinanceTransactionInput>;

export type CreateSavingsGoalInput = {
  name: string;
  target_amount: number;
  current_amount?: number;
  deadline?: string | null;
};

export type UpdateSavingsGoalInput = Partial<
  Pick<CreateSavingsGoalInput, "name" | "target_amount" | "current_amount" | "deadline">
>;

export type CreateFinanceBudgetInput = {
  category_id: string;
  period_start: string;
  period_end: string;
  limit_amount: number;
};

export type UpdateFinanceBudgetInput = Partial<
  Pick<CreateFinanceBudgetInput, "category_id" | "period_start" | "period_end" | "limit_amount">
>;

export type CreateFinanceCategoryInput = {
  name: string;
  type: FinanceCategory["type"];
  icon?: string | null;
  color?: string | null;
};

export type UpdateFinanceCategoryInput = Partial<
  Pick<CreateFinanceCategoryInput, "name" | "type" | "icon" | "color">
>;

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return 0;
};

function mapAccount(row: FinanceAccount): FinanceAccount {
  return { ...row, balance: toNumber(row.balance) };
}

function mapTransaction(row: FinanceTransactionWithRelations): FinanceTransactionWithRelations {
  return { ...row, amount: toNumber(row.amount) };
}

function mapSavingsGoal(row: SavingsGoal): SavingsGoal {
  return {
    ...row,
    target_amount: toNumber(row.target_amount),
    current_amount: toNumber(row.current_amount),
  };
}

function mapBudget(row: FinanceBudget): FinanceBudget {
  return { ...row, limit_amount: toNumber(row.limit_amount) };
}

async function requireAuthUserId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export const financeRepository = {
  async getAccounts(): Promise<FinanceAccount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("finance_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapAccount);
  },

  async getAccountById(id: string): Promise<FinanceAccount> {
    const supabase = createClient();
    const { data, error } = await supabase.from("finance_accounts").select("*").eq("id", id).single();
    if (error) throw error;
    return mapAccount(data);
  },

  async createAccount(input: CreateFinanceAccountInput): Promise<FinanceAccount> {
    const supabase = createClient();
    const userId = await requireAuthUserId(supabase);
    const { data, error } = await supabase
      .from("finance_accounts")
      .insert({
        user_id: userId,
        name: input.name,
        account_type: input.account_type,
        balance: input.balance ?? 0,
        currency: input.currency ?? "USD",
        is_active: input.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return mapAccount(data);
  },

  async updateAccount(id: string, input: UpdateFinanceAccountInput): Promise<FinanceAccount> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("finance_accounts")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapAccount(data);
  },

  async deleteAccount(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("finance_accounts").delete().eq("id", id);
    if (error) throw error;
  },

  async getCategories(): Promise<FinanceCategory[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from("finance_categories").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  },

  async createCategory(input: CreateFinanceCategoryInput): Promise<FinanceCategory> {
    const supabase = createClient();
    const userId = await requireAuthUserId(supabase);
    const { data, error } = await supabase
      .from("finance_categories")
      .insert({
        user_id: userId,
        name: input.name.trim(),
        type: input.type,
        icon: input.icon ?? null,
        color: input.color ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as FinanceCategory;
  },

  async updateCategory(id: string, input: UpdateFinanceCategoryInput): Promise<FinanceCategory> {
    const supabase = createClient();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.type !== undefined) patch.type = input.type;
    if (input.icon !== undefined) patch.icon = input.icon;
    if (input.color !== undefined) patch.color = input.color;
    const { data, error } = await supabase.from("finance_categories").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data as FinanceCategory;
  },

  async deleteCategory(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("finance_categories").delete().eq("id", id);
    if (error) throw error;
  },

  async getTransactions(filters?: {
    type?: string;
    from?: string;
    to?: string;
  }): Promise<FinanceTransactionWithRelations[]> {
    const supabase = createClient();
    let q = supabase
      .from("finance_transactions")
      .select("*, account:finance_accounts(id, name, currency), category:finance_categories(id, name)")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (filters?.type && filters.type !== "all") {
      q = q.eq("type", filters.type);
    }
    if (filters?.from) {
      q = q.gte("transaction_date", filters.from);
    }
    if (filters?.to) {
      q = q.lte("transaction_date", filters.to);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((row) => mapTransaction(row as FinanceTransactionWithRelations));
  },

  async getTransactionById(id: string): Promise<FinanceTransactionWithRelations> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("finance_transactions")
      .select("*, account:finance_accounts(id, name, currency), category:finance_categories(id, name)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return mapTransaction(data as FinanceTransactionWithRelations);
  },

  async createTransaction(input: CreateFinanceTransactionInput): Promise<FinanceTransaction> {
    const supabase = createClient();
    const userId = await requireAuthUserId(supabase);
    const { data, error } = await supabase
      .from("finance_transactions")
      .insert({
        user_id: userId,
        account_id: input.account_id ?? null,
        category_id: input.category_id ?? null,
        type: input.type,
        amount: input.amount,
        description: input.description ?? null,
        transaction_date: input.transaction_date,
        tags: input.tags ?? [],
      })
      .select()
      .single();
    if (error) throw error;
    return mapTransaction(data as FinanceTransactionWithRelations);
  },

  async updateTransaction(id: string, input: UpdateFinanceTransactionInput): Promise<FinanceTransaction> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("finance_transactions")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapTransaction(data as FinanceTransactionWithRelations);
  },

  async deleteTransaction(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("finance_transactions").delete().eq("id", id);
    if (error) throw error;
  },

  async getSavingsGoals(): Promise<SavingsGoal[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("finance_savings_goals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSavingsGoal);
  },

  async getSavingsGoalById(id: string): Promise<SavingsGoal> {
    const supabase = createClient();
    const { data, error } = await supabase.from("finance_savings_goals").select("*").eq("id", id).single();
    if (error) throw error;
    return mapSavingsGoal(data);
  },

  async createSavingsGoal(input: CreateSavingsGoalInput): Promise<SavingsGoal> {
    const supabase = createClient();
    const userId = await requireAuthUserId(supabase);
    const { data, error } = await supabase
      .from("finance_savings_goals")
      .insert({
        user_id: userId,
        name: input.name,
        target_amount: input.target_amount,
        current_amount: input.current_amount ?? 0,
        deadline: input.deadline ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapSavingsGoal(data);
  },

  async updateSavingsGoal(id: string, input: UpdateSavingsGoalInput): Promise<SavingsGoal> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("finance_savings_goals")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapSavingsGoal(data);
  },

  async deleteSavingsGoal(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("finance_savings_goals").delete().eq("id", id);
    if (error) throw error;
  },

  async getBudgets(range?: { from: string; to: string }): Promise<FinanceBudget[]> {
    const supabase = createClient();
    let q = supabase.from("finance_budgets").select("*").order("period_start", { ascending: false });
    if (range) {
      q = q.lte("period_start", range.to).gte("period_end", range.from);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((row) => mapBudget(row as FinanceBudget));
  },

  async createBudget(input: CreateFinanceBudgetInput): Promise<FinanceBudget> {
    const supabase = createClient();
    const userId = await requireAuthUserId(supabase);

    const { data, error } = await supabase
      .from("finance_budgets")
      .insert({
        user_id: userId,
        category_id: input.category_id,
        period_start: input.period_start,
        period_end: input.period_end,
        limit_amount: input.limit_amount,
      })
      .select()
      .single();
    if (error) throw error;
    return mapBudget(data as FinanceBudget);
  },

  async updateBudget(id: string, input: UpdateFinanceBudgetInput): Promise<FinanceBudget> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("finance_budgets")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapBudget(data as FinanceBudget);
  },

  async deleteBudget(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("finance_budgets").delete().eq("id", id);
    if (error) throw error;
  },

  /**
   * Idempotent: inserts default income/expense categories only when the user has none.
   * @returns true if a seed insert ran.
   */
  async ensureDefaultFinanceCategories(): Promise<boolean> {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Not authenticated");

    const { count, error: countError } = await supabase
      .from("finance_categories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (countError) throw countError;
    if ((count ?? 0) > 0) return false;

    const rows = DEFAULT_FINANCE_CATEGORY_SEEDS.map((c) => ({
      user_id: user.id,
      name: c.name,
      type: c.type,
      icon: null as string | null,
      color: null as string | null,
    }));

    const { error: insertError } = await supabase.from("finance_categories").insert(rows);
    if (insertError) throw insertError;
    return true;
  },
};
