/**
 * matchOpportunities — surfaces specific opportunity types this person is well
 * positioned for right now: each with why it fits and a concrete first action.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { CareerProfile } from "@/types/database";
import {
  OpportunitiesSchema,
  type OpportunitiesResult,
} from "@/lib/career-mirror/validators";
import { OpportunitiesGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function matchOpportunities(params: {
  profile: Partial<CareerProfile>;
  locale?: AppLocale;
}): Promise<{ data: OpportunitiesResult; modelUsed: string }> {
  const taskBrief =
    "Match this person to opportunities they are genuinely well positioned for " +
    "right now — roles, projects, collaborations, speaking, writing, " +
    "communities, or bets. For each: a clear title, why_fit grounded in their " +
    "real strengths and goals, a concrete first action, and a category. Favour " +
    "things they could plausibly pursue this quarter over far-off ideals.";

  const userText = asContext("Profile", params.profile);

  return runCareerMirrorGenerator({
    taskBrief,
    userText,
    responseSchema: OpportunitiesGeminiSchema,
    validator: OpportunitiesSchema,
    locale: params.locale,
    temperature: 0.55,
  });
}
