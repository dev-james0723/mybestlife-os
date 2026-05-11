/**
 * Client fetchers for the Mind Sweep AI assists.
 *
 * Two endpoints:
 *   - `fetchMindLabel` — single-entry classification, called per add.
 *   - `fetchMindTriage` — batch insight, called when items.length >= 3 and
 *     ideally debounced so we don't hammer the route on every keystroke.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { AIInsightPayload } from "@/hooks/use-ai-insight";
import type { MindLabelResult, MindTriageResult } from "@/lib/ai/bio-lab/types";
import { fetchBioLabAI } from "./_shared";

export type FetchMindLabelArgs = {
  text: string;
  language: AppLocale;
  forceRefresh?: boolean;
  signal?: AbortSignal;
};

export async function fetchMindLabel(
  args: FetchMindLabelArgs,
): Promise<AIInsightPayload<MindLabelResult>> {
  return fetchBioLabAI<MindLabelResult>({
    endpoint: "mind-label",
    body: { text: args.text },
    language: args.language,
    forceRefresh: args.forceRefresh,
    signal: args.signal,
  });
}

export type MindTriageInputItem = {
  text: string;
  kind: "task" | "worry" | "idea" | "reminder";
};

export type FetchMindTriageArgs = {
  items: MindTriageInputItem[];
  language: AppLocale;
  forceRefresh?: boolean;
  signal?: AbortSignal;
};

export async function fetchMindTriage(
  args: FetchMindTriageArgs,
): Promise<AIInsightPayload<MindTriageResult>> {
  return fetchBioLabAI<MindTriageResult>({
    endpoint: "mind-triage",
    body: { items: args.items },
    language: args.language,
    forceRefresh: args.forceRefresh,
    signal: args.signal,
  });
}
