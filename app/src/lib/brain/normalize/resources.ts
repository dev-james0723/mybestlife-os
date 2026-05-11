/**
 * Resource & finance normalizers.
 *
 * Imports:
 *   - documents → "document"
 *   - assets → "asset"
 *   - savings goals → "finance_item" (with kind: savings_goal)
 *   - finance accounts/categories/budgets → "finance_item" (lighter weight)
 *   - software vault → "tool"
 */

import type {
  Asset,
  Document,
  FinanceAccount,
  FinanceBudget,
  FinanceCategory,
  FinanceTransaction,
  SavingsGoal,
  SoftwareVaultEntry,
} from "@/types/database";
import type { BrainNode } from "@/types/brain-graph";
import { composeBody, makeBrainNode, ownedBy, truncate } from "./_shared";

export function documentsToBrainNodes(input: {
  rows: Document[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((d) =>
    makeBrainNode(
      {
        sourceId: d.id,
        type: "document",
        userId: input.userId,
        title: truncate(d.name || "Untitled document"),
        summary: d.notes ?? undefined,
        bodyText: composeBody(d.notes),
        tags: d.document_type ? [d.document_type] : [],
        sourceType: "documents",
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        importance: 0.4,
        metadata: {
          document_type: d.document_type,
          expiration_date: d.expiration_date,
          file_url: d.file_url,
        },
      },
      { sourceModule: "document" },
    ),
  );
}

export function assetsToBrainNodes(input: {
  rows: Asset[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((a) =>
    makeBrainNode(
      {
        sourceId: a.id,
        type: "asset",
        userId: input.userId,
        title: truncate(a.name || "Unnamed asset"),
        summary: a.notes ?? undefined,
        bodyText: composeBody(a.notes, a.location),
        tags: [a.category, a.category_key].filter((t): t is string => Boolean(t)),
        categories: a.category_key ? [a.category_key] : undefined,
        sourceType: "assets",
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        importance: 0.45,
        metadata: {
          category_key: a.category_key,
          value: a.value,
          current_value: a.current_value,
          document_id: a.document_id,
        },
      },
      { sourceModule: "asset" },
    ),
  );
}

export function savingsGoalsToBrainNodes(input: {
  rows: SavingsGoal[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((g) =>
    makeBrainNode(
      {
        sourceId: g.id,
        type: "finance_item",
        userId: input.userId,
        title: truncate(g.name || "Savings goal"),
        sourceType: "finance_savings_goals",
        createdAt: g.created_at,
        updatedAt: g.updated_at,
        importance: 0.55,
        // Include "savings" so the canonical taxonomy attaches to this node.
        tags: ["savings", "finance"],
        metadata: {
          kind: "savings_goal",
          target_amount: g.target_amount,
          current_amount: g.current_amount,
          deadline: g.deadline,
        },
      },
      { sourceModule: "finance_goal" },
    ),
  );
}

export function financeAccountsToBrainNodes(input: {
  rows: FinanceAccount[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((a) =>
    makeBrainNode(
      {
        sourceId: a.id,
        type: "finance_item",
        userId: input.userId,
        title: truncate(a.name || "Account"),
        tags: ["finance", a.account_type].filter(Boolean),
        sourceType: "finance_accounts",
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        importance: 0.4,
        metadata: {
          kind: "account",
          account_type: a.account_type,
          balance: a.balance,
          currency: a.currency,
          is_active: a.is_active,
        },
      },
      { sourceModule: "finance" },
    ),
  );
}

export function financeCategoriesToBrainNodes(input: {
  rows: FinanceCategory[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((c) =>
    makeBrainNode(
      {
        sourceId: c.id,
        type: "finance_item",
        userId: input.userId,
        title: truncate(c.name || "Category"),
        tags: ["finance", c.type],
        sourceType: "finance_categories",
        createdAt: c.created_at,
        importance: 0.35,
        metadata: { kind: "category", type: c.type },
      },
      { sourceModule: "finance" },
    ),
  );
}

export function financeBudgetsToBrainNodes(input: {
  rows: FinanceBudget[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((b) =>
    makeBrainNode(
      {
        sourceId: b.id,
        type: "finance_item",
        userId: input.userId,
        title: `Budget — ${b.period_start.slice(0, 7)}`,
        tags: ["finance", "budget"],
        sourceType: "finance_budgets",
        createdAt: b.created_at,
        updatedAt: b.updated_at,
        importance: 0.4,
        metadata: {
          kind: "budget",
          category_id: b.category_id,
          period_start: b.period_start,
          period_end: b.period_end,
          limit_amount: b.limit_amount,
        },
      },
      { sourceModule: "finance" },
    ),
  );
}

/**
 * Transactions are very high-cardinality. We import only those with a
 * description (not all rows have one) and treat them as low-importance
 * leaves so they never dominate the graph.
 */
export function financeTransactionsToBrainNodes(input: {
  rows: FinanceTransaction[] | undefined;
  userId: string;
  /** Optional cap to avoid emitting thousands of leaf nodes. */
  cap?: number;
}): BrainNode[] {
  const owned = ownedBy(input.rows, input.userId);
  const filtered = owned.filter((t) => Boolean(t.description?.trim()));
  const limited =
    typeof input.cap === "number" ? filtered.slice(0, input.cap) : filtered;
  return limited.map((t) =>
    makeBrainNode(
      {
        sourceId: t.id,
        type: "finance_item",
        userId: input.userId,
        title: truncate(t.description || "Transaction"),
        tags: ["finance", t.type, ...(t.tags ?? [])],
        sourceType: "finance_transactions",
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        importance: 0.3,
        metadata: {
          kind: "transaction",
          type: t.type,
          amount: t.amount,
          transaction_date: t.transaction_date,
          account_id: t.account_id,
          category_id: t.category_id,
        },
      },
      { sourceModule: "finance" },
    ),
  );
}

export function softwareToBrainNodes(input: {
  rows: SoftwareVaultEntry[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((s) =>
    makeBrainNode(
      {
        sourceId: s.id,
        type: "tool",
        userId: input.userId,
        title: truncate(s.app_name || "Software"),
        summary: s.summary ?? s.why_i_use_it ?? undefined,
        bodyText: composeBody(
          s.summary,
          s.why_i_use_it,
          s.use_cases,
          s.best_feature,
        ),
        tags: [
          ...(s.category ? [s.category] : []),
          ...(s.tags ? [s.tags] : []),
          ...(s.use_cases ? [s.use_cases] : []),
        ],
        categories: s.category ? [s.category] : undefined,
        sourceType: "software_vault",
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        importance: 0.5,
        metadata: {
          status: s.status,
          priority: s.priority,
          cost_type: s.cost_type,
        },
      },
      { sourceModule: "software" },
    ),
  );
}
