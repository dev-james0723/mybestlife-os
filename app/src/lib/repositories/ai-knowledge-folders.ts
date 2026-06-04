/**
 * Repository for AI Knowledge prompt folders.
 *
 * Folders group prompts from both sources (library + custom). Membership lives
 * in `ai_prompt_folder_items` with a polymorphic FK; this layer assembles the
 * `PromptFolder` domain shape (folder metadata + resolved item refs).
 */

import { createClient } from "@/lib/supabase/client";
import type { PromptFolderItemRow, PromptFolderRow } from "@/types/database";
import type { PromptFolder, PromptFolderItemRef } from "@/types/prompt";

let folderSchemaMissing = false;
let listFoldersInFlight: Promise<PromptFolder[]> | null = null;

function isMissingFolderTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    code?: unknown;
    status?: unknown;
    message?: unknown;
    details?: unknown;
  };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  if (code === "42P01" || code === "PGRST205") return true;

  const status =
    typeof candidate.status === "number"
      ? candidate.status
      : Number(candidate.status);
  const text = `${String(candidate.message ?? "")} ${String(candidate.details ?? "")}`;
  return (
    status === 404 &&
    /ai_prompt_folder(?:s|_items)|schema cache|relation .* does not exist/i.test(text)
  );
}

function toItemRef(row: PromptFolderItemRow): PromptFolderItemRef | null {
  if (row.library_prompt_id) {
    return { source: "library", prompt_id: row.library_prompt_id };
  }
  if (row.custom_prompt_id) {
    return { source: "custom", prompt_id: row.custom_prompt_id };
  }
  return null;
}

function toFolder(
  row: PromptFolderRow,
  items: PromptFolderItemRef[],
): PromptFolder {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    summary: row.summary,
    icon: row.icon,
    color: row.color,
    sort_order: row.sort_order,
    items,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function readFoldersFromSupabase(): Promise<PromptFolder[]> {
  const supabase = createClient();
  const foldersRes = await supabase
    .from("ai_prompt_folders")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (foldersRes.error) {
    if (isMissingFolderTableError(foldersRes.error)) {
      folderSchemaMissing = true;
      return [];
    }
    throw foldersRes.error;
  }

  const itemsRes = await supabase
    .from("ai_prompt_folder_items")
    .select("*")
    .order("added_at", { ascending: false });
  if (itemsRes.error) {
    if (isMissingFolderTableError(itemsRes.error)) {
      folderSchemaMissing = true;
      return [];
    }
    throw itemsRes.error;
  }

  const itemsByFolder = new Map<string, PromptFolderItemRef[]>();
  for (const row of (itemsRes.data ?? []) as PromptFolderItemRow[]) {
    const ref = toItemRef(row);
    if (!ref) continue;
    const list = itemsByFolder.get(row.folder_id) ?? [];
    list.push(ref);
    itemsByFolder.set(row.folder_id, list);
  }

  return ((foldersRes.data ?? []) as PromptFolderRow[]).map((row) =>
    toFolder(row, itemsByFolder.get(row.id) ?? []),
  );
}

export type NewFolderInput = {
  name: string;
  summary?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order?: number;
};

export type UpdateFolderInput = Partial<NewFolderInput>;

export const aiKnowledgeFoldersRepository = {
  /** Folders with their resolved item refs, ordered by sort_order then recency. */
  async listFolders(): Promise<PromptFolder[]> {
    if (folderSchemaMissing) return [];
    if (!listFoldersInFlight) {
      listFoldersInFlight = readFoldersFromSupabase().finally(() => {
        listFoldersInFlight = null;
      });
    }
    return listFoldersInFlight;
  },

  async createFolder(input: NewFolderInput): Promise<PromptFolder> {
    const supabase = createClient();
    const payload = {
      name: input.name,
      summary: input.summary ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      sort_order: input.sort_order ?? 0,
    };
    const { data, error } = await supabase
      .from("ai_prompt_folders")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return toFolder(data as PromptFolderRow, []);
  },

  async updateFolder(
    id: string,
    input: UpdateFolderInput,
  ): Promise<PromptFolderRow> {
    const supabase = createClient();
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.name !== undefined) patch.name = input.name;
    if (input.summary !== undefined) patch.summary = input.summary;
    if (input.icon !== undefined) patch.icon = input.icon;
    if (input.color !== undefined) patch.color = input.color;
    if (input.sort_order !== undefined) patch.sort_order = input.sort_order;

    const { data, error } = await supabase
      .from("ai_prompt_folders")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as PromptFolderRow;
  },

  async deleteFolder(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("ai_prompt_folders")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  /**
   * Add prompt refs to a folder. Already-present items are skipped (the table
   * has two partial unique indexes that can't share one upsert conflict
   * target), so we filter against current membership before inserting.
   */
  async addItems(
    folderId: string,
    refs: PromptFolderItemRef[],
  ): Promise<void> {
    if (refs.length === 0) return;
    const supabase = createClient();

    const { data: existingRows, error: readErr } = await supabase
      .from("ai_prompt_folder_items")
      .select("library_prompt_id, custom_prompt_id")
      .eq("folder_id", folderId);
    if (readErr) throw readErr;

    const present = new Set(
      ((existingRows ?? []) as Pick<
        PromptFolderItemRow,
        "library_prompt_id" | "custom_prompt_id"
      >[]).map((r) =>
        r.library_prompt_id
          ? `library:${r.library_prompt_id}`
          : `custom:${r.custom_prompt_id}`,
      ),
    );

    const rows = refs
      .filter((ref) => !present.has(`${ref.source}:${ref.prompt_id}`))
      .map((ref) => ({
        folder_id: folderId,
        library_prompt_id: ref.source === "library" ? ref.prompt_id : null,
        custom_prompt_id: ref.source === "custom" ? ref.prompt_id : null,
      }));
    if (rows.length === 0) return;

    const { error } = await supabase
      .from("ai_prompt_folder_items")
      .insert(rows);
    if (error) throw error;
  },

  async removeItem(
    folderId: string,
    ref: PromptFolderItemRef,
  ): Promise<void> {
    const supabase = createClient();
    const column =
      ref.source === "library" ? "library_prompt_id" : "custom_prompt_id";
    const { error } = await supabase
      .from("ai_prompt_folder_items")
      .delete()
      .eq("folder_id", folderId)
      .eq(column, ref.prompt_id);
    if (error) throw error;
  },
};
