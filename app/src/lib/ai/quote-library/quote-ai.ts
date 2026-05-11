/**
 * Shared AI plumbing for the Quote Library.
 *
 * Wraps `fetchGeminiStructured` / `fetchGeminiGroundedText` with:
 *   - uniform auth + language detection,
 *   - daily usage quotas (20 source-intelligence calls/user/day),
 *   - typed error envelopes callers can surface in UI.
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  parseAppLocale,
  type AppLocale,
} from "@/lib/i18n/app-locale";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";

export type QuoteAiUsageKind =
  | "source_intelligence"
  | "smart_tagging"
  | "daily_quote"
  | "wisdom"
  | "inspire";

/** Daily quotas — 0 means "uncapped". */
export const QUOTE_AI_DAILY_LIMITS: Record<QuoteAiUsageKind, number> = {
  source_intelligence: 20,
  smart_tagging: 100,
  daily_quote: 3,
  wisdom: 2,
  inspire: 30,
};

export type QuoteAiContext = {
  supabase: SupabaseClient;
  userId: string;
  language: AppLocale;
};

export async function requireQuoteAiContext(
  request: Request,
): Promise<
  | { ok: true; ctx: QuoteAiContext; bodyJson: Record<string, unknown> }
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

export function getQuoteAiKeyOrFail():
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
 * Check whether the user has remaining budget for `kind` today. Returns
 * `{ ok: true, remaining }` if the call is allowed (and does NOT yet
 * decrement). Use {@link recordQuoteAiUsage} after a successful call.
 */
export async function assertQuoteAiQuota(
  ctx: QuoteAiContext,
  kind: QuoteAiUsageKind,
): Promise<
  | { ok: true; remaining: number | "unlimited" }
  | { ok: false; response: NextResponse }
> {
  const limit = QUOTE_AI_DAILY_LIMITS[kind];
  if (limit === 0) return { ok: true, remaining: "unlimited" };

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await ctx.supabase
    .from("quote_ai_usage")
    .select("count")
    .eq("user_id", ctx.userId)
    .eq("kind", kind)
    .eq("usage_date", today)
    .maybeSingle();
  if (error) {
    // If the ledger read fails, let the call through and log — we prefer a
    // temporarily over-budget user to a locked-out one.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[quote-ai] quota read failed:", error);
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

/**
 * Increment today's usage counter for `kind`. Called after a successful
 * Gemini response — before we write the enrichment into the row.
 */
export async function recordQuoteAiUsage(
  ctx: QuoteAiContext,
  kind: QuoteAiUsageKind,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing, error: readError } = await ctx.supabase
    .from("quote_ai_usage")
    .select("id, count")
    .eq("user_id", ctx.userId)
    .eq("kind", kind)
    .eq("usage_date", today)
    .maybeSingle();
  if (readError && process.env.NODE_ENV !== "production") {
    console.warn("[quote-ai] usage read failed:", readError);
  }
  if (existing?.id) {
    await ctx.supabase
      .from("quote_ai_usage")
      .update({ count: existing.count + 1 })
      .eq("id", existing.id);
  } else {
    await ctx.supabase.from("quote_ai_usage").insert({
      kind,
      usage_date: today,
      count: 1,
    });
  }
}

export function quoteAiError(error: unknown, fallbackStatus = 500): NextResponse {
  const msg = error instanceof Error ? error.message : String(error);
  const status = msg.startsWith("gemini_http_") ? 502 : fallbackStatus;
  return NextResponse.json(
    { error: "ai_generation_failed", detail: msg.slice(0, 500) },
    { status },
  );
}
