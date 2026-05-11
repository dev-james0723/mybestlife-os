import type { SoftwareVaultEntry } from "@/types/database";

export const VAULT_COMPARE_DIMENSION_KEYS = [
  "summary",
  "bestFor",
  "downsides",
  "cost",
  "easeOfUse",
  "integration",
  "privacyEnterprise",
  "workflowFit",
] as const;

export type VaultCompareDimensionKey = (typeof VAULT_COMPARE_DIMENSION_KEYS)[number];

export type VaultCompareMatrix = {
  entry: SoftwareVaultEntry;
  cells: Record<VaultCompareDimensionKey, string>;
};

function dash(s: string | null | undefined): string {
  const t = (s ?? "").trim();
  return t.length ? t : "—";
}

function formatCost(entry: SoftwareVaultEntry): string {
  if (entry.cost_type === "Free") return "Free";
  if (entry.cost_amount == null) return dash(entry.cost_type);
  const n = Number(entry.cost_amount);
  if (!Number.isFinite(n)) return dash(entry.cost_type);
  const p = (entry.cost_period ?? "").trim();
  return p ? `$${n.toFixed(0)}/${p}` : `$${n.toFixed(0)}`;
}

function easeFromPriority(priority: SoftwareVaultEntry["priority"]): string {
  switch (priority) {
    case "Must-have":
      return "Critical path (inferred from priority)";
    case "Nice-to-have":
      return "Balanced (inferred from priority)";
    case "Optional":
      return "Experimental / low commitment (inferred from priority)";
    default:
      return "—";
  }
}

function inferPrivacy(entry: SoftwareVaultEntry): string {
  const blob = `${entry.tags ?? ""} ${entry.category ?? ""} ${entry.use_cases ?? ""}`.toLowerCase();
  if (/(hipaa|soc\s*2|soc2|gdpr|fedramp|iso\s*27001|enterprise)/.test(blob)) {
    return "Signals suggest regulated / enterprise posture — verify with each vendor.";
  }
  if (/(finance|legal|health|medical|bank)/.test(blob)) {
    return "Category suggests elevated diligence on data handling.";
  }
  return "Typical consumer / SMB posture (verify vendor policies for your data).";
}

/**
 * Build side-by-side compare cells from vault rows (deterministic heuristics).
 */
export function buildVaultCompareMatrix(entries: SoftwareVaultEntry[]): VaultCompareMatrix[] {
  return entries.map((entry) => ({
    entry,
    cells: {
      summary: dash(entry.summary),
      bestFor: dash(entry.default_tool_for ?? entry.use_cases?.split(/[.;]/)[0]),
      downsides: dash(entry.biggest_downside),
      cost: formatCost(entry),
      easeOfUse: easeFromPriority(entry.priority),
      integration: dash(entry.platforms),
      privacyEnterprise: inferPrivacy(entry),
      workflowFit: dash(entry.use_cases ?? entry.why_i_use_it),
    },
  }));
}
