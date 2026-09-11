import type { SoftwareVaultEntry } from "@/types/database";
import { recordedMonthlyCost, summarizeRecordedCosts } from "./recorded-cost";

export type RecordedCostRow = {
  entry: SoftwareVaultEntry;
  monthlyAmount: number;
  share: number;
};

export type RecordedCostGroup = {
  currency: string;
  total: number;
  rows: RecordedCostRow[];
};

/** Use the same eligibility and normalization as the recorded-cost total. Never convert currencies. */
export function buildRecordedCostBreakdown(entries: SoftwareVaultEntry[], now = Date.now()) {
  const summary = summarizeRecordedCosts(entries, now);
  const rowsByCurrency = new Map<string, RecordedCostRow[]>();

  for (const entry of entries) {
    if (entry.status !== "Active" || !["Paid", "Subscription"].includes(entry.cost_type)) continue;
    const monthlyAmount = recordedMonthlyCost(entry);
    const currency = entry.cost_currency?.trim().toUpperCase();
    if (monthlyAmount === null || !currency) continue;
    const rows = rowsByCurrency.get(currency) ?? [];
    rows.push({ entry, monthlyAmount, share: 0 });
    rowsByCurrency.set(currency, rows);
  }

  const groups: RecordedCostGroup[] = summary.totals.map(([currency, total]) => ({
    currency,
    total,
    rows: (rowsByCurrency.get(currency) ?? [])
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount || a.entry.app_name.localeCompare(b.entry.app_name) || a.entry.id.localeCompare(b.entry.id))
      .map((row) => ({ ...row, share: total > 0 ? (row.monthlyAmount / total) * 100 : 0 })),
  }));

  return {
    groups,
    excluded: summary.excluded,
    unchecked: summary.unchecked,
    activeCount: entries.filter((entry) => entry.status === "Active").length,
    freeCount: entries.filter((entry) => entry.status === "Active" && entry.cost_type === "Free").length,
  };
}
