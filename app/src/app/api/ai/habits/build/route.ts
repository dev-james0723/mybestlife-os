/**
 * POST /api/ai/habits/build
 *
 * Habit Builder — Flash + structured output. Turns a short free-text intent
 * into one primary habit proposal + up to 3 alternatives + first-week ramp.
 *
 * Request body:
 *   {
 *     intent: string,           // the user's free-text intent
 *     constraints?: string,     // optional: explicit constraints
 *     language?: AppLocale,     // default: inferred from session
 *     forceRefresh?: boolean,   // bypass cache
 *   }
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  HabitBuilderGeminiSchema,
  parseHabitBuilderResponse,
  type HabitBuilderResponse,
} from "@/lib/ai/schemas/habits/habit-builder";
import { buildHabitBuilderPrompt } from "@/lib/ai/prompts/habits/habit-builder";
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
  const constraints =
    typeof bodyJson.constraints === "string"
      ? bodyJson.constraints.trim()
      : undefined;
  const forceRefresh = bodyJson.forceRefresh === true;

  if (!intent) {
    return NextResponse.json({ error: "missing_intent" }, { status: 400 });
  }
  if (intent.length > 500) {
    return NextResponse.json({ error: "intent_too_long" }, { status: 413 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const payload = await withInsightCache<HabitBuilderResponse>({
      ctx,
      kind: "habit_builder",
      cacheInput: { intent, constraints: constraints ?? "" },
      forceRefresh,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsFlashModel(),
          systemInstruction: buildHabitBuilderPrompt(ctx.language),
          userText: buildUserText(intent, constraints),
          responseSchema: HabitBuilderGeminiSchema,
          temperature: 0.4,
          maxOutputTokens: 2048,
        });
        const validated = parseHabitBuilderResponse(data);
        return { content: validated, modelUsed };
      },
    });

    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}

function buildUserText(intent: string, constraints: string | undefined): string {
  const lines = [`User intent: ${intent}`];
  if (constraints) lines.push(`Constraints: ${constraints}`);
  return lines.join("\n");
}
