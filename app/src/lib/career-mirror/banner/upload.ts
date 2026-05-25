/**
 * Supabase Storage helpers for AI Career Mirror identity banners.
 *
 * Bucket: `career-banners` (public read, owner-write — see migration
 * 20260526000000_career_mirror.sql). Path convention:
 *   `{userId}/banner-v{n}.{ext}`.
 *
 * Mirrors the quote-thumbnail upload helper (`upsert`, immutable cache, public
 * URL), but versions by an incrementing integer `n` rather than a pipeline tag.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const CAREER_BANNER_BUCKET = "career-banners";

export type UploadedBanner = {
  storagePath: string;
  publicUrl: string;
  version: number;
};

/** mime → file extension (svg supported here because fallbacks ship SVG). */
function bannerMimeToExt(mime: string): "png" | "jpg" | "webp" | "svg" {
  const m = mime.toLowerCase();
  if (m.includes("svg")) return "svg";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  return "png";
}

/**
 * Next free banner version for a user (highest existing `banner-v{n}` + 1).
 * Best-effort: returns 1 when the prefix can't be listed.
 */
export async function nextBannerVersion(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data: list, error } = await supabase.storage
    .from(CAREER_BANNER_BUCKET)
    .list(userId);
  if (error || !list || list.length === 0) return 1;

  let max = 0;
  for (const entry of list) {
    const m = /^banner-v(\d+)\./.exec(entry.name);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max + 1;
}

/**
 * Upload a rendered banner to the `career-banners` bucket and return its public
 * URL. Resolves the next version automatically when one isn't supplied.
 */
export async function uploadCareerBannerToSupabase(params: {
  supabase: SupabaseClient;
  userId: string;
  bytes: Uint8Array | Blob;
  mimeType: string;
  version?: number;
}): Promise<UploadedBanner> {
  const version =
    params.version ?? (await nextBannerVersion(params.supabase, params.userId));
  const ext = bannerMimeToExt(params.mimeType);
  const storagePath = `${params.userId}/banner-v${version}.${ext}`;

  const { error: uploadError } = await params.supabase.storage
    .from(CAREER_BANNER_BUCKET)
    .upload(storagePath, params.bytes, {
      contentType: params.mimeType,
      upsert: true,
      cacheControl: "31536000, immutable",
    });
  if (uploadError) {
    throw new Error(`storage_upload_failed: ${uploadError.message}`);
  }

  const { data: urlData } = params.supabase.storage
    .from(CAREER_BANNER_BUCKET)
    .getPublicUrl(storagePath);

  if (!urlData?.publicUrl) {
    throw new Error("storage_public_url_missing");
  }

  return { storagePath, publicUrl: urlData.publicUrl, version };
}
