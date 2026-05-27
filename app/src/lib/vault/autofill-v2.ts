import { z } from "zod";
import {
  VAULT_COST_TYPES,
  VAULT_PRIORITIES,
  VAULT_STATUSES,
  vaultPricingOptionSchema,
} from "@/lib/vault/schema";
import type {
  AppCandidate,
  ConfidenceLevel,
  FieldSource,
  FieldSourceType,
  PricingPlan,
  SoftwareAlternative,
} from "@/types/vault-smart-autofill";

export const REQUIRED_FORM_FIELDS = [
  "app_name",
  "category",
  "platforms",
  "use_cases",
  "summary",
  "best_feature",
  "biggest_downside",
  "best_alternative",
  "replaces",
  "default_tool_for",
  "tags",
  "why_i_use_it",
  "cost_type",
] as const;

const confidenceSchema = z.enum([
  "high",
  "medium",
  "low",
  "user_confirmed",
  "needs_user_confirmation",
]);

const pricingPlanSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  price: z.number().nonnegative().nullable().optional(),
  currency: z.string().trim().max(12).optional(),
  billing_cycle: z
    .enum(["monthly", "annually", "one-time", "usage-based", "unknown"])
    .optional(),
  cost_type: z.enum(VAULT_COST_TYPES).optional(),
  features: z.array(z.string()).optional(),
  source_url: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  confidence: confidenceSchema.optional(),
});

const alternativeSchema = z.object({
  name: z.string().trim().min(1),
  icon_url: z.string().url().optional(),
  official_url: z.string().url().optional(),
  reason: z.string().trim().max(300).optional(),
  confidence: confidenceSchema.optional(),
});

export const vaultAutofillExtractionSchema = z.object({
  app_name: z.string().trim().min(1),
  website_url: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  github_url: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  category: z.string().trim().min(1).max(120),
  platforms: z.string().trim().min(1).max(240),
  use_cases: z.string().trim().min(1).max(600),
  status: z.enum(VAULT_STATUSES).optional(),
  priority: z.enum(VAULT_PRIORITIES).optional(),
  cost_type: z.enum(VAULT_COST_TYPES),
  cost_amount: z.number().nonnegative().nullable().optional(),
  cost_period: z.string().trim().max(60).optional(),
  cost_currency: z.string().trim().max(12).optional(),
  summary: z.string().trim().min(1).max(280),
  best_feature: z.string().trim().min(1).max(400),
  biggest_downside: z.string().trim().min(1).max(400),
  best_alternative: z.string().trim().min(1).max(200),
  replaces: z.string().trim().min(1).max(200),
  default_tool_for: z.string().trim().min(1).max(200),
  tags: z.union([z.array(z.string()), z.string()]),
  why_i_use_it: z.string().trim().min(1).max(800),
  pricing_plans: z.array(pricingPlanSchema).optional(),
  alternative_options: z.array(alternativeSchema).optional(),
  field_confidence: z.record(z.string(), confidenceSchema).optional(),
});

export type VaultAutofillExtraction = z.infer<typeof vaultAutofillExtractionSchema>;

export function normalizeTags(tags: string | string[]): string {
  const list = Array.isArray(tags)
    ? tags
    : tags
        .split(/[,;]+/)
        .map((t) => t.trim())
        .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const t = raw.replace(/\s+/g, " ").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 10) break;
  }
  return out.join(", ");
}

export function normalizePricingPlans(raw: PricingPlan[] | undefined): PricingPlan[] {
  if (!raw?.length) {
    return [
      {
        id: "free",
        name: "Free",
        price: 0,
        currency: "USD",
        billing_cycle: "one-time",
        cost_type: "Free",
        confidence: "medium",
      },
    ];
  }
  return raw.map((p, i) => ({
    id: p.id?.trim() || `plan-${i}`,
    name: p.name?.trim() || `Plan ${i + 1}`,
    price: p.price ?? null,
    currency: p.currency ?? "USD",
    billing_cycle: p.billing_cycle ?? "unknown",
    cost_type: p.cost_type ?? (p.price === 0 ? "Free" : "Subscription"),
    features: p.features,
    source_url: p.source_url,
    confidence: p.confidence ?? "medium",
  }));
}

