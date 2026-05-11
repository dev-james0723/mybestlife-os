/**
 * POST /api/ai/habits/goal-to-habits
 *
 * Goal → Habits — Flash + structured.
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  GoalToHabitsGeminiSchema,
  parseGoalToHabitsResponse,
  type GoalToHabitsResponse,
} from "@/lib/ai/schemas/habits/goal-to-habits";
import { buildGoalToHabitsPrompt } from "@/lib/ai/prompts/habits/goal-to-habits";
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

  const goalId = typeof bodyJson.goalId === "string" ? bodyJson.goalId : null;
  const goalText = typeof bodyJson.goalText === "string" ? bodyJson.goalText.trim() : "";
  const forceRefresh = bodyJson.forceRefresh === true;

  if (!goalText) {
    return NextResponse.json({ error: "missing_goal_text" }, { status: 400 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const payload = await withInsightCache<GoalToHabitsResponse>({
      ctx,
      kind: "goal_to_habits",
      targetKind: goalId ? "goal" : null,
      targetId: goalId,
      cacheInput: { goalId: goalId ?? "", goalText },
      forceRefresh,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsFlashModel(),
          systemInstruction: buildGoalToHabitsPrompt(ctx.language),
          userText: `Goal:\n${goalText}`,
          responseSchema: GoalToHabitsGeminiSchema,
          temperature: 0.45,
          maxOutputTokens: 4096,
        });
        const validated = parseGoalToHabitsResponse(data);
        return { content: validated, modelUsed };
      },
    });
    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}
