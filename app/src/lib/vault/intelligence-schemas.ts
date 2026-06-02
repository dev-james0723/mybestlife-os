import { z } from "zod";
import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  VAULT_COST_TYPES,
  VAULT_PRIORITIES,
  VAULT_STATUSES,
} from "@/lib/vault/schema";

export const vaultSourceTypeSchema = z.enum([
  "official",
  "official_site",
  "github",
  "app_store",
  "google_play",
  "documentation",
  "pricing",
  "brand_asset_page",
  "review",
  "search",
  "screenshot",
  "video",
  "vault",
  "project",
  "task",
  "goal",
  "llm_inference",
  "other",
]);

export type VaultIntelligenceSourceType = z.infer<typeof vaultSourceTypeSchema>;

export const vaultConfidenceSchema = z.enum([
  "high",
  "medium",
  "low",
  "unknown",
]);

export const shouldAddRecommendationSchema = z.enum([
  "add",
  "trial_first",
  "skip",
  "replace_existing",
  "use_free_tier",
  "wait",
]);

export type ShouldAddRecommendation = z.infer<typeof shouldAddRecommendationSchema>;

export const shouldAddInputKindSchema = z.enum([
  "tool_name",
  "website_url",
  "github_url",
  "app_store_url",
  "google_play_url",
  "pricing_url",
  "screenshot",
  "pricing_screenshot",
  "workflow_need",
  "question",
]);

export const shouldAddOverlapSchema = z.object({
  entry_id: z.string().uuid().optional().nullable(),
  app_name: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  severity: z.enum(["info", "notice", "warning"]).default("notice"),
});

export type ShouldAddOverlap = z.infer<typeof shouldAddOverlapSchema>;

export const shouldAddProjectRelevanceSchema = z.object({
  target_type: z.enum(["project", "task", "goal", "life_area"]),
  target_id: z.string().uuid().optional().nullable(),
  label: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  confidence: vaultConfidenceSchema.default("medium"),
});

export type ShouldAddProjectRelevance = z.infer<typeof shouldAddProjectRelevanceSchema>;

export const shouldAddFieldsToSaveSchema = z.object({
  app_name: z.string().trim().min(1).optional(),
  website_url: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  icon_url: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  category: z.string().trim().max(120).optional(),
  platforms: z.string().trim().max(240).optional(),
  use_cases: z.string().trim().max(600).optional(),
  status: z.enum(VAULT_STATUSES).optional(),
  priority: z.enum(VAULT_PRIORITIES).optional(),
  cost_type: z.enum(VAULT_COST_TYPES).optional(),
  cost_amount: z.union([z.number().nonnegative(), z.string()]).nullable().optional(),
  cost_period: z.string().trim().max(60).optional(),
  why_i_use_it: z.string().trim().max(800).optional(),
  best_feature: z.string().trim().max(400).optional(),
  biggest_downside: z.string().trim().max(400).optional(),
  best_alternative: z.string().trim().max(200).optional(),
  replaces: z.string().trim().max(200).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  default_tool_for: z.string().trim().max(200).optional(),
  summary: z.string().trim().max(280).optional(),
});

export type ShouldAddFieldsToSave = z.infer<typeof shouldAddFieldsToSaveSchema>;

export const vaultIntelligenceSourceSchema = z.object({
  title: z.string().trim().min(1).max(240),
  url: z.string().trim().url().optional().nullable(),
  sourceType: vaultSourceTypeSchema,
  usedFor: z.array(z.string().trim().min(1)).default([]),
});

export type VaultIntelligenceSource = z.infer<typeof vaultIntelligenceSourceSchema>;

export const shouldAddRequestSchema = z.object({
  query: z.string().trim().min(1).max(1200),
  targetUrl: z.string().trim().url().optional().nullable(),
  inputKind: shouldAddInputKindSchema.optional(),
  candidate: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      icon_url: z.string().optional(),
      official_url: z.string().optional(),
      github_url: z.string().optional(),
      company: z.string().optional(),
      software_type: z.string().optional(),
    })
    .optional()
    .nullable(),
  locale: z.custom<AppLocale>().optional(),
});

export type ShouldAddRequest = z.infer<typeof shouldAddRequestSchema>;

