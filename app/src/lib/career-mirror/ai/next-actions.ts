/**
 * generateNextActions — turns the diagnosis + profile into a short, prioritized
 * list of concrete next moves (title, why, effort, horizon).
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { CareerProfile, CareerNextAction, CareerAiDiagnosis } from "@/types/database";
import { NextActionsSchema } from "@/lib/career-mirror/validators";
import { NextActionsGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function generateNextActions(params: {
  profile: Partial<CareerProfile>;
  diagnosis: CareerAiDiagnosis | null;
  locale?: AppLocale;
}): Promise<{ actions: CareerNextAction[]; modelUsed: string }> {
  const taskBrief =
    "Recommend 4-7 next actions that move this person forward given their " +
    "diagnosis. Each action: a concrete title (something they could start this " +
    "week), a one-line why tied to their actual situation, an effort estimate, " +
    "and a horizon (e.g. this week / this month / this quarter). Prioritise the " +
    "moves that close their biggest gap or relieve their main tension. No fluff.";

  const userText = [
    asContext("Profile", params.profile),
    params.diagnosis ? asContext("Diagnosis", params.diagnosis) : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data, modelUsed } = await runCareerMirrorGenerator({
    taskBrief,
    userText,
    responseSchema: NextActionsGeminiSchema,
    validator: NextActionsSchema,
    locale: params.locale,
    temperature: 0.5,
  });
  return { actions: data.actions as CareerNextAction[], modelUsed };
}
