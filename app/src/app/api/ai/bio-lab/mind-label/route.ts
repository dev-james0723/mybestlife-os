/**
 * POST /api/ai/bio-lab/mind-label
 *
 * Mind Sweep AI assist (single entry). Returns the best-fit kind label +
 * confidence so the panel can prefill the chip group; the user always sees
 * the suggestion before it's committed.
 *
 * Request body: { text: string, language?: AppLocale, forceRefresh?: boolean }
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  MindLabelSchema,
  MindLabelGeminiSchema,
} from "@/lib/ai/schemas/bio-lab/index";
import { buildMindLabelPrompt } from "@/lib/ai/prompts/bio-lab/index";
import { BIO_LAB_AI_INSIGHT_KINDS } from "@/lib/ai/bio-lab/insight-kinds";
import type { MindLabelResult } from "@/lib/ai/bio-lab/types";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  withInsightCache,
  errorResponse,
} from "../_shared";

export const runtime = "nodejs";

const MAX_INPUT_LENGTH = 800;

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const text = typeof bodyJson.text === "string" ? bodyJson.text.trim() : "";
  const forceRefresh = bodyJson.forceRefresh === true;

  if (!text) {
    return NextResponse.json({ error: "missing_text" }, { status: 400 });
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return NextResponse.json({ error: "text_too_long" }, { status: 413 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const payload = await withInsightCache<MindLabelResult>({
      ctx,
      kind: BIO_LAB_AI_INSIGHT_KINDS.mindLabel,
      cacheInput: { text },
      forceRefresh,
      allowReturnWithoutCacheOnWriteFailure: true,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsFlashModel(),
          systemInstruction: buildMindLabelPrompt(ctx.language),
          userText: `Entry: ${text}`,
          responseSchema: MindLabelGeminiSchema,
          temperature: 0.2,
          maxOutputTokens: 256,
        });
        const validated = MindLabelSchema.parse(data);
        return { content: validated, modelUsed };
      },
    });

    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}
