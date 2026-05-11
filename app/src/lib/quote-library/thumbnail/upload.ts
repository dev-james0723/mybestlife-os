/**
 * Supabase Storage helpers for quote thumbnails.
 *
 * Bucket: `quote-thumbnails` (public read, owner-write — see migration
 * 20260702000000_quote_library_thumbnails.sql). Path convention:
 *   `{user_id}/{quote_id}/thumbnail-v{version}.{ext}`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { mimeToExt } from "@/lib/quote-library/thumbnail/image";

export const QUOTE_THUMBNAIL_BUCKET = "quote-thumbnails";

/**
 * Current logical version of the prompt + image pipeline. Bump whenever the
 * prompt template or downstream image model changes meaningfully — keeps the
 * stored `thumbnail_version` field useful for future backfills.
 */
export const QUOTE_THUMBNAIL_PIPELINE_VERSION = "v1";

export type UploadedThumbnail = {
  storagePath: string;
  publicUrl: string;
  version: string;
};

export type UploadQuoteThumbnailParams = {
  supabase: SupabaseClient;
  userId: string;
  quoteId: string;
  bytes: Uint8Array;
  mimeType: string;
  /** Defaults to {@link QUOTE_THUMBNAIL_PIPELINE_VERSION}. */
  version?: string;
};

/**
 * Upload the rendered thumbnail to the `quote-thumbnails` bucket and return
 * the public URL. Uses upsert so re-rolls overwrite cleanly.
 */
export async function uploadQuoteThumbnailToSupabase(
  params: UploadQuoteThumbnailParams,
): Promise<UploadedThumbnail> {
  const version = params.version ?? QUOTE_THUMBNAIL_PIPELINE_VERSION;
  const ext = mimeToExt(params.mimeType);
  const storagePath = `${params.userId}/${params.quoteId}/thumbnail-${version}.${ext}`;

  const { error: uploadError } = await params.supabase.storage
    .from(QUOTE_THUMBNAIL_BUCKET)
    .upload(storagePath, params.bytes, {
      contentType: params.mimeType,
      upsert: true,
      cacheControl: "31536000, immutable",
    });
  if (uploadError) {
    throw new Error(`storage_upload_failed: ${uploadError.message}`);
  }

  const { data: urlData } = params.supabase.storage
    .from(QUOTE_THUMBNAIL_BUCKET)
    .getPublicUrl(storagePath);

  if (!urlData?.publicUrl) {
    throw new Error("storage_public_url_missing");
  }

  return {
    storagePath,
    publicUrl: urlData.publicUrl,
    version,
  };
}

/**
 * Delete every thumbnail object underneath a quote's prefix. Called from
 * regenerate flows so we don't accumulate stale variants forever.
 */
export async function deleteQuoteThumbnailsForQuote(params: {
  supabase: SupabaseClient;
  userId: string;
  quoteId: string;
}): Promise<void> {
  const prefix = `${params.userId}/${params.quoteId}`;
  const { data: list, error: listError } = await params.supabase.storage
    .from(QUOTE_THUMBNAIL_BUCKET)
    .list(prefix);
  if (listError) {
    // Treat as best-effort cleanup — don't block the regenerate flow.
    return;
  }
  if (!list || list.length === 0) return;
  const paths = list.map((entry) => `${prefix}/${entry.name}`);
  await params.supabase.storage.from(QUOTE_THUMBNAIL_BUCKET).remove(paths);
}
