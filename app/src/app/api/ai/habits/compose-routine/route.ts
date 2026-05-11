/**
 * POST /api/ai/habits/compose-routine
 *
 * Routine Composer — Flash + structured output.
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  RoutineComposerGeminiSchema,
  parseRoutineComposerResponse,
  type RoutineComposerResponse,
} from "@/lib/ai/schemas/habits/routine-composer";
import { buildRoutineComposerPrompt } from "@/lib/ai/prompts/habits/routine-composer";
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

  const intent = typeof bodyJson.intent === "string" ? bodyJson.intent.trim() : "";
  const forceRefresh = bodyJson.forceRefresh === true;

  if (!intent) {
    return NextResponse.json({ error: "missing_intent" }, { status: 400 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const payload = await withInsightCache<RoutineComposerResponse>({
      ctx,
      kind: "routine_composer",
      cacheInput: { intent },
      forceRefresh,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsFlashModel(),
          systemInstruction: buildRoutineComposerPrompt(ctx.language),
          userText: `Routine intent:\n${intent}`,
          responseSchema: RoutineComposerGeminiSchema,
          temperature: 0.45,
          maxOutputTokens: 2048,
        });
        const validated = parseRoutineComposerResponse(data);
        return { content: validated, modelUsed };
      },
    });
    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}
