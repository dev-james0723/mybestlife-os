/**
 * Quote Library repository — Supabase access layer.
 *
 * All functions rely on the browser-side Supabase client which already carries
 * the user's JWT; RLS on the `quotes`, `quote_collections`, and
 * `quote_collection_items` tables enforces user scoping. `user_id` inserts are
 * omitted and filled in by the `DEFAULT auth.uid()` at the column level.
 */

import { createClient } from "@/lib/supabase/client";
import type {
  CreateQuoteInput,
  Quote,
  QuoteCollection,
  QuoteCollectionItem,
  UpdateQuoteInput,
} from "@/types/quote";

type QuoteRow = Omit<
  Quote,
  "tags" | "thumbnail_palette" | "thumbnail_visual_keywords"
> & {
  tags: string[] | null;
  thumbnail_palette: string[] | null;
  thumbnail_visual_keywords: string[] | null;
};

function normalizeRow(row: QuoteRow): Quote {
  return {
    ...row,
    tags: row.tags ?? [],
    thumbnail_palette: row.thumbnail_palette ?? null,
    thumbnail_visual_keywords: row.thumbnail_visual_keywords ?? null,
  };
}

export const quotesRepository = {
  async list(): Promise<Quote[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .order("is_favorite", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: QuoteRow) => normalizeRow(r));
  },

  async getById(id: string): Promise<Quote> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return normalizeRow(data as QuoteRow);
  },

  async create(input: CreateQuoteInput): Promise<Quote> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quotes")
      .insert({
        quote_text: input.quote_text,
        source_author: input.source_author ?? null,
        source_context: input.source_context ?? null,
        source_url: input.source_url ?? null,
        source_type: input.source_type ?? null,
        source_module: input.source_module ?? "manual",
        category: input.category ?? null,
        tags: input.tags ?? [],
        emotion_tone: input.emotion_tone ?? null,
        personal_note: input.personal_note ?? null,
        is_favorite: input.is_favorite ?? false,
        linked_goal_id: input.linked_goal_id ?? null,
        language: input.language ?? "en",
      })
      .select()
      .single();
    if (error) throw error;
    return normalizeRow(data as QuoteRow);
  },

  async update(id: string, input: UpdateQuoteInput): Promise<Quote> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quotes")
      .update({ ...input })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return normalizeRow(data as QuoteRow);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) throw error;
  },

  async setFavorite(id: string, favorite: boolean): Promise<Quote> {
    return quotesRepository.update(id, { is_favorite: favorite });
  },

  async clearSeeds(): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("is_seed", true);
    if (error) throw error;
  },
};

export const quoteCollectionsRepository = {
  async list(): Promise<QuoteCollection[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quote_collections")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as QuoteCollection[];
  },

  async create(input: {
    name: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
  }): Promise<QuoteCollection> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quote_collections")
      .insert({
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? null,
        icon: input.icon ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as QuoteCollection;
  },

  async update(
    id: string,
    input: Partial<{
      name: string;
      description: string | null;
      color: string | null;
      icon: string | null;
    }>,
  ): Promise<QuoteCollection> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quote_collections")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as QuoteCollection;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("quote_collections")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async listItems(): Promise<QuoteCollectionItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quote_collection_items")
      .select("*");
    if (error) throw error;
    return (data ?? []) as QuoteCollectionItem[];
  },

  async addQuoteToCollection(
    collectionId: string,
    quoteId: string,
  ): Promise<QuoteCollectionItem> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quote_collection_items")
      .insert({ collection_id: collectionId, quote_id: quoteId })
      .select()
      .single();
    if (error) throw error;
    return data as QuoteCollectionItem;
  },

  async removeQuoteFromCollection(
    collectionId: string,
    quoteId: string,
  ): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("quote_collection_items")
      .delete()
      .eq("collection_id", collectionId)
      .eq("quote_id", quoteId);
    if (error) throw error;
  },
};
