import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  SecretaryBriefGeminiSchema,
  parseSecretaryBriefResponse,
  type SecretaryBriefResponse,
} from "@/lib/ai/schemas/habits/secretary";
import { buildSecretaryBriefPrompt } from "@/lib/ai/prompts/habits/secretary";
import {
  buildHabitSecretaryContext,
  formatHabitSecretaryContext,
} from "@/lib/ai/habits/context-builder";
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
  const today =
    typeof bodyJson.today === "string" && bodyJson.today
      ? bodyJson.today.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  const forceRefresh = bodyJson.forceRefresh === true;

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const context = await buildHabitSecretaryContext({
      supabase: ctx.supabase,
      language: ctx.language,
      today,
    });
    const contextText = formatHabitSecretaryContext(context);
    const payload = await withInsightCache<SecretaryBriefResponse>({
      ctx,
      kind: "secretary_brief",
      cacheInput: { today, contextText },
      forceRefresh,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsFlashModel(),
          systemInstruction: buildSecretaryBriefPrompt(ctx.language),
          userText: contextText,
          responseSchema: SecretaryBriefGeminiSchema,
          temperature: 0.35,
          maxOutputTokens: 1200,
        });
        const validated = parseSecretaryBriefResponse(data);
        return { content: validated, modelUsed };
      },
    });

    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}
