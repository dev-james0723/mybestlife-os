import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { isValidPublicUrl } from "@/lib/vault/safe-fetch";

export const MAX_ICON_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/gif": "gif",
};

const ALLOWED_FETCH =
  /^image\/(png|jpeg|jpe?g|webp|svg\+xml|gif|x-icon|vnd\.microsoft\.icon)$/i;

export async function fetchRemoteIconBytes(
  sourceUrl: string,
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  if (!isValidPublicUrl(sourceUrl)) return null;
  const res = await fetch(sourceUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; MyLifeOSVaultBot/1.0)",
      accept: "image/*,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const rawCt = res.headers.get("content-type") ?? "";
  const contentType = rawCt.split(";")[0]?.trim() ?? "";
  if (!ALLOWED_FETCH.test(contentType)) return null;
  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0 || buf.byteLength > MAX_ICON_BYTES) return null;
  return { buffer: buf, contentType };
}

/**
 * Downloads bytes from a resolved icon URL and uploads to the public
 * `vault-icons` bucket under `{userId}/{uuid}.{ext}`. Returns the public URL
 * or null if fetch/upload fails (caller may fall back to the remote URL).
 */
export async function uploadVaultIconFromBytes(
  supabase: SupabaseClient,
  userId: string,
  buffer: ArrayBuffer,
  contentType: string,
): Promise<string | null> {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_FETCH.test(normalized)) return null;
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_ICON_BYTES) return null;

  const ext =
    MIME_TO_EXT[normalized] ?? (normalized.includes("svg") ? "svg" : "png");
  const objectPath = `${userId}/${randomUUID()}.${ext}`;
  const body = new Uint8Array(buffer);
  const { error } = await supabase.storage.from("vault-icons").upload(objectPath, body, {
    contentType: normalized,
    upsert: false,
  });
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[vault/icon-storage] upload failed", error.message);
    }
    return null;
  }
  const { data } = supabase.storage.from("vault-icons").getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function uploadVaultIconFromRemoteUrl(
  supabase: SupabaseClient,
  userId: string,
  sourceUrl: string,
): Promise<string | null> {
  const fetched = await fetchRemoteIconBytes(sourceUrl);
  if (!fetched) return null;
  return uploadVaultIconFromBytes(supabase, userId, fetched.buffer, fetched.contentType);
}
