/**
 * POST /api/ai/assets/potential
 *
 * "Thinking of buying something?" analyzer. Given a candidate item and a
 * compact slice of what the user already owns + their projects/goals, returns
 * honest buy / wait / rent / repair / buy-used / skip guidance. Does not write.
 *
 * Request body: { itemName, notes?, context?: AssetInsightContextPayload, language? }
 * Response (200): { result: PotentialAssetAnalysis, meta: { modelUsed, generatedAt } }
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsProModel,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  errorResponse,
  PotentialAssetGeminiSchema,
  parsePotential,
  normalizePotential,
  buildPotentialPrompt,
} from "../_shared";
import type { AnalyzePotentialAssetResponse } from "@/types/asset-intelligence";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const itemName =
    typeof bodyJson.itemName === "string" ? bodyJson.itemName.trim() : "";
  if (!itemName) {
    return NextResponse.json({ error: "missing_item_name" }, { status: 400 });
  }
  if (itemName.length > 160) {
    return NextResponse.json({ error: "item_name_too_long" }, { status: 413 });
  }
  const notes =
    typeof bodyJson.notes === "string" ? bodyJson.notes.trim().slice(0, 600) : "";
  const context = bodyJson.context ?? {};

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  const userText = [
    `Candidate item: ${itemName}`,
    notes ? `User notes: ${notes}` : "",
    "",
    "Context (what the user already owns + projects/goals):",
    JSON.stringify(context, null, 2),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { data: rawJson, modelUsed } = await fetchGeminiStructured<unknown>({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsProModel(),
      systemInstruction: buildPotentialPrompt(ctx.language),
      userText,
      responseSchema: PotentialAssetGeminiSchema,
      temperature: 0.45,
      maxOutputTokens: 2048,
      timeoutMs: 55_000,
      fallbackModel: getGeminiHabitsFlashModel(),
    });

    const parsed = parsePotential(rawJson);
    if (!parsed) throw new Error("gemini_invalid_structured_output");

    return NextResponse.json({
      result: normalizePotential(parsed),
      meta: { modelUsed, generatedAt: new Date().toISOString() },
    } satisfies AnalyzePotentialAssetResponse);
  } catch (e) {
    return errorResponse(e);
  }
}
