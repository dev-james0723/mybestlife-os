/**
 * POST /api/quote-library/inspire
 *
 * SDK entry: `inspireMe`. Pulls from:
 *   • recent mind sweep snippets + self profile summary (body),
 *   • the user's library,
 *   • preferred favorites.
 *
 * Returns the most resonant quote with a short Gemini-generated reason.
 */

import { NextResponse } from "next/server";
import {
  assertQuoteAiQuota,
  getQuoteAiKeyOrFail,
  quoteAiError,
  recordQuoteAiUsage,
  requireQuoteAiContext,
} from "@/lib/ai/quote-library/quote-ai";
import {
  embedQueryText,
} from "@/lib/ai/quote-library/embeddings";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import { z } from "zod";
import type { Quote } from "@/types/quote";

export const runtime = "nodejs";

const ReasonSchema = z.object({
  reason: z.string().min(10).max(400),
});

const REASON_GEMINI_SCHEMA = {
  type: "object",
  required: ["reason"],
  properties: {
    reason: {
      type: "string",
      description:
        "1–2 warm sentences (max 60 words) explaining why this quote feels right for the user right now. Use second person. Never invent facts about the user.",
    },
  },
};

export async function POST(request: Request) {
  const auth = await requireQuoteAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const focus = typeof bodyJson.focus === "string" ? bodyJson.focus.trim() : "";
  const mindSweepSnippets = Array.isArray(bodyJson.mindSweepSnippets)
    ? (bodyJson.mindSweepSnippets as unknown[])
        .filter((v): v is string => typeof v === "string")
        .slice(0, 5)
    : [];
  const selfProfileSummary =
    typeof bodyJson.selfProfileSummary === "string"
      ? bodyJson.selfProfileSummary.trim()
      : "";

  const quota = await assertQuoteAiQuota(ctx, "inspire");
  if (!quota.ok) return quota.response;

  const apiKeyRes = getQuoteAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  const contextText = [
    focus ? `Top of mind: ${focus}` : "",
    mindSweepSnippets.length
      ? `Recent reflections: ${mindSweepSnippets.join(" | ")}`
      : "",
    selfProfileSummary ? `About me: ${selfProfileSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    let matchQuote: Quote | null = null;

    if (contextText) {
      try {
        const queryEmbedding = await embedQueryText({
          apiKey: apiKeyRes.apiKey,
          text: contextText,
        });
        const { data: matches } = await ctx.supabase.rpc("match_quotes", {
          query_embedding: queryEmbedding as unknown as string,
          match_count: 1,
          match_threshold: 0.1,
        });
        if (Array.isArray(matches) && matches.length > 0) {
          const top = matches[0];
          const { data: full } = await ctx.supabase
            .from("quotes")
            .select("*")
            .eq("id", top.id)
            .single();
          if (full) matchQuote = full as Quote;
        }
      } catch {
        /* Fall through to favorite-based pick below. */
      }
    }

    if (!matchQuote) {
      const { data: favorites } = await ctx.supabase
        .from("quotes")
        .select("*")
        .eq("is_favorite", true)
        .limit(50);
      const pool = (favorites ?? []) as Quote[];
      if (pool.length > 0) {
        matchQuote = pool[Math.floor(Math.random() * pool.length)];
      } else {
        const { data: anyQuotes } = await ctx.supabase
          .from("quotes")
          .select("*")
          .limit(50);
        const all = (anyQuotes ?? []) as Quote[];
        if (all.length > 0) {
          matchQuote = all[Math.floor(Math.random() * all.length)];
        }
      }
    }

    if (!matchQuote) {
      return NextResponse.json({
        quote: null,
        reason: "Your library is still empty — add a quote that moved you recently and I'll surface it when you need it.",
      });
    }

    let reason = "This one feels close to where you are right now.";
    try {
      const { data } = await fetchGeminiStructured<unknown>({
        apiKey: apiKeyRes.apiKey,
        model: getGeminiHabitsFlashModel(),
        systemInstruction: [
          `You are a reflective companion. Given a quote from the user's library and a small amount of context about what's on their mind, write a short sentence or two (max 60 words) on why this quote resonates right now.`,
          `Never invent facts about the user. Never prescribe. Gentle second person. No hedging phrases like "perhaps" repeated more than once.`,
        ].join("\n"),
        userText: [
          `Context:`,
          contextText || "(no context provided)",
          ``,
          `Quote:`,
          `"${matchQuote.quote_text}"`,
          matchQuote.source_author ? `— ${matchQuote.source_author}` : "",
        ].join("\n"),
        responseSchema: REASON_GEMINI_SCHEMA,
        temperature: 0.7,
        maxOutputTokens: 256,
        timeoutMs: 20_000,
      });
      const parsed = ReasonSchema.parse(data);
      reason = parsed.reason;
    } catch {
      /* Keep the fallback reason. */
    }

    await recordQuoteAiUsage(ctx, "inspire");

    return NextResponse.json({
      quote: matchQuote,
      reason,
    });
  } catch (e) {
    return quoteAiError(e);
  }
}
