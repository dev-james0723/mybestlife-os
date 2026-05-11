/**
 * POST /api/quote-library/resonant
 *
 * Body:
 *   {
 *     text: string,       // a journal entry, mood, intent, etc.
 *     limit?: number,     // default 3, max 10
 *     threshold?: number, // default 0.15 cosine similarity floor
 *   }
 *
 * Returns the top-N resonant quotes from the user's library via the
 * `match_quotes` pgvector RPC. Used by the Journal page + `findResonantQuotes`
 * SDK entry.
 */

import { NextResponse } from "next/server";
import {
  getQuoteAiKeyOrFail,
  quoteAiError,
  requireQuoteAiContext,
} from "@/lib/ai/quote-library/quote-ai";
import { embedQueryText } from "@/lib/ai/quote-library/embeddings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireQuoteAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const text = typeof bodyJson.text === "string" ? bodyJson.text.trim() : "";
  const limitRaw = Number(bodyJson.limit ?? 3);
  const thresholdRaw = Number(bodyJson.threshold ?? 0.15);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.round(limitRaw), 1), 10)
    : 3;
  const threshold = Number.isFinite(thresholdRaw)
    ? Math.min(Math.max(thresholdRaw, 0), 1)
    : 0.15;

  if (!text) {
    return NextResponse.json({ error: "missing_text" }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "text_too_long" }, { status: 413 });
  }

  const apiKeyRes = getQuoteAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const queryEmbedding = await embedQueryText({
      apiKey: apiKeyRes.apiKey,
      text,
    });

    const { data, error } = await ctx.supabase.rpc("match_quotes", {
      query_embedding: queryEmbedding as unknown as string,
      match_count: limit,
      match_threshold: threshold,
    });
    if (error) throw error;

    return NextResponse.json({ matches: data ?? [] });
  } catch (e) {
    return quoteAiError(e);
  }
}
