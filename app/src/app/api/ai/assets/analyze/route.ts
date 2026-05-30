/**
 * POST /api/ai/assets/analyze
 *
 * Generates the full Asset Intelligence report (Why This Matters, Asset DNA,
 * Hidden Connections, If This Disappeared Tomorrow, Recommendation, Document
 * Health, Insurance Readiness, Activation Plan, …) for one asset.
 *
 * Expensive, so the result is cached in `asset_intelligence_reports` keyed by
 * (asset_id, language) with an `input_hash`. A matching, fresh hash returns the
 * cached row; `forceRefresh: true` or a changed context regenerates.
 *
 * Request body: { assetId, context: AssetInsightContextPayload, language?, forceRefresh? }
 * Response (200): { result: AssetIntelligenceReport, meta: { modelUsed, generatedAt, cached } }
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsProModel,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import { stableHash } from "@/lib/habits/ai-cache";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  errorResponse,
  AssetReportGeminiSchema,
  parseReport,
  normalizeReport,
  buildAnalyzePrompt,
  buildAnalyzeUserText,
} from "../_shared";
import type {
  AnalyzeAssetResponse,
  AssetInsightContextPayload,
  AssetIntelligenceReport,
} from "@/types/asset-intelligence";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const assetId =
    typeof bodyJson.assetId === "string" ? bodyJson.assetId.trim() : "";
  if (!assetId) {
    return NextResponse.json({ error: "missing_asset_id" }, { status: 400 });
  }
  const context = bodyJson.context as AssetInsightContextPayload | undefined;
  if (!context || typeof context !== "object" || !context.asset) {
    return NextResponse.json({ error: "missing_context" }, { status: 400 });
  }
  const forceRefresh = bodyJson.forceRefresh === true;

  // Ownership check — RLS also enforces this, but fail fast + clearly.
  const { data: asset, error: assetError } = await ctx.supabase
    .from("assets")
    .select("id")
    .eq("id", assetId)
    .maybeSingle();
  if (assetError) {
    return NextResponse.json({ error: "asset_lookup_failed" }, { status: 500 });
  }
  if (!asset) {
    return NextResponse.json({ error: "asset_not_found" }, { status: 404 });
  }

  const inputHash = stableHash({ assetId, language: ctx.language, context });

  // Cache read
  if (!forceRefresh) {
    try {
      const { data: cached } = await ctx.supabase
        .from("asset_intelligence_reports")
        .select("report_json, input_hash, model_used, generated_at")
        .eq("asset_id", assetId)
        .eq("language", ctx.language)
        .maybeSingle();
      if (cached?.report_json && cached.input_hash === inputHash) {
        return NextResponse.json({
          result: cached.report_json as AssetIntelligenceReport,
          meta: {
            modelUsed: cached.model_used ?? "cached",
            generatedAt: cached.generated_at ?? new Date().toISOString(),
            cached: true,
          },
        } satisfies AnalyzeAssetResponse);
      }
    } catch {
      // treat as miss
    }
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const { data: rawJson, modelUsed } = await fetchGeminiStructured<unknown>({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsProModel(),
      systemInstruction: buildAnalyzePrompt(ctx.language),
      userText: buildAnalyzeUserText(context),
      responseSchema: AssetReportGeminiSchema,
      temperature: 0.5,
      maxOutputTokens: 4096,
      timeoutMs: 55_000,
      fallbackModel: getGeminiHabitsFlashModel(),
    });

    const parsed = parseReport(rawJson);
    if (!parsed) throw new Error("gemini_invalid_structured_output");

    const result = normalizeReport(assetId, parsed, modelUsed);

    // Cache write (best-effort upsert on the (asset_id, language) unique key).
    try {
      await ctx.supabase.from("asset_intelligence_reports").upsert(
        {
          user_id: ctx.userId,
          asset_id: assetId,
          report_json: result,
          input_hash: inputHash,
          language: ctx.language,
          model_used: modelUsed,
          generated_at: result.generatedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "asset_id,language" },
      );
    } catch {
      // Non-fatal: still return the fresh report.
    }

    return NextResponse.json({
      result,
      meta: { modelUsed, generatedAt: result.generatedAt, cached: false },
    } satisfies AnalyzeAssetResponse);
  } catch (e) {
    return errorResponse(e);
  }
}
