/**
 * POST /api/bucket-list/analyze-inspiration
 *
 * Reads an uploaded inspiration / screenshot / article image and returns
 * caption + dream hints + *suggested* bucket updates. Suggestions only — the
 * user reviews and confirms before anything is written to their dream.
 *
 * Request body: { imageUrl, bucketItemId?, userNote?, locale? }
 * Response (200): { analysis: BucketInspirationAnalysis }
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
  fetchGeminiStructuredFromParts,
  getGeminiHabitsFlashModel,
  type GeminiStructuredPart,
} from "@/lib/ai/gemini-text";
import { decodeImageInput } from "@/lib/ai/bucket-list/image-input";
import {
  BUCKET_TYPES,
  type BucketInspirationAnalysis,
  type CreateBucketItemInput,
} from "@/types/bucket-list";

export const runtime = "nodejs";
export const maxDuration = 60;

const AnalysisSchema = z.object({
  suggestedCaption: z.string().min(1).max(240),
  extractedDreamHints: z.object({
    destination: z.string().max(160).optional().nullable(),
    activity: z.string().max(160).optional().nullable(),
    mood: z.string().max(80).optional().nullable(),
    season: z.string().max(80).optional().nullable(),
    style: z.string().max(80).optional().nullable(),
    tags: z.array(z.string().min(1).max(40)).max(12).optional(),
  }),
  suggestedBucketUpdates: z
    .object({
      title: z.string().min(2).max(200).optional().nullable(),
      type: z.enum(BUCKET_TYPES).optional().nullable(),
      why_this_matters: z.string().max(1200).optional().nullable(),
      destination_name: z.string().max(160).optional().nullable(),
      destination_country: z.string().max(160).optional().nullable(),
      destination_city: z.string().max(160).optional().nullable(),
      best_season: z.string().max(120).optional().nullable(),
      category_tags: z.array(z.string().min(1).max(40)).max(12).optional(),
      target_month: z
        .string()
        .regex(/^\d{4}-\d{2}$/u)
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
  confidence: z.number().min(0).max(1).optional(),
  warnings: z.array(z.string().min(1).max(240)).max(12).optional(),
});

const ANALYSIS_GEMINI_SCHEMA = {
  type: "object",
  required: ["suggestedCaption", "extractedDreamHints"],
  properties: {
    suggestedCaption: { type: "string" },
    extractedDreamHints: {
      type: "object",
      properties: {
        destination: { type: "string" },
        activity: { type: "string" },
        mood: { type: "string" },
        season: { type: "string" },
        style: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
    },
    suggestedBucketUpdates: {
      type: "object",
      properties: {
        title: { type: "string" },
        type: { type: "string", enum: BUCKET_TYPES as readonly string[] },
        why_this_matters: { type: "string" },
        destination_name: { type: "string" },
        destination_country: { type: "string" },
        destination_city: { type: "string" },
        best_season: { type: "string" },
        category_tags: { type: "array", items: { type: "string" } },
        target_month: { type: "string" },
      },
    },
    confidence: { type: "number" },
    warnings: { type: "array", items: { type: "string" } },
  },
};

function cleanUpdates(
  updates: z.infer<typeof AnalysisSchema>["suggestedBucketUpdates"],
): Partial<CreateBucketItemInput> | null {
  if (!updates) return null;
  const out: Partial<CreateBucketItemInput> = {};
  if (updates.title) out.title = updates.title;
  if (updates.type) out.type = updates.type;
  if (updates.why_this_matters) out.why_this_matters = updates.why_this_matters;
  if (updates.destination_name) out.destination_name = updates.destination_name;
  if (updates.destination_country)
    out.destination_country = updates.destination_country;
  if (updates.destination_city) out.destination_city = updates.destination_city;
  if (updates.best_season) out.best_season = updates.best_season;
  if (updates.category_tags && updates.category_tags.length > 0)
    out.category_tags = updates.category_tags;
  if (updates.target_month) out.target_month = updates.target_month;
  return Object.keys(out).length > 0 ? out : null;
}

export async function POST(request: Request) {
  const auth = await requireBucketAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const imageUrl =
    typeof bodyJson.imageUrl === "string" ? bodyJson.imageUrl.trim() : "";
  const userNote =
    typeof bodyJson.userNote === "string" ? bodyJson.userNote.trim().slice(0, 600) : "";

  if (!imageUrl) {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }

  const quota = await assertBucketAiQuota(ctx, "inspire");
  if (!quota.ok) return quota.response;

  const apiKeyRes = getBucketAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  let decoded;
  try {
    decoded = await decodeImageInput(imageUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "image_too_large" ? 413 : 400;
    return NextResponse.json({ error: "invalid_image", detail: msg }, { status });
  }

  const systemInstruction = [
    "You analyze an inspiration image a person saved for a life 'bucket list' dream.",
    "Describe what you actually see — never invent specifics that are not visible.",
    "Return a short, warm `suggestedCaption`, structured `extractedDreamHints`, and optional `suggestedBucketUpdates` the user can choose to apply.",
    "If you are unsure about a place or fact, leave it out and add a brief note to `warnings`.",
    `Respond in language code: ${ctx.language}.`,
  ].join("\n");

  const parts: GeminiStructuredPart[] = [
    {
      text: userNote
        ? `User note about this image: ${userNote}`
        : "Analyze this inspiration image for a bucket-list dream.",
    },
    { inlineData: { mimeType: decoded.mimeType, data: decoded.base64 } },
  ];

  try {
    const { data } = await fetchGeminiStructuredFromParts<unknown>({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction,
      userParts: parts,
      responseSchema: ANALYSIS_GEMINI_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 1536,
      timeoutMs: 45_000,
    });

    const parsed = AnalysisSchema.parse(data);

    await recordBucketAiUsage(ctx, "inspire");

    const analysis: BucketInspirationAnalysis = {
      suggestedCaption: parsed.suggestedCaption.trim(),
      extractedDreamHints: {
        destination: parsed.extractedDreamHints.destination ?? null,
        activity: parsed.extractedDreamHints.activity ?? null,
        mood: parsed.extractedDreamHints.mood ?? null,
        season: parsed.extractedDreamHints.season ?? null,
        style: parsed.extractedDreamHints.style ?? null,
        tags: parsed.extractedDreamHints.tags ?? [],
      },
      suggestedBucketUpdates: cleanUpdates(parsed.suggestedBucketUpdates),
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.6,
      warnings: parsed.warnings ?? [],
    };

    return NextResponse.json({ analysis });
  } catch (err) {
    return bucketAiError(err);
  }
}
