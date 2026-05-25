/**
 * simulateScenario — runs a "what-if" career simulation: the likely outcome,
 * pros/cons, a probability, the assets it requires, the hidden cost, the most
 * likely failure point, a first 30-day move, and recommended next steps.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { CareerProfile } from "@/types/database";
import { ScenarioSchema, type ScenarioResult } from "@/lib/career-mirror/validators";
import { ScenarioGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function simulateScenario(params: {
  inputs: unknown;
  profile: Partial<CareerProfile>;
  locale?: AppLocale;
}): Promise<{ data: ScenarioResult; modelUsed: string }> {
  const taskBrief =
    "Simulate this career scenario for this specific person. Project the likely " +
    "outcome, the honest pros and cons, and a probability (0-1) of it going the " +
    "way they hope. Name the required_assets, the hidden_cost they are not " +
    "pricing in, the likely_failure_point, a sharp first_30_day_move, and the " +
    "recommended next steps. Ground everything in their actual profile.";

  const userText = [
    asContext("Scenario inputs", params.inputs),
    asContext("Profile", params.profile),
  ].join("\n\n");

  return runCareerMirrorGenerator({
    taskBrief,
    userText,
    responseSchema: ScenarioGeminiSchema,
    validator: ScenarioSchema,
    locale: params.locale,
    temperature: 0.55,
    maxOutputTokens: 6144,
  });
}
