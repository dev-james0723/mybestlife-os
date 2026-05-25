/**
 * AI Career Mirror — Gemini `responseSchema` objects (OpenAPI-3 subset:
 * type/properties/required/items/enum). One exported `...GeminiSchema` per AI
 * function. The matching Zod validators live in
 * `@/lib/career-mirror/validators` and are the server-side source of truth.
 *
 * Gemini's dialect does not support `anyOf`, `discriminator`, or map-keyed
 * objects, so every shape here is a plain object / array / scalar.
 */

import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

const STRING = { type: "string" } as const;
const STRING_ARRAY = { type: "array", items: { type: "string" } } as const;
const SCORE = { type: "integer" } as const;

// ============================================================
// 1. synthesizeCareerIdentity
// ============================================================

export const SynthesizeIdentityGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["ai_summary", "work_style_profile"],
  properties: {
    ai_summary: STRING,
    career_identity: STRING,
    career_stage: STRING,
    current_status_summary: STRING,
    work_style_profile: {
      type: "object",
      properties: {
        energy_pattern: STRING,
        motivation_drivers: STRING_ARRAY,
        decision_style: STRING,
        feedback_preference: STRING,
        ideal_environment: STRING,
        organizational_triggers: STRING_ARRAY,
        communication_preference: STRING,
        ai_coaching_style: STRING,
      },
    },
    ambition_style: STRING,
    desired_reputation: STRING,
    visibility_goal: STRING,
    personal_brand_strategy: STRING,
    content_strategy_direction: STRING,
  },
};

// ============================================================
// 2. diagnoseCareer
// ============================================================

export const DiagnosisGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["scores", "narrative"],
  properties: {
    scores: {
      type: "object",
      required: [
        "clarity",
        "momentum",
        "positioning",
        "network",
        "skill_fit",
        "risk",
      ],
      properties: {
        clarity: SCORE,
        momentum: SCORE,
        positioning: SCORE,
        network: SCORE,
        skill_fit: SCORE,
        risk: SCORE,
      },
    },
    narrative: STRING,
    main_tension: STRING,
    main_risk: STRING,
    strengths: STRING_ARRAY,
    gaps: STRING_ARRAY,
    tensions: {
      type: "array",
      items: {
        type: "object",
        required: ["a", "b", "explanation"],
        properties: {
          a: STRING,
          b: STRING,
          explanation: STRING,
          severity: STRING,
        },
      },
    },
  },
};

// ============================================================
// 3. generateNextActions
// ============================================================

export const NextActionsGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["actions"],
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        required: ["title"],
        properties: {
          title: STRING,
          why: STRING,
          effort: STRING,
          horizon: STRING,
        },
      },
    },
  },
};

// ============================================================
// 4. extractSkills
// ============================================================

export const SkillsGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["skills"],
  properties: {
    skills: STRING_ARRAY,
    inferred_from: STRING_ARRAY,
  },
};

// ============================================================
// 5. reframeGoal
// ============================================================

export const ReframeGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["reframed_problem", "reframe_rationale"],
  properties: {
    reframed_problem: STRING,
    reframe_rationale: STRING,
  },
};

// ============================================================
// 6. analyzeBlockers
// ============================================================

export const BlockersGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["blocker_category"],
  properties: {
    blocker_category: STRING,
    risk_factors: STRING_ARRAY,
    mitigations: STRING_ARRAY,
  },
};

// ============================================================
// 7. realityCheck
// ============================================================

export const RealityCheckGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["verdict", "gap_summary", "confidence"],
  properties: {
    verdict: STRING,
    gap_summary: STRING,
    evidence: STRING_ARRAY,
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
};

// ============================================================
// 8. simulateScenario
// ============================================================

export const ScenarioGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["outcome_summary", "probability"],
  properties: {
    outcome_summary: STRING,
    pros: STRING_ARRAY,
    cons: STRING_ARRAY,
    probability: { type: "number" },
    required_assets: STRING_ARRAY,
    hidden_cost: STRING,
    likely_failure_point: STRING,
    first_30_day_move: STRING,
    recommended_next_steps: STRING_ARRAY,
  },
};

// ============================================================
// 9. personalBrandStrategy
// ============================================================

export const BrandGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["personal_brand_strategy", "content_strategy_direction"],
  properties: {
    personal_brand_strategy: STRING,
    content_strategy_direction: STRING,
    channels: STRING_ARRAY,
    short_bio: STRING,
    long_bio: STRING,
    routes: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "positioning"],
        properties: {
          name: STRING,
          positioning: STRING,
        },
      },
    },
  },
};

// ============================================================
// 10. auditAssetGap
// ============================================================

export const AssetAuditGeminiSchema: GeminiResponseSchema = {
  type: "object",
  properties: {
    has: STRING_ARRAY,
    missing: STRING_ARRAY,
    priorities: STRING_ARRAY,
  },
};

// ============================================================
// 11. generateWeeklyReview
// ============================================================

export const WeeklyReviewGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["momentum_score", "focus_next", "uncomfortable_action"],
  properties: {
    wins: STRING_ARRAY,
    avoided: STRING_ARRAY,
    momentum_score: SCORE,
    focus_next: STRING,
    uncomfortable_action: STRING,
    nudges: STRING_ARRAY,
  },
};

// ============================================================
// 12. matchOpportunities
// ============================================================

export const OpportunitiesGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["opportunities"],
  properties: {
    opportunities: {
      type: "array",
      items: {
        type: "object",
        required: ["title", "why_fit", "action"],
        properties: {
          title: STRING,
          why_fit: STRING,
          action: STRING,
          category: STRING,
        },
      },
    },
  },
};

// ============================================================
// 13. generatePromptPack
// ============================================================

export const PromptPackGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["prompts"],
  properties: {
    prompts: {
      type: "array",
      items: {
        type: "object",
        required: ["title", "body"],
        properties: {
          title: STRING,
          body: STRING,
          when_to_use: STRING,
        },
      },
    },
  },
};

// ============================================================
// 14. generateSectionInsight
// ============================================================

export const SectionInsightGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["insight"],
  properties: {
    insight: STRING,
  },
};

// ============================================================
// 15. autofillFromDocs (review-only)
// ============================================================

export const AutofillGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        required: ["field", "value", "confidence"],
        properties: {
          field: STRING,
          value: STRING,
          confidence: { type: "number" },
        },
      },
    },
  },
};
