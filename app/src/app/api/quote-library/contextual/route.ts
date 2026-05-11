/**
 * POST /api/quote-library/contextual
 *
 * SDK entry: `generateContextualQuote`. Uses Gemini with Google Search
 * grounding to find a REAL quote that matches the user's mind-sweep context.
 * The response is NEVER the user's own library — this surface is "external
 * wisdom for the moment" (spec 2.7).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertQuoteAiQuota,
  getQuoteAiKeyOrFail,
  quoteAiError,
  recordQuoteAiUsage,
  requireQuoteAiContext,
} from "@/lib/ai/quote-library/quote-ai";
import {
  fetchGeminiGroundedText,
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  getGeminiHabitsProModel,
} from "@/lib/ai/gemini-text";

export const runtime = "nodejs";

const ContextualResponseSchema = z.object({
  quote_text: z.string().min(5).max(600),
  source_author: z.string().max(200).nullable(),
  source_context: z.string().max(400).nullable(),
  reason: z.string().min(10).max(400),
  confidence: z.number().min(0).max(1),
});

const CONTEXTUAL_GEMINI_SCHEMA = {
  type: "object",
  required: ["quote_text", "source_author", "reason", "confidence"],
  properties: {
    quote_text: { type: "string" },
    source_author: { type: "string" },
    source_context: { type: "string" },
    reason: { type: "string" },
    confidence: { type: "number" },
  },
};

export async function POST(request: Request) {
  const auth = await requireQuoteAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const context =
    typeof bodyJson.context === "string" ? bodyJson.context.trim() : "";
  if (!context) {
    return NextResponse.json({ error: "missing_context" }, { status: 400 });
  }
  if (context.length > 4000) {
    return NextResponse.json({ error: "context_too_long" }, { status: 413 });
  }

  const quota = await assertQuoteAiQuota(ctx, "inspire");
  if (!quota.ok) return quota.response;

  const apiKeyRes = getQuoteAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    // Call 1: grounded search — gather 2–3 candidate quotes + attributions.
    const research = await fetchGeminiGroundedText({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsProModel(),
      systemInstruction: [
        `You find ONE real, well-attributed quote that resonates with a user's current state of mind.`,
        ``,
        `Use live web search to confirm the quote wording and the author. Prefer quotes that are widely documented.`,
        ``,
        `Return plain text in the structure:`,
        `  QUOTE: "<exact wording>"`,
        `  AUTHOR: <author name or UNKNOWN>`,
        `  SOURCE: <book / essay / year, if available — else UNKNOWN>`,
        `  REASON: <1–2 sentences on why this quote fits the user's context. Warm, gentle, non-prescriptive.>`,
        `  CONFIDENCE: <0.0 – 1.0>`,
        ``,
        `Never fabricate. If you cannot verify, write UNKNOWN + set confidence below 0.3.`,
      ].join("\n"),
      userText: `User's current state:\n${context}`,
      temperature: 0.6,
      maxOutputTokens: 2048,
      timeoutMs: 60_000,
    });

    // Call 2: extract structured shape.
    const extraction = await fetchGeminiStructured<unknown>({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction: [
        `You extract a JSON object from a research brief about a single quote.`,
        `Never invent. If a field in the brief is UNKNOWN, set that JSON field to null and drop confidence to ≤ 0.3.`,
      ].join("\n"),
      userText: `Research brief:\n${research.text}\n\nExtract the JSON now.`,
      responseSchema: CONTEXTUAL_GEMINI_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 1024,
      timeoutMs: 30_000,
    });

    const parsed = ContextualResponseSchema.parse(extraction.data);
    await recordQuoteAiUsage(ctx, "inspire");
    return NextResponse.json(parsed);
  } catch (e) {
    return quoteAiError(e);
  }
}
