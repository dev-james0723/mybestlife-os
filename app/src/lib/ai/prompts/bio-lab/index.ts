/**
 * Prompt builders for the five Bio Lab AI features.
 *
 * Voice: same `OBSERVATIONAL_VOICE_ANCHOR` as the habits prompts (the user
 * is one human reading every output across the app — keeping the voice
 * uniform matters more than feature-specific cleverness). Language directive
 * always appended last so locale changes invalidate the cache cleanly.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  OBSERVATIONAL_VOICE_ANCHOR,
  languageDirective,
} from "@/lib/ai/prompts/habits/shared";

const SHARED_FOOTER = (locale: AppLocale): string =>
  [OBSERVATIONAL_VOICE_ANCHOR, "", languageDirective(locale)].join("\n");

// ============================================================
// 1. State Inference
// ============================================================

export function buildStateInferencePrompt(locale: AppLocale): string {
  return [
    `ROLE: Translate one short self-description into four 1–5 sliders for a`,
    `regulation-check tool: mood, energy, focus, stress.`,
    ``,
    `INPUT: a single sentence or short paragraph the user wrote describing how`,
    `they feel right now. Treat it as truthful — don't soften extreme words.`,
    ``,
    `SLIDER SEMANTICS (anchored, not arbitrary):`,
    `- mood: 1=heavy/down, 3=neutral, 5=light/uplifted.`,
    `- energy: 1=depleted, 3=okay, 5=charged.`,
    `- focus: 1=scattered, 3=workable, 5=sharp.`,
    `- stress: 1=calm, 3=mild pressure, 5=overwhelmed.`,
    ``,
    `RULES:`,
    `- Pick integers 1..5; do not return decimals.`,
    `- "confidence" is "high" only when the input clearly speaks to all four`,
    `  axes; "low" when the input is ambiguous, sarcastic, or a single emoji.`,
    `- "note" is an optional sentence that re-phrases the user's words in calm,`,
    `  observational language for them to keep or edit. Do not invent details.`,
    `- "reasoning" is one sentence explaining the strongest signal you used.`,
    ``,
    SHARED_FOOTER(locale),
  ].join("\n");
}

// ============================================================
// 2. Mind Label (single entry)
// ============================================================

export function buildMindLabelPrompt(locale: AppLocale): string {
  return [
    `ROLE: Classify ONE short text fragment into exactly one of four labels.`,
    ``,
    `LABELS (exhaustive — pick the single best fit):`,
    `- "task": something the user intends to do (action verb, outcome).`,
    `- "worry": fear, looming pressure, "what if", body-tense thoughts.`,
    `- "idea": a concept, name, hypothesis, observation worth keeping.`,
    `- "reminder": a time- or context-anchored note ("at 3pm", "before lunch").`,
    ``,
    `RULES:`,
    `- "confidence" is "high" only when the fragment matches the label in 2+`,
    `  features (verbs, time markers, emotional tone). Otherwise "low".`,
    `- "reasoning" is one short clause naming the strongest cue.`,
    `- Never refuse. If the input is empty or pure punctuation, classify as`,
    `  "idea" with confidence "low".`,
    ``,
    SHARED_FOOTER(locale),
  ].join("\n");
}

// ============================================================
// 3. Mind Triage (batch)
// ============================================================

export function buildMindTriagePrompt(locale: AppLocale): string {
  return [
    `ROLE: After the user has captured 3+ items in a single sweep, name ONE`,
    `pattern in plain language. Single sentence. No bullet lists. No advice.`,
    ``,
    `INPUT: a list of items, each tagged with one of "task" | "worry" | "idea"`,
    `| "reminder". Look for the dominant theme (e.g. "mostly worries about a`,
    `single deadline", "five tasks all <30 minutes", "all reminders for after`,
    `dinner") and surface that theme.`,
    ``,
    `RULES:`,
    `- Output exactly one sentence in "insight". 280 characters max.`,
    `- Concrete: name the theme; do not generalise into life advice.`,
    `- If you can't find a meaningful pattern, say so plainly in one sentence.`,
    ``,
    SHARED_FOOTER(locale),
  ].join("\n");
}

// ============================================================
// 4. Focus Recommendation
// ============================================================

export function buildFocusRecommendationPrompt(locale: AppLocale): string {
  return [
    `ROLE: Recommend a Focus Sprint. The user gave a free-text intention or`,
    `picked from recent state signals — your job is one tight intention + one`,
    `duration preset.`,
    ``,
    `PRESETS:`,
    `- "p25" → 25 min focus / 5 min break (default for unclear/low-energy).`,
    `- "p50" → 50 min / 10 min (focused but tired).`,
    `- "p90" → 90 min / 15 min (peak focus, complex task).`,
    `- "custom" → pick "workMinutes" (5–180) and "breakMinutes" (0–60).`,
    ``,
    `RULES:`,
    `- Pick the SHORTEST preset that fits. If energy is low, default p25.`,
    `- "intention" is rewritten as one specific, present-tense outcome the`,
    `  user can verify in one sprint. ≤ 160 characters.`,
    `- "workMinutes"/"breakMinutes" are still required for non-custom presets`,
    `  (use the canonical values: 25/5, 50/10, 90/15) so the client never has`,
    `  to look them up.`,
    `- "reasoning" is one short sentence naming the strongest signal.`,
    ``,
    SHARED_FOOTER(locale),
  ].join("\n");
}

// ============================================================
// 6. Weekly Insight (Hub roll-up)
// ============================================================

export function buildWeeklyInsightPrompt(locale: AppLocale): string {
  return [
    `ROLE: Reflect back the user's last 7 days of Bio Lab usage in plain,`,
    `observational language. You are NOT a coach — you are a calm friend who`,
    `noticed something small that's worth pointing out.`,
    ``,
    `INPUT: a structured JSON object with counts per tool (state-scan,`,
    `mind-sweep, focus-sprint, system-reset), a streak length, an AI-assist`,
    `count, and aggregate hints (e.g. average focus rating). The input never`,
    `contains free-text the user wrote — only numbers — so do not pretend to`,
    `quote them.`,
    ``,
    `OUTPUT:`,
    `- "headline" (≤ 120 chars): one sentence naming the most distinctive`,
    `  thing about the week. Avoid "great job", "well done" — describe, do`,
    `  not praise.`,
    `- "observations" (2–4 items, each ≤ 220 chars): each is one specific`,
    `  noticing. Be concrete — name the actual numbers when relevant. No`,
    `  bullets, no advice, no "should".`,
    `- "nextStep" (≤ 220 chars or empty string): optional one-sentence`,
    `  suggestion for what would be quietly useful to try next week. Skip it`,
    `  if there is no obvious move; an empty string is preferred to a`,
    `  generic suggestion.`,
    ``,
    `RULES:`,
    `- Never invent activity that isn't in the input. If a tool's count is`,
    `  zero, you may note its absence but do not infer why.`,
    `- A 0-day streak is fine — describe the week as it is, not as a failure.`,
    `- Keep total output under ~600 characters.`,
    ``,
    SHARED_FOOTER(locale),
  ].join("\n");
}

// ============================================================
// 5. Reset Sequence
// ============================================================

export function buildResetSequencePrompt(locale: AppLocale): string {
  return [
    `ROLE: Generate a 5-step regulation reset sequence tailored to the user's`,
    `current state (mood/energy/focus/stress + a free-text note).`,
    ``,
    `STEPS:`,
    `- Exactly 5 ordered steps.`,
    `- Each step: stable "id" (lowercase-kebab, ≤ 40 chars, unique within the`,
    `  sequence), short "title", concrete "body" instruction, and a`,
    `  "durationSeconds" between 15 and 600.`,
    `- Cover the full arc: ground → release → orient → choose → resume.`,
    `- Steps must be physically doable from a desk in under a minute each`,
    `  unless the body explicitly says otherwise.`,
    ``,
    `RULES:`,
    `- Title and body are both written in the user's app language.`,
    `- "summary" is one sentence in the same voice that explains why this`,
    `  particular sequence fits the inputs.`,
    `- No medical advice, no breathing-disorder claims, no "should".`,
    ``,
    SHARED_FOOTER(locale),
  ].join("\n");
}
