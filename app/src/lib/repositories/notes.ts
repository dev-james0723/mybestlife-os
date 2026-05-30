import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/types/database";

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}

export type CreateNoteInput = {
  title: string;
  content?: string | null;
  category?: string | null;
  tags?: string[];
  is_favorite?: boolean;
  project_id?: string | null;
};

export type UpdateNoteInput = Partial<CreateNoteInput>;

export const notesRepository = {
  async getAll(): Promise<Note[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notes")
      .select("*, project:projects(id, name)")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Note> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notes")
      .select("*, project:projects(id, name)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(input: CreateNoteInput): Promise<Note> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        title: input.title,
        content: input.content ?? null,
        category: input.category ?? null,
        tags: input.tags ?? [],
        is_favorite: input.is_favorite ?? false,
        project_id: input.project_id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateNoteInput): Promise<Note> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notes")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) throw error;
  },
};
