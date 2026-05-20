import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDeterministicMindMap } from "@/lib/document-brain/mind-map/deterministicMindMap";
import { buildGeminiDigests, enrichMindMapWithGemini } from "@/lib/document-brain/mind-map/enrichMindMapGemini";
import { layoutMindMapDagre } from "@/lib/document-brain/mind-map/layoutMindMapDagre";
import type {
  DraftMindMapEdge,
  DraftMindMapNode,
  GenerateMindMapContext,
  MindMapDbEdge,
  MindMapDbNode,
} from "@/lib/document-brain/mind-map/mindMapTypes";

type SectionRow = {
  id: string;
  title: string;
  level: number;
  parent_id: string | null;
  page_start: number | null;
  page_end: number | null;
  summary: string | null;
};

type PageRow = { id: string; page_number: number };
type GlossaryRow = { id: string; term: string; definition: string | null; pages: unknown };
type VisualRow = { id: string; title: string | null; source_page_number: number | null };
type ChunkRow = { id: string; page_number: number | null; chunk_text: string };

async function deleteExistingMindMap(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string,
): Promise<void> {
  await supabase.from("document_mind_map_edges").delete().eq("analysis_id", analysisId).eq("user_id", userId);
  await supabase.from("document_mind_map_nodes").delete().eq("analysis_id", analysisId).eq("user_id", userId);
}

async function insertMindMapRows(params: {
  supabase: SupabaseClient;
  userId: string;
  documentId: string;
  analysisId: string;
  nodes: DraftMindMapNode[];
  edges: DraftMindMapEdge[];
}): Promise<{ nodes: MindMapDbNode[]; edges: MindMapDbEdge[] }> {
  const { supabase, userId, documentId, analysisId, nodes, edges } = params;

  const nodeRowsRaw = nodes.map((n) => ({
    id: n.id,
    user_id: userId,
    document_id: documentId,
    analysis_id: analysisId,
    node_key: n.node_key,
    label: n.label,
    node_type: n.node_type,
    description: n.description,
    importance_score: n.importance_score,
    page_numbers: n.page_numbers,
    section_ids: n.section_ids,
    visual_asset_ids: n.visual_asset_ids,
    glossary_term_ids: n.glossary_term_ids,
    source_chunk_ids: n.source_chunk_ids,
    keywords: n.keywords,
    position_x: n.position_x,
    position_y: n.position_y,
    collapsed: n.collapsed,
    metadata: n.metadata as Record<string, unknown>,
  }));

  const seenNodeKeys = new Set<string>();
  const nodeRows = nodeRowsRaw.filter((r) => {
    if (seenNodeKeys.has(r.node_key)) return false;
    seenNodeKeys.add(r.node_key);
    return true;
  });

  for (let i = 0; i < nodeRows.length; i += 40) {
    const slice = nodeRows.slice(i, i + 40);
    const { error } = await supabase.from("document_mind_map_nodes").insert(slice);
    if (error) throw new Error(`mind_map_nodes_insert: ${error.message}`);
  }

  const edgeRowsRaw = edges.map((e) => ({
    id: e.id,
    user_id: userId,
    document_id: documentId,
    analysis_id: analysisId,
    source_node_id: e.source_node_id,
    target_node_id: e.target_node_id,
    relationship_type: e.relationship_type,
    label: e.label,
    description: e.description,
    confidence: e.confidence,
    metadata: e.metadata,
  }));

  const seenEdgeKeys = new Set<string>();
  const edgeRows = edgeRowsRaw.filter((r) => {
    const k = `${r.source_node_id}:${r.target_node_id}:${r.relationship_type ?? ""}`;
    if (seenEdgeKeys.has(k)) return false;
    seenEdgeKeys.add(k);
    return true;
  });

  for (let i = 0; i < edgeRows.length; i += 60) {
    const slice = edgeRows.slice(i, i + 60);
    const { error } = await supabase.from("document_mind_map_edges").insert(slice);
    if (error) throw new Error(`mind_map_edges_insert: ${error.message}`);
  }

  const [{ data: nOut, error: nErr }, { data: eOut, error: eErr }] = await Promise.all([
    supabase.from("document_mind_map_nodes").select("*").eq("analysis_id", analysisId).eq("user_id", userId),
    supabase.from("document_mind_map_edges").select("*").eq("analysis_id", analysisId).eq("user_id", userId),
  ]);
  if (nErr) throw new Error(nErr.message);
  if (eErr) throw new Error(eErr.message);

  return {
    nodes: (nOut ?? []) as MindMapDbNode[],
    edges: (eOut ?? []) as MindMapDbEdge[],
  };
}

export async function generateAndPersistMindMap(
  ctx: GenerateMindMapContext,
  rows: {
    sections: SectionRow[];
    pages: PageRow[];
    glossary: GlossaryRow[];
    visuals: VisualRow[];
    chunks: ChunkRow[];
  },
): Promise<{
  nodes: MindMapDbNode[];
  edges: MindMapDbEdge[];
  gemini_used: boolean;
  gemini_error?: string;
}> {
  const det = buildDeterministicMindMap({
    documentTitle: ctx.documentTitle,
    sections: rows.sections,
    pages: rows.pages,
    glossary: rows.glossary,
    visuals: rows.visuals,
  });

  const existingKeys = new Set(det.nodes.map((n) => n.node_key));
  const digests = buildGeminiDigests({
    sections: rows.sections,
    glossary: rows.glossary,
    chunks: rows.chunks,
  });

  const enriched = await enrichMindMapWithGemini({
    language: ctx.language,
    summary: ctx.summary,
    sectionDigest: digests.sectionDigest,
    glossaryDigest: digests.glossaryDigest,
    chunkDigest: digests.chunkDigest,
    existingKeys,
    nodes: det.nodes,
    edges: det.edges,
  });

  const laid = layoutMindMapDagre(enriched.nodes, enriched.edges);

  await deleteExistingMindMap(ctx.supabase, ctx.userId, ctx.analysisId);

  try {
    const saved = await insertMindMapRows({
      supabase: ctx.supabase,
      userId: ctx.userId,
      documentId: ctx.documentId,
      analysisId: ctx.analysisId,
      nodes: laid,
      edges: enriched.edges,
    });
    return { ...saved, gemini_used: enriched.gemini_used, gemini_error: enriched.gemini_error };
  } catch (e) {
    await deleteExistingMindMap(ctx.supabase, ctx.userId, ctx.analysisId);
    const detLayout = layoutMindMapDagre(det.nodes, det.edges);
    const saved = await insertMindMapRows({
      supabase: ctx.supabase,
      userId: ctx.userId,
      documentId: ctx.documentId,
      analysisId: ctx.analysisId,
      nodes: detLayout,
      edges: det.edges,
    });
    const msg = e instanceof Error ? e.message : String(e);
    return { ...saved, gemini_used: false, gemini_error: msg.slice(0, 400) };
  }
}

export async function fetchMindMapFromDb(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string,
): Promise<{ nodes: MindMapDbNode[]; edges: MindMapDbEdge[] }> {
  const [{ data: nodes, error: nErr }, { data: edges, error: eErr }] = await Promise.all([
    supabase
      .from("document_mind_map_nodes")
      .select("*")
      .eq("analysis_id", analysisId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("document_mind_map_edges")
      .select("*")
      .eq("analysis_id", analysisId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);
  if (nErr) throw new Error(nErr.message);
  if (eErr) throw new Error(eErr.message);
  return {
    nodes: (nodes ?? []) as MindMapDbNode[],
    edges: (edges ?? []) as MindMapDbEdge[],
  };
}
