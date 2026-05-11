/**
 * Client fetcher for the Garden hub weekly insight.
 *
 * Differs from the per-tool fetchers because the response shape includes a
 * discriminator: `{ kind: "ok", metrics, content, ... }` when AI ran or
 * `{ kind: "empty", metrics }` when there was no activity to reflect on
 * (so we never burn an LLM call). Either way the metrics object is
 * surfaced so the UI can show a "0 sessions" empty state without a second
 * round trip.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { AIInsightPayload } from "@/hooks/use-ai-insight";
import type { WeeklyInsightResult } from "@/lib/ai/bio-lab/types";
import { BioLabAIError } from "./_shared";

export type WeeklyInsightMetrics = {
  weekStartUtc: string;
  totals: {
    "state-scan": number;
    "mind-sweep": number;
    "focus-sprint": number;
    "system-reset": number;
  };
  grandTotal: number;
  aiAssistedCount: number;
  streakDays: number;
  averageFocusRating: number | null;
  mindSweepItemCount: number;
};

/**
 * The route's discriminator is `result` (not `kind`) because the success
 * branch spreads an AIInsightPayload, which also carries a `kind` field.
 * Keep them separate to avoid a collision.
 */
export type WeeklyInsightResponse =
  | ({ result: "ok"; metrics: WeeklyInsightMetrics } & AIInsightPayload<WeeklyInsightResult>)
  | { result: "empty"; metrics: WeeklyInsightMetrics };

export type FetchWeeklyInsightArgs = {
  language: AppLocale;
  forceRefresh?: boolean;
  signal?: AbortSignal;
};

export async function fetchWeeklyInsight(
  args: FetchWeeklyInsightArgs,
): Promise<WeeklyInsightResponse> {
  let res: Response;
  try {
    res = await fetch("/api/ai/bio-lab/weekly-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: args.language,
        forceRefresh: args.forceRefresh ?? false,
      }),
      signal: args.signal,
    });
  } catch (e) {
    throw new BioLabAIError(
      "network",
      0,
      e instanceof Error ? e.message : String(e),
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const kind =
      res.status === 401 || res.status === 403
        ? "unauthenticated"
        : res.status === 429
          ? "rate_limited"
          : res.status >= 500
            ? "server"
            : "validation";
    throw new BioLabAIError(kind, res.status, body);
  }

  return (await res.json()) as WeeklyInsightResponse;
}
