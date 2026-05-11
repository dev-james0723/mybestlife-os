/**
 * POST /api/ai/bio-lab/reset-sequence
 *
 * System Reset AI assist. Generates a 5-step adaptive reset sequence based
 * on the user's current state read (mood/energy/focus/stress + free-text
 * note). Falls back gracefully when the AI is unavailable — the panel
 * already ships a static 5-step sequence (see SYSTEM_RESET_STEPS) that the
 * client uses when this route returns a non-2xx.
 *
 * Request body:
 *   { state: { mood: number; energy: number; focus: number; stress: number },
 *     note?: string,
 *     language?: AppLocale,
 *     forceRefresh?: boolean }
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  ResetSequenceSchema,
  ResetSequenceGeminiSchema,
} from "@/lib/ai/schemas/bio-lab/index";
import { buildResetSequencePrompt } from "@/lib/ai/prompts/bio-lab/index";
import { BIO_LAB_AI_INSIGHT_KINDS } from "@/lib/ai/bio-lab/insight-kinds";
import type { ResetSequenceResult } from "@/lib/ai/bio-lab/types";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  withInsightCache,
  errorResponse,
} from "../_shared";

export const runtime = "nodejs";

const MAX_NOTE_LENGTH = 1000;

type StateInput = {
  mood: number;
  energy: number;
  focus: number;
  stress: number;
};

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const state = parseState(bodyJson.state);
  const note = typeof bodyJson.note === "string" ? bodyJson.note.trim() : "";
  const forceRefresh = bodyJson.forceRefresh === true;

  if (!state) {
    return NextResponse.json({ error: "missing_state" }, { status: 400 });
  }
  if (note.length > MAX_NOTE_LENGTH) {
    return NextResponse.json({ error: "note_too_long" }, { status: 413 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const payload = await withInsightCache<ResetSequenceResult>({
      ctx,
      kind: BIO_LAB_AI_INSIGHT_KINDS.resetSequence,
      cacheInput: { state, note },
      forceRefresh,
      allowReturnWithoutCacheOnWriteFailure: true,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsFlashModel(),
          systemInstruction: buildResetSequencePrompt(ctx.language),
          userText: buildUserText(state, note),
          responseSchema: ResetSequenceGeminiSchema,
          temperature: 0.5,
          maxOutputTokens: 1500,
        });
        const validated = ResetSequenceSchema.parse(data);
        return { content: validated, modelUsed };
      },
    });

    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}

function parseState(raw: unknown): StateInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    mood: clamp1to5(r.mood),
    energy: clamp1to5(r.energy),
    focus: clamp1to5(r.focus),
    stress: clamp1to5(r.stress),
  };
}

function clamp1to5(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function buildUserText(state: StateInput, note: string): string {
  const lines = [
    `Current state — mood:${state.mood} energy:${state.energy} focus:${state.focus} stress:${state.stress}`,
  ];
  if (note) lines.push(`Note: ${note}`);
  return lines.join("\n");
}
