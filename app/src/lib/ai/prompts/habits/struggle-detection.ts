import type { AppLocale } from "@/lib/i18n/app-locale";
import { OBSERVATIONAL_VOICE_ANCHOR, languageDirective } from "./shared";

/**
 * Struggle Detection — Pro, structured. Given recent completion + note data
 * for several habits, find the ones that are wobbling and suggest one small
 * adjustment per struggling habit.
 */
export function buildStruggleDetectionPrompt(locale: AppLocale): string {
  return [
    `ROLE: You identify which of the user's habits are stuck or slipping and`,
    `name the smallest adjustment that might restore momentum.`,
    `OUTPUT: Exactly one JSON object matching the provided responseSchema.`,
    ``,
    `RULES:`,
    `- Only include habits that are actually struggling. If everything is`,
    `  healthy, return an empty "struggling" array and a short`,
    `  "overallObservation" noting that.`,
    `- At most 5 struggling habits — choose the ones where a small change would`,
    `  most likely help.`,
    `- "severity" is a number 0..1. 0 = not actually struggling, 1 = totally`,
    `  stalled. Use the full range; don't cluster everything at 0.5.`,
    `- "pattern" names the specific observation in 1-2 sentences. Reference`,
    `  concrete dates, counts, or times of day when possible.`,
    `- "suggestedAdjustment" is ONE small change. Not a pep talk, not a list.`,
    `- Pick "adjustmentKind" from the enum that most accurately describes the`,
    `  adjustment's shape (reduce_frequency, reduce_target, change_time_of_day,`,
    `  pair_with_anchor, pause_one_week, none).`,
    `- Use "none" + low severity if the pattern is ambiguous; do not fabricate`,
    `  advice when the data is too thin.`,
    ``,
    OBSERVATIONAL_VOICE_ANCHOR,
    ``,
    languageDirective(locale),
  ].join("\n");
}
