/**
 * POST /api/ai/assets/generate-image
 *
 * Generates an ultra-realistic product visual for an asset via Gemini image
 * generation, stores it in the public `asset-images` bucket, and (when an
 * `assetId` is supplied) records it in `asset_images`. The generated image is
 * a visual placeholder, NOT proof of ownership.
 *
 * Request body:
 *   { assetName, brand?, model?, category_key?, visualStyle?, assetId? }
 * Response (200): { imageUrl, storagePath, prompt, modelUsed, imageType }
 */

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  generateQuoteThumbnailImage,
  mimeToExt,
  QuoteThumbnailImageError,
} from "@/lib/quote-library/thumbnail/image";
import { buildProductImagePrompt } from "@/lib/ai/prompts/assets/product-image";
import { isAssetCategoryKey } from "@/types/assets";
import type {
  AssetVisualStyle,
  GenerateAssetImageResponse,
} from "@/types/asset-intelligence";

export const runtime = "nodejs";
export const maxDuration = 60;

const ASSET_IMAGE_BUCKET = "asset-images";

const VALID_STYLES: AssetVisualStyle[] = [
  "ultra_realistic_product_photo",
  "clean_ecommerce",
  "minimal_studio",
  "premium_catalog",
];

function str(v: unknown, max = 200): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    const json = await req.json();
    if (json && typeof json === "object") body = json as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const assetName = str(body.assetName, 160);
  if (!assetName) {
    return NextResponse.json({ error: "missing_asset_name" }, { status: 400 });
  }
  const assetId = str(body.assetId, 80);
  const visualStyle = VALID_STYLES.includes(body.visualStyle as AssetVisualStyle)
    ? (body.visualStyle as AssetVisualStyle)
    : "ultra_realistic_product_photo";
  const categoryKey = isAssetCategoryKey(body.category_key)
    ? body.category_key
    : null;

  const prompt = buildProductImagePrompt({
    assetName,
    brand: str(body.brand, 80) ?? null,
    model: str(body.model, 120) ?? null,
    categoryKey,
    visualStyle,
  });

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Image generation is not configured. Set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY on the server.",
      },
      { status: 503 },
    );
  }

  try {
    const generated = await generateQuoteThumbnailImage({
      apiKey,
      prompt,
      primaryModel: process.env.GEMINI_ASSET_IMAGE_MODEL,
    });
    const ext = mimeToExt(generated.mimeType);
    const folder = assetId ?? "drafts";
    const storagePath = `${user.id}/${folder}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(ASSET_IMAGE_BUCKET)
      .upload(storagePath, generated.bytes, {
        contentType: generated.mimeType,
        upsert: true,
        cacheControl: "31536000, immutable",
      });
    if (uploadError) {
      throw new Error(`asset_image_upload_failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(ASSET_IMAGE_BUCKET)
      .getPublicUrl(storagePath);
    if (!urlData.publicUrl) throw new Error("asset_image_public_url_missing");

    // Persist a row when we have a real asset. Make it primary if the asset has
    // no primary image yet.
    if (assetId) {
      const { data: existingPrimary } = await supabase
        .from("asset_images")
        .select("id")
        .eq("asset_id", assetId)
        .eq("is_primary", true)
        .maybeSingle();

      const { error: insertError } = await supabase.from("asset_images").insert({
        user_id: user.id,
        asset_id: assetId,
        image_url: urlData.publicUrl,
        storage_path: storagePath,
        image_type: "generated_product_image",
        prompt,
        model_used: generated.modelUsed,
        is_primary: !existingPrimary,
      });
      if (insertError) throw insertError;
    }

    const response: GenerateAssetImageResponse = {
      imageUrl: urlData.publicUrl,
      storagePath,
      prompt,
      modelUsed: generated.modelUsed,
      imageType: "generated_product_image",
    };
    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof QuoteThumbnailImageError) {
      return NextResponse.json(
        { error: "asset_image_generation_failed", detail: e.message.slice(0, 600) },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 },
      );
    }
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "asset_image_generation_failed", detail: detail.slice(0, 600) },
      { status: 502 },
    );
  }
}
