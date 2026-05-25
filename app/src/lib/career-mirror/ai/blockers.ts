/**
 * analyzeBlockers — categorises what is actually blocking the person, names the
 * underlying risk factors, and proposes concrete mitigations.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import { BlockersSchema, type BlockersResult } from "@/lib/career-mirror/validators";
import { BlockersGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function analyzeBlockers(params: {
  blockers?: string | null;
  context?: unknown;
  locale?: AppLocale;
}): Promise<{ data: BlockersResult; modelUsed: string }> {
  const taskBrief =
    "Analyse what is blocking this person. Assign a single, honest " +
    "blocker_category (e.g. 'fear of visibility', 'skill gap', 'unclear " +
    "direction', 'over-commitment', 'risk aversion'). List the underlying " +
    "risk_factors and concrete mitigations they could actually act on. Be " +
    "specific to their situation, not generic advice.";

  const userText = [
    asContext("Stated blockers", params.blockers ?? ""),
    params.context != null ? asContext("Context", params.context) : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return runCareerMirrorGenerator({
    taskBrief,
    userText,
    responseSchema: BlockersGeminiSchema,
    validator: BlockersSchema,
    locale: params.locale,
    temperature: 0.4,
  });
}
