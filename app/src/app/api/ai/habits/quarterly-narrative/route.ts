/**
 * POST /api/ai/habits/quarterly-narrative
 *
 * Quarterly Narrative — Pro prose (streamed to completion on the server).
 */

import { NextResponse } from "next/server";
import {
  streamGeminiText,
  getGeminiHabitsProModel,
} from "@/lib/ai/gemini-text";
import { loadUserHabitDataSnapshot } from "@/lib/ai/habits/load-user-habit-snapshot";
import { addDaysIso, formatTodayInTimeZone } from "@/lib/habits/calendar-iso";
import { computeStreak } from "@/lib/habits/streak";
import { stableHash } from "@/lib/habits/ai-cache";
import { buildQuarterlyNarrativePrompt } from "@/lib/ai/prompts/habits/quarterly-narrative";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  withInsightCache,
  errorResponse,
} from "../_shared";

export const runtime = "nodejs";

type QuarterlyNarrativeContent = { text: string };

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const quarter = typeof bodyJson.quarter === "string" ? bodyJson.quarter.trim() : "";
  const forceRefresh = bodyJson.forceRefresh === true;

  if (!quarter) {
    return NextResponse.json({ error: "missing_quarter" }, { status: 400 });
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
    const from = addDaysIso(today, -89);

    const snapshot = await loadUserHabitDataSnapshot(ctx.supabase, {
      completionFrom: from,
      completionTo: today,
    });

    const dataSignature = stableHash({
      quarter,
      habits: snapshot.habits.map((h) => h.id).sort(),
      completions: snapshot.completions.map((c) => ({
        id: c.id,
        h: c.habit_id,
        d: c.completion_date,
        s: c.status,
        v: c.value,
        at: c.completed_at,
      })),
    });

    const payload = await withInsightCache<QuarterlyNarrativeContent>({
      ctx,
      kind: "quarterly_narrative",
      cacheInput: { quarter, timeZone, dataSignature },
      forceRefresh,
      generate: async () => {
        const habitPayload = snapshot.habits.map((h) => {
          const comps = snapshot.completions.filter((c) => c.habit_id === h.id);
          const frz = snapshot.freezes.filter((f) => f.habit_id === h.id);
          const streak = computeStreak({
            habit: h,
            completions: comps,
            freezes: frz,
            timeZone,
            now,
          });
          return {
            name: h.name,
            type: h.type,
            target_value: h.target_value,
            frequency: h.frequency,
            is_active: h.is_active,
            archived_at: h.archived_at,
            completions: comps.map((c) => ({
              date: c.completion_date,
              status: c.status,
              value: c.value,
              note: c.note,
            })),
            streak,
          };
        });

        const userText = JSON.stringify(
          {
            quarter,
            windowStart: from,
            windowEnd: today,
            timeZone,
            habits: habitPayload,
          },
          null,
          0,
        );

        const { text, modelUsed } = await streamGeminiText({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsProModel(),
          systemInstruction: buildQuarterlyNarrativePrompt(ctx.language),
          userText,
          temperature: 0.55,
          maxOutputTokens: 8192,
        });

        const trimmed = text.trim();
        if (!trimmed) throw new Error("quarterly_narrative_empty");

        return {
          content: { text: trimmed },
          contentText: trimmed,
          modelUsed,
        };
      },
    });
    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}
