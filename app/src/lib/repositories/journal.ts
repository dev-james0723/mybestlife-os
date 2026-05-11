import { createClient } from "@/lib/supabase/client";
import type { JournalEntry, Json } from "@/types/database";

export type CreateJournalEntryInput = {
  entry_date: string;
  content?: string | null;
  emotion_quadrant?: Json | null;
  needs?: string[];
  ai_summary?: string | null;
  ai_illustration_url?: string | null;
  linked_project_ids?: string[];
  linked_task_ids?: string[];
};

export type UpdateJournalEntryInput = Partial<CreateJournalEntryInput>;

export const journalRepository = {
  async getAll(): Promise<JournalEntry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<JournalEntry> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(input: CreateJournalEntryInput): Promise<JournalEntry> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("journal_entries")
      .insert({
        entry_date: input.entry_date,
        content: input.content ?? null,
        emotion_quadrant: input.emotion_quadrant ?? null,
        needs: input.needs ?? [],
        ai_summary: input.ai_summary ?? null,
        ai_illustration_url: input.ai_illustration_url ?? null,
        linked_project_ids: input.linked_project_ids ?? [],
        linked_task_ids: input.linked_task_ids ?? [],
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateJournalEntryInput): Promise<JournalEntry> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("journal_entries")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("journal_entries").delete().eq("id", id);
    if (error) throw error;
  },
};
