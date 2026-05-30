/**
 * POST /api/ai/role-model/patterns
 *
 * Collection-level analysis: what the user's ENTIRE set of role models reveals
 * about them (recurring traits, dominant archetypes, blind spots, missing
 * archetypes, suggested next role models).
 *
 * Cached via `ai_insights`, keyed on the sorted set of role-model ids so the
 * report auto-refreshes when the collection meaningfully changes, but is
 * otherwise served from cache. `forceRefresh` regenerates on demand.
 *
 * Request: { mode?: "peek"|"generate", forceRefresh?, roleModels: [...], aboutMe? }
 * Response: { result: RoleModelPatternResult | null, cached, meta }
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
  withInsightCache,
} from "../../habits/_shared";
import { readInsight, stableHash } from "@/lib/habits/ai-cache";
import {
  RoleModelPatternResultZ,
  RoleModelPatternsGeminiSchema,
  buildPatternsPrompt,
} from "../_shared-intelligence";
import type { RoleModelPatternResult } from "@/types/role-model-intelligence";

export const runtime = "nodejs";
export const maxDuration = 60;

const KIND = "role_model_patterns" as const;

type RosterEntry = { id: string; name: string; category?: string | null; blurb?: string | null };

function parseRoster(raw: unknown): RosterEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      id: typeof x.id === "string" ? x.id.slice(0, 64) : "",
      name: typeof x.name === "string" ? x.name.slice(0, 120) : "",
      category: typeof x.category === "string" ? x.category.slice(0, 60) : null,
      blurb: typeof x.blurb === "string" ? x.blurb.slice(0, 200) : null,
    }))
    .filter((x) => x.id && x.name)
    .slice(0, 40);
}

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const roster = parseRoster(bodyJson.roleModels);
  const signature = roster.map((r) => r.id).sort().join(",");
  const cacheInput = { signature };

  const mode = bodyJson.mode === "generate" ? "generate" : "peek";
  const forceRefresh = bodyJson.forceRefresh === true;

  if (mode === "peek") {
    try {
      const inputHash = stableHash({ kind: KIND, language: ctx.language, ...cacheInput });
      const hit = await readInsight({
        supabase: ctx.supabase,
        userId: ctx.userId,
        kind: KIND,
        inputHash,
        language: ctx.language,
      });
      if (!hit) return NextResponse.json({ result: null, cached: false, meta: null });
      return NextResponse.json({
        result: hit.content_json as RoleModelPatternResult,
        cached: true,
        meta: { modelUsed: hit.model_used, generatedAt: hit.created_at },
      });
    } catch {
      return NextResponse.json({ result: null, cached: false, meta: null });
    }
  }

  if (roster.length < 2) {
    return NextResponse.json({ error: "need_at_least_two_role_models" }, { status: 400 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;
  const { apiKey } = apiKeyRes;

  const aboutMeRaw = bodyJson.aboutMe as Record<string, unknown> | undefined;
  const aboutMe = aboutMeRaw
    ? {
        mission: typeof aboutMeRaw.mission === "string" ? aboutMeRaw.mission.slice(0, 300) : null,
        coreValues:
          typeof aboutMeRaw.coreValues === "string" ? aboutMeRaw.coreValues.slice(0, 300) : null,
        personality:
          typeof aboutMeRaw.personality === "string" ? aboutMeRaw.personality.slice(0, 300) : null,
      }
    : null;

  try {
    const payload = await withInsightCache<RoleModelPatternResult>({
      ctx,
      kind: KIND,
      targetKind: "role_model_collection",
      cacheInput,
      forceRefresh,
      allowReturnWithoutCacheOnWriteFailure: true,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey,
          model: getGeminiHabitsProModel(),
          systemInstruction: buildPatternsPrompt(roster, aboutMe, ctx.language),
          userText: `Analyze this collection of ${roster.length} role models.`,
          responseSchema: RoleModelPatternsGeminiSchema,
          temperature: 0.6,
          maxOutputTokens: 3072,
          timeoutMs: 50_000,
          fallbackModel: getGeminiHabitsFlashModel(),
        });
        const parsed = RoleModelPatternResultZ.safeParse(data);
        if (!parsed.success) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[role-model/patterns] zod failed:", parsed.error.flatten());
          }
          throw new Error("gemini_invalid_structured_output");
        }
        return { content: parsed.data as RoleModelPatternResult, modelUsed };
      },
    });

    return NextResponse.json({
      result: payload.content,
      cached: payload.cached,
      meta: { modelUsed: payload.modelUsed, generatedAt: payload.generatedAt },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
