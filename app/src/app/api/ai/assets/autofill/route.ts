/**
 * POST /api/ai/assets/autofill
 *
 * AI Asset Creation Wizard backend. Accepts a text description / product name
 * and/or inline attachments (receipt, invoice, warranty, product photo, PDF)
 * and returns a structured, confidence-tagged asset record for the user to
 * review before saving. Never writes to `assets` — the user confirms first.
 *
 * Request body:
 *   {
 *     text?: string,
 *     attachments?: { mimeType: string, data: string (base64), kind?: ... }[],
 *     language?: AppLocale
 *   }
 *
 * Response (200): { result: AssetAutofillResult, meta: { modelUsed, generatedAt } }
 * Errors: 400 empty_input | invalid_json · 401 unauthenticated ·
 *         413 too_many_attachments | attachment_too_large ·
 *         500 missing_gemini_api_key · 502 ai_generation_failed
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructuredFromParts,
  getGeminiHabitsFlashModel,
  getGeminiHabitsProModel,
  type GeminiStructuredPart,
} from "@/lib/ai/gemini-text";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  errorResponse,
  AssetAutofillGeminiSchema,
  parseAutofill,
  normalizeAutofill,
  buildAutofillPrompt,
} from "../_shared";
import type {
  AssetAutofillResponse,
  AssetAutofillAttachment,
} from "@/types/asset-intelligence";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 7_500_000; // ~7.5MB decoded; base64 is ~33% larger
const ALLOWED_MIME = /^(image\/(jpeg|png|webp|gif|heic)|application\/pdf)$/i;

function parseAttachments(raw: unknown): AssetAutofillAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: AssetAutofillAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const mimeType = typeof rec.mimeType === "string" ? rec.mimeType : "";
    const data = typeof rec.data === "string" ? rec.data : "";
    if (!mimeType || !data || !ALLOWED_MIME.test(mimeType)) continue;
    out.push({ mimeType, data });
  }
  return out;
}

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const text = typeof bodyJson.text === "string" ? bodyJson.text.trim() : "";
  const attachments = parseAttachments(bodyJson.attachments);

  if (!text && attachments.length === 0) {
    return NextResponse.json({ error: "empty_input" }, { status: 400 });
  }
  if (attachments.length > MAX_ATTACHMENTS) {
    return NextResponse.json({ error: "too_many_attachments" }, { status: 413 });
  }
  for (const a of attachments) {
    // base64 length ~ 4/3 of byte length
    if ((a.data.length * 3) / 4 > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: "attachment_too_large" }, { status: 413 });
    }
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  const userParts: GeminiStructuredPart[] = [];
  userParts.push({
    text: text
      ? `User input about the asset:\n${text}`
      : "Extract the asset from the attached document(s)/photo(s).",
  });
  for (const a of attachments) {
    userParts.push({ inlineData: { mimeType: a.mimeType, data: a.data } });
  }

  try {
    const { data: rawJson, modelUsed } =
      await fetchGeminiStructuredFromParts<unknown>({
        apiKey: apiKeyRes.apiKey,
        // Attachments benefit from the stronger model; text-only can use flash.
        model: attachments.length > 0
          ? getGeminiHabitsProModel()
          : getGeminiHabitsFlashModel(),
        systemInstruction: buildAutofillPrompt(ctx.language),
        userParts,
        responseSchema: AssetAutofillGeminiSchema,
        temperature: 0.25,
        maxOutputTokens: 2048,
        timeoutMs: 55_000,
        fallbackModel: getGeminiHabitsFlashModel(),
      });

    const parsed = parseAutofill(rawJson);
    if (!parsed) throw new Error("gemini_invalid_structured_output");

    const response: AssetAutofillResponse = {
      result: normalizeAutofill(parsed),
      meta: { modelUsed, generatedAt: new Date().toISOString() },
    };
    return NextResponse.json(response);
  } catch (e) {
    return errorResponse(e);
  }
}
