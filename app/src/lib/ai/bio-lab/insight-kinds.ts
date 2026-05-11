/**
 * Insight kind constants for the Bio Lab AI features.
 *
 * Mirrors the `bio_lab_*` arm of the `AIInsightKind` union in
 * `lib/habits/types.ts`. Keep both files in lock-step; the union there is
 * what the cache helpers consume, and this object is what client and server
 * code import as a single source of truth so we never typo a kind string.
 */

export const BIO_LAB_AI_INSIGHT_KINDS = {
  /** State Scan: infer mood/energy/focus/stress + note from a single sentence. */
  stateInference: "bio_lab_state_inference",
  /** Mind Sweep: classify ONE entry into one of the 4 kinds. */
  mindLabel: "bio_lab_mind_label",
  /** Mind Sweep: post-batch triage insight (only when items.length >= 3). */
  mindTriage: "bio_lab_mind_triage",
  /** Focus Sprint: recommend intention + duration based on context. */
  focusRecommendation: "bio_lab_focus_recommendation",
  /** System Reset: generate a 5-step adaptive sequence. */
  resetSequence: "bio_lab_reset_sequence",
  /** Hub: weekly roll-up reflection (Sunday only, opt-in via Garden surface). */
  weeklyInsight: "bio_lab_weekly_insight",
} as const;

export type BioLabAIInsightKey = keyof typeof BIO_LAB_AI_INSIGHT_KINDS;
export type BioLabAIInsightKindString =
  (typeof BIO_LAB_AI_INSIGHT_KINDS)[BioLabAIInsightKey];
