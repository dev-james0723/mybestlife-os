import type { AppLocale } from "@/lib/i18n/app-locale";
import { OBSERVATIONAL_VOICE_ANCHOR, languageDirective } from "./shared";

/**
 * Review a habit — Pro, streaming prose, followed by a structured summary.
 * The full completion history of one habit is passed in; the model writes a
 * careful critique and ends with a recommendation: keep / adjust / pause / retire.
 */
export function buildReviewHabitPrompt(locale: AppLocale): string {
  return [
    `ROLE: The user is asking you to review one specific habit they've been`,
    `running. Read the whole history (weeks or months). Then write the kind`,
    `of honest note a thoughtful friend who has been paying attention would`,
    `write — not a pep talk, not a lecture.`,
    ``,
    `OUTPUT SHAPE (plain prose, no headings):`,
    `1) Open by naming the habit and the time range in one sentence.`,
    `2) 2-4 paragraphs observing what actually happened: the pattern across`,
    `   weeks, when it held, when it slipped, what the notes suggest about`,
    `   why, how often freezes or skips were used.`,
    `3) One difficult truth you noticed (only if one exists — if the data is`,
    `   fine, say so). Do not invent difficult truths to sound honest.`,
    `4) A recommendation: keep as-is, adjust (and how), pause for a week, or`,
    `   retire the habit. Justify in one paragraph.`,
    `Keep the whole review under 400 words.`,
    ``,
    `INPUT: A JSON block with:`,
    `- The habit (name, type, target, frequency, time_of_day, createdAt).`,
    `- completions[]: every completion in the range (date, status, value, note).`,
    `- freezes[]: every streak freeze in the range.`,
    `- streak: current and best.`,
    ``,
    `RULES:`,
    `- Never invent numbers. If you quote a count or date, it must appear in`,
    `  the input.`,
    `- Use the user's language (see LANGUAGE below). Do not switch mid-review.`,
    `- No greeting, no sign-off.`,
    ``,
    OBSERVATIONAL_VOICE_ANCHOR,
    ``,
    languageDirective(locale),
  ].join("\n");
}

/**
 * Separate prompt for the *structured summary* that accompanies the streamed
 * prose. Returns a small JSON object the UI can render as headlines in the
 * detail drawer.
 */
/**
 * Single-pass structured review: long `prose` plus summary fields for the UI.
 */
export function buildReviewHabitCombinedStructuredPrompt(
  locale: AppLocale,
): string {
  return [
    `ROLE: The user is asking you to review one specific habit they've been`,
    `running. Read the whole history (weeks or months). Then write the kind`,
    `of honest note a thoughtful friend who has been paying attention would`,
    `write — not a pep talk, not a lecture.`,
    ``,
    `OUTPUT: Exactly one JSON object matching the responseSchema.`,
    `- Field "prose": the full review as plain text (no markdown headings).`,
    `  Same structure as a written review: open with habit + time range,`,
    `  2-4 short paragraphs on patterns, one difficult truth only if earned,`,
    `  then recommendation. Under 400 words inside "prose".`,
    `- Other fields: concise summary bullets aligned with that prose.`,
    ``,
    `INPUT: A JSON block in the user message with habit, completions, freezes, streak.`,
    ``,
    `RULES:`,
    `- Never invent numbers. If you quote a count or date, it must appear in`,
    `  the input.`,
    `- Use the user's language (see LANGUAGE below). Do not switch mid-review.`,
    `- No greeting, no sign-off.`,
    ``,
    OBSERVATIONAL_VOICE_ANCHOR,
    ``,
    languageDirective(locale),
  ].join("\n");
}

export function buildReviewHabitSummaryPrompt(locale: AppLocale): string {
  return [
    `ROLE: You read the prose review you just produced (or the equivalent`,
    `habit data) and distill it into a small, scannable summary.`,
    `OUTPUT: Exactly one JSON object matching the provided responseSchema.`,
    ``,
    `RULES:`,
    `- "whatWorked" and "whatDidnt" are short bullets (<= 12 words each).`,
    `- "oneThingToTry" is THE single most important thing, stated clearly.`,
    `- "difficultTruths" only includes facts supported by the data. Empty`,
    `  array is fine.`,
    `- "continueRecommendation" must match the recommendation the prose review`,
    `  arrived at (keep, adjust, pause, retire).`,
    `- "recommendationReason" is 1-2 sentences naming WHY, grounded in the`,
    `  observations — no motivation language.`,
    ``,
    OBSERVATIONAL_VOICE_ANCHOR,
    ``,
    languageDirective(locale),
  ].join("\n");
}
