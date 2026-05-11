/**
 * POST /api/ai/habits/review-habit
 *
 * Review a habit — Pro + structured (prose + summary in one response).
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsProModel,
} from "@/lib/ai/gemini-text";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";
import { loadUserHabitDataSnapshot } from "@/lib/ai/habits/load-user-habit-snapshot";
import { addDaysIso, formatTodayInTimeZone } from "@/lib/habits/calendar-iso";
import { computeStreak } from "@/lib/habits/streak";
import { stableHash } from "@/lib/habits/ai-cache";
import {
  ReviewHabitFullGeminiSchema,
  ReviewHabitSummarySchema,
  parseReviewHabitFullResponse,
  type ReviewHabitFullResponse,
  type ReviewHabitSummary,
} from "@/lib/ai/schemas/habits/review-habit-summary";
import { buildReviewHabitCombinedStructuredPrompt } from "@/lib/ai/prompts/habits/review-habit";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  withInsightCache,
  errorResponse,
} from "../_shared";

export const runtime = "nodejs";

type ReviewHabitContent = {
  text: string;
  summary: ReviewHabitSummary;
};

function toSummary(full: ReviewHabitFullResponse): ReviewHabitSummary {
  const { prose, ...summary } = full;
  void prose;
  return ReviewHabitSummarySchema.parse(summary);
}

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const habitId = typeof bodyJson.habitId === "string" ? bodyJson.habitId : "";
  const forceRefresh = bodyJson.forceRefresh === true;

  if (!habitId) {
    return NextResponse.json({ error: "missing_habit_id" }, { status: 400 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  const timeZone =
    typeof bodyJson.timeZone === "string" && bodyJson.timeZone.trim()
      ? bodyJson.timeZone.trim()
      : "UTC";

  try {
    const now = new Date();
    const today = formatTodayInTimeZone(now, timeZone);
    const historyFrom = addDaysIso(today, -400);

    const snapshot = await loadUserHabitDataSnapshot(ctx.supabase, {
      completionFrom: historyFrom,
      completionTo: today,
    });

    const habit = snapshot.habits.find((h) => h.id === habitId);
    if (!habit) {
      return NextResponse.json({ error: "habit_not_found" }, { status: 404 });
    }

    const comps = snapshot.completions.filter((c) => c.habit_id === habitId);
    const frz = snapshot.freezes.filter((f) => f.habit_id === habitId);
    const streak = computeStreak({
      habit,
      completions: comps,
      freezes: frz,
      timeZone,
      now,
    });

    const dataSignature = stableHash({
      habitId,
      completions: comps.map((c) => ({
        id: c.id,
        d: c.completion_date,
        s: c.status,
        v: c.value,
        at: c.completed_at,
      })),
      freezes: frz.map((f) => ({ id: f.id, d: f.freeze_date })),
    });

    const payload = await withInsightCache<ReviewHabitContent>({
      ctx,
      kind: "review_habit",
      targetKind: "habit",
      targetId: habitId,
      cacheInput: { habitId, timeZone, dataSignature },
      forceRefresh,
      generate: async () => {
        const userText = JSON.stringify(
          {
            habit: {
              id: habit.id,
              name: habit.name,
              description: habit.description,
              type: habit.type,
              target_value: habit.target_value,
              frequency: habit.frequency,
              time_of_day: habit.time_of_day,
              created_at: habit.created_at,
            },
            completions: comps.map((c) => ({
              date: c.completion_date,
              status: c.status,
              value: c.value,
              note: c.note,
            })),
            freezes: frz.map((f) => ({
              date: f.freeze_date,
              reason: f.reason,
            })),
            streak,
            rangeStart: historyFrom,
            rangeEnd: today,
            timeZone,
          },
          null,
          0,
        );

        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsProModel(),
          systemInstruction: buildReviewHabitCombinedStructuredPrompt(
            ctx.language,
          ),
          userText,
          responseSchema: ReviewHabitFullGeminiSchema as GeminiResponseSchema,
          temperature: 0.5,
          maxOutputTokens: 8192,
        });

        const parsed = parseReviewHabitFullResponse(data);
        const text = parsed.prose.trim();
        if (!text) throw new Error("review_habit_empty");

        return {
          content: { text, summary: toSummary(parsed) },
          contentText: text,
          modelUsed,
        };
      },
    });
    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}
