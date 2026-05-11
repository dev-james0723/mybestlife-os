/**
 * POST /api/ai/habits/struggle-detection
 *
 * Struggle Detection — Pro + structured JSON.
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsProModel,
} from "@/lib/ai/gemini-text";
import { loadUserHabitDataSnapshot } from "@/lib/ai/habits/load-user-habit-snapshot";
import { addDaysIso, formatTodayInTimeZone } from "@/lib/habits/calendar-iso";
import { computeStreak } from "@/lib/habits/streak";
import { stableHash } from "@/lib/habits/ai-cache";
import {
  StruggleDetectionGeminiSchema,
  parseStruggleDetectionResponse,
  type StruggleDetectionResponse,
} from "@/lib/ai/schemas/habits/struggle-detection";
import { buildStruggleDetectionPrompt } from "@/lib/ai/prompts/habits/struggle-detection";
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

  const windowDaysRaw =
    typeof bodyJson.windowDays === "number" ? bodyJson.windowDays : 14;
  const windowDays = Math.min(90, Math.max(7, Math.floor(windowDaysRaw)));
  const forceRefresh = bodyJson.forceRefresh === true;

  const timeZone =
    typeof bodyJson.timeZone === "string" && bodyJson.timeZone.trim()
      ? bodyJson.timeZone.trim()
      : "UTC";

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const now = new Date();
    const today = formatTodayInTimeZone(now, timeZone);
    const from = addDaysIso(today, -(windowDays - 1));

    const snapshot = await loadUserHabitDataSnapshot(ctx.supabase, {
      completionFrom: from,
      completionTo: today,
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
    });

    const payload = await withInsightCache<StruggleDetectionResponse>({
      ctx,
      kind: "struggle_detection",
      cacheInput: { windowDays, timeZone, dataSignature },
      forceRefresh,
      generate: async () => {
        const habitPayload = snapshot.habits.map((h) => {
          const comps = snapshot.completions.filter((c) => c.habit_id === h.id);
          const frz = snapshot.freezes.filter((f) => f.habit_id === h.id);
          const windowComps = comps.filter(
            (c) => c.completion_date >= from && c.completion_date <= today,
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
            is_active: h.is_active,
            archived_at: h.archived_at,
            completions: windowComps.map((c) => ({
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
          };
        });

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
          systemInstruction: buildStruggleDetectionPrompt(ctx.language),
          userText,
          responseSchema: StruggleDetectionGeminiSchema,
          temperature: 0.35,
          maxOutputTokens: 4096,
        });

        const validated = parseStruggleDetectionResponse(data);
        return { content: validated, modelUsed };
      },
    });
    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}
