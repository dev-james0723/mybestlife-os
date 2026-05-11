import type { SoftwareVaultEntry } from "@/types/database";
import type {
  CreateSoftwareVaultInput,
  UpdateSoftwareVaultInput,
} from "@/lib/repositories/software-vault";
import type { VaultLibraryTool } from "@/lib/vault/software-library-schema";
import { libraryToolIconUrl } from "@/lib/vault/library-tool-icon-url";

function normalizeAppName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Find an existing vault row that likely represents the same product.
 */
export function findVaultDuplicateForLibraryTool(
  entries: SoftwareVaultEntry[],
  tool: VaultLibraryTool,
): SoftwareVaultEntry | null {
  const target = normalizeAppName(tool.name);
  if (!target) return null;

  const url = (tool.website_url ?? "").replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();

  for (const e of entries) {
    if (normalizeAppName(e.app_name) === target) return e;
    if (url && e.website_url) {
      const eu = e.website_url.replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();
      if (eu && (eu === url || eu.endsWith(url) || url.endsWith(eu))) return e;
    }
  }
  return null;
}

export type LibraryImportContext = {
  stackName?: string;
  industryLabel?: string;
};

/**
 * Map a curated / recommended tool into a `software_vault` insert payload.
 * Intentionally conservative defaults; user can edit after deposit.
 */
export function libraryToolToCreateInput(
  tool: VaultLibraryTool,
  ctx?: LibraryImportContext,
): CreateSoftwareVaultInput {
  const tagParts = [...(tool.workflow_tags ?? [])];
  if (ctx?.industryLabel) tagParts.push(`industry:${ctx.industryLabel}`);
  if (ctx?.stackName) tagParts.push(`stack:${ctx.stackName}`);

  const useCases = tool.role_in_stack ?? null;
  const why = [ctx?.stackName && `From stack: ${ctx.stackName}`, tool.role_in_stack]
    .filter(Boolean)
    .join(" — ");

  const derivedIcon = tool.icon_url?.trim() || libraryToolIconUrl(tool);

  return {
    app_name: tool.name,
    website_url: tool.website_url ?? null,
    icon_url: derivedIcon ?? null,
    category: tool.category ?? null,
    use_cases: useCases,
    status: "Testing",
    priority: "Nice-to-have",
    cost_type: tool.estimated_monthly_cost_usd != null ? "Subscription" : "Freemium",
    cost_amount: tool.estimated_monthly_cost_usd ?? null,
    cost_period: tool.estimated_monthly_cost_usd != null ? "month" : null,
    why_i_use_it: why || null,
    tags: tagParts.length ? tagParts.join(", ") : null,
    summary: tool.role_in_stack?.slice(0, 280) ?? null,
    ai_generated_fields: [],
  };
}

function splitTags(tags: string | null | undefined): string[] {
  return (tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * When a library tool matches an existing vault row, enrich tags / notes instead of inserting a duplicate.
 */
export function mergeStackContextIntoEntry(
  entry: SoftwareVaultEntry,
  tool: VaultLibraryTool,
  ctx: LibraryImportContext,
): UpdateSoftwareVaultInput {
  const stackTag = ctx.stackName ? `stack:${ctx.stackName}` : null;
  const industryTag = ctx.industryLabel ? `industry:${ctx.industryLabel}` : null;
  const merged = new Set(splitTags(entry.tags));
  for (const t of tool.workflow_tags ?? []) merged.add(t);
  if (stackTag) merged.add(stackTag);
  if (industryTag) merged.add(industryTag);

  const noteLine = [ctx.stackName && `Stack: ${ctx.stackName}`, tool.role_in_stack]
    .filter(Boolean)
    .join(" — ");
  let why = (entry.why_i_use_it ?? "").trim();
  if (noteLine) {
    const hint = noteLine.slice(0, 48);
    if (!why.toLowerCase().includes(hint.toLowerCase())) {
      why = why ? `${why}\n\n${noteLine}` : noteLine;
    }
  }

  const fillIcon =
    !entry.icon_url?.trim() ? (tool.icon_url?.trim() || libraryToolIconUrl(tool) || null) : undefined;

  return {
    tags: merged.size ? [...merged].join(", ") : null,
    why_i_use_it: why || null,
    ...(fillIcon ? { icon_url: fillIcon } : {}),
  };
}
