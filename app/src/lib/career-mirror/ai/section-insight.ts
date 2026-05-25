/**
 * generateSectionInsight — a single short, sharp "seen-through" observation for
 * one setup section, shown inline as the user answers. Not clinical, not a
 * cheerleader — a quick mirror.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { SetupAnswers } from "@/lib/career-mirror/careerSetupTypes";
import {
  SectionInsightSchema,
  type SectionInsightResult,
} from "@/lib/career-mirror/validators";
import { SectionInsightGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function generateSectionInsight(params: {
  section: string;
  answers?: SetupAnswers | null;
  locale?: AppLocale;
}): Promise<{ data: SectionInsightResult; modelUsed: string }> {
  const taskBrief =
    "Give ONE short, sharp insight about what this person just revealed in the " +
    "section below — the kind of observation that makes them feel seen, not " +
    "analysed. One or two sentences. No clinical jargon, no cheerleading, no " +
    "advice. Just a perceptive reflection of a pattern or tension you noticed.";

  const userText = [
    asContext("Section", params.section),
    params.answers ? asContext("Answers", params.answers) : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return runCareerMirrorGenerator({
    taskBrief,
    userText,
    responseSchema: SectionInsightGeminiSchema,
    validator: SectionInsightSchema,
    locale: params.locale,
    temperature: 0.6,
    maxOutputTokens: 512,
  });
}