export const shouldAddResponseSchema = z.object({
  recommendation: shouldAddRecommendationSchema,
  reason: z.string().trim().min(1),
  overlap_with_existing_tools: z.array(shouldAddOverlapSchema).default([]),
  tools_it_might_replace: z.array(shouldAddOverlapSchema).default([]),
  project_relevance: z.array(shouldAddProjectRelevanceSchema).default([]),
  cost_warning: z.string().trim().nullable().default(null),
  learning_curve: z.string().trim().nullable().default(null),
  suggested_trial_period: z.string().trim().nullable().default(null),
  fields_to_save_if_user_confirms: shouldAddFieldsToSaveSchema.default({}),
  sources: z.array(vaultIntelligenceSourceSchema).default([]),
  unknowns: z.array(z.string().trim().min(1)).default([]),
  warnings: z.array(z.string().trim().min(1)).default([]),
  generatedAt: z.string().datetime(),
  modelUsed: z.string().optional().nullable(),
});

export type ShouldAddResponse = z.infer<typeof shouldAddResponseSchema>;

export const productResearchCategorySchema = z.enum([
  "app",
  "web_app",
  "software",
  "saas",
  "github_project",
  "open_source_tool",
  "browser_extension",
  "other",
]);

export type ProductResearchCategory = z.infer<typeof productResearchCategorySchema>;

export const productResearchSettingsSchema = z.object({
  generateAnalysisReport: z.boolean().optional(),
  generateManualIllustration: z.boolean().optional(),
  fetchIconLogo: z.boolean().optional(),
  includeSimilarProducts: z.boolean().optional(),
  includeTechnicalGithubAnalysis: z
    .union([z.boolean(), z.literal("only_if_github_repo_available")])
    .optional(),
});

export const DEFAULT_PRODUCT_RESEARCH_SETTINGS = {
  generateAnalysisReport: true,
  generateManualIllustration: false,
  fetchIconLogo: true,
  includeSimilarProducts: true,
  includeTechnicalGithubAnalysis: "only_if_github_repo_available" as const,
};

export const productResearchRequestSchema = z.object({
  productName: z.string().trim().min(1).max(160),
  targetUrl: z.string().trim().url().optional().nullable(),
  category: productResearchCategorySchema.optional(),
  settings: productResearchSettingsSchema.optional(),
  existingVaultEntryId: z.string().uuid().optional().nullable(),
  locale: z.custom<AppLocale>().optional(),
});

export type ProductResearchRequest = z.infer<typeof productResearchRequestSchema>;

export const productResearchActiveSettingsSchema = z.object({
  generateAnalysisReport: z.boolean(),
  generateManualIllustration: z.boolean(),
  fetchIconLogo: z.boolean(),
  includeSimilarProducts: z.boolean(),
  includeTechnicalGithubAnalysis: z.union([z.boolean(), z.literal("skipped")]),
});

export const productResearchOfficialLinksSchema = z.object({
  officialWebsite: z.string().url().nullable().optional(),
  githubRepo: z.string().url().nullable().optional(),
  appStore: z.string().url().nullable().optional(),
  googlePlay: z.string().url().nullable().optional(),
  documentation: z.string().url().nullable().optional(),
  pricing: z.string().url().nullable().optional(),
});

export const productResearchIconLogoSchema = z.object({
  imageUrl: z.string().url(),
  sourceUrl: z.string().url(),
  sourceType: z.enum([
    "official_website",
    "favicon",
    "app_store",
    "google_play",
    "github_avatar",
    "documentation",
    "brand_asset_page",
    "unknown",
  ]),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().optional(),
});

export const productResearchFeatureSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(800),
  confirmed: z.boolean(),
  sourceUrls: z.array(z.string().url()).optional(),
});

export const productResearchAnalysisReportSchema = z.object({
  productOverview: z.string().trim().min(1),
  coreFeatures: z.array(productResearchFeatureSchema).default([]),
  userWorkflow: z.array(z.string().trim().min(1)).default([]),
  mainUseCases: z.array(z.string().trim().min(1)).default([]),
  targetUsers: z.array(z.string().trim().min(1)).default([]),
  strengths: z.array(z.string().trim().min(1)).default([]),
  weaknessesOrLimitations: z.array(z.string().trim().min(1)).default([]),
  uiUxAnalysis: z.string().trim().optional(),
  competitivePositioning: z.string().trim().nullable().optional(),
  finalVerdict: z.string().trim().min(1),
});

