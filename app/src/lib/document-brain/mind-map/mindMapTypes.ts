import type { SupabaseClient } from "@supabase/supabase-js";

export type MindMapNodeType =
  | "document_root"
  | "concept"
  | "section"
  | "subsection"
  | "glossary"
  | "visual"
  | "page"
  | "person"
  | "organization"
  | "date"
  | "fee"
  | "requirement"
  | "question";

export type MindMapEvidenceSnippet = {
  page: number;
  quote: string;
};

export type MindMapNodeMetadata = {
  page_group?: boolean;
  page_from?: number;
  page_to?: number;
  section_title?: string;
  visual_title?: string;
  glossary_term?: string;
  evidence?: MindMapEvidenceSnippet[];
  /** True when this branch starts collapsed in the UI. */
  default_hidden?: boolean;
};

export type DraftMindMapNode = {
  id: string;
  node_key: string;
  label: string;
  node_type: MindMapNodeType;
  description: string | null;
  importance_score: number | null;
  page_numbers: number[];
  section_ids: string[];
  visual_asset_ids: string[];
  glossary_term_ids: string[];
  source_chunk_ids: string[];
  keywords: string[];
  position_x: number | null;
  position_y: number | null;
  collapsed: boolean;
  metadata: MindMapNodeMetadata;
};

export type DraftMindMapEdge = {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string | null;
  label: string | null;
  description: string | null;
  confidence: number | null;
  metadata: Record<string, unknown>;
};

export type MindMapDbNode = {
  id: string;
  user_id: string;
  document_id: string;
  analysis_id: string;
  node_key: string;
  label: string;
  node_type: string;
  description: string | null;
  importance_score: number | null;
  page_numbers: number[] | null;
  section_ids: string[] | null;
  visual_asset_ids: string[] | null;
  glossary_term_ids: string[] | null;
  source_chunk_ids: string[] | null;
  keywords: string[] | null;
  position_x: number | null;
  position_y: number | null;
  collapsed: boolean | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

export type MindMapDbEdge = {
  id: string;
  user_id: string;
  document_id: string;
  analysis_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string | null;
  label: string | null;
  description: string | null;
  confidence: number | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

export type GenerateMindMapContext = {
  supabase: SupabaseClient;
  userId: string;
  documentId: string;
  analysisId: string;
  documentTitle: string | null;
  language: string | null;
  summary: string | null;
};

export const MIND_MAP_MAX_NODES = 140;
