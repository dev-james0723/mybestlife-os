import { createClient } from "@/lib/supabase/client";
import type { GratefulThing } from "@/types/database";

export type CreateGratefulThingInput = {
  content: string;
  entry_date?: string;
  category?: string | null;
  photo_url?: string | null;
  is_favorite?: boolean;
};

export type UpdateGratefulThingInput = Partial<CreateGratefulThingInput>;

export const gratefulThingsRepository = {
  async getAll(): Promise<GratefulThing[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("grateful_things")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<GratefulThing> {
    const supabase = createClient();
    const { data, error } = await supabase.from("grateful_things").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },

  async create(input: CreateGratefulThingInput): Promise<GratefulThing> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("grateful_things")
      .insert({
        content: input.content,
        entry_date: input.entry_date ?? new Date().toISOString().slice(0, 10),
        category: input.category?.trim() || null,
        photo_url: input.photo_url?.trim() || null,
        is_favorite: input.is_favorite ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateGratefulThingInput): Promise<GratefulThing> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("grateful_things")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("grateful_things").delete().eq("id", id);
    if (error) throw error;
  },
};