export const productResearchSimilarProductSchema = z.object({
  name: z.string().trim().min(1).max(160),
  website: z.string().url().nullable().optional(),
  howItCompares: z.string().trim().min(1),
  strengthVsTarget: z.string().trim().optional(),
  weaknessVsTarget: z.string().trim().optional(),
});

export const productResearchGithubAnalysisSchema = z.object({
  repoUrl: z.string().url(),
  description: z.string().optional(),
  stars: z.number().int().nonnegative().nullable().optional(),
  forks: z.number().int().nonnegative().nullable().optional(),
  license: z.string().nullable().optional(),
  primaryLanguage: z.string().nullable().optional(),
  techStack: z.array(z.string()).default([]),
  installationProcess: z.string().optional(),
  documentationQuality: z.enum(["strong", "okay", "weak", "unknown"]),
  repoActivity: z.enum(["active", "slow", "inactive", "unknown"]),
  openIssues: z.number().int().nonnegative().nullable().optional(),
  maintainabilityNotes: z.array(z.string()).default([]),
  developerExperience: z.string(),
  risks: z.array(z.string()).default([]),
});

export const productResearchSourceSchema = z.object({
  title: z.string().trim().min(1),
  url: z.string().url(),
  sourceType: z.enum([
    "official",
    "github",
    "app_store",
    "documentation",
    "pricing",
    "review",
    "screenshot",
    "video",
    "other",
  ]),
  usedFor: z.array(z.string().trim().min(1)).default([]),
});

export const productResearchResponseSchema = z.object({
  activeSettings: productResearchActiveSettingsSchema,
  productName: z.string().trim().min(1),
  officialLinks: productResearchOfficialLinksSchema.default({}),
  iconLogo: productResearchIconLogoSchema.nullable().optional(),
  oneSentenceSummary: z.string().nullable().optional(),
  analysisReport: productResearchAnalysisReportSchema.nullable().optional(),
  similarProducts: z.array(productResearchSimilarProductSchema).nullable().optional(),
  technicalGithubAnalysis: productResearchGithubAnalysisSchema.nullable().optional(),
  manualIllustrationPrompt: z.string().nullable().optional(),
  sources: z.array(productResearchSourceSchema).default([]),
  unknowns: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  generatedAt: z.string().datetime(),
  modelUsed: z.string().optional().nullable(),
});

export type ProductResearchResponse = z.infer<typeof productResearchResponseSchema>;

export const productResearchSaveRequestSchema = z.object({
  report: productResearchResponseSchema,
  request: productResearchRequestSchema,
  existingVaultEntryId: z.string().uuid().optional().nullable(),
});

export type ProductResearchSaveRequest = z.infer<typeof productResearchSaveRequestSchema>;

export const productResearchApplyRequestSchema = z.object({
  reportId: z.string().uuid().optional().nullable(),
  existingVaultEntryId: z.string().uuid().optional().nullable(),
  createNewEntry: z.boolean().optional(),
  fields: shouldAddFieldsToSaveSchema,
  setIconAsPrimary: z.boolean().optional(),
});

export type ProductResearchApplyRequest = z.infer<typeof productResearchApplyRequestSchema>;

export const toolStackSeveritySchema = z.enum(["info", "notice", "warning", "critical"]);
export const toolStackActionSchema = z.enum([
  "keep",
  "trial_first",
  "research_first",
  "replace_review",
  "cancel_review",
  "downgrade_review",
  "use_free_tier_review",
  "set_default_review",
  "link_to_project",
  "missing_capability",
  "create_recipe",
  "record_usage",
]);

export const toolStackInsightSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(180),
  detail: z.string().trim().min(1).max(1200),
  severity: toolStackSeveritySchema,
  action: toolStackActionSchema,
  recommendation: z.string().trim().min(1).max(800),
  relatedEntryIds: z.array(z.string().uuid()).default([]),
  estimatedMonthlyUsd: z.number().nonnegative().optional().nullable(),
  sources: z.array(vaultIntelligenceSourceSchema).default([]),
});

