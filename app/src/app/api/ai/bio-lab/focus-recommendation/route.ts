/**
 * POST /api/ai/bio-lab/focus-recommendation
 *
 * Focus Sprint AI assist. Picks an intention + duration based on the user's
 * free-text intent and (optionally) recent state signals so the panel can
 * preselect a preset and intention text the user can accept or override.
 *
 * Request body:
 *   { intent?: string,
 *     state?: { mood: number; energy: number; focus: number; stress: number },
 *     lastSprintOutcome?: "completed"|"partial"|"blocked",
 *     language?: AppLocale,
 *     forceRefresh?: boolean }
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  FocusRecommendationSchema,
  FocusRecommendationGeminiSchema,
} from "@/lib/ai/schemas/bio-lab/index";
import { buildFocusRecommendationPrompt } from "@/lib/ai/prompts/bio-lab/index";
import { BIO_LAB_AI_INSIGHT_KINDS } from "@/lib/ai/bio-lab/insight-kinds";
import type { FocusRecommendationResult } from "@/lib/ai/bio-lab/types";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  withInsightCache,
  errorResponse,
} from "../_shared";

export const runtime = "nodejs";

const MAX_INTENT_LENGTH = 600;
const VALID_OUTCOMES = new Set(["completed", "partial", "blocked"]);

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

  const intent =
    typeof bodyJson.intent === "string" ? bodyJson.intent.trim() : "";
  const state = parseState(bodyJson.state);
  const lastSprintOutcome = parseOutcome(bodyJson.lastSprintOutcome);
  const forceRefresh = bodyJson.forceRefresh === true;

  if (intent.length > MAX_INTENT_LENGTH) {
    return NextResponse.json({ error: "intent_too_long" }, { status: 413 });
  }
  // Need at least one signal: free-text intent OR a state read.
  if (!intent && !state) {
    return NextResponse.json({ error: "missing_signal" }, { status: 400 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const payload = await withInsightCache<FocusRecommendationResult>({
      ctx,
      kind: BIO_LAB_AI_INSIGHT_KINDS.focusRecommendation,
      cacheInput: { intent, state, lastSprintOutcome },
      forceRefresh,
      allowReturnWithoutCacheOnWriteFailure: true,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsFlashModel(),
          systemInstruction: buildFocusRecommendationPrompt(ctx.language),
          userText: buildUserText(intent, state, lastSprintOutcome),
          responseSchema: FocusRecommendationGeminiSchema,
          temperature: 0.4,
          maxOutputTokens: 512,
        });
        const validated = FocusRecommendationSchema.parse(data);
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
  const out: StateInput = {
    mood: clamp1to5(r.mood),
    energy: clamp1to5(r.energy),
    focus: clamp1to5(r.focus),
    stress: clamp1to5(r.stress),
  };
  return out;
}

function clamp1to5(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function parseOutcome(raw: unknown): "completed" | "partial" | "blocked" | null {
  if (typeof raw !== "string") return null;
  return VALID_OUTCOMES.has(raw)
    ? (raw as "completed" | "partial" | "blocked")
    : null;
}

function buildUserText(
  intent: string,
  state: StateInput | null,
  lastSprintOutcome: "completed" | "partial" | "blocked" | null,
): string {
  const lines: string[] = [];
  if (intent) lines.push(`Stated intention: ${intent}`);
  if (state) {
    lines.push(
      `Current state — mood:${state.mood} energy:${state.energy} focus:${state.focus} stress:${state.stress}`,
    );
  }
  if (lastSprintOutcome) {
    lines.push(`Last sprint outcome: ${lastSprintOutcome}`);
  }
  return lines.join("\n");
}
