import { createClient } from "@/lib/supabase/client";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/env";
import type {
  CareerVaultCategory,
  CareerVaultFile,
  VaultFileMetadata,
} from "@/types/career-vault";
import {
  removeVaultObject,
  uploadVaultObject,
} from "@/lib/career-vault/storage";

export type UpdateVaultFileInput = Partial<{
  filename: string;
  category: CareerVaultCategory;
  tags: string[];
  description: string | null;
  is_starred: boolean;
  is_master: boolean;
}>;

/** Thrown when PostgREST reports the vault table is missing (migrations not applied). */
export const CAREER_VAULT_MISSING_TABLE_MARKER =
  "The career_vault_files table was not found.";

export function isMissingCareerVaultTableError(err: unknown): boolean {
  return err instanceof Error && err.message.includes(CAREER_VAULT_MISSING_TABLE_MARKER);
}

function mapVaultListError(err: { message?: string }): Error {
  const msg = err.message ?? "";
  const missingTable =
    (msg.includes("career_vault_files") &&
      (msg.includes("does not exist") ||
        msg.includes("schema cache") ||
        msg.includes("Could not find"))) ||
    (msg.includes("relation") &&
      msg.includes("career_vault_files") &&
      msg.includes("does not exist"));
  if (missingTable) {
    return new Error(
      `${CAREER_VAULT_MISSING_TABLE_MARKER} Apply Supabase migrations (e.g. npm run db:push from the app folder, or run the SQL files in the Dashboard) and try again.`,
    );
  }
  if (!getSupabaseUrl() || !getSupabaseKey()) {
    return new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local.",
    );
  }
  return err instanceof Error ? err : new Error(msg || "Unknown error");
}

export const careerVaultRepository = {
  async list(): Promise<CareerVaultFile[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_files")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw mapVaultListError(error);
    return (data ?? []) as CareerVaultFile[];
  },

  async getById(id: string): Promise<CareerVaultFile> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_files")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw mapVaultListError(error);
    return data as CareerVaultFile;
  },

  /**
   * Uploads the blob to Storage, then inserts the metadata row. If the insert
   * fails the orphan object is cleaned up best-effort.
   */
  async create(
    file: File,
    metadata: VaultFileMetadata,
  ): Promise<CareerVaultFile> {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("Not authenticated");

    const { path, filename } = await uploadVaultObject(
      user.id,
      metadata.category,
      file,
    );

    // If the user is flagging this as the new master, clear previous master in the same category first.
    if (metadata.isMaster) {
      await supabase
        .from("career_vault_files")
        .update({ is_master: false })
        .eq("user_id", user.id)
        .eq("category", metadata.category)
        .eq("is_master", true);
    }

    const { data, error } = await supabase
      .from("career_vault_files")
      .insert({
        user_id: user.id,
        filename,
        original_filename: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
        category: metadata.category,
        tags: metadata.tags ?? [],
        description: metadata.description?.trim() || null,
        is_starred: metadata.isStarred ?? false,
        is_master: metadata.isMaster ?? false,
      })
      .select()
      .single();

    if (error) {
      await removeVaultObject(path).catch(() => undefined);
      throw error;
    }

    return data as CareerVaultFile;
  },

  async update(
    id: string,
    updates: UpdateVaultFileInput,
  ): Promise<CareerVaultFile> {
    const supabase = createClient();

    // If promoting to master, clear siblings first.
    if (updates.is_master === true) {
      const current = await careerVaultRepository.getById(id);
      const targetCategory = updates.category ?? current.category;
      await supabase
        .from("career_vault_files")
        .update({ is_master: false })
        .eq("user_id", current.user_id)
        .eq("category", targetCategory)
        .eq("is_master", true)
        .neq("id", id);
    }

    const { data, error } = await supabase
      .from("career_vault_files")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as CareerVaultFile;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const existing = await careerVaultRepository.getById(id);

    const { error } = await supabase
      .from("career_vault_files")
      .delete()
      .eq("id", id);
    if (error) throw error;

    // Best-effort cleanup; ignore errors (file might already be gone).
    await removeVaultObject(existing.file_path).catch(() => undefined);
  },
};
