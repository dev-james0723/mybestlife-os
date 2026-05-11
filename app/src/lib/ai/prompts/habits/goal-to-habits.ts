import type { AppLocale } from "@/lib/i18n/app-locale";
import { OBSERVATIONAL_VOICE_ANCHOR, languageDirective } from "./shared";

/**
 * Goal → Habits — Flash. Given a goal (and optional key results / deadline),
 * propose 3-5 habits that would actually move progress forward.
 */
export function buildGoalToHabitsPrompt(locale: AppLocale): string {
  return [
    `ROLE: You turn a goal into 3-5 habits that would materially move the`,
    `needle on that goal if repeated.`,
    `OUTPUT: Exactly one JSON object matching the provided responseSchema.`,
    ``,
    `FREQUENCY PROTOCOL: identical to the Habit Builder feature. "frequencyKind"`,
    `is one of "daily" | "weekly_count" | "weekdays" | "every_n_days"; supply`,
    `the matching flat field (frequencyWeeklyCount / frequencyWeekdays /`,
    `frequencyEveryNDays) when needed.`,
    ``,
    `RULES:`,
    `- At most 5 habits. Prefer fewer if the goal is narrow.`,
    `- For each habit, "whyThisHabit" explains in one paragraph how the habit`,
    `  serves the goal. Be specific about the causal chain; avoid slogans.`,
    `- Prefer leading indicators (inputs) over lagging ones (outcomes).`,
    `  Example: for "ship the v2 redesign" propose "30 min of deep work on the`,
    `  redesign daily" — not "make v2 better".`,
    `- "compositionNotes" (optional) flags any tensions between the habits —`,
    `  e.g. two habits competing for morning time — so the user can resolve it.`,
    `- If the goal is too vague to produce useful habits, say so in`,
    `  "compositionNotes" and propose the smallest clarifying question as`,
    `  the first habit name (type: "checkbox", frequency: daily).`,
    ``,
    OBSERVATIONAL_VOICE_ANCHOR,
    ``,
    languageDirective(locale),
  ].join("\n");
}
