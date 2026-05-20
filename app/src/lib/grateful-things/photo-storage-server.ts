import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { GRATEFUL_THINGS_PHOTO_BUCKET } from "@/lib/grateful-things/photo-storage";

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

function buildPhotoPath(opts: { userId: string; entryId?: string | null; suffix: string }): string {
  const middle = opts.entryId ?? "drafts";
  return `${opts.userId}/${middle}/${crypto.randomUUID()}-${opts.suffix}.jpg`;
}

async function ensurePhotoBucket(): Promise<void> {
  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) return;
    if (buckets?.some((b) => b.id === GRATEFUL_THINGS_PHOTO_BUCKET)) return;
    await supabase.storage.createBucket(GRATEFUL_THINGS_PHOTO_BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: [...ALLOWED_MIMES],
    });
  } catch {
    /* service role may be unavailable locally; client falls back to data URLs */
  }
}

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  const mime = match[1] ?? "image/jpeg";
  const bytes = Uint8Array.from(Buffer.from(match[2] ?? "", "base64"));
  return { mime, bytes };
}

async function uploadBytes(opts: {
  userId: string;
  entryId?: string | null;
  suffix: string;
  bytes: Uint8Array;
  contentType: string;
}): Promise<string | null> {
  try {
    await ensurePhotoBucket();
    const supabase = createServiceRoleSupabaseClient();
    const storagePath = buildPhotoPath({
      userId: opts.userId,
      entryId: opts.entryId,
      suffix: opts.suffix,
    });
    const { error: uploadError } = await supabase.storage
      .from(GRATEFUL_THINGS_PHOTO_BUCKET)
      .upload(storagePath, opts.bytes, {
        contentType: opts.contentType,
        upsert: false,
        cacheControl: "3600",
      });
    if (uploadError) return null;
    const { data } = supabase.storage.from(GRATEFUL_THINGS_PHOTO_BUCKET).getPublicUrl(storagePath);
    return data.publicUrl;
  } catch {
    return null;
  }
}

/**
 * Server-side photo persistence for gratitude entries.
 * Accepts a client-compressed data URL or an existing http(s) URL.
 */
export async function persistGratitudePhotosServer(opts: {
  userId: string;
  photo: string | null | undefined;
  entryId?: string | null;
}): Promise<{ photo_url: string | null; thumbnail_url: string | null }> {
  const { userId, photo, entryId } = opts;
  if (!photo?.trim()) return { photo_url: null, thumbnail_url: null };

  const trimmed = photo.trim();
  if (!trimmed.startsWith("data:")) {
    return { photo_url: trimmed, thumbnail_url: trimmed };
  }

  const parsed = parseDataUrl(trimmed);
  if (!parsed) return { photo_url: trimmed, thumbnail_url: trimmed };

  const contentType = parsed.mime.startsWith("image/") ? parsed.mime : "image/jpeg";
  const photo_url =
    (await uploadBytes({
      userId,
      entryId,
      suffix: "photo",
      bytes: parsed.bytes,
      contentType,
    })) ?? trimmed;

  const thumbnail_url =
    photo_url.startsWith("data:")
      ? (await uploadBytes({
          userId,
          entryId,
          suffix: "thumb",
          bytes: parsed.bytes,
          contentType,
        })) ?? photo_url
      : photo_url;

  return { photo_url, thumbnail_url };
}
