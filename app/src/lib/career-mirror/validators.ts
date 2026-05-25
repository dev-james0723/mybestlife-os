/**
 * AI Career Mirror — Zod schemas for every AI output (server-side validation
 * boundary). The route handlers run these against the raw Gemini output before
 * persisting to Supabase or returning to the client.
 *
 * The matching Gemini `responseSchema` objects (OpenAPI-3 subset) live in
 * `@/lib/ai/schemas/career-mirror/index`. Keep the two in sync.
 */

import { z } from "zod";

// ============================================================
// Shared helpers
// ============================================================

/** Score 0..100, coercing floats/strings Gemini sometimes emits. */
const Score0to100 = z.preprocess((val: unknown) => {
  const n =
    typeof val === "number"
      ? val
      : typeof val === "string"
        ? Number(val.trim())
        : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}, z.number().int().min(0).max(100));

/** Probability 0..1, coercing percentages / strings. */
const Probability0to1 = z.preprocess((val: unknown) => {
  let n =
    typeof val === "number"
      ? val
      : typeof val === "string"
        ? Number(val.trim().replace(/%$/, ""))
        : NaN;
  if (!Number.isFinite(n)) return 0.5;
  if (n > 1) n = n / 100;
  return Math.min(1, Math.max(0, n));
}, z.number().min(0).max(1));

const ShortText = z.string().min(1).max(600);
const StringList = z.array(z.string().min(1).max(400)).default([]);

// ============================================================
// 1. synthesizeCareerIdentity
// ============================================================

export const CareerWorkStyleProfileSchema = z.object({
  energy_pattern: z.string().max(400).optional(),
  motivation_drivers: StringList,
  decision_style: z.string().max(400).optional(),
  feedback_preference: z.string().max(400).optional(),
  ideal_environment: z.string().max(400).optional(),
  organizational_triggers: StringList,
  communication_preference: z.string().max(400).optional(),
  ai_coaching_style: z.string().max(400).optional(),
});

export const SynthesizeIdentitySchema = z.object({
  ai_summary: z.string().min(1).max(2000),
  career_identity: z.string().max(400).optional().default(""),
  career_stage: z.string().max(120).optional().default(""),
  current_status_summary: z.string().max(1200).optional().default(""),
  work_style_profile: CareerWorkStyleProfileSchema,
  ambition_style: z.string().max(200).optional().default(""),
  desired_reputation: z.string().max(400).optional().default(""),
  visibility_goal: z.string().max(400).optional().default(""),
  personal_brand_strategy: z.string().max(1200).optional().default(""),
  content_strategy_direction: z.string().max(1200).optional().default(""),
});
export type SynthesizeIdentityResult = z.infer<typeof SynthesizeIdentitySchema>;

// ============================================================
// 2. diagnoseCareer
// ============================================================

export const CareerTensionSchema = z.object({
  a: z.string().min(1).max(200),
  b: z.string().min(1).max(200),
  explanation: z.string().min(1).max(600),
  severity: z.string().max(40).optional(),
});

export const DiagnosisSchema = z.object({
  scores: z.object({
    clarity: Score0to100,
    momentum: Score0to100,
    positioning: Score0to100,
    network: Score0to100,
    skill_fit: Score0to100,
    risk: Score0to100,
  }),
  narrative: z.string().min(1).max(2400),
  main_tension: z.string().max(600).optional(),
  main_risk: z.string().max(600).optional(),
  strengths: StringList,
  gaps: StringList,
  tensions: z.array(CareerTensionSchema).default([]),
});
export type DiagnosisResult = z.infer<typeof DiagnosisSchema>;

// ============================================================
// 3. generateNextActions
// ============================================================

export const NextActionSchema = z.object({
  title: z.string().min(1).max(200),
  why: z.string().max(600).optional(),
  effort: z.string().max(80).optional(),
  horizon: z.string().max(80).optional(),
});

export const NextActionsSchema = z.object({
  actions: z.array(NextActionSchema).max(12).default([]),
});
export type NextActionsResult = z.infer<typeof NextActionsSchema>;

// ============================================================
// 4. extractSkills
// ============================================================

export const SkillsSchema = z.object({
  skills: z.array(z.string().min(1).max(80)).max(40).default([]),
  inferred_from: StringList,
});
export type SkillsResult = z.infer<typeof SkillsSchema>;

