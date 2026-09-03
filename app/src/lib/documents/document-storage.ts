import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DOCUMENT_FILES_BUCKET,
  DOCUMENT_SIGNED_URL_TTL_SECONDS,
} from "@/lib/documents/document-intake";

export async function createDocumentSignedUploadUrl(input: {
  supabase: SupabaseClient;
  storagePath: string;
}): Promise<{ url?: string; error?: string }> {
  const { data, error } = await input.supabase.storage
    .from(DOCUMENT_FILES_BUCKET)
    .createSignedUploadUrl(input.storagePath, { upsert: false });

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "signed_upload_url_failed" };
  }
  return { url: data.signedUrl };
}

export async function createDocumentSignedUrl(input: {
  supabase: SupabaseClient;
  storagePath: string;
}): Promise<{ url?: string; error?: string }> {
  const { data, error } = await input.supabase.storage
    .from(DOCUMENT_FILES_BUCKET)
    .createSignedUrl(input.storagePath, DOCUMENT_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "signed_url_failed" };
  }
  return { url: data.signedUrl };
}

export async function downloadDocumentFileServer(input: {
  supabase: SupabaseClient;
  storagePath: string;
}): Promise<{ bytes?: Uint8Array; mimeType?: string; error?: string }> {
  const { data, error } = await input.supabase.storage
    .from(DOCUMENT_FILES_BUCKET)
    .download(input.storagePath);

  if (error || !data) {
    return { error: error?.message ?? "download_failed" };
  }

  return {
    bytes: new Uint8Array(await data.arrayBuffer()),
    mimeType: data.type || "application/octet-stream",
  };
}

export async function deleteDocumentFileServer(input: {
  supabase: SupabaseClient;
  storagePath: string;
}): Promise<{ error?: string }> {
  const { error } = await input.supabase.storage
    .from(DOCUMENT_FILES_BUCKET)
    .remove([input.storagePath]);

  return error ? { error: error.message } : {};
}
