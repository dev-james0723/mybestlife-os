/**
 * GET  /api/quote-library/wisdom  — fetch the cached profile (if any).
 * POST /api/quote-library/wisdom  — compute a fresh profile.
 *
 * Recompute policy (matches spec 2.5):
 *   • Initial compute: quote count ≥ 20.
 *   • Auto-recompute: whenever current count ≥ cached count + 10.
 *   • Manual refresh: capped to once per day per user via manual_refresh_date.
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsProModel,
} from "@/lib/ai/gemini-text";
import {
  assertQuoteAiQuota,
  getQuoteAiKeyOrFail,
  quoteAiError,
  recordQuoteAiUsage,
  requireQuoteAiContext,
} from "@/lib/ai/quote-library/quote-ai";
import { buildWisdomAnalysisSystemPrompt, buildWisdomAnalysisUserText } from "@/lib/ai/prompts/quote-library/wisdom";
import { WisdomAnalysisGeminiSchema } from "@/lib/ai/schemas/quote-library/wisdom";
import type { Quote } from "@/types/quote";
import { z } from "zod";
import { QuoteCategorySchema } from "@/lib/validators/quote";

export const runtime = "nodejs";

const MIN_QUOTES = 20;
const AUTO_RECOMPUTE_DELTA = 10;
const SAMPLE_SIZE = 30;

const TopThemeSchema = z.object({
  theme: z.string().min(2).max(80),
  description: z.string().min(4).max(400),
  supporting_categories: z.array(QuoteCategorySchema).min(1).max(6),
});

const WisdomSchema = z.object({
  top_themes: z.array(TopThemeSchema).min(3).max(5),
  monthly_insight: z.string().min(30).max(1600),
});

export async function GET(request: Request) {
  const auth = await requireQuoteAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { data, error } = await ctx.supabase
    .from("quote_wisdom_profiles")
    .select("*")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: "wisdom_read_failed", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ profile: data ?? null });
}

export async function POST(request: Request) {
  const auth = await requireQuoteAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const manualRefresh = bodyJson.manual === true;

  const { data: quotes, error: qError } = await ctx.supabase
    .from("quotes")
    .select("quote_text, source_author, category");
  if (qError) {
    return NextResponse.json(
      { error: "quotes_read_failed", detail: qError.message },
      { status: 500 },
    );
  }

  const typed = (quotes ?? []) as Pick<Quote, "quote_text" | "source_author" | "category">[];
  if (typed.length < MIN_QUOTES) {
    return NextResponse.json(
      { error: "not_enough_quotes", total: typed.length, required: MIN_QUOTES },
      { status: 409 },
    );
  }

  const { data: cached } = await ctx.supabase
    .from("quote_wisdom_profiles")
    .select("*")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);

  if (manualRefresh && cached?.manual_refresh_date === today) {
    return NextResponse.json(
      {
        error: "manual_refresh_exhausted",
        profile: cached,
        retry_after: "tomorrow",
      },
      { status: 429 },
    );
  }

  if (!manualRefresh && cached) {
    const delta = typed.length - cached.quote_count_at_compute;
    if (delta < AUTO_RECOMPUTE_DELTA) {
      return NextResponse.json({ profile: cached, cached: true });
    }
  }

  const quota = await assertQuoteAiQuota(ctx, "wisdom");
  if (!quota.ok) return quota.response;

  const apiKeyRes = getQuoteAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  const distribution: Record<string, number> = {};
  for (const q of typed) {
    const key = q.category ?? "Uncategorized";
    distribution[key] = (distribution[key] ?? 0) + 1;
  }

  // Diverse sample — 1 per category up to SAMPLE_SIZE, then fill with favorites.
  const byCategory = new Map<string, Pick<Quote, "quote_text" | "source_author" | "category">>();
  for (const q of typed) {
    const key = q.category ?? "Uncategorized";
    if (!byCategory.has(key)) byCategory.set(key, q);
    if (byCategory.size >= SAMPLE_SIZE) break;
  }
  const sampleQuotes = Array.from(byCategory.values())
    .slice(0, SAMPLE_SIZE)
    .map((q) => ({
      text: q.quote_text.slice(0, 400),
      author: q.source_author,
      category: q.category,
    }));

  try {
    const { data, modelUsed } = await fetchGeminiStructured<unknown>({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsProModel(),
      systemInstruction: buildWisdomAnalysisSystemPrompt(ctx.language),
      userText: buildWisdomAnalysisUserText({
        distribution,
        sampleQuotes,
        totalCount: typed.length,
      }),
      responseSchema: WisdomAnalysisGeminiSchema,
      temperature: 0.6,
      maxOutputTokens: 2048,
      timeoutMs: 90_000,
    });

    const parsed = WisdomSchema.parse(data);

    const upsertRow = {
      user_id: ctx.userId,
      quote_count_at_compute: typed.length,
      category_distribution: distribution,
      top_themes: parsed.top_themes,
      monthly_insight: parsed.monthly_insight,
      computed_at: new Date().toISOString(),
      manual_refresh_date: manualRefresh ? today : (cached?.manual_refresh_date ?? null),
    };

    const { data: upserted, error: upsertError } = await ctx.supabase
      .from("quote_wisdom_profiles")
      .upsert(upsertRow, { onConflict: "user_id" })
      .select()
      .single();
    if (upsertError) {
      return NextResponse.json(
        { error: "wisdom_write_failed", detail: upsertError.message },
        { status: 500 },
      );
    }

    await recordQuoteAiUsage(ctx, "wisdom");

    return NextResponse.json({
      profile: upserted,
      cached: false,
      modelUsed,
    });
  } catch (e) {
    return quoteAiError(e);
  }
}
