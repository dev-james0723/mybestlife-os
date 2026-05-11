"use client";

/**
 * Storage helpers for the `role-model-photos` Supabase bucket.
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
 *   {auth.uid()}/{slug-or-uuid}/{uuid}.{ext}
 *
 * The middle segment is the role-model id when known, or "drafts" while the
 * user is still composing a brand-new entry. We don't enforce the middle
 * segment in RLS — the policy only validates the leading user id — but the
 * structure makes orphan cleanup possible by listing prefixes per role model.
 *
 * What this module is NOT
 * -----------------------
 * - It does not write to the `role_models` table. Callers are responsible
 *   for persisting the returned public URL onto `photo_url`.
 * - It does not auto-clean orphan uploads. If the user uploads then cancels
 *   the form, the file lives in storage. We could add a server-side janitor
 *   later; for now it's an acceptable trade for a simpler client.
 */

import { createClient } from "@/lib/supabase/client";

// ============================================================================
// Constants
// ============================================================================

export const ROLE_MODEL_PHOTO_BUCKET = "role-model-photos";

export const ROLE_MODEL_PHOTO_MAX_BYTES = 5 * 1024 * 1024; // keep in sync w/ bucket

export const ROLE_MODEL_PHOTO_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type RoleModelPhotoMime =
  (typeof ROLE_MODEL_PHOTO_ALLOWED_MIMES)[number];

const MIME_TO_EXT: Record<RoleModelPhotoMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Discriminated result for {@link validatePhotoFile}. Returning a tagged union
 * lets the UI show specific (translated) error copy without parsing strings.
 */
export type PhotoValidationResult =
  | { ok: true; mime: RoleModelPhotoMime }
  | {
      ok: false;
      reason: "wrong_type" | "too_large" | "empty";
    };

export function validatePhotoFile(file: File): PhotoValidationResult {
  if (file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > ROLE_MODEL_PHOTO_MAX_BYTES) {
    return { ok: false, reason: "too_large" };
  }
  if (!isAllowedMime(file.type)) return { ok: false, reason: "wrong_type" };
  return { ok: true, mime: file.type };
}

function isAllowedMime(t: string): t is RoleModelPhotoMime {
  return (ROLE_MODEL_PHOTO_ALLOWED_MIMES as readonly string[]).includes(t);
}

// ============================================================================
// Path helpers
// ============================================================================

/**
 * Build a storage object path. `roleModelId` is optional; if missing we put
 * the file into a "drafts" sub-folder so retroactive cleanup is possible.
 */
export function buildRoleModelPhotoPath(opts: {
  userId: string;
  roleModelId?: string | null;
  mime: RoleModelPhotoMime;
}): string {
  const ext = MIME_TO_EXT[opts.mime];
  const middle = opts.roleModelId ?? "drafts";
  const filename = `${crypto.randomUUID()}.${ext}`;
  return `${opts.userId}/${middle}/${filename}`;
}

/**
 * Detect whether a URL points at our public storage bucket. We use this to
 * decide whether `<Image>` from next/image is safe to use (it requires a
 * whitelisted host) vs. plain `<img>` for arbitrary external URLs.
 */
export function isRoleModelStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes(`/storage/v1/object/public/${ROLE_MODEL_PHOTO_BUCKET}/`);
}

/**
 * Extract the bucket-relative storage path from a public Supabase URL.
 * Returns null if the URL is not from our bucket (i.e. an external URL the
 * user pasted). The cleanup helper uses this to find what to delete.
 */
export function extractRoleModelPhotoPath(
  publicUrl: string | null | undefined,
): string | null {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${ROLE_MODEL_PHOTO_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  // Strip query strings; the path portion is just the part between marker
  // and the first `?` (or end-of-string).
  const tail = publicUrl.slice(idx + marker.length);
  const q = tail.indexOf("?");
  return q === -1 ? tail : tail.slice(0, q);
}

// ============================================================================
// Upload / delete
// ============================================================================

export type UploadRoleModelPhotoResult = {
  /** Public CDN URL (suitable for <img> or next/image). */
  publicUrl: string;
  /** Bucket-relative path (`{userId}/{roleModelId}/{uuid}.{ext}`). */
  storagePath: string;
};

/**
 * Upload a freshly picked photo to storage and return a public URL.
 *
 * Throws on auth failure or upload error. Validation should be done by the
 * caller via {@link validatePhotoFile} so the UI can show specific copy
 * (this function still re-validates as a defence-in-depth check).
 */
export async function uploadRoleModelPhoto(opts: {
  file: File;
  /** Optional — provide when editing an existing role model. */
  roleModelId?: string | null;
}): Promise<UploadRoleModelPhotoResult> {
  const validation = validatePhotoFile(opts.file);
  if (!validation.ok) {
    throw new Error(`role-model-photo: invalid file (${validation.reason})`);
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("role-model-photo: not authenticated");
  }

  const storagePath = buildRoleModelPhotoPath({
    userId: user.id,
    roleModelId: opts.roleModelId,
    mime: validation.mime,
  });

  const { error: uploadError } = await supabase.storage
    .from(ROLE_MODEL_PHOTO_BUCKET)
    .upload(storagePath, opts.file, {
      contentType: validation.mime,
      upsert: false,
      cacheControl: "3600",
    });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(ROLE_MODEL_PHOTO_BUCKET)
    .getPublicUrl(storagePath);

  return { publicUrl: data.publicUrl, storagePath };
}

/**
 * Best-effort delete. Accepts either a public URL or a bucket-relative path.
 * Errors are swallowed and (in dev) logged: orphan files are tolerable, but
 * blocking a role-model delete because storage hiccupped is not.
 */
export async function deleteRoleModelPhoto(
  publicUrlOrPath: string | null | undefined,
): Promise<void> {
  if (!publicUrlOrPath) return;
  const path =
    extractRoleModelPhotoPath(publicUrlOrPath) ?? publicUrlOrPath.trim();
  if (!path || path.startsWith("http")) return; // not our bucket → nothing to do

  try {
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(ROLE_MODEL_PHOTO_BUCKET)
      .remove([path]);
    if (error && process.env.NODE_ENV !== "production") {
      console.warn("[role-model-photo] delete failed:", error.message);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[role-model-photo] delete threw:", err);
    }
  }
}
