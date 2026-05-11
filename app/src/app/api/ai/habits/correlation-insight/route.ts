/**
 * POST /api/ai/habits/correlation-insight
 *
 * Correlation Insight — Pro + structured.
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsProModel,
} from "@/lib/ai/gemini-text";
import { loadUserHabitDataSnapshot } from "@/lib/ai/habits/load-user-habit-snapshot";
import { addDaysIso, formatTodayInTimeZone } from "@/lib/habits/calendar-iso";
import { stableHash } from "@/lib/habits/ai-cache";
import {
  CorrelationInsightGeminiSchema,
  parseCorrelationInsightResponse,
  type CorrelationInsightResponse,
} from "@/lib/ai/schemas/habits/correlation-insight";
import { buildCorrelationInsightPrompt } from "@/lib/ai/prompts/habits/correlation-insight";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  withInsightCache,
  errorResponse,
} from "../_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const habitIds = Array.isArray(bodyJson.habitIds)
    ? (bodyJson.habitIds as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const windowDaysRaw =
    typeof bodyJson.windowDays === "number" ? bodyJson.windowDays : 30;
  const windowDays = Math.min(120, Math.max(14, Math.floor(windowDaysRaw)));
  const forceRefresh = bodyJson.forceRefresh === true;

  const timeZone =
    typeof bodyJson.timeZone === "string" && bodyJson.timeZone.trim()
      ? bodyJson.timeZone.trim()
      : "UTC";

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  const sortedIds = [...new Set(habitIds)].sort();

  try {
    if (sortedIds.length < 2) {
      return NextResponse.json(
        { error: "need_two_habit_ids" },
        { status: 400 },
      );
    }

    const now = new Date();
    const today = formatTodayInTimeZone(now, timeZone);
    const from = addDaysIso(today, -(windowDays - 1));

    const snapshot = await loadUserHabitDataSnapshot(ctx.supabase, {
      completionFrom: from,
      completionTo: today,
    });

    const selectedHabits = snapshot.habits.filter((h) => sortedIds.includes(h.id));
    if (selectedHabits.length < 2) {
      return NextResponse.json(
        { error: "habits_not_found" },
        { status: 404 },
      );
    }

    const dataSignature = stableHash({
      habitIds: sortedIds,
      completions: snapshot.completions
        .filter((c) => sortedIds.includes(c.habit_id))
        .map((c) => ({
          id: c.id,
          h: c.habit_id,
          d: c.completion_date,
          s: c.status,
          v: c.value,
        })),
    });

    const payload = await withInsightCache<CorrelationInsightResponse>({
      ctx,
      kind: "correlation_insight",
      cacheInput: { habitIds: sortedIds, windowDays, timeZone, dataSignature },
      forceRefresh,
      generate: async () => {
        const habitPayload = selectedHabits.map((h) => ({
          id: h.id,
          name: h.name,
          type: h.type,
          target_value: h.target_value,
          frequency: h.frequency,
          completions: snapshot.completions
            .filter(
              (c) =>
                c.habit_id === h.id &&
                c.completion_date >= from &&
                c.completion_date <= today,
            )
            .map((c) => ({
              date: c.completion_date,
              status: c.status,
              value: c.value,
              note: c.note,
            })),
        }));

        const userText = JSON.stringify(
          {
            windowDays,
            windowStart: from,
            windowEnd: today,
            timeZone,
            habits: habitPayload,
          },
          null,
          0,
        );

        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsProModel(),
          systemInstruction: buildCorrelationInsightPrompt(ctx.language),
          userText,
          responseSchema: CorrelationInsightGeminiSchema,
          temperature: 0.35,
          maxOutputTokens: 4096,
        });

        const validated = parseCorrelationInsightResponse(data);
        return { content: validated, modelUsed };
      },
    });
    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}
