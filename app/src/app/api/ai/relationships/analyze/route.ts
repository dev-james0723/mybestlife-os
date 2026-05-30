/**
 * POST /api/ai/relationships/analyze
 *
 * Generates a Relationship Intelligence Report from a compact, privacy-aware
 * context payload the client assembles (see lib/relationships/relationship-
 * insight-context.ts). The handler does not persist — the client caches the
 * result in `relationship_ai_reports`.
 *
 * Body: { relationshipId, locale?, context: {…} }
 * 200:  { report: RelationshipIntelligenceReport, meta }
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
} from "../../habits/_shared";
import {
  AnalyzeGeminiSchema,
  AnalyzeZ,
  buildAnalyzePrompt,
} from "../_shared";
import type { RelationshipIntelligenceReport } from "@/types/relationship-intelligence";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CONTEXT_CHARS = 12000;

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const relationshipId =
    typeof bodyJson.relationshipId === "string"
      ? bodyJson.relationshipId.trim()
      : "";
  if (!relationshipId) {
    return NextResponse.json({ error: "missing_relationship_id" }, { status: 400 });
  }

  const contextText =
    typeof bodyJson.context === "string"
      ? bodyJson.context
      : JSON.stringify(bodyJson.context ?? {});
  if (contextText.length < 2) {
    return NextResponse.json({ error: "missing_context" }, { status: 400 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;
  const { apiKey } = apiKeyRes;

  try {
    const { data: rawJson, modelUsed } = await fetchGeminiStructured<unknown>({
      apiKey,
      model: getGeminiHabitsProModel(),
      systemInstruction: buildAnalyzePrompt(ctx.language),
      userText: `Relationship context (JSON):\n${contextText.slice(0, MAX_CONTEXT_CHARS)}`,
      responseSchema: AnalyzeGeminiSchema,
      temperature: 0.45,
      maxOutputTokens: 4096,
      timeoutMs: 55_000,
      fallbackModel: getGeminiHabitsFlashModel(),
    });

    const parsed = AnalyzeZ.safeParse(rawJson);
    if (!parsed.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[relationships/analyze] zod failed:", parsed.error.flatten());
      }
      throw new Error("gemini_invalid_structured_output");
    }

    const report: RelationshipIntelligenceReport = {
      relationshipId,
      ...parsed.data,
      generatedAt: new Date().toISOString(),
      modelUsed,
    };

    return NextResponse.json({
      report,
      meta: { model_used: modelUsed, generated_at: report.generatedAt },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
