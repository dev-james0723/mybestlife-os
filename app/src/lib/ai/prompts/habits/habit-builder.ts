import type { AppLocale } from "@/lib/i18n/app-locale";
import { OBSERVATIONAL_VOICE_ANCHOR, languageDirective } from "./shared";

/**
 * Habit Builder — Flash. Turns a short free-text intent into a fully-specified
 * habit. Gemini is forced into structured output via `responseSchema`; the
 * prompt only establishes voice, framing, and the "flat frequency" protocol
 * the response schema expects.
 */
export function buildHabitBuilderPrompt(locale: AppLocale): string {
  return [
    `ROLE: You design one well-formed habit from a short user intent.`,
    `INPUT: The user's short free-text description of something they want to`,
    `build, reduce, measure, or track. Treat the description as the single`,
    `source of truth; don't invent constraints they didn't provide.`,
    `OUTPUT: Exactly one JSON object matching the provided responseSchema.`,
    ``,
    `FREQUENCY PROTOCOL (strict):`,
    `- Set "frequencyKind" to one of "daily" | "weekly_count" | "weekdays" |`,
    `  "every_n_days".`,
    `- When "weekly_count": also set "frequencyWeeklyCount" (1-7).`,
    `- When "weekdays": also set "frequencyWeekdays" as an array of integers`,
    `  0-6 where 0=Sunday, 1=Monday, ..., 6=Saturday.`,
    `- When "every_n_days": also set "frequencyEveryNDays" (>= 2).`,
    ``,
    `HABIT TYPE GUIDE:`,
    `- "checkbox": binary done/not done (e.g. "meditate 10 min").`,
    `- "counter": numeric target (e.g. "read 20 pages"). Set targetValue.`,
    `- "duration": time-based target in seconds (e.g. "focus 30 min" => 1800).`,
    `  Set targetValue to the number of seconds.`,
    `- "negative": success = no log for the day (e.g. "no doomscrolling").`,
    ``,
    `PROPOSAL RULES:`,
    `- Prefer one tiny habit over a grand one. If the user's intent is big,`,
    `  name it in "rationale" and propose the smallest useful first step as`,
    `  "primary".`,
    `- "alternatives" should be meaningfully different framings (e.g. time of`,
    `  day, counter vs duration, daily vs weekdays) — not near-duplicates.`,
    `- "firstWeekRamp" contains 2-3 bullet hints that make the first week`,
    `  kinder than the steady-state target. Each bullet is a complete sentence.`,
    `- The user's "rationale" field names why this habit fits their intent in`,
    `  one or two sentences — no motivational filler.`,
    ``,
    OBSERVATIONAL_VOICE_ANCHOR,
    ``,
    languageDirective(locale),
  ].join("\n");
}