export type ToolStackInsight = z.infer<typeof toolStackInsightSchema>;

export const overlapAuditRequestSchema = z.object({
  save: z.boolean().optional(),
});

export const overlapAuditResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  summary: z.object({
    totalTools: z.number().int().nonnegative(),
    overlapGroups: z.number().int().nonnegative(),
    monthlyOverlapUsd: z.number().nonnegative(),
    missingCapabilityCount: z.number().int().nonnegative(),
  }),
  groups: z.array(toolStackInsightSchema).default([]),
  missingCapabilities: z.array(toolStackInsightSchema).default([]),
  savedGroupIds: z.array(z.string().uuid()).optional(),
});

export type OverlapAuditRequest = z.infer<typeof overlapAuditRequestSchema>;
export type OverlapAuditResponse = z.infer<typeof overlapAuditResponseSchema>;

export const subscriptionAuditRequestSchema = z.object({
  save: z.boolean().optional(),
});

export const subscriptionAuditResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  summary: z.object({
    activeRecurringTools: z.number().int().nonnegative(),
    estimatedMonthlyUsd: z.number().nonnegative(),
    stalePricingCount: z.number().int().nonnegative(),
    reviewCount: z.number().int().nonnegative(),
  }),
  reviews: z.array(toolStackInsightSchema).default([]),
  savedReviewIds: z.array(z.string().uuid()).optional(),
});

export type SubscriptionAuditRequest = z.infer<typeof subscriptionAuditRequestSchema>;
export type SubscriptionAuditResponse = z.infer<typeof subscriptionAuditResponseSchema>;

export const projectStackRequestSchema = z.object({
  targetType: z.enum(["project", "goal", "task", "workflow", "custom"]).default("custom"),
  targetId: z.string().uuid().optional().nullable(),
  targetName: z.string().trim().min(1).max(180),
  description: z.string().trim().max(1600).optional().nullable(),
  selectedEntryIds: z.array(z.string().uuid()).max(24).optional(),
  save: z.boolean().optional(),
});

export const projectStackBlueprintItemSchema = z.object({
  entryId: z.string().uuid().nullable(),
  appName: z.string().trim().min(1).max(180),
  role: z.string().trim().min(1).max(500),
  fit: z.enum(["core", "supporting", "optional", "missing"]),
  reason: z.string().trim().min(1).max(800),
  estimatedMonthlyUsd: z.number().nonnegative().nullable().optional(),
});

export const projectStackResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  blueprintId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(180),
  targetType: z.enum(["project", "goal", "task", "workflow", "custom"]),
  rationale: z.string().trim().min(1).max(1600),
  items: z.array(projectStackBlueprintItemSchema).min(1).max(32),
  missingCapabilities: z.array(toolStackInsightSchema).default([]),
  setupOrder: z.array(z.string().trim().min(1).max(240)).default([]),
});

export type ProjectStackRequest = z.infer<typeof projectStackRequestSchema>;
export type ProjectStackResponse = z.infer<typeof projectStackResponseSchema>;

export const workflowRecipeRequestSchema = z.object({
  name: z.string().trim().min(1).max(180),
  goal: z.string().trim().min(1).max(1600),
  selectedEntryIds: z.array(z.string().uuid()).max(24).optional(),
});

export const workflowRecipeStepSchema = z.object({
  stepIndex: z.number().int().min(1).max(32),
  title: z.string().trim().min(1).max(180),
  instruction: z.string().trim().min(1).max(1000),
  entryIds: z.array(z.string().uuid()).default([]),
  output: z.string().trim().min(1).max(500),
});

export const workflowRecipeResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  name: z.string().trim().min(1).max(180),
  goal: z.string().trim().min(1).max(1600),
  overview: z.string().trim().min(1).max(1400),
  steps: z.array(workflowRecipeStepSchema).min(1).max(32),
  requiredEntryIds: z.array(z.string().uuid()).default([]),
  missingCapabilities: z.array(toolStackInsightSchema).default([]),
});

