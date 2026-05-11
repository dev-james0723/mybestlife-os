import { createClient } from "@/lib/supabase/client";
import type { JapaneseStudySession } from "@/types/database";

export type CreateJapaneseStudySessionInput = {
  session_date: string;
  duration_minutes: number;
  study_type?: string | null;
  content?: string | null;
  notes?: string | null;
};

export type UpdateJapaneseStudySessionInput = Partial<CreateJapaneseStudySessionInput>;

export const japaneseStudyRepository = {
  async getAll(): Promise<JapaneseStudySession[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("japanese_study_sessions")
      .select("*")
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<JapaneseStudySession> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("japanese_study_sessions")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(input: CreateJapaneseStudySessionInput): Promise<JapaneseStudySession> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("japanese_study_sessions")
      .insert({
        session_date: input.session_date,
        duration_minutes: input.duration_minutes,
        study_type: input.study_type ?? null,
        content: input.content ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    input: UpdateJapaneseStudySessionInput
  ): Promise<JapaneseStudySession> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("japanese_study_sessions")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("japanese_study_sessions").delete().eq("id", id);
    if (error) throw error;
  },
};
