/**
 * Shared AI plumbing for the Bucket List.
 *
 * Wraps `fetchGeminiStructured` / `fetchGeminiGroundedText` with:
 *   - uniform auth + language detection,
 *   - daily usage quotas (default 20 enrichment calls/user/day),
 *   - typed error envelopes callers can surface in UI.
 *
 * Mirrors the Quote Library pattern so both features share a consistent
 * rate-limit + error schema.
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAppLocale, type AppLocale } from "@/lib/i18n/app-locale";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import type { BucketAiUsageKind } from "@/types/bucket-list";

/** Daily quotas — 0 means "uncapped". */
export const BUCKET_AI_DAILY_LIMITS: Record<BucketAiUsageKind, number> = {
  destination_brief: 20,
  trip_plan: 10,
  smart_tag: 60,
  inspire: 30,
  reframe: 20,
  reflection_summary: 30,
};

export type BucketAiContext = {
  supabase: SupabaseClient;
  userId: string;
  language: AppLocale;
};

export async function requireBucketAiContext(
  request: Request,
): Promise<
  | { ok: true; ctx: BucketAiContext; bodyJson: Record<string, unknown> }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();
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

export function getBucketAiKeyOrFail():
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

/**
 * Check whether the user has remaining budget for `kind` today.
 */
export async function assertBucketAiQuota(
  ctx: BucketAiContext,
  kind: BucketAiUsageKind,
): Promise<
  | { ok: true; remaining: number | "unlimited" }
  | { ok: false; response: NextResponse }
> {
  const limit = BUCKET_AI_DAILY_LIMITS[kind];
  if (limit === 0) return { ok: true, remaining: "unlimited" };

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await ctx.supabase
    .from("bucket_ai_usage")
    .select("count")
    .eq("user_id", ctx.userId)
    .eq("kind", kind)
    .eq("usage_date", today)
    .maybeSingle();
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[bucket-ai] quota read failed:", error);
    }
    return { ok: true, remaining: "unlimited" };
  }

  const used = data?.count ?? 0;
  if (used >= limit) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "quota_exceeded",
          kind,
          limit,
          used,
          resets_at: "next UTC midnight",
        },
        { status: 429 },
      ),
    };
  }
  return { ok: true, remaining: limit - used };
}

export async function recordBucketAiUsage(
  ctx: BucketAiContext,
  kind: BucketAiUsageKind,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing, error: readError } = await ctx.supabase
    .from("bucket_ai_usage")
    .select("count")
    .eq("user_id", ctx.userId)
    .eq("kind", kind)
    .eq("usage_date", today)
    .maybeSingle();
  if (readError && process.env.NODE_ENV !== "production") {
    console.warn("[bucket-ai] usage read failed:", readError);
  }
  if (existing) {
    await ctx.supabase
      .from("bucket_ai_usage")
      .update({ count: existing.count + 1 })
      .eq("user_id", ctx.userId)
      .eq("kind", kind)
      .eq("usage_date", today);
  } else {
    await ctx.supabase.from("bucket_ai_usage").insert({
      user_id: ctx.userId,
      kind,
      usage_date: today,
      count: 1,
    });
  }
}

export function bucketAiError(
  error: unknown,
  fallbackStatus = 500,
): NextResponse {
  const msg = error instanceof Error ? error.message : String(error);
  const status = msg.startsWith("gemini_http_") ? 502 : fallbackStatus;
  return NextResponse.json(
    { error: "ai_generation_failed", detail: msg.slice(0, 500) },
    { status },
  );
}
