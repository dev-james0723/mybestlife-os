/**
 * POST /api/bucket-list/generate-cover-image
 *
 * Generates an AI dream visual for a bucket item via Gemini image generation,
 * stores it in the public `bucket-dream-images` bucket, and records it in
 * `bucket_dream_images` (image_type 'generated_visual', source_type 'generated').
 *
 * The generated image is a visual concept, not a real photo. Provenance is
 * stored internally via `cover_image_is_ai` / source_type.
 *
 * Request body:
 *   { bucketItemId, title, type, destination?, style?, setAsCover?, locale? }
 * Response (200): { imageUrl, prompt, modelUsed }
 */

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import {
  assertBucketAiQuota,
  bucketAiError,
  recordBucketAiUsage,
  requireBucketAiContext,
} from "@/lib/ai/bucket-list/bucket-ai";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  generateQuoteThumbnailImage,
  mimeToExt,
  QuoteThumbnailImageError,
} from "@/lib/quote-library/thumbnail/image";
import { BUCKET_DREAM_IMAGE_BUCKET } from "@/lib/repositories/bucket-list";
import {
  BUCKET_COVER_IMAGE_STYLES,
  BUCKET_TYPES,
  type BucketCoverImageStyle,
  type BucketType,
} from "@/types/bucket-list";

export const runtime = "nodejs";
export const maxDuration = 60;

const STYLE_DESCRIPTORS: Record<BucketCoverImageStyle, string> = {
  realistic_travel:
    "ultra-realistic travel photograph, natural light, photojournalistic, true-to-life colors",
  cinematic:
    "cinematic still, dramatic lighting, shallow depth of field, film grain, widescreen mood",
  dreamy:
    "dreamy ethereal atmosphere, soft glow, pastel tones, gentle haze, aspirational",
  minimal_editorial:
    "minimal editorial photography, clean composition, lots of negative space, muted palette",
  luxury_magazine:
    "luxury magazine cover aesthetic, rich textures, elegant, high-end travel feature look",
};

const TYPE_SCENE: Record<BucketType, string> = {
  travel: "a breathtaking destination scene that evokes wanderlust",
  achievement: "a triumphant, motivating scene representing accomplishment",
  growth: "a serene, hopeful scene representing personal growth and learning",
  relationship: "a warm, heartfelt scene representing connection and togetherness",
  purchase: "an aspirational hero shot of the desired item in a beautiful setting",
  lifestyle: "a calm, inspiring lifestyle scene representing the desired way of living",
};

function buildCoverPrompt(params: {
  title: string;
  type: BucketType;
  destination?: string;
  style: BucketCoverImageStyle;
}): string {
  return [
    `Create a beautiful, inspiring cover image for a personal "bucket list" dream.`,
    `Dream: "${params.title}".`,
    params.destination ? `Location / subject: ${params.destination}.` : "",
    `Scene: ${TYPE_SCENE[params.type]}.`,
    `Style: ${STYLE_DESCRIPTORS[params.style]}.`,
    `Wide landscape composition suitable as a card background. No text, no watermarks, no logos, no people's faces in focus.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function POST(request: Request) {
  const auth = await requireBucketAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const bucketItemId =
    typeof bodyJson.bucketItemId === "string" ? bodyJson.bucketItemId.trim() : "";
  const title = typeof bodyJson.title === "string" ? bodyJson.title.trim() : "";
  const type = (BUCKET_TYPES as readonly string[]).includes(
    bodyJson.type as string,
  )
    ? (bodyJson.type as BucketType)
    : "travel";
  const destination =
    typeof bodyJson.destination === "string" && bodyJson.destination.trim()
      ? bodyJson.destination.trim().slice(0, 160)
      : undefined;
  const style: BucketCoverImageStyle = (
    BUCKET_COVER_IMAGE_STYLES as readonly string[]
  ).includes(bodyJson.style as string)
    ? (bodyJson.style as BucketCoverImageStyle)
    : "realistic_travel";
  // Phase 9 safety: generated visuals are saved to the gallery for review by
  // default. The caller must explicitly ask to apply one as the cover.
  const setAsCover = bodyJson.setAsCover === true;

  if (!bucketItemId || !title) {
    return NextResponse.json(
      { error: "missing_fields", detail: "bucketItemId and title are required." },
      { status: 400 },
    );
  }

  // Ownership check (RLS also enforces on every write below).
  const { data: owned } = await ctx.supabase
    .from("bucket_items")
    .select("id")
    .eq("id", bucketItemId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!owned) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const quota = await assertBucketAiQuota(ctx, "inspire");
  if (!quota.ok) return quota.response;

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    // Graceful, honest fallback — we never fake a generated image.
    return NextResponse.json(
      { error: "image_generation_unavailable" },
      { status: 503 },
    );
  }

  const prompt = buildCoverPrompt({ title, type, destination, style });

  try {
    const generated = await generateQuoteThumbnailImage({
      apiKey,
      prompt,
      primaryModel: process.env.GEMINI_BUCKET_IMAGE_MODEL,
    });

    const ext = mimeToExt(generated.mimeType);
    const storagePath = `${ctx.userId}/${bucketItemId}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await ctx.supabase.storage
      .from(BUCKET_DREAM_IMAGE_BUCKET)
      .upload(storagePath, generated.bytes, {
        contentType: generated.mimeType,
        upsert: true,
        cacheControl: "31536000, immutable",
      });
    if (uploadError) {
      throw new Error(`dream_image_upload_failed: ${uploadError.message}`);
    }

    const { data: urlData } = ctx.supabase.storage
      .from(BUCKET_DREAM_IMAGE_BUCKET)
      .getPublicUrl(storagePath);
    const imageUrl = urlData.publicUrl;

    // When this generated visual becomes the cover, clear any existing primary
    // first (one-primary unique index), then record + sync the dream cover.
    if (setAsCover) {
      await ctx.supabase
        .from("bucket_dream_images")
        .update({ is_primary: false })
        .eq("bucket_item_id", bucketItemId)
        .eq("is_primary", true);
    }

    const { error: insertError } = await ctx.supabase
      .from("bucket_dream_images")
      .insert({
        user_id: ctx.userId,
        bucket_item_id: bucketItemId,
        image_url: imageUrl,
        image_type: "generated_visual",
        source_type: "generated",
        prompt,
        model_used: generated.modelUsed,
        is_primary: setAsCover,
      });
    if (insertError) throw insertError;

    if (setAsCover) {
      await ctx.supabase
        .from("bucket_items")
        .update({ cover_image_url: imageUrl, cover_image_is_ai: true })
        .eq("id", bucketItemId)
        .eq("user_id", ctx.userId);
    }

    await recordBucketAiUsage(ctx, "inspire");

    return NextResponse.json({
      imageUrl,
      prompt,
      modelUsed: generated.modelUsed,
    });
  } catch (e) {
    if (e instanceof QuoteThumbnailImageError) {
      return NextResponse.json(
        { error: "image_generation_failed", detail: e.message.slice(0, 500) },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 },
      );
    }
    return bucketAiError(e);
  }
}
