import { createClient } from "@/lib/supabase/client";
import type { Document } from "@/types/database";

export type CreateDocumentInput = {
  name: string;
  document_type?: string | null;
  expiration_date?: string | null;
  file_url?: string | null;
  notes?: string | null;
};

export type UpdateDocumentInput = Partial<CreateDocumentInput>;

export const documentsRepository = {
  async getAll(): Promise<Document[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("expiration_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Document> {
    const supabase = createClient();
    const { data, error } = await supabase.from("documents").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },

  async create(input: CreateDocumentInput): Promise<Document> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("documents")
      .insert({
        name: input.name,
        document_type: input.document_type ?? null,
        expiration_date: input.expiration_date ?? null,
        file_url: input.file_url ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateDocumentInput): Promise<Document> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("documents")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) throw error;
  },
};
