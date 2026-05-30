/**
 * POST /api/ai/role-model/analyze
 *
 * Generates the per-Role-Model intelligence layer (Why Now, Hidden
 * Connections, What Not To Copy, Role Model DNA, overlap, mirror, challenge
 * prompts) grounded in the user's real Life OS data.
 *
 * Caching reuses the existing `ai_insights` table via `withInsightCache`. The
 * cache key is keyed ONLY on `{ roleModelId, locale }` (NOT the volatile
 * context), so the modal can cheaply re-open a cached insight and the user
 * controls regeneration with an explicit Refresh.
 *
 * Modes:
 *   - peek (default): read cache only, never call the model. Returns
 *     `{ result: null }` on a miss so the UI can show a "Generate" CTA.
 *   - generate: cache-or-generate.
 *   - generate + forceRefresh: always regenerate.
 *
 * Request: { roleModelId, mode?: "peek"|"generate", forceRefresh?, context }
 * Response: { result: RoleModelInsightResult | null, cached: boolean, meta }
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  getGeminiHabitsProModel,
} from "@/lib/ai/gemini-text";
import {
  errorResponse,
  getApiKeyOrFail,
  requireAuthedContext,
  withInsightCache,
} from "../../habits/_shared";
import { readInsight, stableHash } from "@/lib/habits/ai-cache";
import {
  RoleModelAnalyzeGeminiSchema,
  RoleModelInsightResultZ,
  buildAnalyzePrompt,
  parseInsightContext,
} from "../_shared-intelligence";
import type { RoleModelInsightResult } from "@/types/role-model-intelligence";

export const runtime = "nodejs";
export const maxDuration = 60;

const KIND = "role_model_analyze" as const;

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const roleModelId =
    typeof bodyJson.roleModelId === "string" ? bodyJson.roleModelId.trim() : "";
  if (!roleModelId) {
    return NextResponse.json({ error: "missing_role_model_id" }, { status: 400 });
  }

  const mode = bodyJson.mode === "generate" ? "generate" : "peek";
  const forceRefresh = bodyJson.forceRefresh === true;
  const cacheInput = { roleModelId };

  // -- Peek: cache-only, never burns the model. --
  if (mode === "peek") {
    try {
      const inputHash = stableHash({ kind: KIND, language: ctx.language, ...cacheInput });
      const hit = await readInsight({
        supabase: ctx.supabase,
        userId: ctx.userId,
        kind: KIND,
        inputHash,
        language: ctx.language,
      });
      if (!hit) return NextResponse.json({ result: null, cached: false, meta: null });
      return NextResponse.json({
        result: hit.content_json as RoleModelInsightResult,
        cached: true,
        meta: { modelUsed: hit.model_used, generatedAt: hit.created_at },
      });
    } catch {
      // Missing table / RLS hiccup → treat as a miss so the UI offers Generate.
      return NextResponse.json({ result: null, cached: false, meta: null });
    }
  }

  // -- Generate. --
  const context = parseInsightContext(bodyJson.context);
  if (!context) {
    return NextResponse.json({ error: "missing_context" }, { status: 400 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;
  const { apiKey } = apiKeyRes;

  try {
    const payload = await withInsightCache<RoleModelInsightResult>({
      ctx,
      kind: KIND,
      targetKind: "role_model",
      targetId: roleModelId,
      cacheInput,
      forceRefresh,
      allowReturnWithoutCacheOnWriteFailure: true,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey,
          model: getGeminiHabitsProModel(),
          systemInstruction: buildAnalyzePrompt(context, ctx.language),
          userText: `Analyze role model "${context.roleModel.name}" for this user.`,
          responseSchema: RoleModelAnalyzeGeminiSchema,
          temperature: 0.55,
          maxOutputTokens: 4096,
          timeoutMs: 50_000,
          fallbackModel: getGeminiHabitsFlashModel(),
        });
        const parsed = RoleModelInsightResultZ.safeParse(data);
        if (!parsed.success) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[role-model/analyze] zod failed:", parsed.error.flatten());
          }
          throw new Error("gemini_invalid_structured_output");
        }
        return { content: parsed.data as RoleModelInsightResult, modelUsed };
      },
    });

    return NextResponse.json({
      result: payload.content,
      cached: payload.cached,
      meta: { modelUsed: payload.modelUsed, generatedAt: payload.generatedAt },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
