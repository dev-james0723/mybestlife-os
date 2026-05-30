/**
 * POST /api/ai/assets/upload-image
 *
 * Stores a user-uploaded asset photo (product / serial-number / condition) in
 * the public `asset-images` bucket and records it in `asset_images`. Unlike
 * generate-image this is the *evidence* layer — real photos the user took.
 *
 * Request body: { assetId, data (base64), mimeType, imageType?, makePrimary? }
 */

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mimeToExt } from "@/lib/quote-library/thumbnail/image";
import { ASSET_IMAGE_TYPES, type AssetImageType } from "@/types/asset-intelligence";

export const runtime = "nodejs";

const ASSET_IMAGE_BUCKET = "asset-images";
const MAX_BYTES = 10_000_000;
const ALLOWED_MIME = /^image\/(jpeg|png|webp|gif)$/i;

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

  const assetId = typeof body.assetId === "string" ? body.assetId.trim() : "";
  const data = typeof body.data === "string" ? body.data : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  const imageType: AssetImageType = ASSET_IMAGE_TYPES.includes(
    body.imageType as AssetImageType,
  )
    ? (body.imageType as AssetImageType)
    : "uploaded_product_photo";
  const makePrimary = body.makePrimary === true;

  if (!assetId) {
    return NextResponse.json({ error: "missing_asset_id" }, { status: 400 });
  }
  if (!data || !ALLOWED_MIME.test(mimeType)) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  const bytes = Buffer.from(data, "base64");
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    return NextResponse.json({ error: "image_too_large" }, { status: 413 });
  }

  // Ownership check (RLS also enforces).
  const { data: asset } = await supabase
    .from("assets")
    .select("id")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset) {
    return NextResponse.json({ error: "asset_not_found" }, { status: 404 });
  }

  const ext = mimeToExt(mimeType);
  const storagePath = `${user.id}/${assetId}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(ASSET_IMAGE_BUCKET)
    .upload(storagePath, bytes, {
      contentType: mimeType,
      upsert: true,
      cacheControl: "31536000, immutable",
    });
  if (uploadError) {
    return NextResponse.json(
      { error: "upload_failed", detail: uploadError.message },
      { status: 502 },
    );
  }

  const { data: urlData } = supabase.storage
    .from(ASSET_IMAGE_BUCKET)
    .getPublicUrl(storagePath);

  let isPrimary = makePrimary;
  if (!makePrimary) {
    const { data: existingPrimary } = await supabase
      .from("asset_images")
      .select("id")
      .eq("asset_id", assetId)
      .eq("is_primary", true)
      .maybeSingle();
    isPrimary = !existingPrimary;
  } else {
    // Clear any current primary first.
    await supabase
      .from("asset_images")
      .update({ is_primary: false, updated_at: new Date().toISOString() })
      .eq("asset_id", assetId)
      .eq("is_primary", true);
  }

  const { data: row, error: insertError } = await supabase
    .from("asset_images")
    .insert({
      user_id: user.id,
      asset_id: assetId,
      image_url: urlData.publicUrl,
      storage_path: storagePath,
      image_type: imageType,
      is_primary: isPrimary,
    })
    .select()
    .single();
  if (insertError) {
    return NextResponse.json(
      { error: "record_failed", detail: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ image: row });
}
