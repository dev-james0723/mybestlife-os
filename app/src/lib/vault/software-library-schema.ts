import { z } from "zod";
import {
  VAULT_COST_TYPES,
  VAULT_PRIORITIES,
  VAULT_STATUSES,
} from "@/lib/vault/schema";

/** Curated library industries (slug form for URLs, filters, and API contracts). */
export const VAULT_STACK_INDUSTRY_SLUGS = [
  "finance_accounting",
  "legal",
  "education",
  "creator_content",
  "startup_sme",
  "operations_bizops",
  "marketing_growth",
  "sales_bd",
  "customer_support_cx",
  "hr_recruiting",
  "product_project_management",
  "software_dev_it",
  "ecommerce_retail",
  "real_estate",
  "healthcare_clinics",
  "consulting_professional_services",
  "music",
  "art_design",
] as const;

export type VaultStackIndustrySlug = (typeof VAULT_STACK_INDUSTRY_SLUGS)[number];

export const vaultStackIndustrySlugSchema = z.enum(VAULT_STACK_INDUSTRY_SLUGS);

/** Relative setup effort for a whole stack. */
export const VAULT_SETUP_DIFFICULTY = ["easy", "moderate", "advanced"] as const;
export type VaultSetupDifficulty = (typeof VAULT_SETUP_DIFFICULTY)[number];
export const vaultSetupDifficultySchema = z.enum(VAULT_SETUP_DIFFICULTY);

/** Curator / model coarse cost signal (distinct from numeric monthly estimates). */
export const VAULT_ESTIMATED_COST_TIER = ["free", "low", "medium", "high", "enterprise"] as const;
export type VaultEstimatedCostTier = (typeof VAULT_ESTIMATED_COST_TIER)[number];
export const vaultEstimatedCostTierSchema = z.enum(VAULT_ESTIMATED_COST_TIER);

/** Build-my-stack wizard enums (aligned with Phase 3 API contract). */
export const VAULT_BUDGET_SENSITIVITY = ["low", "medium", "high", "unsure"] as const;
export const vaultBudgetSensitivitySchema = z.enum(VAULT_BUDGET_SENSITIVITY);
export type VaultBudgetSensitivity = z.infer<typeof vaultBudgetSensitivitySchema>;

export const VAULT_PRIVACY_SENSITIVITY = [
  "standard",
  "elevated",
  "strict_compliance",
  "unsure",
] as const;
export const vaultPrivacySensitivitySchema = z.enum(VAULT_PRIVACY_SENSITIVITY);
export type VaultPrivacySensitivity = z.infer<typeof vaultPrivacySensitivitySchema>;

export const VAULT_ECOSYSTEM_PREFERENCE = [
  "google_workspace",
  "microsoft_365",
  "apple",
  "mixed",
  "no_preference",
] as const;
export const vaultEcosystemPreferenceSchema = z.enum(VAULT_ECOSYSTEM_PREFERENCE);
export type VaultEcosystemPreference = z.infer<typeof vaultEcosystemPreferenceSchema>;

export const VAULT_TECHNICAL_COMFORT = [
  "low",
  "medium",
  "high",
  "mixed_team",
] as const;
export const vaultTechnicalComfortSchema = z.enum(VAULT_TECHNICAL_COMFORT);
export type VaultTechnicalComfort = z.infer<typeof vaultTechnicalComfortSchema>;

/**
 * A tool inside a curated stack or a model recommendation.
 * Kept loose enough for Gemini output, strict enough for UI + vault mapping.
 */
