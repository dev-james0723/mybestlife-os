import type { SoftwareVaultEntry } from "@/types/database";

type Cost = Pick<SoftwareVaultEntry, "cost_type" | "cost_amount" | "cost_period" | "cost_currency">;

function amountOf(entry: Cost): number | null {
  if (entry.cost_amount == null || String(entry.cost_amount).trim() === "") return null;
  const amount = Number(entry.cost_amount);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/** Unknown and one-time billing periods cannot be treated as a monthly charge. */
export function recordedMonthlyCost(entry: Cost): number | null {
  if (entry.cost_type === "Free") return 0;
  const amount = amountOf(entry);
  if (amount === null) return null;
  const period = (entry.cost_period ?? "").trim().toLowerCase().replace(/^(per\s+|\/)\s*/, "");
  const factors: Record<string, number> = {
    month: 1, monthly: 1, mo: 1, 月: 1, 每月: 1,
    year: 1 / 12, yearly: 1 / 12, annual: 1 / 12, annually: 1 / 12, yr: 1 / 12, 年: 1 / 12, 每年: 1 / 12,
    quarter: 1 / 3, quarterly: 1 / 3, 季: 1 / 3, 每季: 1 / 3,
    week: 52 / 12, weekly: 52 / 12, wk: 52 / 12, 每週: 52 / 12,
    day: 365 / 12, daily: 365 / 12, 每日: 365 / 12,
  };
  const factor = Object.hasOwn(factors, period) ? factors[period] : undefined;
  return factor === undefined ? null : amount * factor;
}

export function formatRecordedCost(entry: Cost, language = "en"): string {
  const zh = language.startsWith("zh");
  if (entry.cost_type === "Free") return zh ? "免費" : "Free";
  const amount = amountOf(entry);
  if (amount === null) return zh ? "金額未記錄" : "Amount not recorded";
  const currency = entry.cost_currency?.trim().toUpperCase() || (zh ? "幣別未記錄" : "Currency not recorded");
  const period = entry.cost_period?.trim() || (zh ? "週期未記錄" : "Period not recorded");
  return `${currency} ${amount.toFixed(2)} / ${period}`;
}

/** Price bands use USD only; unknown prices and other currencies are never labelled free. */
export function recordedCostTier(entry: Cost): "free" | "low" | "mid" | "high" | "unknown" {
  if (entry.cost_type === "Free") return "free";
  const amount = recordedMonthlyCost(entry);
  if (amount === null || entry.cost_currency?.trim().toUpperCase() !== "USD") return "unknown";
  return amount === 0 ? "free" : amount < 10 ? "low" : amount < 30 ? "mid" : "high";
}

/** Compare amounts only within the same recorded currency; unknowns come last. */
export function compareRecordedCosts(a: Cost, b: Cost): number {
  const aCost = recordedMonthlyCost(a);
  const bCost = recordedMonthlyCost(b);
  const aCurrency = a.cost_currency?.trim().toUpperCase() ?? "";
  const bCurrency = b.cost_currency?.trim().toUpperCase() ?? "";
  const aKnown = aCost !== null && Boolean(aCurrency);
  const bKnown = bCost !== null && Boolean(bCurrency);
  if (aKnown !== bKnown) return aKnown ? -1 : 1;
  if (!aKnown || !bKnown) return 0;
  return aCurrency.localeCompare(bCurrency) || bCost! - aCost!;
}

export function summarizeRecordedCosts(entries: SoftwareVaultEntry[], now = Date.now()) {
  const totals = new Map<string, number>();
  let excluded = 0;
  let unchecked = 0;
  for (const entry of entries) {
    if (entry.status !== "Active" || !["Subscription", "Paid"].includes(entry.cost_type)) continue;
    const checkedAt = Date.parse(entry.pricing_last_checked_at ?? "");
    if (!Number.isFinite(checkedAt) || now - checkedAt > 90 * 86400_000 || checkedAt > now) unchecked++;
    const amount = recordedMonthlyCost(entry);
    const currency = entry.cost_currency?.trim().toUpperCase();
    if (amount === null || !currency) { excluded++; continue; }
    totals.set(currency, (totals.get(currency) ?? 0) + amount);
  }
  return { totals: [...totals].sort(([a], [b]) => a.localeCompare(b)), excluded, unchecked };
}
