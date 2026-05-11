/**
 * POST /api/ai/bio-lab/state-inference
 *
 * State Scan AI assist. Takes a sentence/phrase the user wrote and returns
 * 4 sliders (1–5) + a cleaned-up note + confidence + reasoning, so the
 * panel can prefill the sliders and let the user adjust.
 *
 * Request body: { rawInput: string, language?: AppLocale, forceRefresh?: boolean }
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  StateInferenceSchema,
  StateInferenceGeminiSchema,
} from "@/lib/ai/schemas/bio-lab/index";
import { buildStateInferencePrompt } from "@/lib/ai/prompts/bio-lab/index";
import { BIO_LAB_AI_INSIGHT_KINDS } from "@/lib/ai/bio-lab/insight-kinds";
import type { StateInferenceResult } from "@/lib/ai/bio-lab/types";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  withInsightCache,
  errorResponse,
} from "../_shared";

export const runtime = "nodejs";

const MAX_INPUT_LENGTH = 1000;

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const rawInput =
    typeof bodyJson.rawInput === "string" ? bodyJson.rawInput.trim() : "";
  const forceRefresh = bodyJson.forceRefresh === true;

  if (!rawInput) {
    return NextResponse.json({ error: "missing_input" }, { status: 400 });
  }
  if (rawInput.length > MAX_INPUT_LENGTH) {
    return NextResponse.json({ error: "input_too_long" }, { status: 413 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const payload = await withInsightCache<StateInferenceResult>({
      ctx,
      kind: BIO_LAB_AI_INSIGHT_KINDS.stateInference,
      cacheInput: { rawInput },
      forceRefresh,
      allowReturnWithoutCacheOnWriteFailure: true,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsFlashModel(),
          systemInstruction: buildStateInferencePrompt(ctx.language),
          userText: `User self-description: ${rawInput}`,
          responseSchema: StateInferenceGeminiSchema,
          temperature: 0.3,
          maxOutputTokens: 512,
        });
        const validated = StateInferenceSchema.parse(data);
        return { content: validated, modelUsed };
      },
    });

    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}
