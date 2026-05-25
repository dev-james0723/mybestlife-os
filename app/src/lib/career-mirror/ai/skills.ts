/**
 * extractSkills — pulls a clean, deduped skill list out of the setup answers
 * and (optionally) extracted document text, with a note on what each skill was
 * inferred from.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { SetupAnswers } from "@/lib/career-mirror/careerSetupTypes";
import { SkillsSchema, type SkillsResult } from "@/lib/career-mirror/validators";
import { SkillsGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function extractSkills(params: {
  answers?: SetupAnswers | null;
  docText?: string;
  locale?: AppLocale;
}): Promise<{ data: SkillsResult; modelUsed: string }> {
  const taskBrief =
    "Extract this person's real, demonstrable skills (hard and soft) from their " +
    "answers and documents. Use concise, recognisable skill names (e.g. " +
    "'product strategy', 'public speaking', 'Python'). Do not pad the list with " +
    "generic filler. In inferred_from, briefly note where the strongest signals " +
    "came from.";

  const userText = [
    params.answers ? asContext("Setup answers", params.answers) : "",
    params.docText ? `Document text:\n${params.docText.slice(0, 16000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return runCareerMirrorGenerator({
    taskBrief,
    userText: userText || "No additional context provided.",
    responseSchema: SkillsGeminiSchema,
    validator: SkillsSchema,
    locale: params.locale,
    temperature: 0.3,
  });
}
