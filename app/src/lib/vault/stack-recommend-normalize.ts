import {
  vaultBuildStackResponseSchema,
  vaultLibraryToolSchema,
  type VaultBuildStackResponse,
  type VaultLibraryTool,
} from "@/lib/vault/software-library-schema";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "tool"
  );
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

/**
 * Coerce one Gemini tool object into {@link VaultLibraryTool}; fills missing `id`
 * and drops invalid URLs.
 */
export function normalizeGeminiLibraryTool(
  input: unknown,
  idx: number,
  usedIds: Set<string>,
): VaultLibraryTool | null {
  const r = asRecord(input);
  if (!r) return null;
  const name = typeof r.name === "string" ? r.name.trim().slice(0, 120) : "";
  if (!name) return null;

  let id =
    typeof r.id === "string" && r.id.trim()
      ? r.id.trim().slice(0, 80)
      : `${slugify(name)}-${idx}`;
  while (usedIds.has(id)) {
    id = `${id.slice(0, 70)}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 80);
  }
  usedIds.add(id);

  let website_url: string | null | undefined;
  if (typeof r.website_url === "string" && r.website_url.trim()) {
    const u = r.website_url.trim();
    try {
      const parsed = new URL(u);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        website_url = u.slice(0, 500);
      }
    } catch {
      website_url = undefined;
    }
  }

  const category =
    typeof r.category === "string" ? r.category.trim().slice(0, 120) || null : null;
  const role_in_stack =
    typeof r.role_in_stack === "string"
      ? r.role_in_stack.trim().slice(0, 240) || null
      : null;

  let estimated_monthly_cost_usd: number | null | undefined;
  if (typeof r.estimated_monthly_cost_usd === "number" && Number.isFinite(r.estimated_monthly_cost_usd)) {
    estimated_monthly_cost_usd = Math.min(
      500_000,
      Math.max(0, r.estimated_monthly_cost_usd),
    );
  } else if (r.estimated_monthly_cost_usd === null) {
    estimated_monthly_cost_usd = null;
  }

  let workflow_tags: string[] | undefined;
  if (Array.isArray(r.workflow_tags)) {
    workflow_tags = r.workflow_tags
      .filter((x): x is string => typeof x === "string")
      .map((t) => t.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 12);
    if (workflow_tags.length === 0) workflow_tags = undefined;
  }

  let icon_url: string | null | undefined;
  if (typeof r.icon_url === "string" && r.icon_url.trim()) {
    const iu = r.icon_url.trim().slice(0, 500);
    try {
      const p = new URL(iu);
      if (p.protocol === "http:" || p.protocol === "https:") icon_url = iu;
    } catch {
      icon_url = undefined;
    }
  }

  const parsed = vaultLibraryToolSchema.safeParse({
    id,
    name,
    website_url: website_url ?? null,
    icon_url: icon_url ?? null,
    category,
    role_in_stack,
    estimated_monthly_cost_usd: estimated_monthly_cost_usd ?? null,
    workflow_tags,
  });
  return parsed.success ? parsed.data : null;
}

function normalizeStringArray(v: unknown, maxLen: number, itemMax: number): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim().slice(0, itemMax))
    .filter(Boolean)
    .slice(0, maxLen);
  return out.length ? out : undefined;
}

/**
 * Turn raw Gemini JSON into a validated {@link VaultBuildStackResponse}.
 */
export function normalizeVaultBuildStackGeminiJson(
  parsed: unknown,
): { ok: true; data: VaultBuildStackResponse } | { ok: false; error: string } {
  const root = asRecord(parsed);
  if (!root) return { ok: false, error: "invalid_json_shape" };

  const usedIds = new Set<string>();
  const core: VaultLibraryTool[] = [];
  const opt: VaultLibraryTool[] = [];

  const rawCore = Array.isArray(root.core_tools) ? root.core_tools : [];
  const rawOpt = Array.isArray(root.optional_tools) ? root.optional_tools : [];

  rawCore.forEach((item, i) => {
    const t = normalizeGeminiLibraryTool(item, i, usedIds);
    if (t) core.push(t);
  });
  rawOpt.forEach((item, i) => {
    const t = normalizeGeminiLibraryTool(item, i + 1000, usedIds);
    if (t) opt.push(t);
  });

  if (core.length === 0) {
    return { ok: false, error: "no_core_tools" };
  }

  const candidate: VaultBuildStackResponse = {
    stack_name:
      typeof root.stack_name === "string" ? root.stack_name.trim().slice(0, 120) : undefined,
    core_tools: core,
    optional_tools: opt.length ? opt : undefined,
    rationale:
      typeof root.rationale === "string" ? root.rationale.trim().slice(0, 4000) : undefined,
    estimated_monthly_cost_usd:
      typeof root.estimated_monthly_cost_usd === "number" &&
      Number.isFinite(root.estimated_monthly_cost_usd)
        ? Math.min(500_000, Math.max(0, root.estimated_monthly_cost_usd))
        : root.estimated_monthly_cost_usd === null
          ? null
          : undefined,
    setup_order: normalizeStringArray(root.setup_order, 32, 200),
    overlap_warnings: normalizeStringArray(root.overlap_warnings, 16, 400),
    notes: normalizeStringArray(root.notes, 16, 400),
  };

  const final = vaultBuildStackResponseSchema.safeParse(candidate);
  if (!final.success) {
    return { ok: false, error: "schema_validation_failed" };
  }
  return { ok: true, data: final.data };
}
