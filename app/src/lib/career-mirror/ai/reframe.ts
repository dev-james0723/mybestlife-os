/**
 * reframeGoal — restates the person's stated pain/blockers/goals as the real
 * problem worth solving. REVIEW-ONLY output: callers persist the reframe to
 * `ai_reframed_problem` and must NEVER overwrite the user's own pain_points /
 * blockers with it.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import { ReframeSchema, type ReframeResult } from "@/lib/career-mirror/validators";
import { ReframeGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function reframeGoal(params: {
  pain_points?: string | null;
  blockers?: string | null;
  goals?: string | null;
  locale?: AppLocale;
}): Promise<{ data: ReframeResult; modelUsed: string }> {
  const taskBrief =
    "Reframe the problem. Take what this person calls their pain, blockers, and " +
    "goals, and name the deeper problem actually worth solving — the one " +
    "underneath the surface complaint. State the reframed_problem in one crisp " +
    "sentence, then give a short rationale for why this is the truer framing. " +
    "Do not soften it into a platitude.";

  const userText = [
    asContext("Pain points", params.pain_points ?? ""),
    asContext("Blockers", params.blockers ?? ""),
    asContext("Goals", params.goals ?? ""),
  ].join("\n\n");

  return runCareerMirrorGenerator({
    taskBrief,
    userText,
    responseSchema: ReframeGeminiSchema,
    validator: ReframeSchema,
    locale: params.locale,
    temperature: 0.55,
  });
}
