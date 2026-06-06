import type { LifeAgentPermissionDomain } from "@/types/life-agent";

export type RetrievalMode = "hybrid" | "semantic" | "keyword" | "recent";

export type RetrievalSourceDomain =
  | LifeAgentPermissionDomain
  | "doc_oracle"
  | "ai_knowledge"
  | "quote_library"
  | "software_vault";

export type RetrievalScope = {
  sourceDomains: RetrievalSourceDomain[];
  requestedSourceDomains: RetrievalSourceDomain[];
  readableLifeAgentDomains: LifeAgentPermissionDomain[];
  excludedSourceDomains: RetrievalSourceDomain[];
  sessionGrantedDomains: LifeAgentPermissionDomain[];
};

export type RetrievalSourceChip = {
  domain: RetrievalSourceDomain;
  label: string;
  active: boolean;
  removable: boolean;
};

export type RetrievalScores = {
  combined: number;
  semantic: number | null;
  metadata: number;
  recency: number;
  connection: number;
};

export type RetrievalResult = {
  id: string;
  retrievalDocumentId: string | null;
  knowledgeItemId: string | null;
  sourceDomain: RetrievalSourceDomain;
  sourceTable: string;
  sourceId: string;
  documentKind: string;
  chunkIndex: number;
  title: string;
  snippet: string;
  bodyPreview: string;
  sourceUrl: string | null;
  sourceMetadata: Record<string, unknown>;
  pageNumber: number | null;
  sectionPath: string | null;
  tags: string[];
  scores: RetrievalScores;
  whyMatched: string[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type RetrievalCitation = {
  resultId: string;
  retrievalDocumentId: string | null;
  sourceDomain: RetrievalSourceDomain;
  sourceId: string;
  title: string;
  quote?: string;
  pageNumber?: number | null;
  sectionPath?: string | null;
};

export type RetrievalRun = {
  id: string | null;
  query: string;
  mode: RetrievalMode;
  scope: RetrievalScope;
  sourceChips: RetrievalSourceChip[];
  results: RetrievalResult[];
  warnings: string[];
};

export type RetrievalDocumentInput = {
  user_id: string;
  source_domain: RetrievalSourceDomain;
  source_table: string;
  source_id: string;
  knowledge_item_id: string | null;
  document_kind: string;
  chunk_index: number;
  title: string | null;
  body: string;
  body_preview: string | null;
  source_url: string | null;
  source_metadata: Record<string, unknown>;
  page_number: number | null;
  section_path: string | null;
  tags: string[];
  content_hash: string;
  embedding?: number[] | null;
  embedding_model?: string;
};
