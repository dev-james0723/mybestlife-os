/** Row shape for `document_pages` as used by Doc Oracle UI. */

export type DocOraclePageRow = {
  id: string;
  page_number: number;
  page_label: string | null;
  page_type: string | null;
  raw_text: string | null;
  markdown: string | null;
  page_summary: string | null;
  interpreted_page_meaning: string | null;
  keywords: unknown;
  linked_terms: unknown;
  linked_sections: unknown;
  rendered_image_path: string | null;
  rendered_image_url: string | null;
  source_pdf_page_ref: string | null;
  has_visual_assets: boolean;
  suggested_questions: unknown;
};

export type DocOracleVisualRow = {
  id: string;
  type: string | null;
  semantic_category: string | null;
  title: string | null;
  description: string | null;
  image_path: string | null;
  source_page_number: number | null;
  extracted_labels: unknown;
  retrieval_tags: unknown;
  related_terms: unknown;
  related_sections: unknown;
  confidence: number | null;
};
