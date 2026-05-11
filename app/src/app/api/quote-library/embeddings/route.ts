/**
 * POST /api/quote-library/embeddings
 *
 * Body: `{ quote_ids?: string[] }`
 *
 * Generates text-embedding-004 embeddings for the given quotes (or, if no ids
 * provided, for every quote belonging to the user that doesn't yet have one).
 * Rate-limited to 50 quotes per call to avoid long-running requests.
 */

import { NextResponse } from "next/server";
import {
  getQuoteAiKeyOrFail,
  quoteAiError,
  requireQuoteAiContext,
} from "@/lib/ai/quote-library/quote-ai";
import { embedQuoteText } from "@/lib/ai/quote-library/embeddings";

export const runtime = "nodejs";

const MAX_BATCH = 50;

export async function POST(request: Request) {
  const auth = await requireQuoteAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const apiKeyRes = getQuoteAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    let query = ctx.supabase
      .from("quotes")
      .select("id, quote_text, source_author, embedding");
    const ids = Array.isArray(bodyJson.quote_ids)
      ? (bodyJson.quote_ids as unknown[]).filter(
          (v): v is string => typeof v === "string",
        )
      : null;
    if (ids && ids.length > 0) {
      query = query.in("id", ids.slice(0, MAX_BATCH));
    } else {
      query = query.is("embedding", null).limit(MAX_BATCH);
    }
    const { data: quotes, error: readError } = await query;
    if (readError) throw readError;

    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const row of quotes ?? []) {
      try {
        const values = await embedQuoteText({
          apiKey: apiKeyRes.apiKey,
          text: row.quote_text,
          title: row.source_author ?? null,
        });
        const { error: writeError } = await ctx.supabase
          .from("quotes")
          .update({ embedding: values as unknown as string })
          .eq("id", row.id);
        if (writeError) throw writeError;
        results.push({ id: row.id, ok: true });
      } catch (e) {
        results.push({
          id: row.id,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (e) {
    return quoteAiError(e);
  }
}
