/**
 * Shared helpers for every handler under `app/api/ai/habits/*`.
 *
 * Each handler:
 *   1. Requires the user to be authenticated (`requireAuthUser`).
 *   2. Parses + shape-validates the request body.
 *   3. Hashes the input (`stableHash`) and probes `ai_insights` for a hit.
 *   4. If miss: calls Gemini via the wrapper, validates with Zod, writes the
 *      row, returns.
 *   5. If hit: returns the cached row.
 *
 * The helper fn `withInsightCache` wraps (3) + (4) + (5) so every route reads
 * nearly the same shape.
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAppLocale, type AppLocale } from "@/lib/i18n/app-locale";
import type { AIInsightKind } from "@/lib/habits/types";
import {
  readInsight,
  writeInsight,
  stableHash,
  type CacheRow,
} from "@/lib/habits/ai-cache";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import type { AIInsightPayload } from "@/hooks/use-ai-insight";

export type AuthedContext = {
  supabase: SupabaseClient;
  userId: string;
  language: AppLocale;
};

/**
 * Extract the authed user + requested language. Returns a Next response on
 * failure so the handler can early-return.
 */
export async function requireAuthedContext(
  request: Request,
): Promise<
  | { ok: true; ctx: AuthedContext; bodyJson: Record<string, unknown> }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthenticated" },
        { status: 401 },
      ),
    };
  }

  let bodyJson: Record<string, unknown> = {};
  const rawText = await request.text();
  if (rawText) {
    try {
      const parsed = JSON.parse(rawText) as unknown;
      if (parsed && typeof parsed === "object") {
        bodyJson = parsed as Record<string, unknown>;
      }
    } catch {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "invalid_json" },
          { status: 400 },
        ),
      };
    }
  }

  const language = parseAppLocale(bodyJson.language);

  return {
    ok: true,
    ctx: { supabase, userId: userData.user.id, language },
    bodyJson,
  };
}

/** Thin typed wrapper around `getGeminiServerApiKey()` that returns a 500 on miss. */
export function getApiKeyOrFail():
  | { ok: true; apiKey: string }
  | { ok: false; response: NextResponse } {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "missing_gemini_api_key" },
        { status: 500 },
      ),
    };
  }
  return { ok: true, apiKey };
}

// ============================================================
// withInsightCache
// ============================================================

export type WithCacheArgs<TContent> = {
  ctx: AuthedContext;
  kind: AIInsightKind;
  targetKind?: string | null;
  targetId?: string | null;
  /** Input object whose stable hash forms the cache key. */
  cacheInput: Record<string, unknown>;
  /** When true, skip the read step and force regeneration. */
  forceRefresh?: boolean;
  /**
   * When the Supabase `ai_insights` write fails after a successful generation,
   * return the fresh model output instead of failing the HTTP request. Bio Lab
   * routes enable this so users still get AI when the cache table is missing,
   * RLS is misconfigured, or Supabase is briefly unavailable.
   */
  allowReturnWithoutCacheOnWriteFailure?: boolean;
  /** Generator: produces `{ contentJson?, contentText?, modelUsed }`. */
  generate: () => Promise<{
    content: TContent;
    contentText?: string | null;
    modelUsed: string;
  }>;
};

export async function withInsightCache<TContent>(
  args: WithCacheArgs<TContent>,
): Promise<AIInsightPayload<TContent>> {
  const {
    ctx,
    kind,
    cacheInput,
    forceRefresh,
    allowReturnWithoutCacheOnWriteFailure,
  } = args;
  const inputHash = stableHash({ kind, language: ctx.language, ...cacheInput });

  if (!forceRefresh) {
    try {
      const hit = await readInsight({
        supabase: ctx.supabase,
        userId: ctx.userId,
        kind,
        inputHash,
        language: ctx.language,
      });
      if (hit) return rowToPayload<TContent>(hit, true);
    } catch (readErr) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[withInsightCache] cache read failed, treating as miss:",
          readErr,
        );
      }
    }
  }

  const { content, contentText, modelUsed } = await args.generate();

  try {
    const row = await writeInsight({
      supabase: ctx.supabase,
      userId: ctx.userId,
      kind,
      inputHash,
      language: ctx.language,
      targetKind: args.targetKind ?? null,
      targetId: args.targetId ?? null,
      contentJson: content ?? null,
      contentText: contentText ?? null,
      modelUsed,
    });

    return rowToPayload<TContent>(row, false);
  } catch (writeErr) {
    if (allowReturnWithoutCacheOnWriteFailure) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[withInsightCache] cache write failed, returning unpersisted insight:",
          writeErr,
        );
      }
      return {
        kind,
        content,
        modelUsed,
        language: ctx.language,
        cached: false,
        generatedAt: new Date().toISOString(),
      };
    }
    throw writeErr;
  }
}

function rowToPayload<TContent>(
  row: CacheRow,
  cached: boolean,
): AIInsightPayload<TContent> {
  // For streaming/prose kinds the client reads `content.text`; for structured
  // kinds the client reads the typed object directly. We keep the payload
  // shape uniform by nesting text into a `{ text }` wrapper when that's all
  // we have.
  const content =
    row.content_json != null
      ? (row.content_json as TContent)
      : ({ text: row.content_text ?? "" } as unknown as TContent);

  return {
    kind: row.kind,
    content,
    modelUsed: row.model_used,
    language: row.language,
    cached,
    generatedAt: row.created_at,
  };
}

/** Uniform shape for handler-thrown errors. */
export function errorResponse(
  error: unknown,
  fallbackStatus = 500,
): NextResponse {
  const msg = error instanceof Error ? error.message : String(error);
  const status = msg.startsWith("gemini_http_401")
    ? 502
    : msg.startsWith("gemini_http_")
      ? 502
      : fallbackStatus;
  return NextResponse.json(
    { error: "ai_generation_failed", detail: msg.slice(0, 500) },
    { status },
  );
}
