/**
 * POST /api/ai/relationships/autofill
 *
 * Turns a messy memory (pasted notes / email snippet / one-line description)
 * about ONE person into a structured relationship profile. Single structured
 * Gemini call (no web search needed — we extract from the user's own text).
 *
 * The handler NEVER writes to Supabase — the client reviews the result in the
 * AI Creation Wizard, edits, and saves. Auth is still required so anonymous
 * traffic can't burn API budget.
 *
 * Body: { text?, personName?, locale?, context?: { projects } }
 * 200:  { result: RelationshipAutofillResult, meta }
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsProModel,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  errorResponse,
  getApiKeyOrFail,
  requireAuthedContext,
} from "../../habits/_shared";
import {
  AutofillGeminiSchema,
  AutofillResultZ,
  buildAutofillPrompt,
  parseProjectContext,
  sanitizeProjectId,
} from "../_shared";
import { DEFAULT_RELATIONSHIP_CATEGORY } from "@/types/relationship";
import type {
  RelationshipAutofillResponse,
  RelationshipAutofillResult,
} from "@/types/relationship-intelligence";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT = 6000;

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const text =
    typeof bodyJson.text === "string" ? bodyJson.text.trim().slice(0, MAX_TEXT) : "";
  const personName =
    typeof bodyJson.personName === "string" ? bodyJson.personName.trim() : "";

  if (!text && !personName) {
    return NextResponse.json({ error: "missing_input" }, { status: 400 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;
  const { apiKey } = apiKeyRes;

  const projects = parseProjectContext(bodyJson.context);
  const allowedProjectIds = new Set(projects.map((p) => p.id));

  const userText = [
    personName ? `Person name (provided by user): ${personName}` : "",
    text ? `User's note / context:\n${text}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { data: rawJson, modelUsed } = await fetchGeminiStructured<unknown>({
      apiKey,
      model: getGeminiHabitsProModel(),
      systemInstruction: buildAutofillPrompt(ctx.language, projects),
      userText,
      responseSchema: AutofillGeminiSchema,
      temperature: 0.3,
      maxOutputTokens: 4096,
      timeoutMs: 50_000,
      fallbackModel: getGeminiHabitsFlashModel(),
    });

    const parsed = AutofillResultZ.safeParse(rawJson);
    if (!parsed.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[relationships/autofill] zod failed:",
          parsed.error.flatten(),
        );
      }
      throw new Error("gemini_invalid_structured_output");
    }
    const d = parsed.data;

    const result: RelationshipAutofillResult = {
      person_name: d.person_name.trim() || personName || "Unknown",
      category: d.category ?? DEFAULT_RELATIONSHIP_CATEGORY,
      relationship_strength: d.relationship_strength ?? "new",
      email: d.email ?? null,
      phone: d.phone ?? null,
      last_contact_date: d.last_contact_date ?? null,
      last_interaction_notes: d.last_interaction_notes ?? null,
      next_action: d.next_action ?? null,
      next_action_date: d.next_action_date ?? null,
      commitments_made: d.commitments_made ?? null,
      preferences_and_details: d.preferences_and_details ?? null,
      general_notes: d.general_notes ?? null,
      tags: Array.from(new Set(d.tags.map((t) => t.trim()).filter(Boolean))),
      linked_project_id: sanitizeProjectId(allowedProjectIds, d.linked_project_id),
      confidence: d.confidence,
      field_confidence: d.field_confidence ?? {},
      missing_fields: d.missing_fields,
      suggested_next_actions: d.suggested_next_actions,
      warnings: d.warnings,
    };

    const response: RelationshipAutofillResponse = {
      result,
      meta: { model_used: modelUsed, generated_at: new Date().toISOString() },
    };
    return NextResponse.json(response);
  } catch (e) {
    return errorResponse(e);
  }
}
