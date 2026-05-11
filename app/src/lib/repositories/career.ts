import { createClient } from "@/lib/supabase/client";
import type { CareerAsset, Json } from "@/types/database";

export type CreateCareerAssetInput = {
  asset_type: string;
  title: string;
  content?: string | null;
  metadata?: Json;
};

export type UpdateCareerAssetInput = Partial<CreateCareerAssetInput>;

export const careerRepository = {
  async getAll(): Promise<CareerAsset[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_assets")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<CareerAsset> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_assets")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(input: CreateCareerAssetInput): Promise<CareerAsset> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_assets")
      .insert({
        asset_type: input.asset_type,
        title: input.title,
        content: input.content ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateCareerAssetInput): Promise<CareerAsset> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_assets")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("career_assets").delete().eq("id", id);
    if (error) throw error;
  },
};
