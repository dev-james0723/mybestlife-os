/**
 * POST /api/quote-library/source-intelligence
 *
 * Body:
 *   {
 *     quote_id: string,
 *     force_refresh?: boolean,
 *   }
 *
 * Two-call pattern:
 *   1. Grounded research (Gemini + googleSearch tool) → plain text brief.
 *   2. Structured extraction → typed JSON payload stored in quotes.source_intelligence.
 *
 * Cap: 20 calls / user / day (see QUOTE_AI_DAILY_LIMITS).
 * Cache: stored indefinitely on the row. Re-runs only on `force_refresh`.
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiGroundedText,
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  getGeminiHabitsProModel,
} from "@/lib/ai/gemini-text";
import {
  assertQuoteAiQuota,
  getQuoteAiKeyOrFail,
  quoteAiError,
  recordQuoteAiUsage,
  requireQuoteAiContext,
} from "@/lib/ai/quote-library/quote-ai";
import {
  SOURCE_INTELLIGENCE_EXTRACTION_SYSTEM,
  SOURCE_INTELLIGENCE_RESEARCH_SYSTEM,
  buildSourceIntelligenceExtractionUserText,
  buildSourceIntelligenceResearchUserText,
} from "@/lib/ai/prompts/quote-library/source-intelligence";
import { SourceIntelligenceGeminiSchema } from "@/lib/ai/schemas/quote-library/source-intelligence";
import { SourceIntelligenceResponseSchema } from "@/lib/validators/quote";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireQuoteAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const quoteId = typeof bodyJson.quote_id === "string" ? bodyJson.quote_id : "";
  const forceRefresh = bodyJson.force_refresh === true;

  if (!quoteId) {
    return NextResponse.json({ error: "missing_quote_id" }, { status: 400 });
  }

  const { data: quote, error: quoteError } = await ctx.supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();
  if (quoteError || !quote) {
    return NextResponse.json({ error: "quote_not_found" }, { status: 404 });
  }

  if (!forceRefresh && quote.is_ai_enriched && quote.source_intelligence) {
    return NextResponse.json({
      quote,
      source_intelligence: quote.source_intelligence,
      cached: true,
    });
  }

  const author = quote.source_author?.trim();
  if (!author) {
    return NextResponse.json(
      { error: "missing_author" },
      { status: 400 },
    );
  }

  const quota = await assertQuoteAiQuota(ctx, "source_intelligence");
  if (!quota.ok) return quota.response;

  const apiKeyRes = getQuoteAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    // Call 1: grounded research.
    const research = await fetchGeminiGroundedText({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsProModel(),
      systemInstruction: SOURCE_INTELLIGENCE_RESEARCH_SYSTEM,
      userText: buildSourceIntelligenceResearchUserText({
        quote_text: quote.quote_text,
        source_author: author,
        source_context: quote.source_context,
      }),
      temperature: 0.4,
      maxOutputTokens: 3072,
      timeoutMs: 90_000,
    });

    // Call 2: structured extraction (no tools).
    const extraction = await fetchGeminiStructured<unknown>({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction: SOURCE_INTELLIGENCE_EXTRACTION_SYSTEM,
      userText: buildSourceIntelligenceExtractionUserText(research.text),
      responseSchema: SourceIntelligenceGeminiSchema,
      temperature: 0.2,
      maxOutputTokens: 2048,
      timeoutMs: 45_000,
    });

    const parsed = SourceIntelligenceResponseSchema.parse(extraction.data);

    const sourceIntelligence = {
      author_bio: parsed.author_bio?.trim() || null,
      historical_context: parsed.historical_context?.trim() || null,
      related_quotes: parsed.related_quotes.map((rq) => ({
        text: rq.text.trim(),
        source: rq.source?.trim() ?? null,
      })),
      confidence: parsed.confidence,
      unverified: parsed.unverified,
      fetched_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await ctx.supabase
      .from("quotes")
      .update({
        source_intelligence: sourceIntelligence,
        is_ai_enriched: !parsed.unverified && parsed.confidence >= 0.5,
      })
      .eq("id", quoteId)
      .select()
      .single();
    if (updateError) {
      return NextResponse.json(
        { error: "update_failed", detail: updateError.message },
        { status: 500 },
      );
    }

    await recordQuoteAiUsage(ctx, "source_intelligence");

    return NextResponse.json({
      quote: updated,
      source_intelligence: sourceIntelligence,
      cached: false,
      modelUsed: `${research.modelUsed} + ${extraction.modelUsed}`,
    });
  } catch (e) {
    return quoteAiError(e);
  }
}
