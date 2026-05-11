import { createClient } from "@/lib/supabase/client";
import type { CareerVaultCategory } from "@/types/career-vault";
import { CAREER_VAULT_BUCKET } from "./constants";
import { sanitizeFilename } from "./utils";

/** Cheap, dep-free UUID v4 (good enough for object paths). */
function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback: time + random — never hits in modern browsers.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

export function buildVaultObjectPath(
  userId: string,
  category: CareerVaultCategory,
  rawFilename: string,
): { path: string; filename: string } {
  const filename = sanitizeFilename(rawFilename);
  const path = `${userId}/${category}/${uuid()}_${filename}`;
  return { path, filename };
}

/**
 * Archive path for a specific file revision. Kept under `versions/<fileId>/`
 * so a file's history is co-located and can be bulk-removed with the file.
 */
export function buildVaultVersionPath(
  userId: string,
  fileId: string,
  versionNumber: number,
  rawFilename: string,
): { path: string; filename: string } {
  const filename = sanitizeFilename(rawFilename);
  const path = `${userId}/versions/${fileId}/v${versionNumber}_${uuid()}_${filename}`;
  return { path, filename };
}

/**
 * Copy an existing object to a new path within the same bucket. Used when we
 * archive the "current" file before replacing it with a new version.
 */
export async function copyVaultObject(
  fromPath: string,
  toPath: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(CAREER_VAULT_BUCKET)
    .copy(fromPath, toPath);
  if (error) throw error;
}

export async function uploadVaultObject(
  userId: string,
  category: CareerVaultCategory,
  file: File,
): Promise<{ path: string; filename: string }> {
  const supabase = createClient();
  const { path, filename } = buildVaultObjectPath(userId, category, file.name);
  const { error } = await supabase.storage
    .from(CAREER_VAULT_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) throw error;
  return { path, filename };
}

export async function removeVaultObject(path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(CAREER_VAULT_BUCKET).remove([path]);
  if (error) throw error;
}

/**
 * Short-lived signed URL for previewing / downloading a private file.
 * Default: 1 hour.
 */
export async function createVaultSignedUrl(
  path: string,
  expiresInSeconds = 60 * 60,
  options?: { download?: string | boolean },
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(CAREER_VAULT_BUCKET)
    .createSignedUrl(path, expiresInSeconds, options);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Failed to create signed URL");
  return data.signedUrl;
}

/** Download the object and trigger a browser save. */
export async function downloadVaultObject(
  path: string,
  saveAs: string,
): Promise<void> {
  const url = await createVaultSignedUrl(path, 60, { download: saveAs });
  // Assign to location rather than window.open so Safari doesn't block.
  const a = document.createElement("a");
  a.href = url;
  a.download = saveAs;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
