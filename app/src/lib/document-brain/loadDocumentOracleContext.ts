import type { SupabaseClient } from "@supabase/supabase-js";

export type DocumentOracleMindMapNodeRow = {
  id: string;
  label: string;
  node_type: string;
  description: string | null;
  page_numbers: number[] | null;
};

export type DocumentOracleMindMapEdgeRow = {
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  relationship_type: string | null;
};

export type DocumentOracleChunkRow = {
  id: string;
  chunk_text: string;
  page_number: number | null;
  section_path: string | null;
};

export type DocumentOraclePageRow = {
  page_number: number;
  page_summary: string | null;
  markdown: string | null;
};

export type DocumentOracleSectionRow = {
  id: string;
  title: string;
  page_start: number | null;
  page_end: number | null;
  summary: string | null;
};

export type DocumentOracleGlossaryRow = {
  id: string;
  term: string;
  definition: string | null;
  pages: unknown;
};

export type DocumentOracleVisualRow = {
  id: string;
  title: string | null;
  description: string | null;
  source_page_number: number | null;
};

export type LoadedDocumentOracleContext = {
  analysisId: string;
  documentTitle: string | null;
  documentType: string | null;
  language: string | null;
  summary: string | null;
  chunks: DocumentOracleChunkRow[];
  pages: DocumentOraclePageRow[];
  sections: DocumentOracleSectionRow[];
  glossary: DocumentOracleGlossaryRow[];
  visuals: DocumentOracleVisualRow[];
  mindMapNodes: DocumentOracleMindMapNodeRow[];
  mindMapEdges: DocumentOracleMindMapEdgeRow[];
};

export async function loadCompletedDocumentOracleContext(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
): Promise<
  | { ok: true; ctx: LoadedDocumentOracleContext }
  | { ok: false; status: 404 | 409; error: string }
> {
  const { data: analysis, error: aErr } = await supabase
    .from("document_analyses")
    .select("id, document_title, document_type, language, summary, status")
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (aErr || !analysis) {
    return { ok: false, status: 404, error: "analysis_not_found" };
  }
  if (analysis.status !== "completed") {
    return { ok: false, status: 409, error: "analysis_not_ready" };
  }

  const analysisId = analysis.id as string;

  const [chunksRes, pagesRes, sectionsRes, glossaryRes, visualsRes, nodesRes, edgesRes] = await Promise.all([
    supabase
      .from("document_chunks")
      .select("id, chunk_text, page_number, section_path")
      .eq("analysis_id", analysisId)
      .eq("user_id", userId)
      .limit(800),
    supabase
      .from("document_pages")
      .select("page_number, page_summary, markdown")
      .eq("analysis_id", analysisId)
      .eq("user_id", userId)
      .order("page_number", { ascending: true })
      .limit(600),
    supabase
      .from("document_sections")
      .select("id, title, page_start, page_end, summary")
      .eq("analysis_id", analysisId)
      .eq("user_id", userId)
      .order("page_start", { ascending: true, nullsFirst: false })
      .limit(400),
    supabase
      .from("document_glossary_terms")
      .select("id, term, definition, category, pages, related_terms")
      .eq("analysis_id", analysisId)
      .eq("user_id", userId)
      .limit(400),
    supabase
      .from("document_visual_assets")
      .select("id, title, description, source_page_number")
      .eq("analysis_id", analysisId)
      .eq("user_id", userId)
      .limit(200),
    supabase
      .from("document_mind_map_nodes")
      .select("id, label, node_type, description, page_numbers")
      .eq("analysis_id", analysisId)
      .eq("user_id", userId)
      .limit(400),
    supabase
      .from("document_mind_map_edges")
      .select("source_node_id, target_node_id, label, relationship_type")
      .eq("analysis_id", analysisId)
      .eq("user_id", userId)
      .limit(800),
  ]);

  if (chunksRes.error || pagesRes.error || sectionsRes.error || glossaryRes.error || visualsRes.error) {
    return { ok: false, status: 404, error: "data_load_failed" };
  }

  const chunks = (chunksRes.data ?? []) as DocumentOracleChunkRow[];
  const pages = (pagesRes.data ?? []) as DocumentOraclePageRow[];
  const sections = (sectionsRes.data ?? []) as DocumentOracleSectionRow[];
  const glossary = (glossaryRes.data ?? []) as DocumentOracleGlossaryRow[];
  const visuals = (visualsRes.data ?? []) as DocumentOracleVisualRow[];

  const mindMapNodes = !nodesRes.error ? ((nodesRes.data ?? []) as DocumentOracleMindMapNodeRow[]) : [];
  const mindMapEdges = !edgesRes.error ? ((edgesRes.data ?? []) as DocumentOracleMindMapEdgeRow[]) : [];

  return {
    ok: true,
    ctx: {
      analysisId,
      documentTitle: (analysis.document_title as string | null) ?? null,
      documentType: (analysis.document_type as string | null) ?? null,
      language: (analysis.language as string | null) ?? null,
      summary: (analysis.summary as string | null) ?? null,
      chunks,
      pages,
      sections,
      glossary,
      visuals,
      mindMapNodes,
      mindMapEdges,
    },
  };
}