// ============================================================
// 5. reframeGoal
// ============================================================

export const ReframeSchema = z.object({
  reframed_problem: ShortText,
  reframe_rationale: z.string().min(1).max(1200),
});
export type ReframeResult = z.infer<typeof ReframeSchema>;

// ============================================================
// 6. analyzeBlockers
// ============================================================

export const BlockersSchema = z.object({
  blocker_category: z.string().min(1).max(120),
  risk_factors: StringList,
  mitigations: StringList,
});
export type BlockersResult = z.infer<typeof BlockersSchema>;

// ============================================================
// 7. realityCheck
// ============================================================

export const RealityCheckSchema = z.object({
  verdict: z.string().min(1).max(600),
  gap_summary: z.string().min(1).max(1200),
  evidence: StringList,
  confidence: z.enum(["high", "medium", "low"]),
});
export type RealityCheckResult = z.infer<typeof RealityCheckSchema>;

// ============================================================
// 8. simulateScenario
// ============================================================

export const ScenarioSchema = z.object({
  outcome_summary: z.string().min(1).max(1600),
  pros: StringList,
  cons: StringList,
  probability: Probability0to1,
  required_assets: StringList,
  hidden_cost: z.string().max(800).optional().default(""),
  likely_failure_point: z.string().max(800).optional().default(""),
  first_30_day_move: z.string().max(800).optional().default(""),
  recommended_next_steps: StringList,
});
export type ScenarioResult = z.infer<typeof ScenarioSchema>;

// ============================================================
// 9. personalBrandStrategy
// ============================================================

export const BrandRouteSchema = z.object({
  name: z.string().min(1).max(120),
  positioning: z.string().min(1).max(600),
});

export const BrandSchema = z.object({
  personal_brand_strategy: z.string().min(1).max(1600),
  content_strategy_direction: z.string().min(1).max(1600),
  channels: StringList,
  short_bio: z.string().max(600).optional().default(""),
  long_bio: z.string().max(2000).optional().default(""),
  routes: z.array(BrandRouteSchema).max(8).default([]),
});
export type BrandResult = z.infer<typeof BrandSchema>;

// ============================================================
// 10. auditAssetGap -> PersonalBrandAssets
// ============================================================

export const AssetAuditSchema = z.object({
  has: StringList,
  missing: StringList,
  priorities: StringList,
});
export type AssetAuditResult = z.infer<typeof AssetAuditSchema>;

// ============================================================
// 11. generateWeeklyReview
// ============================================================

export const WeeklyReviewSchema = z.object({
  wins: StringList,
  avoided: StringList,
  momentum_score: Score0to100,
  focus_next: z.string().min(1).max(800),
  uncomfortable_action: z.string().min(1).max(800),
  nudges: StringList,
});
export type WeeklyReviewResult = z.infer<typeof WeeklyReviewSchema>;

// ============================================================
// 12. matchOpportunities
// ============================================================

export const OpportunitySchema = z.object({
  title: z.string().min(1).max(200),
  why_fit: z.string().min(1).max(800),
  action: z.string().min(1).max(600),
  category: z.string().max(80).optional().default(""),
});

export const OpportunitiesSchema = z.object({
  opportunities: z.array(OpportunitySchema).max(12).default([]),
});
export type OpportunitiesResult = z.infer<typeof OpportunitiesSchema>;

// ============================================================
// 13. generatePromptPack
// ============================================================

export const PromptPackEntrySchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
  when_to_use: z.string().max(600).optional().default(""),
});

export const PromptPackSchema = z.object({
  prompts: z.array(PromptPackEntrySchema).max(20).default([]),
});
export type PromptPackResult = z.infer<typeof PromptPackSchema>;

// ============================================================
// 14. generateSectionInsight
// ============================================================

export const SectionInsightSchema = z.object({
  insight: z.string().min(1).max(600),
});
export type SectionInsightResult = z.infer<typeof SectionInsightSchema>;

// ============================================================
// 15. autofillFromDocs (review-only)
// ============================================================

export const AutofillSuggestionSchema = z.object({
  field: z.string().min(1).max(120),
  value: z.unknown(),
  confidence: Probability0to1,
});

export const AutofillSchema = z.object({
  suggestions: z.array(AutofillSuggestionSchema).max(60).default([]),
});
export type AutofillResult = z.infer<typeof AutofillSchema>;