export const vaultLibraryToolSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  website_url: z
    .string()
    .trim()
    .url()
    .max(500)
    .optional()
    .nullable(),
  /** Optional square logo; when absent UI derives favicon from `website_url`. */
  icon_url: z.string().trim().url().max(500).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  /** How this tool serves the stack (one line). */
  role_in_stack: z.string().trim().max(240).optional().nullable(),
  /** Optional monthly estimate in USD for this line item. */
  estimated_monthly_cost_usd: z.number().nonnegative().max(500_000).optional().nullable(),
  /** Optional tags for overlap / compare heuristics. */
  workflow_tags: z.array(z.string().trim().max(40)).max(12).optional(),
  /** Industries this tool commonly appears in (curated / model hints). */
  industry_slugs: z.array(vaultStackIndustrySlugSchema).max(12).optional(),
  role_hints: z.array(z.string().trim().max(80)).max(8).optional(),
  workflow_types: z.array(z.string().trim().max(40)).max(8).optional(),
  setup_difficulty: vaultSetupDifficultySchema.optional().nullable(),
  privacy_sensitivity: vaultPrivacySensitivitySchema.optional().nullable(),
  recommendation_score: z.number().min(0).max(1).optional().nullable(),
  curated: z.boolean().optional(),
  stack_template_ids: z.array(z.string().trim().max(80)).max(12).optional(),
});

export type VaultLibraryTool = z.infer<typeof vaultLibraryToolSchema>;

/** Curated template shown in Recommended Stacks (Phase 2). */
export const vaultCuratedStackTemplateSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  industry: vaultStackIndustrySlugSchema,
  /** Optional audience, e.g. "FP&A lead". */
  role: z.string().trim().max(120).optional().nullable(),
  summary: z.string().trim().min(1).max(560),
  /** Aggregate monthly estimate in USD (curator-provided). */
  estimated_monthly_cost_usd: z.number().nonnegative().max(500_000).nullable(),
  setup_difficulty: vaultSetupDifficultySchema,
  /** Core tools in this archetype (required). */
  tools: z.array(vaultLibraryToolSchema).min(1).max(24),
  /** Optional add-ons shown separately in the stack detail UI. */
  optional_tools: z.array(vaultLibraryToolSchema).max(24).optional(),
  rationale: z.string().trim().max(2000),
  /** Short “why exist” line when different from `rationale`. */
  why_this_stack: z.string().trim().max(560).optional().nullable(),
  tradeoffs: z.array(z.string().trim().max(400)).max(12).optional(),
  /** Ordered human steps; values may match tool names or phases. */
  setup_order: z.array(z.string().trim().max(200)).max(24),
  workflow_fit: z.string().trim().max(400).optional().nullable(),
  team_size_fit: z.string().trim().max(240).optional().nullable(),
  privacy_level: vaultPrivacySensitivitySchema.optional().nullable(),
  estimated_cost_tier: vaultEstimatedCostTierSchema.optional().nullable(),
  recommended_for: z.string().trim().max(400).optional().nullable(),
  not_ideal_for: z.string().trim().max(400).optional().nullable(),
});

export type VaultCuratedStackTemplate = z.infer<typeof vaultCuratedStackTemplateSchema>;

/** POST /api/vault/stack-recommend (Phase 3) — request body. */
export const vaultBuildStackRequestSchema = z.object({
  industry: vaultStackIndustrySlugSchema,
  role: z.string().trim().min(1).max(120),
  goals: z.string().trim().min(1).max(1200),
  pain_points: z.string().trim().min(1).max(1200),
  budget_sensitivity: vaultBudgetSensitivitySchema,
  team_size: z.string().trim().min(1).max(80),
  privacy_sensitivity: vaultPrivacySensitivitySchema,
  ecosystem_preference: vaultEcosystemPreferenceSchema,
  technical_comfort: vaultTechnicalComfortSchema,
});

export type VaultBuildStackRequest = z.infer<typeof vaultBuildStackRequestSchema>;

/**
 * Gemini stack planner output (Phase 3).
 * Fields optional where the model may omit — UI merges with safe defaults.
 */
