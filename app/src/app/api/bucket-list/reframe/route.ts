/**
 * POST /api/bucket-list/reframe
 *
 * Reframe an oversized / amorphous dream into 2–4 smaller, actionable versions
 * the user can start this quarter. Pure structured JSON — no search required.
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
import {
  BUCKET_TIME_HORIZONS,
  type BucketReframeResponse,
  type BucketTimeHorizon,
} from "@/types/bucket-list";

export const runtime = "nodejs";

const ReframeSchema = z.object({
  smaller_versions: z
    .array(
      z.object({
        title: z.string().min(3).max(140),
        description: z.string().min(10).max(600),
        estimated_cost: z.number().nonnegative().optional().nullable(),
        cost_currency: z
          .string()
          .regex(/^[A-Z]{3}$/u)
          .optional()
          .nullable(),
        time_horizon: z
          .enum(BUCKET_TIME_HORIZONS)
          .optional()
          .nullable(),
      }),
    )
    .min(2)
    .max(4),
});

const REFRAME_GEMINI_SCHEMA = {
  type: "object",
  required: ["smaller_versions"],
  properties: {
    smaller_versions: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        required: ["title", "description"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          estimated_cost: { type: "number" },
          cost_currency: { type: "string" },
          time_horizon: {
            type: "string",
            enum: BUCKET_TIME_HORIZONS as readonly string[],
          },
        },
      },
    },
  },
};

export async function POST(request: Request) {
  const auth = await requireBucketAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const title =
    typeof bodyJson.title === "string" ? bodyJson.title.trim() : "";
  const description =
    typeof bodyJson.description === "string" ? bodyJson.description.trim() : "";
  const whyMatters =
    typeof bodyJson.why_this_matters === "string"
      ? bodyJson.why_this_matters.trim()
      : "";
  const type =
    typeof bodyJson.type === "string" ? bodyJson.type.trim() : "lifestyle";
  const estimatedCost =
    typeof bodyJson.estimated_cost === "number"
      ? bodyJson.estimated_cost
      : null;

  if (!title) {
    return NextResponse.json({ error: "missing_title" }, { status: 400 });
  }

  const quota = await assertBucketAiQuota(ctx, "reframe");
  if (!quota.ok) return quota.response;

  const apiKeyRes = getBucketAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const { data } = await fetchGeminiStructured<unknown>({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction: [
        "You help people transform oversized life dreams into realistic, honest smaller versions.",
        "Offer 2–4 alternative framings that could be started this year. Each keeps the soul of the dream but is affordable, scoped, and motivating.",
        "Keep descriptions warm and concrete. Never shame the original dream.",
        "Prefer lower estimated_cost for alternatives unless the user's original cost was already low.",
      ].join("\n"),
      userText: [
        `Dream type: ${type}`,
        `Title: ${title}`,
        description ? `Description: ${description}` : "",
        whyMatters ? `Why it matters: ${whyMatters}` : "",
        estimatedCost ? `Current estimated cost: ${estimatedCost}` : "",
        "",
        "Propose 2–4 smaller-version alternatives (title + short description + estimated_cost + cost_currency + time_horizon).",
      ]
        .filter(Boolean)
        .join("\n"),
      responseSchema: REFRAME_GEMINI_SCHEMA,
      temperature: 0.6,
      maxOutputTokens: 2048,
      timeoutMs: 30_000,
    });

    const parsed = ReframeSchema.parse(data);

    await recordBucketAiUsage(ctx, "reframe");

    const response: BucketReframeResponse = {
      smaller_versions: parsed.smaller_versions.map((v) => ({
        title: v.title,
        description: v.description,
        estimated_cost: v.estimated_cost ?? null,
        cost_currency: v.cost_currency ?? null,
        time_horizon: (v.time_horizon ?? null) as BucketTimeHorizon | null,
      })),
      fetched_at: new Date().toISOString(),
    };

    const bucketId =
      typeof bodyJson.bucket_item_id === "string"
        ? bodyJson.bucket_item_id
        : null;
    if (bucketId) {
      await ctx.supabase
        .from("bucket_items")
        .update({ ai_reframe_suggestions: response })
        .eq("id", bucketId)
        .eq("user_id", ctx.userId);
    }

    return NextResponse.json({ response });
  } catch (err) {
    return bucketAiError(err);
  }
}
