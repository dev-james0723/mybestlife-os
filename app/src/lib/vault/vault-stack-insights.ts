import type { SoftwareVaultEntry } from "@/types/database";
import type { VaultOverlapInsightsResult } from "@/lib/vault/software-library-schema";

function estimateMonthlyUsd(entry: SoftwareVaultEntry): number {
  if (entry.cost_amount == null) return 0;
  const amount = Number(entry.cost_amount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const period = (entry.cost_period ?? "").toLowerCase();
  if (/(year|yr|annual)/.test(period)) return amount / 12;
  if (/(week|wk)/.test(period)) return amount * (52 / 12);
  if (/(day|daily)/.test(period)) return amount * (365 / 12);
  if (/(quarter)/.test(period)) return amount / 3;
  return amount;
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s.-]/g, "");
}

/**
 * Deterministic overlap / coverage hints for the current vault.
 * Phase 4 may enrich with Gemini; keep logic transparent and testable.
 */
export function analyzeVaultStackInsights(
  entries: SoftwareVaultEntry[],
): VaultOverlapInsightsResult {
  const items: VaultOverlapInsightsResult["items"] = [];
  const now = new Date().toISOString();

  if (entries.length === 0) {
    return { generated_at: now, items: [] };
  }

  const byNorm = new Map<string, SoftwareVaultEntry[]>();
  for (const e of entries) {
    const key = normalizeName(e.app_name);
    if (!key) continue;
    const list = byNorm.get(key) ?? [];
    list.push(e);
    byNorm.set(key, list);
  }

  for (const [, group] of byNorm) {
    if (group.length < 2) continue;
    items.push({
      id: `dup_name_${group[0]!.id.slice(0, 8)}`,
      kind: "duplicate_names",
      severity: "warning",
      title: "Possible duplicate entries",
      detail: `Multiple vault rows share a very similar name (“${group[0]!.app_name}”). Consider merging notes into one entry.`,
      related_entry_ids: group.map((g) => g.id),
      meta: { sampleName: group[0]!.app_name },
    });
    break;
  }

  const recurring = entries.filter(
    (e) => e.status === "Active" && (e.cost_type === "Subscription" || e.cost_type === "Paid"),
  );
  const monthlySum = recurring.reduce((s, e) => s + estimateMonthlyUsd(e), 0);
  if (monthlySum > 500) {
    items.push({
      id: "spend_high",
      kind: "high_recurring_spend",
      severity: "notice",
      title: "Recurring spend is material",
      detail: `Active paid tools sum to about $${Math.round(monthlySum)}/mo (rough estimate). Review retirements or downgrades.`,
      meta: { monthlyUsd: Math.round(monthlySum) },
    });
  }

  const categories = new Set(
    entries.map((e) => (e.category ?? "").trim().toLowerCase()).filter(Boolean),
  );
  const hasDoc = [...categories].some((c) => /doc|wiki|note|knowledge/.test(c));
  if (!hasDoc && entries.length >= 4) {
    items.push({
      id: "missing_docs_layer",
      kind: "missing_docs_layer",
      severity: "info",
      title: "No obvious documentation layer",
      detail:
        "Consider adding a lightweight wiki or notes tool so decisions and links do not live only in chat threads.",
    });
  }

  const aiTags = entries.flatMap((e) =>
    (e.tags ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  );
  const aiish = aiTags.filter((t) => /ai|llm|copilot|assistant|gpt|claude|gemini/.test(t));
  if (aiish.length >= 3) {
    items.push({
      id: "overlap_ai_assistants",
      kind: "ai_tool_overlap",
      severity: "info",
      title: "Several AI-adjacent tools",
      detail: "Tags suggest multiple assistants or AI products — watch for overlapping subscriptions.",
    });
  }

  return { generated_at: now, items };
}
