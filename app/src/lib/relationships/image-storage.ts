"use client";

/**
 * Storage helpers for the `relationship-images` Supabase bucket — the
 * multi-image memory layer (profile / 合照 / event / business card / screenshot
 * / memory). Mirrors `lib/relationships/photo-storage.ts`; kept separate so the
 * two buckets can evolve their policies independently.
 *
 * Path layout: {auth.uid()}/{relationship_id_or_drafts}/{uuid}.{ext}
 */

import { createClient } from "@/lib/supabase/client";

export const RELATIONSHIP_IMAGES_BUCKET = "relationship-images";
export const RELATIONSHIP_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const RELATIONSHIP_IMAGE_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type Mime = (typeof RELATIONSHIP_IMAGE_ALLOWED_MIMES)[number];

const MIME_TO_EXT: Record<Mime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type ImageValidationResult =
  | { ok: true; mime: Mime }
  | { ok: false; reason: "wrong_type" | "too_large" | "empty" };

export function validateRelationshipImageFile(file: File): ImageValidationResult {
  if (file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > RELATIONSHIP_IMAGE_MAX_BYTES) {
    return { ok: false, reason: "too_large" };
  }
  if (!(RELATIONSHIP_IMAGE_ALLOWED_MIMES as readonly string[]).includes(file.type)) {
    return { ok: false, reason: "wrong_type" };
  }
  return { ok: true, mime: file.type as Mime };
}

export async function uploadRelationshipImage(opts: {
  file: File;
  relationshipId?: string | null;
}): Promise<{ publicUrl: string; storagePath: string }> {
  const validation = validateRelationshipImageFile(opts.file);
  if (!validation.ok) {
    throw new Error(`relationship-image: invalid file (${validation.reason})`);
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("relationship-image: not authenticated");

  const ext = MIME_TO_EXT[validation.mime];
  const middle = opts.relationshipId ?? "drafts";
  const storagePath = `${user.id}/${middle}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(RELATIONSHIP_IMAGES_BUCKET)
    .upload(storagePath, opts.file, {
      contentType: validation.mime,
      upsert: false,
      cacheControl: "3600",
    });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(RELATIONSHIP_IMAGES_BUCKET)
    .getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, storagePath };
}

export function isRelationshipImageStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes(`/storage/v1/object/public/${RELATIONSHIP_IMAGES_BUCKET}/`);
}

export async function deleteRelationshipImage(
  publicUrlOrPath: string | null | undefined,
): Promise<void> {
  if (!publicUrlOrPath) return;
  const marker = `/storage/v1/object/public/${RELATIONSHIP_IMAGES_BUCKET}/`;
  const idx = publicUrlOrPath.indexOf(marker);
  const path =
    idx === -1 ? publicUrlOrPath.trim() : publicUrlOrPath.slice(idx + marker.length);
  if (!path || path.startsWith("http")) return;
  try {
    const supabase = createClient();
    await supabase.storage.from(RELATIONSHIP_IMAGES_BUCKET).remove([path.split("?")[0]!]);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[relationship-image] delete threw:", err);
    }
  }
}
