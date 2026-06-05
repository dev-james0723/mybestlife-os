import type { SupabaseClient } from "@supabase/supabase-js";

export const LIFE_AGENT_UPLOADS_BUCKET = "life-agent-uploads";

const SIGNED_URL_TTL_SEC = 3600;

export function buildLifeAgentUploadPath(
  userId: string,
  uploadId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180);
  return `${userId}/${uploadId}/${safeName}`;
}

export async function uploadLifeAgentFileServer(
  supabase: SupabaseClient,
  userId: string,
  uploadId: string,
  fileName: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<{ storagePath: string; error?: string }> {
  const storagePath = buildLifeAgentUploadPath(userId, uploadId, fileName);
  const { error } = await supabase.storage.from(LIFE_AGENT_UPLOADS_BUCKET).upload(storagePath, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) return { storagePath, error: error.message };
  return { storagePath };
}

export async function downloadLifeAgentFile(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<{ bytes: Uint8Array; error?: string }> {
  const { data, error } = await supabase.storage
    .from(LIFE_AGENT_UPLOADS_BUCKET)
    .download(storagePath);
  if (error || !data) {
    return { bytes: new Uint8Array(), error: error?.message ?? "download_failed" };
  }
  const buf = await data.arrayBuffer();
  return { bytes: new Uint8Array(buf) };
}

export async function createLifeAgentUploadSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(LIFE_AGENT_UPLOADS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function isTextMime(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  );
}

export function guessExtractMode(mimeType: string): "transcribe" | "describe" | "extract" {
  if (mimeType.startsWith("image/")) return "describe";
  if (mimeType === "application/pdf") return "extract";
  return "extract";
}
