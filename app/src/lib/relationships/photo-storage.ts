"use client";

/**
 * Storage helpers for the `relationship-photos` Supabase bucket.
 *
 * Mirrors `lib/role-models/photo-storage.ts` — see that file for the
 * extended rationale. The two bucket helpers are intentionally separate
 * (rather than shared) so each domain can evolve its bucket policies
 * independently without coupling.
 *
 * Bucket
 * ------
 * - Public read (so plain <img> and next/image can render without signed URLs).
 * - Write/update/delete scoped to the uploader by RLS:
 *     path[0] = auth.uid()::text
 * - Allowed MIMEs (also enforced by RLS):
 *     image/jpeg, image/png, image/webp, image/gif
 * - Server max: 5 MB per file (enforced by the bucket).
 *
 * Path layout
 * -----------
 *   {auth.uid()}/{relationship_id_or_drafts}/{uuid}.{ext}
 *
 * The middle segment is the relationship id when known, or "drafts" while
 * the user is still composing a brand-new entry.
 *
 * What this module is NOT
 * -----------------------
 * - It does not write to the `relationships` table. Callers persist the
 *   returned public URL onto `photo_url` themselves.
 * - It does not auto-clean orphan uploads. If the user uploads then cancels
 *   the form, the file lives in storage. A janitor can be added later.
 */

import { createClient } from "@/lib/supabase/client";

// ============================================================================
// Constants
// ============================================================================

export const RELATIONSHIP_PHOTO_BUCKET = "relationship-photos";

export const RELATIONSHIP_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const RELATIONSHIP_PHOTO_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type RelationshipPhotoMime =
  (typeof RELATIONSHIP_PHOTO_ALLOWED_MIMES)[number];

const MIME_TO_EXT: Record<RelationshipPhotoMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// ============================================================================
// Validation
// ============================================================================

export type PhotoValidationResult =
  | { ok: true; mime: RelationshipPhotoMime }
  | {
      ok: false;
      reason: "wrong_type" | "too_large" | "empty";
    };

export function validateRelationshipPhotoFile(
  file: File,
): PhotoValidationResult {
  if (file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > RELATIONSHIP_PHOTO_MAX_BYTES) {
    return { ok: false, reason: "too_large" };
  }
  if (!isAllowedMime(file.type)) return { ok: false, reason: "wrong_type" };
  return { ok: true, mime: file.type };
}

function isAllowedMime(t: string): t is RelationshipPhotoMime {
  return (RELATIONSHIP_PHOTO_ALLOWED_MIMES as readonly string[]).includes(t);
}

// ============================================================================
// Path helpers
// ============================================================================

export function buildRelationshipPhotoPath(opts: {
  userId: string;
  relationshipId?: string | null;
  mime: RelationshipPhotoMime;
}): string {
  const ext = MIME_TO_EXT[opts.mime];
  const middle = opts.relationshipId ?? "drafts";
  const filename = `${crypto.randomUUID()}.${ext}`;
  return `${opts.userId}/${middle}/${filename}`;
}

export function isRelationshipStorageUrl(
  url: string | null | undefined,
): boolean {
  if (!url) return false;
  return url.includes(
    `/storage/v1/object/public/${RELATIONSHIP_PHOTO_BUCKET}/`,
  );
}

export function extractRelationshipPhotoPath(
  publicUrl: string | null | undefined,
): string | null {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${RELATIONSHIP_PHOTO_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const tail = publicUrl.slice(idx + marker.length);
  const q = tail.indexOf("?");
  return q === -1 ? tail : tail.slice(0, q);
}

// ============================================================================
// Upload / delete
// ============================================================================

export type UploadRelationshipPhotoResult = {
  publicUrl: string;
  storagePath: string;
};

export async function uploadRelationshipPhoto(opts: {
  file: File;
  /** Optional — provide when editing an existing relationship. */
  relationshipId?: string | null;
}): Promise<UploadRelationshipPhotoResult> {
  const validation = validateRelationshipPhotoFile(opts.file);
  if (!validation.ok) {
    throw new Error(`relationship-photo: invalid file (${validation.reason})`);
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("relationship-photo: not authenticated");
  }

  const storagePath = buildRelationshipPhotoPath({
    userId: user.id,
    relationshipId: opts.relationshipId,
    mime: validation.mime,
  });

  const { error: uploadError } = await supabase.storage
    .from(RELATIONSHIP_PHOTO_BUCKET)
    .upload(storagePath, opts.file, {
      contentType: validation.mime,
      upsert: false,
      cacheControl: "3600",
    });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(RELATIONSHIP_PHOTO_BUCKET)
    .getPublicUrl(storagePath);

  return { publicUrl: data.publicUrl, storagePath };
}

/**
 * Best-effort delete. Accepts either a public URL or a bucket-relative path.
 * Errors are swallowed (and in dev, logged): orphan files are tolerable, but
 * blocking a relationship delete because storage hiccupped is not.
 */
export async function deleteRelationshipPhoto(
  publicUrlOrPath: string | null | undefined,
): Promise<void> {
  if (!publicUrlOrPath) return;
  const path =
    extractRelationshipPhotoPath(publicUrlOrPath) ?? publicUrlOrPath.trim();
  if (!path || path.startsWith("http")) return;

  try {
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(RELATIONSHIP_PHOTO_BUCKET)
      .remove([path]);
    if (error && process.env.NODE_ENV !== "production") {
      console.warn("[relationship-photo] delete failed:", error.message);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[relationship-photo] delete threw:", err);
    }
  }
}
