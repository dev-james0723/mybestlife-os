/**
 * POST /api/quote-library/smart-tagging
 *
 * Body:
 *   {
 *     quote_id: string,       // the newly-created quote
 *     quote_text: string,
 *     source_author?: string,
 *     source_context?: string,
 *     language?: AppLocale,
 *   }
 *
 * Effect:
 *   Generates category + tags + emotion_tone via Gemini (flash, structured
 *   output), writes them back on the quote row, and returns the updated row.
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  assertQuoteAiQuota,
  getQuoteAiKeyOrFail,
  quoteAiError,
  recordQuoteAiUsage,
  requireQuoteAiContext,
} from "@/lib/ai/quote-library/quote-ai";
import { SmartTaggingGeminiSchema } from "@/lib/ai/schemas/quote-library/smart-tagging";
import {
  buildSmartTaggingSystemPrompt,
  buildSmartTaggingUserText,
} from "@/lib/ai/prompts/quote-library/smart-tagging";
import { SmartTaggingResponseSchema } from "@/lib/validators/quote";
import { embedQuoteText } from "@/lib/ai/quote-library/embeddings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireQuoteAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const quoteId = typeof bodyJson.quote_id === "string" ? bodyJson.quote_id : "";
  const quoteText =
    typeof bodyJson.quote_text === "string" ? bodyJson.quote_text.trim() : "";
  const sourceAuthor =
    typeof bodyJson.source_author === "string"
      ? bodyJson.source_author.trim() || null
      : null;
  const sourceContext =
    typeof bodyJson.source_context === "string"
      ? bodyJson.source_context.trim() || null
      : null;

  if (!quoteId || !quoteText) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (quoteText.length > 4000) {
    return NextResponse.json({ error: "quote_too_long" }, { status: 413 });
  }

  const quota = await assertQuoteAiQuota(ctx, "smart_tagging");
  if (!quota.ok) return quota.response;

  const apiKeyRes = getQuoteAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const { data, modelUsed } = await fetchGeminiStructured<unknown>({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction: buildSmartTaggingSystemPrompt(ctx.language),
      userText: buildSmartTaggingUserText({
        quote_text: quoteText,
        source_author: sourceAuthor,
        source_context: sourceContext,
      }),
      responseSchema: SmartTaggingGeminiSchema,
      temperature: 0.3,
      maxOutputTokens: 1024,
      timeoutMs: 30_000,
    });

    const validated = SmartTaggingResponseSchema.parse(data);

    // Also kick off an embedding in parallel — piggy-backs on the same call so
    // we only pay one HTTP round-trip on save.
    let embedding: number[] | null = null;
    try {
      embedding = await embedQuoteText({
        apiKey: apiKeyRes.apiKey,
        text: quoteText,
        title: sourceAuthor,
      });
    } catch {
      /* Embedding failures are non-fatal — resonance search still works for
         other quotes; this one falls back to text search. */
    }

    const updatePayload: Record<string, unknown> = {
      category: validated.category,
      tags: validated.tags,
      emotion_tone: validated.emotion_tone,
      confidence_score: validated.confidence,
    };
    if (
      validated.detected_language &&
      validated.detected_language.length <= 10
    ) {
      updatePayload.language = validated.detected_language;
    }
    if (embedding) updatePayload.embedding = embedding;

    const { data: updated, error: updateError } = await ctx.supabase
      .from("quotes")
      .update(updatePayload)
      .eq("id", quoteId)
      .select()
      .single();
    if (updateError) {
      return NextResponse.json(
        { error: "update_failed", detail: updateError.message },
        { status: 500 },
      );
    }

    await recordQuoteAiUsage(ctx, "smart_tagging");

    return NextResponse.json({
      tagging: validated,
      quote: updated,
      modelUsed,
    });
  } catch (e) {
    return quoteAiError(e);
  }
}
