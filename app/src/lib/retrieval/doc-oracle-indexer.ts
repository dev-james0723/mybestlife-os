import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { mapRowToItem } from "@/lib/knowledge/map-row-to-item";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import {
  buildDocOracleChunkRetrievalDocuments,
  buildDocOracleRetrievalDocuments,
  buildKnowledgeRetrievalDocuments,
  type DocOracleAnalysisRow,
  type DocOracleChunkRow,
  type DocOraclePageRow,
  type DocOracleSectionRow,
  type DocOracleVisualAssetRow,
} from "@/lib/retrieval/documents";
import {
  composeRetrievalEmbeddingText,
  embedRetrievalDocumentText,
} from "@/lib/retrieval/embeddings";
import type { RetrievalDocumentInput } from "@/lib/retrieval/types";

type IndexResult = {
  ok: boolean;
  indexed: number;
  failed: number;
  warnings: string[];
  error?: string;
};

function isMissingTableError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === "42P01" || e.code === "PGRST205") return true;
  const message = String(e.message ?? "").toLowerCase();
  return message.includes("does not exist") || message.includes("could not find the table");
}

async function upsertDocument(params: {
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>;
  doc: RetrievalDocumentInput;
  apiKey: string | null;
}): Promise<boolean> {
  let embedding: string | null = null;
  if (params.apiKey) {
    const values = await embedRetrievalDocumentText({
      apiKey: params.apiKey,
      title: params.doc.title,
      text: composeRetrievalEmbeddingText({
        title: params.doc.title,
        body: params.doc.body,
        tags: params.doc.tags,
      }),
    });
    embedding = values as unknown as string;
  }

  const row: Record<string, unknown> = {
    ...params.doc,
    embedding_model: "text-embedding-004",
  };
  delete row.embedding;
  if (embedding) row.embedding = embedding;

  const { error } = await params.supabase
    .from("os_retrieval_documents")
    .upsert(row, {
      onConflict: "user_id,source_domain,source_id,document_kind,chunk_index",
    });
  return !error;
}

export async function indexDocOracleRetrievalForDocument(params: {
  userId: string;
  documentId: string;
}): Promise<IndexResult> {
  const warnings: string[] = [];
  let admin: ReturnType<typeof createServiceRoleSupabaseClient>;
  try {
    admin = createServiceRoleSupabaseClient();
  } catch (error) {
    return {
      ok: false,
      indexed: 0,
      failed: 0,
      warnings,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const { data: itemRow, error: itemError } = await admin
    .from("knowledge_items")
    .select("*")
    .eq("user_id", params.userId)
    .eq("id", params.documentId)
    .maybeSingle();
  if (itemError || !itemRow) {
    return {
      ok: false,
      indexed: 0,
      failed: 0,
      warnings,
      error: itemError?.message ?? "knowledge_item_not_found",
    };
  }

  const item = mapRowToItem(itemRow as Record<string, unknown>);
  const [analyses, pages, sections, visuals, chunks] = await Promise.all([
    admin
      .from("document_analyses")
      .select(
        "id,document_id,document_title,document_type,language,total_pages,visual_density,extraction_risk,summary,status,created_at,updated_at",
      )
      .eq("user_id", params.userId)
      .eq("document_id", params.documentId),
    admin
      .from("document_pages")
      .select(
        "id,document_id,analysis_id,page_number,page_label,page_type,raw_text,markdown,page_summary,interpreted_page_meaning,keywords,linked_terms,linked_sections,has_visual_assets,suggested_questions,extraction_risk,created_at,updated_at",
      )
      .eq("user_id", params.userId)
      .eq("document_id", params.documentId)
      .order("page_number", { ascending: true })
      .limit(2000),
    admin
      .from("document_sections")
      .select(
        "id,document_id,analysis_id,title,level,page_start,page_end,summary,keywords,representative_pages,created_at,updated_at",
      )
      .eq("user_id", params.userId)
      .eq("document_id", params.documentId)
      .order("page_start", { ascending: true })
      .limit(2000),
    admin
      .from("document_visual_assets")
      .select(
        "id,document_id,analysis_id,source_page_number,type,semantic_category,title,description,image_url,extracted_labels,retrieval_tags,related_terms,related_sections,confidence,created_at,updated_at",
      )
      .eq("user_id", params.userId)
      .eq("document_id", params.documentId)
      .limit(2000),
    admin
      .from("document_chunks")
      .select(
        "id,document_id,analysis_id,chunk_text,chunk_type,page_number,section_path,keywords,has_visual,related_visual_asset_ids,created_at,updated_at",
      )
      .eq("user_id", params.userId)
      .eq("document_id", params.documentId)
      .order("created_at", { ascending: true })
      .limit(2000),
  ]);

  for (const [label, error] of [
    ["doc_oracle_analyses", analyses.error],
    ["doc_oracle_pages", pages.error],
    ["doc_oracle_sections", sections.error],
    ["doc_oracle_visuals", visuals.error],
    ["doc_oracle_chunks", chunks.error],
  ] as const) {
    if (error && !isMissingTableError(error)) {
      warnings.push(`${label}_unavailable:${error.message}`);
    }
  }

  const docs = [
    ...buildKnowledgeRetrievalDocuments({ userId: params.userId, item }),
    ...buildDocOracleRetrievalDocuments({
      userId: params.userId,
      item,
      analyses: (analyses.data ?? []) as DocOracleAnalysisRow[],
      pages: (pages.data ?? []) as DocOraclePageRow[],
      sections: (sections.data ?? []) as DocOracleSectionRow[],
      visualAssets: (visuals.data ?? []) as DocOracleVisualAssetRow[],
    }),
    ...buildDocOracleChunkRetrievalDocuments({
      userId: params.userId,
      item,
      chunks: (chunks.data ?? []) as DocOracleChunkRow[],
    }),
  ].slice(0, 160);

  const apiKey = getGeminiServerApiKey() ?? null;
  if (!apiKey) warnings.push("embeddings_not_generated:missing_gemini_api_key");

  let indexed = 0;
  let failed = 0;
  for (const doc of docs) {
    try {
      const ok = await upsertDocument({ supabase: admin, doc, apiKey });
      if (ok) indexed += 1;
      else failed += 1;
    } catch (error) {
      failed += 1;
      warnings.push(
        `retrieval_doc_upsert_failed:${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { ok: failed === 0, indexed, failed, warnings };
}
