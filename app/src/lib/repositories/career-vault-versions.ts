import { createClient } from "@/lib/supabase/client";
import type {
  CareerVaultFile,
  CareerVaultFileVersion,
} from "@/types/career-vault";
import {
  buildVaultObjectPath,
  buildVaultVersionPath,
  copyVaultObject,
  removeVaultObject,
} from "@/lib/career-vault/storage";
import { CAREER_VAULT_BUCKET } from "@/lib/career-vault/constants";
import { careerVaultRepository } from "./career-vault";

export type CreateVersionInput = {
  fileId: string;
  newFile: File;
  changeNote?: string | null;
};

export type RestoreVersionInput = {
  fileId: string;
  versionId: string;
};

export type RetentionTrimResult = {
  keptCount: number;
  archivedCount: number;
};

/**
 * Orchestrates version creation. High-level flow:
 *   1. Load current metadata.
 *   2. Copy the current blob into `versions/<fileId>/v<N>_...`.
 *   3. Insert a `career_vault_file_versions` row for v<N>.
 *   4. Upload the new blob to a fresh object path.
 *   5. Update the main file row (file_path, file_size, mime_type, filename,
 *      current_version = N + 1).
 *
 * If any later step fails we best-effort roll back objects we created so we
 * don't leak storage. We *don't* try to roll back the version row itself
 * because the original file is still intact at that point.
 */
export const careerVaultVersionsRepository = {
  async list(fileId: string): Promise<CareerVaultFileVersion[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_file_versions")
      .select("*")
      .eq("file_id", fileId)
      .order("version_number", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerVaultFileVersion[];
  },

  async getById(id: string): Promise<CareerVaultFileVersion> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_file_versions")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as CareerVaultFileVersion;
  },

  async createVersion({
    fileId,
    newFile,
    changeNote,
  }: CreateVersionInput): Promise<{
    file: CareerVaultFile;
    archived: CareerVaultFileVersion;
  }> {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("Not authenticated");

    const current = await careerVaultRepository.getById(fileId);
    const archiveVersion = current.current_version;

    // 1) Archive current blob → versions/<fileId>/v<N>_<filename>.
    const { path: archivePath } = buildVaultVersionPath(
      user.id,
      fileId,
      archiveVersion,
      current.filename,
    );

    await copyVaultObject(current.file_path, archivePath);

    // 2) Insert version row for the archived blob.
    const { data: versionRow, error: versionError } = await supabase
      .from("career_vault_file_versions")
      .insert({
        file_id: fileId,
        user_id: user.id,
        version_number: archiveVersion,
        filename: current.filename,
        file_path: archivePath,
        file_size: current.file_size,
        mime_type: current.mime_type,
        change_note: changeNote?.trim() || null,
        changed_fields: {},
      })
      .select()
      .single();

    if (versionError || !versionRow) {
      await removeVaultObject(archivePath).catch(() => undefined);
      throw versionError ?? new Error("Failed to record version history");
    }

    // 3) Upload new blob at a fresh content path (keeps paths unique).
    const { path: newPath, filename: newFilename } = buildVaultObjectPath(
      user.id,
      current.category,
      newFile.name,
    );

    const { error: uploadError } = await supabase.storage
      .from(CAREER_VAULT_BUCKET)
      .upload(newPath, newFile, {
        contentType: newFile.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      // Roll back the just-inserted version row + archived blob.
      try {
        await supabase
          .from("career_vault_file_versions")
          .delete()
          .eq("id", versionRow.id);
      } catch {
        /* best-effort */
      }
      await removeVaultObject(archivePath).catch(() => undefined);
      throw uploadError;
    }

    // 4) Update the parent file row to point at the new blob.
    const { data: updatedFile, error: updateError } = await supabase
      .from("career_vault_files")
      .update({
        filename: newFilename,
        original_filename: newFile.name,
        file_path: newPath,
        file_size: newFile.size,
        mime_type: newFile.type || current.mime_type,
        current_version: archiveVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fileId)
      .select()
      .single();

    if (updateError || !updatedFile) {
      await removeVaultObject(newPath).catch(() => undefined);
      throw updateError ?? new Error("Failed to update file metadata");
    }

    return {
      file: updatedFile as CareerVaultFile,
      archived: versionRow as CareerVaultFileVersion,
    };
  },

  /**
   * "Restoring" v5 means: fetch v5's archived bytes, then create a NEW version
   * whose content matches v5. We never destroy v6..vN.
   */
  async restoreVersion({
    fileId,
    versionId,
  }: RestoreVersionInput): Promise<{
    file: CareerVaultFile;
    archived: CareerVaultFileVersion;
  }> {
    const supabase = createClient();
    const version = await careerVaultVersionsRepository.getById(versionId);
    if (version.file_id !== fileId) {
      throw new Error("Version does not belong to this file");
    }

    // Download bytes via a short-lived signed URL.
    const { data: signed, error: signedError } = await supabase.storage
      .from(CAREER_VAULT_BUCKET)
      .createSignedUrl(version.file_path, 60);
    if (signedError || !signed?.signedUrl) {
      throw signedError ?? new Error("Failed to read archived version");
    }

    const res = await fetch(signed.signedUrl);
    if (!res.ok) throw new Error(`Failed to read archived version (${res.status})`);
    const blob = await res.blob();
    const file = new File([blob], version.filename, {
      type: version.mime_type || blob.type || "application/octet-stream",
    });

    return careerVaultVersionsRepository.createVersion({
      fileId,
      newFile: file,
      changeNote: `Restored from v${version.version_number}`,
    });
  },

  /**
   * Keep the N newest past-versions. Older ones are removed (row + blob).
   * Returns (kept, archivedAway). Safe to call after every createVersion.
   */
  async trimToRetentionLimit(
    fileId: string,
    limit: number,
  ): Promise<RetentionTrimResult> {
    const supabase = createClient();
    const versions = await careerVaultVersionsRepository.list(fileId);
    if (versions.length <= limit) {
      return { keptCount: versions.length, archivedCount: 0 };
    }

    const toDelete = versions.slice(limit); // list() is DESC by version_number
    const ids = toDelete.map((v) => v.id);

    const { error: deleteError } = await supabase
      .from("career_vault_file_versions")
      .delete()
      .in("id", ids);
    if (deleteError) throw deleteError;

    // Best-effort blob cleanup. Don't throw if already missing.
    for (const v of toDelete) {
      await removeVaultObject(v.file_path).catch(() => undefined);
    }

    return { keptCount: limit, archivedCount: toDelete.length };
  },

  /** Permanently delete a single archived version (row + blob). */
  async deleteVersion(versionId: string): Promise<void> {
    const supabase = createClient();
    const existing = await careerVaultVersionsRepository.getById(versionId);

    const { error } = await supabase
      .from("career_vault_file_versions")
      .delete()
      .eq("id", versionId);
    if (error) throw error;

    await removeVaultObject(existing.file_path).catch(() => undefined);
  },
};
