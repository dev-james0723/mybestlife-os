/**
 * synthesizeCareerIdentity — turns raw setup answers + the (partial) profile
 * into a coherent identity: summary, identity line, stage, status, work-style
 * profile, ambition / reputation / visibility, and brand direction.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { CareerProfile } from "@/types/database";
import type { SetupAnswers } from "@/lib/career-mirror/careerSetupTypes";
import {
  SynthesizeIdentitySchema,
  type SynthesizeIdentityResult,
} from "@/lib/career-mirror/validators";
import { SynthesizeIdentityGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function synthesizeCareerIdentity(params: {
  answers?: SetupAnswers | null;
  profile: Partial<CareerProfile>;
  locale?: AppLocale;
}): Promise<{ data: SynthesizeIdentityResult; modelUsed: string }> {
  const taskBrief =
    "Synthesize this person's career identity. Read across their setup answers " +
    "and profile and reflect back who they are professionally — clear, " +
    "specific, and recognisable. Fill the work_style_profile from their stated " +
    "energy, motivations, decision and feedback preferences, ideal environment, " +
    "and organizational triggers; infer the coaching style that would actually " +
    "help them. Keep ai_summary tight (3-5 sentences). Do not invent facts.";

  const userText = [
    asContext("Profile", params.profile),
    params.answers ? asContext("Setup answers", params.answers) : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return runCareerMirrorGenerator({
    taskBrief,
    userText,
    responseSchema: SynthesizeIdentityGeminiSchema,
    validator: SynthesizeIdentitySchema,
    locale: params.locale,
    temperature: 0.5,
  });
}
