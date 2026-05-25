/**
 * personalBrandStrategy — defines how this person should position themselves:
 * a brand strategy, content direction, channels, short/long bios, and a few
 * distinct positioning routes they could choose between.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { CareerProfile } from "@/types/database";
import { BrandSchema, type BrandResult } from "@/lib/career-mirror/validators";
import { BrandGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function personalBrandStrategy(params: {
  profile: Partial<CareerProfile>;
  locale?: AppLocale;
}): Promise<{ data: BrandResult; modelUsed: string }> {
  const taskBrief =
    "Design a personal brand strategy for this person. State the core " +
    "personal_brand_strategy and the content_strategy_direction, recommend the " +
    "channels that fit how they actually work and want to be seen, and write a " +
    "short_bio and a long_bio in their voice. Offer 2-4 distinct positioning " +
    "routes (each with a name and a one-line positioning) so they can choose a " +
    "direction rather than be handed one.";

  const userText = asContext("Profile", params.profile);

  return runCareerMirrorGenerator({
    taskBrief,
    userText,
    responseSchema: BrandGeminiSchema,
    validator: BrandSchema,
    locale: params.locale,
    temperature: 0.6,
    maxOutputTokens: 6144,
  });
}
