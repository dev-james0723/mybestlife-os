/**
 * Zod + Gemini schemas for the five Bio Lab AI features.
 *
 * Each feature exports:
 *   - `<Feature>Schema`   — the Zod schema the route handler validates against.
 *   - `<Feature>GeminiSchema` — the OpenAPI-3 subset Gemini will enforce.
 *   - `<Feature>Result`   — the inferred TS type.
 *
 * Gemini's `responseSchema` cannot use `discriminatedUnion`, `enum` keys for
 * map shapes, or `anyOf`. We work around that with simple flat objects;
 * `parse*Result` functions reassemble more complex shapes when needed. None
 * of the bio-lab features need that layer today (no discriminated unions on
 * the wire), so the parse step is a thin Zod parse.
 */

import { z } from "zod";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

// ============================================================
// 1. State Inference (State Scan)
//    Input: a sentence like "I'm exhausted and on edge."
//    Output: 4 sliders (1–5) + a clean note + confidence + reasoning.
// ============================================================

function clampInt1to5(n: number): number {
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** Gemini sometimes emits floats or strings; coerce before validating. */
const Score1to5 = z.preprocess((val: unknown) => {
  if (typeof val === "number") return clampInt1to5(val);
  if (typeof val === "string") {
    const t = val.trim();
    if (t === "") return undefined;
    const n = Number(t);
    if (Number.isFinite(n)) return clampInt1to5(n);
  }
  return val;
}, z.number().int().min(1).max(5));

export const StateInferenceSchema = z.object({
  mood: Score1to5,
  energy: Score1to5,
  focus: Score1to5,
  stress: Score1to5,
  /** Cleaned-up note suggestion derived from the input. May be empty. */
  note: z.preprocess(
    (v) => (v == null ? "" : String(v)),
    z.string().max(400),
  ),
  /** Self-reported model confidence — drives the "review before save" UX. */
  confidence: z.enum(["high", "medium", "low"]),
  /** One short sentence explaining how the inference was reached. */
  reasoning: z.preprocess((v) => {
    const s = v == null ? "" : String(v).trim();
    return s.length > 0 ? s : "Inferred from your words.";
  }, z.string().min(1).max(240)),
});

export const StateInferenceGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["mood", "energy", "focus", "stress", "confidence", "reasoning"],
  properties: {
    mood: { type: "integer" },
    energy: { type: "integer" },
    focus: { type: "integer" },
    stress: { type: "integer" },
    note: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    reasoning: { type: "string" },
  },
};

// ============================================================
// 2. Mind Label (Mind Sweep — single entry)
//    Input: one short text fragment.
//    Output: best label + confidence + a one-line reasoning.
// ============================================================

const MindKindEnum = z.enum(["task", "worry", "idea", "reminder"]);

export const MindLabelSchema = z.object({
  kind: MindKindEnum,
  confidence: z.enum(["high", "low"]),
  reasoning: z.string().min(1).max(160),
});

export const MindLabelGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["kind", "confidence", "reasoning"],
  properties: {
    kind: { type: "string", enum: ["task", "worry", "idea", "reminder"] },
    confidence: { type: "string", enum: ["high", "low"] },
    reasoning: { type: "string" },
  },
};

// ============================================================
// 3. Mind Triage (Mind Sweep — batch insight)
//    Input: a list of recently-captured items + their kinds.
//    Output: one short insight sentence (no bullet lists, no advice block).
// ============================================================

export const MindTriageSchema = z.object({
  insight: z.string().min(1).max(280),
});

export const MindTriageGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["insight"],
  properties: {
    insight: { type: "string" },
  },
};

// ============================================================
// 4. Focus Recommendation (Focus Sprint)
//    Input: optional intention text + current state hints (energy/focus,
//    last sprint outcome).
//    Output: recommended intention + duration preset + reasoning.
// ============================================================

const FocusPresetEnum = z.enum(["p25", "p50", "p90", "custom"]);

export const FocusRecommendationSchema = z.object({
  intention: z.string().min(1).max(160),
  preset: FocusPresetEnum,
  /** Only meaningful when preset === "custom". */
  workMinutes: z.number().int().min(5).max(180),
  breakMinutes: z.number().int().min(0).max(60),
  reasoning: z.string().min(1).max(240),
});

export const FocusRecommendationGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["intention", "preset", "workMinutes", "breakMinutes", "reasoning"],
  properties: {
    intention: { type: "string" },
    preset: { type: "string", enum: ["p25", "p50", "p90", "custom"] },
    workMinutes: { type: "integer" },
    breakMinutes: { type: "integer" },
    reasoning: { type: "string" },
  },
};

// ============================================================
// 5. Reset Sequence (System Reset)
//    Input: current state hints (mood/energy/focus/stress + free-text note).
//    Output: 5 ordered steps with localized title/body, plus a one-line
//    summary of why this sequence.
// ============================================================

export const ResetSequenceStepSchema = z.object({
  /** Stable id for replay; stays consistent across runs of the same step. */
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(280),
  /** Suggested duration for this step (1–5 minutes). */
  durationSeconds: z.number().int().min(15).max(600),
});

export const ResetSequenceSchema = z.object({
  summary: z.string().min(1).max(200),
  steps: z.array(ResetSequenceStepSchema).length(5),
});

// ============================================================
// 6. Weekly Insight (Hub roll-up — Sunday)
//    Input: aggregated metrics for the past 7 days (counts per tool,
//    streak, AI-assist count, top reflections). NOT raw rows — we
//    summarise client-side first so the payload stays tiny and never
//    contains free-text the user wrote.
//    Output: a short headline + 2–4 single-sentence observations +
//    optional next-step sentence.
// ============================================================

export const WeeklyInsightSchema = z.object({
  /** ≤ 80 chars. One sentence, observational tone. */
  headline: z.string().min(1).max(120),
  /** 2 to 4 short observations. Each ≤ 200 chars, no bullets. */
  observations: z.array(z.string().min(1).max(220)).min(2).max(4),
  /** Optional single sentence — empty string if nothing useful to add. */
  nextStep: z.string().max(220).default(""),
});

export const WeeklyInsightGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["headline", "observations"],
  properties: {
    headline: { type: "string" },
    observations: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string" },
    },
    nextStep: { type: "string" },
  },
};

export const ResetSequenceGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["summary", "steps"],
  properties: {
    summary: { type: "string" },
    steps: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        required: ["id", "title", "body", "durationSeconds"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          durationSeconds: { type: "integer" },
        },
      },
    },
  },
};
