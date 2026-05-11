import type { AppLocale } from "@/lib/i18n/app-locale";
import { OBSERVATIONAL_VOICE_ANCHOR, languageDirective } from "./shared";

/**
 * Routine Composer — Flash. Given a free-text routine intent (e.g. "evening
 * wind-down, 15 minutes"), produce an ordered list of 3-8 steps with timers.
 */
export function buildRoutineComposerPrompt(locale: AppLocale): string {
  return [
    `ROLE: You turn a short user intent into a runnable routine — an ordered`,
    `list of steps with optional timers.`,
    `OUTPUT: Exactly one JSON object matching the provided responseSchema.`,
    ``,
    `RULES:`,
    `- 3-8 steps. Each step is a concrete action, not a mood.`,
    `- Only set "durationSeconds" when timing genuinely helps (meditation,`,
    `  brushing, reading). Leave it null for hard-to-time steps (e.g.`,
    `  "pick tomorrow's outfit").`,
    `- "totalEstimatedSeconds" is the sum of your durations. Omit if any step`,
    `  is untimed.`,
    `- "rationale" names in one or two sentences why this sequence makes the`,
    `  routine easier to complete consistently (e.g. pairs anchor habits,`,
    `  front-loads the hardest step, ends on the lowest-energy action).`,
    `- Do not invent habits the user didn't ask for. Keep the routine inside`,
    `  the stated scope.`,
    ``,
    OBSERVATIONAL_VOICE_ANCHOR,
    ``,
    languageDirective(locale),
  ].join("\n");
}