export const workflowRecipeSaveRequestSchema = z.object({
  recipe: workflowRecipeResponseSchema,
  projectId: z.string().uuid().optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
});

export type WorkflowRecipeRequest = z.infer<typeof workflowRecipeRequestSchema>;
export type WorkflowRecipeResponse = z.infer<typeof workflowRecipeResponseSchema>;
export type WorkflowRecipeSaveRequest = z.infer<typeof workflowRecipeSaveRequestSchema>;

export const defaultToolRecommendationSchema = z.object({
  job: z.string().trim().min(1).max(180),
  lifeArea: z.string().trim().max(120).optional().nullable(),
  recommendedEntryId: z.string().uuid(),
  recommendedAppName: z.string().trim().min(1).max(180),
  reason: z.string().trim().min(1).max(900),
  alternatives: z.array(z.object({
    entryId: z.string().uuid(),
    appName: z.string().trim().min(1).max(180),
    reason: z.string().trim().min(1).max(500),
  })).default([]),
});

export const defaultToolRecommendationResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  recommendations: z.array(defaultToolRecommendationSchema).default([]),
});

export const defaultToolApplyRequestSchema = z.object({
  recommendation: defaultToolRecommendationSchema,
  exceptions: z.array(z.string().trim().min(1).max(180)).max(12).optional(),
});

export type DefaultToolRecommendation = z.infer<typeof defaultToolRecommendationSchema>;
export type DefaultToolRecommendationResponse = z.infer<typeof defaultToolRecommendationResponseSchema>;
export type DefaultToolApplyRequest = z.infer<typeof defaultToolApplyRequestSchema>;

export const usageEventRequestSchema = z.object({
  entryId: z.string().uuid(),
  eventType: z.enum(["open", "used", "completed_workflow", "manual_note"]).default("used"),
  contextType: z.enum(["vault", "project", "goal", "task", "workflow", "manual"]).default("vault"),
  contextId: z.string().uuid().optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

export type UsageEventRequest = z.infer<typeof usageEventRequestSchema>;

export const pageIntelligenceResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  healthScore: z.number().int().min(0).max(100),
  summaryCards: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(120),
    detail: z.string().trim().max(500).optional().nullable(),
    severity: toolStackSeveritySchema,
  })).default([]),
  nextActions: z.array(toolStackInsightSchema).default([]),
});

export type PageIntelligenceResponse = z.infer<typeof pageIntelligenceResponseSchema>;

export function normalizeProductResearchSettings(
  input: ProductResearchRequest["settings"] | undefined,
): z.infer<typeof productResearchActiveSettingsSchema> {
  const merged = { ...DEFAULT_PRODUCT_RESEARCH_SETTINGS, ...(input ?? {}) };
  return {
    generateAnalysisReport: Boolean(merged.generateAnalysisReport),
    generateManualIllustration: Boolean(merged.generateManualIllustration),
    fetchIconLogo: Boolean(merged.fetchIconLogo),
    includeSimilarProducts: Boolean(merged.includeSimilarProducts),
    includeTechnicalGithubAnalysis:
      merged.includeTechnicalGithubAnalysis === "only_if_github_repo_available"
        ? "skipped"
        : Boolean(merged.includeTechnicalGithubAnalysis),
  };
}

export function detectShouldAddInputKind(query: string): z.infer<typeof shouldAddInputKindSchema> {
  const q = query.trim();
  const lower = q.toLowerCase();
  if (/^https?:\/\/github\.com\/[^/\s]+\/[^/\s]+/.test(lower) || /^github\.com\/[^/\s]+\/[^/\s]+/.test(lower)) {
    return "github_url";
  }
  if (/apps\.apple\.com\//.test(lower)) return "app_store_url";
  if (/play\.google\.com\//.test(lower)) return "google_play_url";
  if (/^https?:\/\//.test(lower) || /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(q)) {
    return /pricing|plans|billing/.test(lower) ? "pricing_url" : "website_url";
  }
  if (/\bshould\s+i\b|\bshould\s+we\b|\bworth\s+(adding|using|trying)\b|\badd\s+this\b/.test(lower)) {
    return "question";
  }
  if (q.split(/\s+/).filter(Boolean).length >= 7) return "workflow_need";
  return "tool_name";
}
