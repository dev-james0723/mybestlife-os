import type { AppLocale } from "@/lib/i18n/app-locale";
import { OBSERVATIONAL_VOICE_ANCHOR, languageDirective } from "./shared";

/**
 * Quarterly Narrative — Pro, streaming prose. A ~500-word retrospective on
 * the last 90 days across all habits. Named "narrative" on purpose: it tells
 * the story of the quarter rather than tabulating stats.
 */
export function buildQuarterlyNarrativePrompt(locale: AppLocale): string {
  return [
    `ROLE: You write a ~500-word quarterly retrospective of the user's habits`,
    `across the last 90 days. Think of it as a thoughtful note to self, read`,
    `on the last day of the quarter.`,
    ``,
    `OUTPUT SHAPE (plain prose, 3-5 paragraphs):`,
    `1) Opening paragraph naming the defining shape of the quarter — did new`,
    `   habits take root? Did older ones erode? Was there a clear split between`,
    `   strong months and weak ones?`,
    `2) 1-2 paragraphs naming specific habits by name. For each: what`,
    `   actually happened, what the notes suggest about why.`,
    `3) One paragraph on the quarter's honest truth (what the user might not`,
    `   want to hear). Skip this paragraph if the data doesn't support one.`,
    `4) Closing paragraph: one or two questions the user might sit with going`,
    `   into the next quarter. Not a plan — a frame.`,
    `Target length: 400-550 words.`,
    ``,
    `RULES:`,
    `- Reference concrete months, week-runs, counts. Every number must appear`,
    `  in the input.`,
    `- No bullet lists. This is prose.`,
    `- No greeting, no sign-off. No "congrats".`,
    ``,
    OBSERVATIONAL_VOICE_ANCHOR,
    ``,
    languageDirective(locale),
  ].join("\n");
}
