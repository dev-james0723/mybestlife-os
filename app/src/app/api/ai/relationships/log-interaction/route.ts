/**
 * POST /api/ai/relationships/log-interaction
 *
 * Extracts a structured update from a quick, messy note about an interaction
 * with a known person, and pre-computes a field-level diff vs. the current
 * relationship so the client can show a "Will update: …" review screen.
 *
 * The handler NEVER writes — the client confirms the diff, then persists the
 * interaction + applies updates + creates promises with explicit consent.
 *
 * Body: { relationshipId, note, current?: {…snapshot…}, locale? }
 * 200:  { result: InteractionExtraction, meta }
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
  LogInteractionGeminiSchema,
  LogInteractionZ,
  buildLogInteractionPrompt,
  serverTodayIso,
} from "../_shared";
import type {
  InteractionExtraction,
  InteractionFieldDiff,
  LogInteractionResponse,
} from "@/types/relationship-intelligence";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT = 4000;

type CurrentSnapshot = {
  person_name?: string;
  next_action?: string | null;
  preferences_and_details?: string | null;
  commitments_made?: string | null;
  tags?: string[];
};

function readSnapshot(raw: unknown): CurrentSnapshot {
  if (!raw || typeof raw !== "object") return {};
  const c = raw as Record<string, unknown>;
  return {
    person_name: typeof c.person_name === "string" ? c.person_name : undefined,
    next_action: typeof c.next_action === "string" ? c.next_action : null,
    preferences_and_details:
      typeof c.preferences_and_details === "string"
        ? c.preferences_and_details
        : null,
    commitments_made:
      typeof c.commitments_made === "string" ? c.commitments_made : null,
    tags: Array.isArray(c.tags)
      ? c.tags.filter((t): t is string => typeof t === "string")
      : [],
  };
}

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const relationshipId =
    typeof bodyJson.relationshipId === "string"
      ? bodyJson.relationshipId.trim()
      : "";
  const note =
    typeof bodyJson.note === "string"
      ? bodyJson.note.trim().slice(0, MAX_TEXT)
      : "";
  if (!note) {
    return NextResponse.json({ error: "missing_note" }, { status: 400 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;
  const { apiKey } = apiKeyRes;

  const snapshot = readSnapshot(bodyJson.current);

  try {
    const { data: rawJson, modelUsed } = await fetchGeminiStructured<unknown>({
      apiKey,
      model: getGeminiHabitsProModel(),
      systemInstruction: buildLogInteractionPrompt(
        ctx.language,
        snapshot.person_name ?? "this person",
      ),
      userText: `Quick note:\n${note}`,
      responseSchema: LogInteractionGeminiSchema,
      temperature: 0.3,
      maxOutputTokens: 2048,
      timeoutMs: 45_000,
      fallbackModel: getGeminiHabitsFlashModel(),
    });

    const parsed = LogInteractionZ.safeParse(rawJson);
    if (!parsed.success) {
      throw new Error("gemini_invalid_structured_output");
    }
    const d = parsed.data;

    const interactionDate = d.interaction_date ?? serverTodayIso();
    const commitmentsText = d.commitments.join("\n");

    // Pre-compute the review diff. Long-form fields append (preserving the
    // user's existing memory); scalar/forward-looking fields replace.
    const diffs: InteractionFieldDiff[] = [];
    diffs.push({
      field: "last_contact_date",
      label: "Last Contact",
      previous: null,
      next: interactionDate,
      mode: "replace",
    });
    if (d.summary) {
      diffs.push({
        field: "last_interaction_notes",
        label: "Last Interaction",
        previous: null,
        next: d.summary,
        mode: "replace",
      });
    }
    if (d.next_action) {
      diffs.push({
        field: "next_action",
        label: "Next Action",
        previous: snapshot.next_action ?? null,
        next: d.next_action,
        mode: "replace",
      });
    }
    if (d.next_action_date) {
      diffs.push({
        field: "next_action_date",
        label: "Next Action Date",
        previous: null,
        next: d.next_action_date,
        mode: "replace",
      });
    }
    if (d.preferences_and_details) {
      diffs.push({
        field: "preferences_and_details",
        label: "Preferences",
        previous: snapshot.preferences_and_details ?? null,
        next: d.preferences_and_details,
        mode: "append",
      });
    }
    if (commitmentsText) {
      diffs.push({
        field: "commitments_made",
        label: "Commitments",
        previous: snapshot.commitments_made ?? null,
        next: commitmentsText,
        mode: "append",
      });
    }
    if (d.tags.length) {
      const merged = Array.from(
        new Set([...(snapshot.tags ?? []), ...d.tags]),
      );
      diffs.push({
        field: "tags",
        label: "Tags",
        previous: (snapshot.tags ?? []).join(", ") || null,
        next: merged.join(", "),
        mode: "replace",
      });
    }

    const result: InteractionExtraction = {
      interaction_date: interactionDate,
      interaction_type: d.interaction_type,
      summary: d.summary,
      commitments: d.commitments,
      preferences_and_details: d.preferences_and_details ?? null,
      next_action: d.next_action ?? null,
      next_action_date: d.next_action_date ?? null,
      tags: d.tags,
      suggested_strength: d.suggested_strength ?? null,
      diffs,
      warnings: d.warnings,
    };

    const response: LogInteractionResponse = {
      result,
      meta: { model_used: modelUsed, generated_at: new Date().toISOString() },
    };
    // relationshipId is echoed implicitly by the client; not required server-side
    void relationshipId;
    return NextResponse.json(response);
  } catch (e) {
    return errorResponse(e);
  }
}
