/**
 * Client fetcher for the Focus Sprint AI assist.
 *
 * Sends an optional intent + optional state read; the route requires at
 * least one of the two so the caller knows callers can't spam empty payloads.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { AIInsightPayload } from "@/hooks/use-ai-insight";
import type { FocusRecommendationResult } from "@/lib/ai/bio-lab/types";
import type { FocusOutcome } from "@/lib/bio-lab/flow-types";
import { fetchBioLabAI } from "./_shared";

export type FocusStateInput = {
  mood: number;
  energy: number;
  focus: number;
  stress: number;
};

export type FetchFocusRecommendationArgs = {
  intent?: string;
  state?: FocusStateInput;
  lastSprintOutcome?: FocusOutcome;
  language: AppLocale;
  forceRefresh?: boolean;
  signal?: AbortSignal;
};

export async function fetchFocusRecommendation(
  args: FetchFocusRecommendationArgs,
): Promise<AIInsightPayload<FocusRecommendationResult>> {
  const body: Record<string, unknown> = {};
  if (args.intent) body.intent = args.intent;
  if (args.state) body.state = args.state;
  if (args.lastSprintOutcome) body.lastSprintOutcome = args.lastSprintOutcome;

  return fetchBioLabAI<FocusRecommendationResult>({
    endpoint: "focus-recommendation",
    body,
    language: args.language,
    forceRefresh: args.forceRefresh,
    signal: args.signal,
  });
}