export function normalizeAlternatives(
  raw: SoftwareAlternative[] | undefined,
  bestAlternative: string,
): SoftwareAlternative[] {
  const list = [...(raw ?? [])];
  const primary = bestAlternative.trim();
  if (primary && !list.some((a) => a.name.toLowerCase() === primary.toLowerCase())) {
    list.unshift({ name: primary, confidence: "medium" });
  }
  const seen = new Set<string>();
  const out: SoftwareAlternative[] = [];
  for (const a of list) {
    const name = a.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      icon_url: a.icon_url,
      official_url: a.official_url,
      reason: a.reason,
      confidence: a.confidence ?? "medium",
    });
    if (out.length >= 5) break;
  }
  return out;
}

function isBlank(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function computeNeedsConfirmation(
  fields: Record<string, unknown>,
  fieldConfidence: Record<string, ConfidenceLevel>,
): string[] {
  const needs: string[] = [];
  for (const key of REQUIRED_FORM_FIELDS) {
    const conf = fieldConfidence[key];
    if (conf === "needs_user_confirmation" || isBlank(fields[key])) {
      needs.push(key);
    }
  }
  return [...new Set(needs)];
}

export function buildFieldSources(params: {
  fields: Record<string, unknown>;
  fieldConfidence: Record<string, ConfidenceLevel>;
  hasGithub: boolean;
  hasOfficialPage: boolean;
  hasPricingSearch: boolean;
}): FieldSource[] {
  const now = new Date().toISOString();
  const sources: FieldSource[] = [];

  const defaultType = (field: string): FieldSourceType => {
    if (field.startsWith("cost_") || field === "pricing_plans") {
      return params.hasPricingSearch ? "pricing_page" : "llm_inference";
    }
    if (params.hasGithub && ["summary", "best_feature", "platforms", "tags"].includes(field)) {
      return "github";
    }
    if (params.hasOfficialPage) return "official_site";
    return "llm_inference";
  };

  for (const [field, confidence] of Object.entries(params.fieldConfidence)) {
    if (params.fields[field] === undefined) continue;
    sources.push({
      field,
      source_type: defaultType(field),
      fetched_at: now,
      confidence,
    });
  }

  return sources;
}

export function extractionToFormFields(
  extraction: VaultAutofillExtraction,
  candidate?: AppCandidate | null,
): Record<string, string | number | null> {
  const tags = normalizeTags(extraction.tags);
  const alternatives = normalizeAlternatives(
    extraction.alternative_options,
    extraction.best_alternative,
  );
  const bestAlt = alternatives[0]?.name ?? extraction.best_alternative;

  return {
    app_name: extraction.app_name || candidate?.name || "",
    website_url: extraction.website_url ?? candidate?.official_url ?? "",
    category: extraction.category,
    platforms: extraction.platforms,
    use_cases: extraction.use_cases,
    status: extraction.status ?? "Active",
    priority: extraction.priority ?? "Nice-to-have",
    cost_type: extraction.cost_type,
    cost_amount:
      extraction.cost_amount != null ? String(extraction.cost_amount) : extraction.cost_type === "Free" ? "0" : "",
    cost_period: extraction.cost_period ?? (extraction.cost_type === "Free" ? "one-time" : ""),
    why_i_use_it: extraction.why_i_use_it,
    best_feature: extraction.best_feature,
    biggest_downside: extraction.biggest_downside,
    best_alternative: bestAlt,
    replaces: extraction.replaces,
    tags,
    default_tool_for: extraction.default_tool_for,
    summary: extraction.summary,
  };
}

export function mergeFieldConfidence(
  extraction: VaultAutofillExtraction,
  needs: string[],
): Record<string, ConfidenceLevel> {
  const base: Record<string, ConfidenceLevel> = {
    ...(extraction.field_confidence as Record<string, ConfidenceLevel> | undefined),
  };
  for (const key of REQUIRED_FORM_FIELDS) {
    if (!base[key]) base[key] = "medium";
  }
  for (const key of needs) {
    base[key] = "needs_user_confirmation";
  }
  return base;
}

/** Legacy pricing option shape for VaultAddDialog compatibility */
export function pricingPlansToLegacyOptions(plans: PricingPlan[]) {
  return plans.map((p) => ({
    plan_name: p.name,
    cost_type: p.cost_type ?? "Subscription",
    cost_amount: p.price ?? null,
    cost_period:
      p.billing_cycle === "monthly"
        ? "month"
        : p.billing_cycle === "annually"
          ? "year"
          : p.billing_cycle === "one-time"
            ? "one-time"
            : "month",
    currency: p.currency,
    billing_label:
      p.price != null && p.currency
        ? `${p.currency} ${p.price}/${p.billing_cycle === "annually" ? "year" : "month"}`
        : p.name,
    source_url: p.source_url,
  }));
}

export { vaultPricingOptionSchema };
