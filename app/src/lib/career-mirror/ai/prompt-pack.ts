/**
 * generatePromptPack — builds a bundle of ready-to-paste AI prompts tailored to
 * this person's career situation (each with a title, body, and when_to_use).
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { CareerProfile } from "@/types/database";
import {
  PromptPackSchema,
  type PromptPackResult,
} from "@/lib/career-mirror/validators";
import { PromptPackGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function generatePromptPack(params: {
  profile: Partial<CareerProfile>;
  locale?: AppLocale;
}): Promise<{ data: PromptPackResult; modelUsed: string }> {
  const taskBrief =
    "Generate a pack of 6-10 high-leverage AI prompts personalised to this " +
    "person. Each prompt: a short title, a copy-paste-ready body that already " +
    "embeds their context so they get useful output immediately, and a " +
    "when_to_use note. Cover positioning, outreach, interview prep, content, " +
    "and decision-making. Make the bodies specific, not generic templates.";

  const userText = asContext("Profile", params.profile);

  return runCareerMirrorGenerator({
    taskBrief,
    userText,
    responseSchema: PromptPackGeminiSchema,
    validator: PromptPackSchema,
    locale: params.locale,
    temperature: 0.6,
    maxOutputTokens: 8192,
  });
}
