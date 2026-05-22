/**
 * Server-side helpers that upload AI media into the journal Storage buckets
 * and return a signed URL (valid for `SIGNED_URL_TTL_SECONDS`).
 *
 * All paths follow `{user_id}/{entry_id}-{timestamp}.{ext}`. RLS policies
 * (see `20270704000100_journal_storage_buckets.sql`) restrict access to the
 * owning user, so we MUST use the authenticated server client (NOT the
 * service-role client) so `auth.uid()` resolves correctly.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  JOURNAL_AUDIO_BUCKET,
  JOURNAL_ILLUSTRATIONS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "./constants";

function imageExtFromMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "png";
}

function audioExtFromMime(mime: string): string {
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("webm")) return "webm";
  return "wav";
}

export async function uploadJournalIllustration(params: {
  supabase: SupabaseClient;
  userId: string;
  entryId: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<{ path: string; signedUrl: string }> {
  const ext = imageExtFromMime(params.mimeType);
  const timestamp = Date.now();
  const path = `${params.userId}/${params.entryId}-${timestamp}.${ext}`;

  const { error: upErr } = await params.supabase.storage
    .from(JOURNAL_ILLUSTRATIONS_BUCKET)
    .upload(path, params.bytes, {
      contentType: params.mimeType || "image/png",
      upsert: false,
    });
  if (upErr) {
    throw new Error(`storage_upload_failed: ${upErr.message}`);
  }

  const { data: signed, error: signErr } = await params.supabase.storage
    .from(JOURNAL_ILLUSTRATIONS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) {
    throw new Error(
      `storage_signed_url_failed: ${signErr?.message ?? "no url"}`,
    );
  }
  return { path, signedUrl: signed.signedUrl };
}

export async function uploadJournalAudio(params: {
  supabase: SupabaseClient;
  userId: string;
  entryId: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<{ path: string; signedUrl: string }> {
  const ext = audioExtFromMime(params.mimeType);
  const timestamp = Date.now();
  const path = `${params.userId}/${params.entryId}-${timestamp}.${ext}`;

  const { error: upErr } = await params.supabase.storage
    .from(JOURNAL_AUDIO_BUCKET)
    .upload(path, params.bytes, {
      contentType: params.mimeType || "audio/wav",
      upsert: false,
    });
  if (upErr) {
    throw new Error(`storage_upload_failed: ${upErr.message}`);
  }

  const { data: signed, error: signErr } = await params.supabase.storage
    .from(JOURNAL_AUDIO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) {
    throw new Error(
      `storage_signed_url_failed: ${signErr?.message ?? "no url"}`,
    );
  }
  return { path, signedUrl: signed.signedUrl };
}
