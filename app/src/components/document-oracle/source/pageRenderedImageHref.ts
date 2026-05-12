import type { DocOraclePageRow } from "@/components/document-oracle/docOraclePageTypes";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";

/** Public URL or authenticated proxy URL for a full-page `document_pages` screenshot. */
export function pageRenderedImageHref(page: DocOraclePageRow): string | null {
  const u = page.rendered_image_url?.trim();
  if (u) return u;
  const p = page.rendered_image_path?.trim();
  if (p) return knowledgeFilesApiHref(p);
  return null;
}

export function documentHasRenderedPageImages(pages: DocOraclePageRow[]): boolean {
  return pages.some((p) => pageRenderedImageHref(p) != null);
}
