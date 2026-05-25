/**
 * realityCheck — honest assessment of whether a stated target is realistic for
 * this person right now: a verdict, the gap, the evidence behind it, and a
 * confidence level.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { CareerProfile } from "@/types/database";
import {
  RealityCheckSchema,
  type RealityCheckResult,
} from "@/lib/career-mirror/validators";
import { RealityCheckGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function realityCheck(params: {
  target: string;
  profile: Partial<CareerProfile>;
  locale?: AppLocale;
}): Promise<{ data: RealityCheckResult; modelUsed: string }> {
  const taskBrief =
    "Give a reality check on the target below. Render a clear verdict on how " +
    "realistic it is for this person from where they stand today, summarise the " +
    "concrete gap between current state and target, cite the evidence (from " +
    "their profile) you based it on, and state your confidence. Be respectful " +
    "but do not flatter — false encouragement helps no one.";

  const userText = [
    asContext("Target", params.target),
    asContext("Profile", params.profile),
  ].join("\n\n");

  return runCareerMirrorGenerator({
    taskBrief,
    userText,
    responseSchema: RealityCheckGeminiSchema,
    validator: RealityCheckSchema,
    locale: params.locale,
    temperature: 0.4,
  });
}
