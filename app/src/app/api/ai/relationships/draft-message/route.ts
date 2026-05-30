/**
 * POST /api/ai/relationships/draft-message
 *
 * Generates a follow-up message DRAFT. Never sends; the client copies or
 * saves the draft. Auth required.
 *
 * Body: { relationshipId, purpose, tone, language, context? }
 * 200:  { result: DraftMessageResult, meta }
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  getGeminiHabitsProModel,
} from "@/lib/ai/gemini-text";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import {
  errorResponse,
  getApiKeyOrFail,
  requireAuthedContext,
} from "../../habits/_shared";
import {
  DraftMessageGeminiSchema,
  DraftMessageZ,
  buildDraftMessagePrompt,
} from "../_shared";
import {
  MESSAGE_DRAFT_PURPOSES,
  MESSAGE_DRAFT_TONES,
  type DraftMessageResponse,
  type DraftMessageResult,
  type MessageDraftPurpose,
  type MessageDraftTone,
} from "@/types/relationship-intelligence";

export const runtime = "nodejs";
export const maxDuration = 60;

function coercePurpose(v: unknown): MessageDraftPurpose {
  return (MESSAGE_DRAFT_PURPOSES as readonly string[]).includes(v as string)
    ? (v as MessageDraftPurpose)
    : "follow_up";
}
function coerceTone(v: unknown): MessageDraftTone {
  return (MESSAGE_DRAFT_TONES as readonly string[]).includes(v as string)
    ? (v as MessageDraftTone)
    : "warm";
}

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { bodyJson } = auth;

  const relationshipId =
    typeof bodyJson.relationshipId === "string"
      ? bodyJson.relationshipId.trim()
      : "";
  if (!relationshipId) {
    return NextResponse.json({ error: "missing_relationship_id" }, { status: 400 });
  }

  const purpose = coercePurpose(bodyJson.purpose);
  const tone = coerceTone(bodyJson.tone);
  // `language` overrides the request locale when the user picks an output lang.
  const language = parseAppLocale(bodyJson.language);
  const extra =
    typeof bodyJson.context === "string" ? bodyJson.context.slice(0, 6000) : "";

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;
  const { apiKey } = apiKeyRes;

  try {
    const { data: rawJson, modelUsed } = await fetchGeminiStructured<unknown>({
      apiKey,
      model: getGeminiHabitsProModel(),
      systemInstruction: buildDraftMessagePrompt(language, { purpose, tone }),
      userText: `Relationship context:\n${extra || "(minimal context supplied)"}`,
      responseSchema: DraftMessageGeminiSchema,
      temperature: 0.6,
      maxOutputTokens: 1600,
      timeoutMs: 45_000,
      fallbackModel: getGeminiHabitsFlashModel(),
    });

    const parsed = DraftMessageZ.safeParse(rawJson);
    if (!parsed.success) {
      throw new Error("gemini_invalid_structured_output");
    }

    const result: DraftMessageResult = {
      subject: parsed.data.subject ?? null,
      body: parsed.data.body,
      suggestedChannel: parsed.data.suggestedChannel ?? undefined,
      caution: parsed.data.caution ?? null,
    };

    const response: DraftMessageResponse = {
      result,
      meta: { model_used: modelUsed, generated_at: new Date().toISOString() },
    };
    return NextResponse.json(response);
  } catch (e) {
    return errorResponse(e);
  }
}
