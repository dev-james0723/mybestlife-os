import { createClient } from "@/lib/supabase/client";
import type { Asset, AssetCategoryKey } from "@/types/assets";

export type CreateAssetInput = {
  name: string;
  /**
   * Legacy free-text category. Kept in sync with `category_key` for backward
   * compat with clients that haven't migrated yet. New UI writes BOTH: the
   * constrained enum key AND the human-readable label derived from localized
   * copy (caller's responsibility to resolve).
   */
  category?: string | null;
  category_key?: AssetCategoryKey | null;
  value?: number | null;
  current_value?: number | null;
  location?: string | null;
  purchase_date?: string | null;
  serial_number?: string | null;
  notes?: string | null;
  document_id?: string | null;
  is_favorite?: boolean;
};

export type UpdateAssetInput = Partial<CreateAssetInput>;

export const assetsRepository = {
  async getAll(): Promise<Asset[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Asset[];
  },

  async getById(id: string): Promise<Asset> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Asset;
  },

  async create(input: CreateAssetInput): Promise<Asset> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("assets")
      .insert({
        name: input.name,
        category: input.category ?? null,
        category_key: input.category_key ?? null,
        value: input.value ?? null,
        current_value: input.current_value ?? null,
        location: input.location ?? null,
        purchase_date: input.purchase_date ?? null,
        serial_number: input.serial_number ?? null,
        notes: input.notes ?? null,
        document_id: input.document_id ?? null,
        is_favorite: input.is_favorite ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Asset;
  },

  async update(id: string, input: UpdateAssetInput): Promise<Asset> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("assets")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Asset;
  },

  /**
   * Dedicated favorite toggle.
   * Separate from `update` to keep the mutation surface small for the
   * optimistic-update hook — also means RLS policies that only allow
   * toggling `is_favorite` could be used without opening up `update` access.
   */
  async setFavorite(id: string, value: boolean): Promise<Asset> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("assets")
      .update({ is_favorite: value, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Asset;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) throw error;
  },
};
