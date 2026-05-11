/**
 * Client fetcher for the State Scan AI assist.
 *
 * Usage:
 *   const result = await fetchStateInference({ rawInput, language });
 *   // result.content is the typed StateInferenceResult; result.cached tells
 *   // you whether Gemini was actually called.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { AIInsightPayload } from "@/hooks/use-ai-insight";
import type { StateInferenceResult } from "@/lib/ai/bio-lab/types";
import { fetchBioLabAI } from "./_shared";

export type FetchStateInferenceArgs = {
  rawInput: string;
  language: AppLocale;
  forceRefresh?: boolean;
  signal?: AbortSignal;
};

export async function fetchStateInference(
  args: FetchStateInferenceArgs,
): Promise<AIInsightPayload<StateInferenceResult>> {
  return fetchBioLabAI<StateInferenceResult>({
    endpoint: "state-inference",
    body: { rawInput: args.rawInput },
    language: args.language,
    forceRefresh: args.forceRefresh,
    signal: args.signal,
  });
}
