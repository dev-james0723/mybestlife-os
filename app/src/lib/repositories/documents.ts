import { createClient } from "@/lib/supabase/client";
import type {
  Document,
  DocumentAiStatus,
  DocumentSourceKind,
} from "@/types/database";

export type CreateDocumentInput = {
  name: string;
  document_type?: string | null;
  expiration_date?: string | null;
  file_url?: string | null;
  source_kind?: DocumentSourceKind;
  storage_bucket?: string | null;
  storage_path?: string | null;
  original_file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  ai_status?: DocumentAiStatus;
  ai_confidence?: number | null;
  ai_metadata?: Record<string, unknown> | null;
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw authError ?? new Error("Unauthenticated");

    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        name: input.name,
        document_type: input.document_type ?? null,
        expiration_date: input.expiration_date ?? null,
        file_url: input.file_url ?? null,
        source_kind: input.source_kind ?? "manual",
        storage_bucket: input.storage_bucket ?? null,
        storage_path: input.storage_path ?? null,
        original_file_name: input.original_file_name ?? null,
        mime_type: input.mime_type ?? null,
        file_size: input.file_size ?? null,
        ai_status: input.ai_status ?? "not_requested",
        ai_confidence: input.ai_confidence ?? null,
        ai_metadata: input.ai_metadata ?? {},
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
    const response = await fetch("/api/documents/intake", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: id }),
    });
    if (!response.ok) {
      throw new Error(
        "The private file could not be removed, so the document record was kept.",
      );
    }
  },
};
