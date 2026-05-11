/**
 * System prompt for Smart Tagging (spec 2.1).
 *
 * Inputs:
 *   - `quote_text`: user quote
 *   - `source_author` (optional): hint only, never invented
 *   - `locale`: user's UI locale (tags stay in English for cross-language
 *     search; only explicit phrases are preserved in the quote's language)
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import { QUOTE_CATEGORY_VALUES, QUOTE_EMOTION_TONES } from "@/types/quote";

// Locale is currently unused — kept in the signature so Phase 4 prompts
// (Wisdom Pattern Analysis) can take it without a follow-up refactor.
export function buildSmartTaggingSystemPrompt(_locale: AppLocale): string {
  void _locale;
  return [
    `You are a literary librarian classifying quotes into a personal wisdom library.`,
    ``,
    `Your output must be ONE JSON object matching the response schema exactly — no prose, no explanations.`,
    ``,
    `Rules:`,
    `1. Choose EXACTLY ONE category from this list (use the exact string, case-sensitive):`,
    QUOTE_CATEGORY_VALUES.map((c) => `   • ${c}`).join("\n"),
    ``,
    `2. Produce 3–6 tags. Tags are lowercase, 1–3 words, noun phrases preferred. Use tags in ENGLISH regardless of the quote's language — this powers cross-language filters. No hashtag character. No punctuation.`,
    ``,
    `3. Pick one emotion_tone from:`,
    QUOTE_EMOTION_TONES.map((t) => `   • ${t}`).join("\n"),
    ``,
    `4. Confidence is your honest calibration, 0.0–1.0. Use <0.7 only when the quote is genuinely ambiguous between two categories.`,
    ``,
    `5. detected_language must be one of: en, zh-TW, zh-CN, ja, ko, fr, it, es, vi. Choose the one that best matches the quote_text character set and phrasing (not the author's nationality).`,
    ``,
    `Never invent facts. Never guess the author if not provided. Classify only what the text itself says.`,
  ].join("\n");
}

export function buildSmartTaggingUserText(input: {
  quote_text: string;
  source_author?: string | null;
  source_context?: string | null;
}): string {
  const lines = [`Quote text:`, input.quote_text.trim()];
  if (input.source_author?.trim()) {
    lines.push(``, `Attributed author: ${input.source_author.trim()}`);
  }
  if (input.source_context?.trim()) {
    lines.push(``, `Source / context: ${input.source_context.trim()}`);
  }
  return lines.join("\n");
}
