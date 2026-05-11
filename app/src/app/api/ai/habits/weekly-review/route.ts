/**
 * POST /api/ai/habits/weekly-review
 *
 * Weekly Review — Pro prose (assembled server-side; client hook unchanged).
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsProModel,
  type GeminiResponseSchema,
} from "@/lib/ai/gemini-text";
import { loadUserHabitDataSnapshot } from "@/lib/ai/habits/load-user-habit-snapshot";
import { addDaysIso } from "@/lib/habits/calendar-iso";
import { computeStreak } from "@/lib/habits/streak";
import { stableHash } from "@/lib/habits/ai-cache";
import { buildWeeklyReviewPrompt } from "@/lib/ai/prompts/habits/weekly-review";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  withInsightCache,
  errorResponse,
} from "../_shared";

export const runtime = "nodejs";

const WeeklyTextSchema: GeminiResponseSchema = {
  type: "object",
  required: ["text"],
  properties: { text: { type: "string" } },
};

type WeeklyReviewContent = { text: string };

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const weekStart = typeof bodyJson.weekStart === "string" ? bodyJson.weekStart : "";
  const weekEnd = typeof bodyJson.weekEnd === "string" ? bodyJson.weekEnd : "";
  const forceRefresh = bodyJson.forceRefresh === true;

  if (!weekStart || !weekEnd) {
    return NextResponse.json(
      { error: "missing_week_range" },
      { status: 400 },
    );
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  const timeZone =
    typeof bodyJson.timeZone === "string" && bodyJson.timeZone.trim()
      ? bodyJson.timeZone.trim()
      : "UTC";

  try {
    const historyFrom = addDaysIso(weekStart, -400);
    const snapshot = await loadUserHabitDataSnapshot(ctx.supabase, {
      completionFrom: historyFrom,
      completionTo: weekEnd,
    });

    const dataSignature = stableHash({
      habits: snapshot.habits.map((h) => h.id).sort(),
      completions: snapshot.completions.map((c) => ({
        id: c.id,
        d: c.completion_date,
        s: c.status,
        v: c.value,
        at: c.completed_at,
      })),
      freezes: snapshot.freezes.map((f) => ({
        id: f.id,
        h: f.habit_id,
        d: f.freeze_date,
      })),
    });

    const payload = await withInsightCache<WeeklyReviewContent>({
      ctx,
      kind: "weekly_review",
      cacheInput: { weekStart, weekEnd, dataSignature },
      forceRefresh,
      generate: async () => {
        const now = new Date();
        const habitPayload = snapshot.habits.map((h) => {
          const comps = snapshot.completions.filter((c) => c.habit_id === h.id);
          const frz = snapshot.freezes.filter((f) => f.habit_id === h.id);
          const weekComps = comps.filter(
            (c) => c.completion_date >= weekStart && c.completion_date <= weekEnd,
          );
          const streak = computeStreak({
            habit: h,
            completions: comps,
            freezes: frz,
            timeZone,
            now,
          });
          return {
            id: h.id,
            name: h.name,
            type: h.type,
            target_value: h.target_value,
            frequency: h.frequency,
            time_of_day: h.time_of_day,
            weekCompletions: weekComps.map((c) => ({
              date: c.completion_date,
              status: c.status,
              value: c.value,
              note: c.note,
            })),
            streak: {
              current: streak.currentStreak,
              best: streak.bestStreak,
              lastActiveDate: streak.lastActiveDate,
            },
            freezesInWeek: frz
              .filter((f) => f.freeze_date >= weekStart && f.freeze_date <= weekEnd)
              .map((f) => ({ date: f.freeze_date, reason: f.reason })),
          };
        });

        const userText = JSON.stringify(
          {
            weekStart,
            weekEnd,
            timeZone,
            habits: habitPayload,
          },
          null,
          0,
        );

        const { data, modelUsed } = await fetchGeminiStructured<{ text: string }>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsProModel(),
          systemInstruction: buildWeeklyReviewPrompt(ctx.language),
          userText,
          responseSchema: WeeklyTextSchema,
          temperature: 0.55,
          maxOutputTokens: 2048,
        });

        const text = typeof data.text === "string" ? data.text.trim() : "";
        if (!text) throw new Error("weekly_review_empty");

        return {
          content: { text },
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
