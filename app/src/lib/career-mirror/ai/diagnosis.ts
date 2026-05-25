/**
 * diagnoseCareer — produces the structured CareerAiDiagnosis: six 0-100 scores,
 * a narrative, the single biggest tension and risk, strengths/gaps, and the
 * named tensions between competing forces in this person's situation.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { CareerProfile, CareerAiDiagnosis } from "@/types/database";
import type { SetupAnswers } from "@/lib/career-mirror/careerSetupTypes";
import { DiagnosisSchema } from "@/lib/career-mirror/validators";
import { DiagnosisGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function diagnoseCareer(params: {
  profile: Partial<CareerProfile>;
  answers?: SetupAnswers | null;
  locale?: AppLocale;
}): Promise<{ data: CareerAiDiagnosis; modelUsed: string }> {
  const taskBrief =
    "Diagnose this career honestly. Score clarity, momentum, positioning, " +
    "network, skill_fit, and risk each 0-100 — be willing to give low scores. " +
    "Write a narrative that names what is really going on (their patterns, " +
    "avoidances, and the gap between where they say they want to go and what " +
    "they actually do). Identify the main_tension and main_risk in one sentence " +
    "each, list concrete strengths and gaps, and surface the genuine tensions " +
    "(competing pulls) with a short explanation and a severity word.";

  const userText = [
    asContext("Profile", params.profile),
    params.answers ? asContext("Setup answers", params.answers) : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data, modelUsed } = await runCareerMirrorGenerator({
    taskBrief,
    userText,
    responseSchema: DiagnosisGeminiSchema,
    validator: DiagnosisSchema,
    locale: params.locale,
    temperature: 0.5,
  });
  return { data: data as CareerAiDiagnosis, modelUsed };
}