export const vaultBuildStackResponseSchema = z.object({
  stack_name: z.string().trim().max(120).optional(),
  core_tools: z.array(vaultLibraryToolSchema).max(16).optional(),
  optional_tools: z.array(vaultLibraryToolSchema).max(16).optional(),
  rationale: z.string().trim().max(4000).optional(),
  estimated_monthly_cost_usd: z.number().nonnegative().max(500_000).optional().nullable(),
  setup_order: z.array(z.string().trim().max(200)).max(32).optional(),
  overlap_warnings: z.array(z.string().trim().max(400)).max(16).optional(),
  notes: z.array(z.string().trim().max(400)).max(16).optional(),
});

export type VaultBuildStackResponse = z.infer<typeof vaultBuildStackResponseSchema>;

/** Side-by-side compare row (Phase 4) — may reference vault rows or library tools. */
export const vaultCompareToolSnapshotSchema = z.object({
  ref_id: z.string().trim().min(1).max(120),
  source: z.enum(["vault", "library"]),
  name: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(400).optional().nullable(),
  best_for: z.string().trim().max(400).optional().nullable(),
  downsides: z.string().trim().max(400).optional().nullable(),
  cost_label: z.string().trim().max(120).optional().nullable(),
  ease_of_use: z.string().trim().max(200).optional().nullable(),
  integration_power: z.string().trim().max(200).optional().nullable(),
  privacy_enterprise: z.string().trim().max(200).optional().nullable(),
  workflow_fit: z.string().trim().max(400).optional().nullable(),
});

export type VaultCompareToolSnapshot = z.infer<typeof vaultCompareToolSnapshotSchema>;

export const vaultOverlapInsightSeverity = z.enum(["info", "notice", "warning"]);
export type VaultOverlapInsightSeverity = z.infer<typeof vaultOverlapInsightSeverity>;

/** Stable keys for localizing deterministic insights in the UI. */
export const VAULT_OVERLAP_INSIGHT_KINDS = [
  "duplicate_names",
  "high_recurring_spend",
  "missing_docs_layer",
  "ai_tool_overlap",
] as const;
export const vaultOverlapInsightKindSchema = z.enum(VAULT_OVERLAP_INSIGHT_KINDS);
export type VaultOverlapInsightKind = z.infer<typeof vaultOverlapInsightKindSchema>;

export const vaultOverlapInsightItemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  severity: vaultOverlapInsightSeverity,
  /** When set, the client should prefer localized strings for this kind. */
  kind: vaultOverlapInsightKindSchema.optional(),
  title: z.string().trim().min(1).max(160),
  detail: z.string().trim().max(600).optional().nullable(),
  /** Optional vault entry ids implicated by this insight. */
  related_entry_ids: z.array(z.string().uuid()).max(24).optional(),
  /** Small structured hints for localized UI (e.g. monthly total, sample name). */
  meta: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export type VaultOverlapInsightItem = z.infer<typeof vaultOverlapInsightItemSchema>;

export const vaultOverlapInsightsResultSchema = z.object({
  generated_at: z.string().datetime().optional(),
  items: z.array(vaultOverlapInsightItemSchema).max(24),
});

export type VaultOverlapInsightsResult = z.infer<typeof vaultOverlapInsightsResultSchema>;

/**
 * When importing a library tool into `software_vault`, we only send columns
 * the repository accepts; everything else is synthesized conservatively.
 */
export const vaultImportFromLibraryInputSchema = z.object({
  tool: vaultLibraryToolSchema,
  /** Optional stack context stored in free-text fields for the user. */
  stack_context: z
    .object({
      stack_name: z.string().trim().max(120).optional(),
      industry: vaultStackIndustrySlugSchema.optional(),
    })
    .optional(),
  status: z.enum(VAULT_STATUSES).optional(),
  priority: z.enum(VAULT_PRIORITIES).optional(),
  cost_type: z.enum(VAULT_COST_TYPES).optional(),
});

export type VaultImportFromLibraryInput = z.infer<typeof vaultImportFromLibraryInputSchema>;
