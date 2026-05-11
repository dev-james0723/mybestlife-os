/**
 * POST /api/ai/bio-lab/weekly-insight
 *
 * Garden hub weekly roll-up. Aggregates the last 7 days of activity from
 * the four `bio_lab_*` tables (server-side, RLS-scoped to the caller) into
 * a tiny metrics object, hashes that as the cache key, and asks Gemini for
 * one short reflective paragraph (headline + 2–4 observations + optional
 * next-step).
 *
 * Why server-side aggregation:
 *   - Cache key stays deterministic per (user, week) — clients cannot drift
 *     it accidentally and burn the quota.
 *   - The model never sees free-text the user wrote (notes, intentions).
 *     We send numbers only.
 *
 * Request body (all optional):
 *   { language?: AppLocale, forceRefresh?: boolean }
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  WeeklyInsightSchema,
  WeeklyInsightGeminiSchema,
} from "@/lib/ai/schemas/bio-lab/index";
import { buildWeeklyInsightPrompt } from "@/lib/ai/prompts/bio-lab/index";
import { BIO_LAB_AI_INSIGHT_KINDS } from "@/lib/ai/bio-lab/insight-kinds";
import type { WeeklyInsightResult } from "@/lib/ai/bio-lab/types";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  withInsightCache,
  errorResponse,
} from "../_shared";

export const runtime = "nodejs";

/**
 * Compact, deterministic input the prompt + cache hash both consume.
 * Anything not on this object is invisible to the model.
 */
type WeeklyMetrics = {
  /** ISO date for the start-of-week boundary (UTC, day-truncated). */
  weekStartUtc: string;
  totals: {
    "state-scan": number;
    "mind-sweep": number;
    "focus-sprint": number;
    "system-reset": number;
  };
  /** Total sessions across all tools (sum of `totals`). */
  grandTotal: number;
  /** AI-assist count: how many of those sessions had an AI step. */
  aiAssistedCount: number;
  /** Streak of consecutive UTC-days with at least one session, ending today. */
  streakDays: number;
  /** Average focus rating from completed Focus Sprints (1–5), null if none. */
  averageFocusRating: number | null;
  /** Total Mind Sweep items captured. */
  mindSweepItemCount: number;
};

const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  let metrics: WeeklyMetrics;
  try {
    metrics = await loadWeeklyMetrics(ctx.supabase);
  } catch (e) {
    return errorResponse(e);
  }

  // If the week is empty, we don't burn an LLM call — just tell the client.
  // The client UI hides the card on `empty` so the user sees nothing extra.
  // We use `result` (not `kind`) as the discriminator because `kind` is
  // also a field on AIInsightPayload and would collide on the spread below.
  if (metrics.grandTotal === 0) {
    return NextResponse.json({ result: "empty", metrics });
  }

  try {
    const payload = await withInsightCache<WeeklyInsightResult>({
      ctx,
      kind: BIO_LAB_AI_INSIGHT_KINDS.weeklyInsight,
      cacheInput: { metrics },
      forceRefresh: auth.bodyJson.forceRefresh === true,
      allowReturnWithoutCacheOnWriteFailure: true,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsFlashModel(),
          systemInstruction: buildWeeklyInsightPrompt(ctx.language),
          userText: `Weekly metrics (numeric only): ${JSON.stringify(metrics)}`,
          responseSchema: WeeklyInsightGeminiSchema,
          temperature: 0.45,
          maxOutputTokens: 512,
        });
        const validated = WeeklyInsightSchema.parse(data);
        return { content: validated, modelUsed };
      },
    });

    return NextResponse.json({ ...payload, result: "ok", metrics });
  } catch (e) {
    return errorResponse(e);
  }
}

// ============================================================
// Server-side aggregation (RLS-scoped via ctx.supabase)
// ============================================================

async function loadWeeklyMetrics(
  supabase: SupabaseClient,
): Promise<WeeklyMetrics> {
  const now = new Date();
  const since = new Date(now.getTime() - SEVEN_DAYS_MS).toISOString();
  // Anchor cache to UTC start-of-day so the cache key only flips once per day,
  // not per request — and on Sunday the same response serves the whole day.
  const weekStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();

  const [scans, sweeps, sprints, resets] = await Promise.all([
    supabase
      .from("bio_lab_state_scans")
      .select("created_at, ai_assisted")
      .gte("created_at", since),
    supabase
      .from("bio_lab_mind_sweeps")
      .select("created_at, ai_assisted, items")
      .gte("created_at", since),
    supabase
      .from("bio_lab_focus_sprints")
      .select("created_at, ai_assisted, focus_rating, outcome")
      .gte("created_at", since),
    supabase
      .from("bio_lab_system_resets")
      .select("created_at, ai_assisted")
      .gte("created_at", since),
  ]);

  for (const r of [scans, sweeps, sprints, resets]) {
    if (r.error) throw new Error(`weekly_metrics_query_failed: ${r.error.message}`);
  }

  const scanRows = (scans.data ?? []) as Array<{ created_at: string; ai_assisted: boolean }>;
  const sweepRows = (sweeps.data ?? []) as Array<{
    created_at: string;
    ai_assisted: boolean;
    items: unknown[] | null;
  }>;
  const sprintRows = (sprints.data ?? []) as Array<{
    created_at: string;
    ai_assisted: boolean;
    focus_rating: number | null;
    outcome: string;
  }>;
  const resetRows = (resets.data ?? []) as Array<{ created_at: string; ai_assisted: boolean }>;

  const totals: WeeklyMetrics["totals"] = {
    "state-scan": scanRows.length,
    "mind-sweep": sweepRows.length,
    "focus-sprint": sprintRows.length,
    "system-reset": resetRows.length,
  };
  const grandTotal =
    totals["state-scan"] +
    totals["mind-sweep"] +
    totals["focus-sprint"] +
    totals["system-reset"];

  const aiAssistedCount =
    scanRows.filter((r) => r.ai_assisted).length +
    sweepRows.filter((r) => r.ai_assisted).length +
    sprintRows.filter((r) => r.ai_assisted).length +
    resetRows.filter((r) => r.ai_assisted).length;

  const ratings = sprintRows
    .map((r) => r.focus_rating)
    .filter((r): r is number => typeof r === "number" && r >= 1 && r <= 5);
  const averageFocusRating =
    ratings.length === 0
      ? null
      : Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10;

  const mindSweepItemCount = sweepRows.reduce(
    (acc, r) => acc + (Array.isArray(r.items) ? r.items.length : 0),
    0,
  );

  // Streak: how many UTC days back from "today" have ≥ 1 session.
  const allDates = [
    ...scanRows,
    ...sweepRows,
    ...sprintRows,
    ...resetRows,
  ].map((r) => utcDayKey(new Date(r.created_at)));
  const dayKeys = new Set(allDates);
  let streakDays = 0;
  const cursor = new Date(now.getTime());
  while (streakDays < 30) {
    if (dayKeys.has(utcDayKey(cursor))) {
      streakDays += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return {
    weekStartUtc,
    totals,
    grandTotal,
    aiAssistedCount,
    streakDays,
    averageFocusRating,
    mindSweepItemCount,
  };
}

function utcDayKey(d: Date): string {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  ).toISOString();
}
