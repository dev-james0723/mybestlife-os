/**
 * generateWeeklyReview — a structured weekly check-in: wins, what was avoided,
 * a momentum score, the focus for next week, one uncomfortable action worth
 * taking, and a few nudges.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { CareerProfile } from "@/types/database";
import {
  WeeklyReviewSchema,
  type WeeklyReviewResult,
} from "@/lib/career-mirror/validators";
import { WeeklyReviewGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function generateWeeklyReview(params: {
  profile: Partial<CareerProfile>;
  recent: unknown;
  locale?: AppLocale;
}): Promise<{ data: WeeklyReviewResult; modelUsed: string }> {
  const taskBrief =
    "Run this person's weekly career review. Name the genuine wins, call out " +
    "what they avoided (gently but honestly), score their momentum 0-100, set a " +
    "clear focus_next, and prescribe one uncomfortable_action that would move " +
    "them most. Add a few short nudges. Be the mirror, not the cheerleader.";

  const userText = [
    asContext("Profile", params.profile),
    asContext("Recent activity", params.recent),
  ].join("\n\n");

  return runCareerMirrorGenerator({
    taskBrief,
    userText,
    responseSchema: WeeklyReviewGeminiSchema,
    validator: WeeklyReviewSchema,
    locale: params.locale,
    temperature: 0.5,
  });
}
