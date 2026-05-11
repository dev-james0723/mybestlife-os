/**
 * GET /api/quote-library/daily-quote
 *
 * Returns (or lazily creates) today's Quote of the Day for the authed user.
 * The selection is deterministic per (userId, date) — see
 * `lib/quote-library/daily-quote.ts`.
 *
 * Optional query:
 *   ?refresh=1  — force a new pick (still capped via QUOTE_AI_DAILY_LIMITS).
 */

import { NextResponse } from "next/server";
import {
  assertQuoteAiQuota,
  quoteAiError,
  recordQuoteAiUsage,
  requireQuoteAiContext,
} from "@/lib/ai/quote-library/quote-ai";
import { pickDailyQuote } from "@/lib/quote-library/daily-quote";
import type { Quote } from "@/types/quote";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireQuoteAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";
  const today = new Date().toISOString().slice(0, 10);

  try {
    if (!forceRefresh) {
      const { data: cached, error: cacheError } = await ctx.supabase
        .from("quote_daily_picks")
        .select("*, quote:quote_id (*)")
        .eq("user_id", ctx.userId)
        .eq("pick_date", today)
        .maybeSingle();
      if (!cacheError && cached?.quote) {
        return NextResponse.json({
          pick_date: cached.pick_date,
          quote: cached.quote,
          reason: cached.reason_text,
          dismissed: cached.dismissed,
          cached: true,
        });
      }
    }

    const quota = await assertQuoteAiQuota(ctx, "daily_quote");
    if (!quota.ok) return quota.response;

    const { data: quotes, error: quotesError } = await ctx.supabase
      .from("quotes")
      .select("*");
    if (quotesError) throw quotesError;

    const typed = (quotes ?? []) as Quote[];
    const pick = pickDailyQuote({ quotes: typed, userId: ctx.userId });
    if (!pick) {
      return NextResponse.json({
        pick_date: today,
        quote: null,
        cached: false,
      });
    }

    // Upsert the pick + bump last_surfaced_on so future picks rotate fairly.
    await ctx.supabase
      .from("quote_daily_picks")
      .upsert(
        {
          user_id: ctx.userId,
          pick_date: today,
          quote_id: pick.id,
          dismissed: false,
        },
        { onConflict: "user_id,pick_date" },
      );
    await ctx.supabase
      .from("quotes")
      .update({ last_surfaced_on: today })
      .eq("id", pick.id);

    await recordQuoteAiUsage(ctx, "daily_quote");

    return NextResponse.json({
      pick_date: today,
      quote: pick,
      reason: null,
      dismissed: false,
      cached: false,
    });
  } catch (e) {
    return quoteAiError(e);
  }
}

export async function POST(request: Request) {
  const auth = await requireQuoteAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const dismissed = bodyJson.dismissed === true;
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await ctx.supabase
    .from("quote_daily_picks")
    .update({ dismissed })
    .eq("user_id", ctx.userId)
    .eq("pick_date", today);
  if (error) {
    return NextResponse.json(
      { error: "update_failed", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, dismissed });
}
