"use client";

import { createClient } from "@/lib/supabase/client";
import {
  compressDataUrlForGratitudePhoto,
  compressImageForGratitudePhoto,
  compressImageForGratitudeThumbnail,
} from "@/lib/grateful-things/compress-gratitude-photo";

export const GRATEFUL_THINGS_PHOTO_BUCKET = "grateful-things-photos";

export const GRATEFUL_THINGS_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

type GratitudePhotoMime = (typeof ALLOWED_MIMES)[number];

const MIME_TO_EXT: Record<GratitudePhotoMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function isAllowedMime(t: string): t is GratitudePhotoMime {
  return (ALLOWED_MIMES as readonly string[]).includes(t);
}

function buildPhotoPath(opts: { userId: string; entryId?: string | null; suffix: string }): string {
  const middle = opts.entryId ?? "drafts";
  return `${opts.userId}/${middle}/${crypto.randomUUID()}-${opts.suffix}.jpg`;
}

export function isGratefulThingsStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes(`/storage/v1/object/public/${GRATEFUL_THINGS_PHOTO_BUCKET}/`);
}

async function uploadJpegBlob(opts: {
  blob: Blob;
  storagePath: string;
}): Promise<string> {
  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(GRATEFUL_THINGS_PHOTO_BUCKET)
    .upload(opts.storagePath, opts.blob, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "3600",
    });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(GRATEFUL_THINGS_PHOTO_BUCKET).getPublicUrl(opts.storagePath);
  return data.publicUrl;
}

export type PersistedGratitudePhotos = {
  photo_url: string | null;
  thumbnail_url: string | null;
};

/**
 * Normalizes an optional photo field for DB insert/update:
 * - null/empty → nulls
 * - existing storage/http URL → unchanged
 * - data URL or oversized file → compress, upload photo + thumbnail
 */
export async function persistGratitudePhotos(opts: {
  photo: string | File | null | undefined;
  entryId?: string | null;
}): Promise<PersistedGratitudePhotos> {
  const { photo, entryId } = opts;
  if (!photo) return { photo_url: null, thumbnail_url: null };

  if (typeof photo === "string") {
    const trimmed = photo.trim();
    if (!trimmed) return { photo_url: null, thumbnail_url: null };
    if (!trimmed.startsWith("data:")) {
      return { photo_url: trimmed, thumbnail_url: trimmed };
    }
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("grateful-photo: not authenticated");

  let photoBlob: Blob;
  let thumbSource: Blob;

  if (photo instanceof File) {
    if (!isAllowedMime(photo.type)) throw new Error("grateful-photo: invalid type");
    if (photo.size > GRATEFUL_THINGS_PHOTO_MAX_BYTES) throw new Error("grateful-photo: too_large");
    photoBlob = await compressImageForGratitudePhoto(photo);
    thumbSource = photo;
  } else {
    photoBlob = await compressDataUrlForGratitudePhoto(photo);
    thumbSource = photoBlob;
  }

  const thumbBlob = await compressImageForGratitudeThumbnail(thumbSource);

  const photoPath = buildPhotoPath({ userId: user.id, entryId, suffix: "photo" });
  const thumbPath = buildPhotoPath({ userId: user.id, entryId, suffix: "thumb" });

  try {
    const [photo_url, thumbnail_url] = await Promise.all([
      uploadJpegBlob({ blob: photoBlob, storagePath: photoPath }),
      uploadJpegBlob({ blob: thumbBlob, storagePath: thumbPath }),
    ]);
    return { photo_url, thumbnail_url };
  } catch {
    const toDataUrl = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("read_failed"));
        };
        reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
        reader.readAsDataURL(blob);
      });
    const [photo_url, thumbnail_url] = await Promise.all([
      toDataUrl(photoBlob),
      toDataUrl(thumbBlob),
    ]);
    return { photo_url, thumbnail_url };
  }
}
