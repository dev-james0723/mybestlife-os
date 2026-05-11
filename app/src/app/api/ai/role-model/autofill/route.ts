/**
 * POST /api/ai/role-model/autofill
 *
 * Signature interaction for the Role Model sub-tab. Given a person's name
 * and the current user's UI language, runs a TWO-CALL Gemini pipeline:
 *
 *   1. `gemini-2.5-pro` + `google_search` tool → freeform research notes.
 *   2. `gemini-2.5-pro` + `responseSchema`     → typed JSON profile.
 *
 * The first call uses live web search to ground facts, quotes, and the
 * portrait URL. The second call cannot use both `google_search` and
 * `responseSchema` (Gemini API rejects the combination), so we feed the
 * notes from call 1 as context and let it extract the structured shape.
 *
 * The handler does NOT write to Supabase — the user reviews the result in
 * the form and either edits + saves, or discards. Authentication is still
 * required so anonymous traffic can't burn API budget.
 *
 * Request body:
 *   { name: string, language?: AppLocale, context?: RoleModelAutofillContextPayload }
 *
 * Response (200):
 *   { result: RoleModelAutoFillResult, meta: { research_model, extraction_model, generated_at } }
 *
 * Errors:
 *   400 missing_name | name_too_long | invalid_json
 *   401 unauthenticated
 *   500 missing_gemini_api_key
 *   502 ai_generation_failed (Gemini upstream error / safety block / invalid output)
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiGroundedText,
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
  RoleModelAutoFillGeminiSchema,
  RoleModelAutoFillResultZ,
  buildExtractionPrompt,
  buildResearchPrompt,
  coerceRoleModelAutofillJson,
  inferPortraitUrlFromResearchNotes,
  normalizeAutoFillResult,
  parseAutofillContextPayload,
  sanitizeLinkedIds,
} from "../_shared";
import type { RoleModelAutoFillResponse } from "@/types/role-model";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_NAME_LENGTH = 120;

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const name =
    typeof bodyJson.name === "string" ? bodyJson.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }
  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: "name_too_long" }, { status: 413 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;
  const { apiKey } = apiKeyRes;

  const model = getGeminiHabitsProModel();
  const parsedContext = parseAutofillContextPayload(bodyJson.context);

  const allowedProjectIds = new Set(parsedContext.projects.map((p) => p.id));
  const allowedGoalIds = new Set(parsedContext.goals.map((g) => g.id));
  const allowedNoteIds = new Set(parsedContext.notes.map((n) => n.id));

  try {
    const { text: researchNotes, modelUsed: researchModel } =
      await fetchGeminiGroundedText({
        apiKey,
        model,
        systemInstruction: buildResearchPrompt(ctx.language),
        userText: `Person to research: ${name}`,
        temperature: 0.45,
        maxOutputTokens: 8192,
        timeoutMs: 55_000,
        // Flash tends to be more reliably available for `google_search` than
        // older Pro fallbacks when the primary Pro model is unavailable.
        fallbackModel: getGeminiHabitsFlashModel(),
      });

    if (!researchNotes.trim()) {
      throw new Error("gemini_empty_research");
    }

    const { data: rawJson, modelUsed: extractionModel } =
      await fetchGeminiStructured<unknown>({
        apiKey,
        model,
        systemInstruction: buildExtractionPrompt(ctx.language, parsedContext),
        userText: [
          `Researcher's notes about "${name}":`,
          "",
          researchNotes,
        ].join("\n"),
        responseSchema: RoleModelAutoFillGeminiSchema,
        temperature: 0.3,
        maxOutputTokens: 4096,
        timeoutMs: 45_000,
        fallbackModel: getGeminiHabitsFlashModel(),
      });

    const coerced = coerceRoleModelAutofillJson(rawJson);
    const parsed = RoleModelAutoFillResultZ.safeParse(coerced);
    if (!parsed.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[role-model/autofill] zod validation failed:",
          parsed.error.flatten(),
        );
      }
      throw new Error("gemini_invalid_structured_output");
    }

    const base = normalizeAutoFillResult(parsed.data);
    const result = {
      ...base,
      photo_url: inferPortraitUrlFromResearchNotes(
        researchNotes,
        base.photo_url,
      ),
      linked_project_ids: sanitizeLinkedIds(
        allowedProjectIds,
        parsed.data.linked_project_ids,
      ),
      linked_goal_ids: sanitizeLinkedIds(
        allowedGoalIds,
        parsed.data.linked_goal_ids,
      ),
      linked_note_ids: sanitizeLinkedIds(
        allowedNoteIds,
        parsed.data.linked_note_ids,
      ),
    };

    const response: RoleModelAutoFillResponse = {
      result,
      meta: {
        research_model: researchModel,
        extraction_model: extractionModel,
        generated_at: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (e) {
    return errorResponse(e);
  }
}
