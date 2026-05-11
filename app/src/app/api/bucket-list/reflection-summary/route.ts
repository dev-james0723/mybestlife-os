/**
 * POST /api/bucket-list/reflection-summary
 *
 * Turn a user's raw reflection text (after completing a dream) into a short,
 * warm memory summary.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assertBucketAiQuota,
  bucketAiError,
  getBucketAiKeyOrFail,
  recordBucketAiUsage,
  requireBucketAiContext,
} from "@/lib/ai/bucket-list/bucket-ai";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";

export const runtime = "nodejs";

const SummarySchema = z.object({
  summary: z.string().min(20).max(600),
  title_suggestion: z.string().min(3).max(80).optional().nullable(),
});

const SUMMARY_GEMINI_SCHEMA = {
  type: "object",
  required: ["summary"],
  properties: {
    summary: { type: "string" },
    title_suggestion: { type: "string" },
  },
};

export async function POST(request: Request) {
  const auth = await requireBucketAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const dreamTitle =
    typeof bodyJson.dream_title === "string"
      ? bodyJson.dream_title.trim()
      : "";
  const reflection =
    typeof bodyJson.reflection_text === "string"
      ? bodyJson.reflection_text.trim()
      : "";
  const mood =
    typeof bodyJson.mood === "string" ? bodyJson.mood.trim() : "";

  if (!reflection || reflection.length < 20) {
    return NextResponse.json(
      { error: "reflection_too_short" },
      { status: 400 },
    );
  }

  const quota = await assertBucketAiQuota(ctx, "reflection_summary");
  if (!quota.ok) return quota.response;

  const apiKeyRes = getBucketAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const { data } = await fetchGeminiStructured<unknown>({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction: [
        "You write short, warm memory summaries for a personal life journal.",
        "Mirror the user's voice; don't sensationalise. 2–4 sentences max (about 60 words).",
        "Don't invent facts. If mood is provided, honour its emotional register.",
        "Also suggest a short (≤ 6-word) title that could headline the memory.",
      ].join("\n"),
      userText: [
        dreamTitle ? `Dream: ${dreamTitle}` : "",
        mood ? `Mood: ${mood}` : "",
        "",
        "Reflection:",
        reflection.slice(0, 4000),
      ]
        .filter(Boolean)
        .join("\n"),
      responseSchema: SUMMARY_GEMINI_SCHEMA,
      temperature: 0.55,
      maxOutputTokens: 512,
      timeoutMs: 20_000,
    });

    const parsed = SummarySchema.parse(data);

    await recordBucketAiUsage(ctx, "reflection_summary");

    return NextResponse.json({
      summary: parsed.summary,
      title_suggestion: parsed.title_suggestion ?? null,
    });
  } catch (err) {
    return bucketAiError(err);
  }
}
