/**
 * POST /api/bucket-list/memory-reflection
 *
 * Turns a user's completion reflection into a structured "life memory" —
 * what happened, why it mattered, what changed, what was learned, the life
 * chapter it belongs to, and what it unlocked.
 *
 * Strict rule: this is an INTERPRETATION of the user's own words + the dream's
 * recorded details. It must never invent events, places, people, or feelings
 * the user did not express. Interpretive framing only ("this may suggest…").
 *
 * The route does not persist; the reflection wizard saves the result onto the
 * reflection row after the user confirms. Suggestions only.
 *
 * Request body: { bucketItemId, reflectionText, mood?, changedMe?, locale? }
 * Response (200): { memory: BucketDreamMemory }
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
import type { BucketDreamMemory, BucketItem } from "@/types/bucket-list";

export const runtime = "nodejs";
export const maxDuration = 60;

const MemorySchema = z.object({
  summary: z.string().min(4).max(280),
  whatHappened: z.string().min(2).max(800),
  whyItMattered: z.string().min(2).max(800),
  whatChanged: z.string().min(2).max(800),
  whatLearned: z.string().min(2).max(800),
  lifeChapter: z.string().min(2).max(200),
  whatUnlocked: z.string().min(2).max(800),
});

const MEMORY_GEMINI_SCHEMA = {
  type: "object",
  required: [
    "summary",
    "whatHappened",
    "whyItMattered",
    "whatChanged",
    "whatLearned",
    "lifeChapter",
    "whatUnlocked",
  ],
  properties: {
    summary: { type: "string" },
    whatHappened: { type: "string" },
    whyItMattered: { type: "string" },
    whatChanged: { type: "string" },
    whatLearned: { type: "string" },
    lifeChapter: { type: "string" },
    whatUnlocked: { type: "string" },
  },
};

export async function POST(request: Request) {
  const auth = await requireBucketAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const bucketItemId =
    typeof bodyJson.bucketItemId === "string" ? bodyJson.bucketItemId.trim() : "";
  const reflectionText =
    typeof bodyJson.reflectionText === "string" ? bodyJson.reflectionText.trim() : "";
  const mood = typeof bodyJson.mood === "string" ? bodyJson.mood.trim() : "";
  const changedMe =
    typeof bodyJson.changedMe === "string" ? bodyJson.changedMe.trim() : "";

  if (!bucketItemId) {
    return NextResponse.json({ error: "missing_bucket_item_id" }, { status: 400 });
  }
  if (reflectionText.length < 12 && changedMe.length < 12) {
    return NextResponse.json(
      { error: "reflection_too_short" },
      { status: 400 },
    );
  }

  const { data: row } = await ctx.supabase
    .from("bucket_items")
    .select("id,title,type,why_this_matters,description")
    .eq("id", bucketItemId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const item = row as Pick<
    BucketItem,
    "id" | "title" | "type" | "why_this_matters" | "description"
  >;

  const quota = await assertBucketAiQuota(ctx, "reflection_summary");
  if (!quota.ok) return quota.response;

  const apiKeyRes = getBucketAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  const systemInstruction = [
    "You help a person turn their reflection on a completed life dream into a warm, honest memory.",
    "CRITICAL: use ONLY what the user wrote and the dream's recorded details. Never invent events, places, people, dates, or feelings they did not express.",
    "If the reflection is sparse, keep each field short and grounded — do not embellish.",
    "Frame any interpretation tentatively ('this may suggest…', 'it seems…'). Never claim certainty ('this proves…').",
    "Warm, second-person, concise. No clichés.",
  ].join("\n");

  const userText = [
    `Respond in language code: ${ctx.language}.`,
    "",
    `Dream: "${item.title}" (type: ${item.type}).`,
    item.why_this_matters ? `Why it mattered to them (before): ${item.why_this_matters}` : "",
    "",
    "Their reflection now that it's complete:",
    reflectionText || "(none written)",
    mood ? `Mood: ${mood}` : "",
    changedMe ? `What they said changed in them: ${changedMe}` : "",
    "",
    "Write the memory fields. Keep `summary` to a single evocative sentence.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { data } = await fetchGeminiStructured<unknown>({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction,
      userText,
      responseSchema: MEMORY_GEMINI_SCHEMA,
      temperature: 0.5,
      maxOutputTokens: 1200,
      timeoutMs: 30_000,
    });

    const parsed = MemorySchema.parse(data);
    await recordBucketAiUsage(ctx, "reflection_summary");

    const memory: BucketDreamMemory = { ...parsed };
    return NextResponse.json({ memory });
  } catch (err) {
    return bucketAiError(err);
  }
}
