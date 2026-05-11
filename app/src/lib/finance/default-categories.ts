/** Seed rows (without `user_id`) inserted when a user has zero categories. */
export const DEFAULT_FINANCE_CATEGORY_SEEDS: readonly { name: string; type: "income" | "expense" }[] =
  [
    { name: "Salary", type: "income" },
    { name: "Freelance", type: "income" },
    { name: "Other income", type: "income" },
    { name: "Housing", type: "expense" },
    { name: "Food", type: "expense" },
    { name: "Transport", type: "expense" },
    { name: "Utilities", type: "expense" },
    { name: "Health", type: "expense" },
    { name: "Entertainment", type: "expense" },
    { name: "Shopping", type: "expense" },
    { name: "Other expense", type: "expense" },
  ] as const;
