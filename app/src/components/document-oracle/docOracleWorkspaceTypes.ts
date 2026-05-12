/** Shared row types for Doc Oracle workspace (avoid importing heavy client modules in leaf components). */

export type DocOracleAnalysis = {
  id: string;
  document_title: string | null;
  summary: string | null;
  total_pages: number | null;
  parser: string | null;
  parser_version: string | null;
  status: string;
  document_type: string | null;
  language: string | null;
};

export type DocOracleSectionRow = {
  id: string;
  title: string;
  level: number;
  parent_id: string | null;
  page_start: number | null;
  page_end: number | null;
  summary: string | null;
  keywords: unknown;
  representative_pages: unknown;
};

export type DocOracleGlossaryRow = {
  id: string;
  term: string;
  definition: string | null;
  category: string | null;
  pages: unknown;
  related_terms: unknown;
  document_id?: string;
  analysis_id?: string;
};
