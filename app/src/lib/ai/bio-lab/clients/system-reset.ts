/**
 * Client fetcher for the System Reset AI assist.
 *
 * Generates a 5-step adaptive sequence. The static fallback (the existing
 * `SYSTEM_RESET_STEPS`) lives in the panel; if this fetch throws, the caller
 * is expected to render the static sequence and never block the user.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { AIInsightPayload } from "@/hooks/use-ai-insight";
import type { ResetSequenceResult } from "@/lib/ai/bio-lab/types";
import { fetchBioLabAI } from "./_shared";

export type ResetStateInput = {
  mood: number;
  energy: number;
  focus: number;
  stress: number;
};

export type FetchResetSequenceArgs = {
  state: ResetStateInput;
  note?: string;
  language: AppLocale;
  forceRefresh?: boolean;
  signal?: AbortSignal;
};

export async function fetchResetSequence(
  args: FetchResetSequenceArgs,
): Promise<AIInsightPayload<ResetSequenceResult>> {
  const body: Record<string, unknown> = { state: args.state };
  if (args.note) body.note = args.note;

  return fetchBioLabAI<ResetSequenceResult>({
    endpoint: "reset-sequence",
    body,
    language: args.language,
    forceRefresh: args.forceRefresh,
    signal: args.signal,
  });
}
