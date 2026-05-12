import type { DocOracleGlossaryRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import type { DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import { normalizeGlossaryPages, normalizeGlossaryRelatedTerms } from "@/components/document-oracle/glossary/glossaryNormalize";

export function glossaryPagesSearchBlob(pages: unknown): string {
  return normalizeGlossaryPages(pages).join(" ");
}

export function glossaryMatchesSearch(term: DocOracleGlossaryRow, categoryLabel: string, qRaw: string): boolean {
  const q = qRaw.trim().toLowerCase();
  if (!q) return true;
  const related = normalizeGlossaryRelatedTerms(term.related_terms).join(" ");
  const pages = glossaryPagesSearchBlob(term.pages);
  const blob = [
    term.term,
    term.definition || "",
    categoryLabel,
    related,
    pages,
  ]
    .join("\n")
    .toLowerCase();
  return blob.includes(q);
}

export function sectionsOverlappingGlossaryPages(
  pageNums: number[],
  sections: DocOracleSectionRow[],
): DocOracleSectionRow[] {
  if (pageNums.length === 0) return [];
  const lo = Math.min(...pageNums);
  const hi = Math.max(...pageNums);
  const hits = sections.filter((s) => {
    const ps = s.page_start;
    const pe = s.page_end ?? s.page_start;
    if (ps == null && pe == null) return false;
    const a = ps ?? pe ?? 0;
    const b = pe ?? ps ?? 0;
    return hi >= a && lo <= b;
  });
  hits.sort((x, y) => {
    const xs = x.page_start ?? 0;
    const ys = y.page_start ?? 0;
    return xs - ys;
  });
  return hits.slice(0, 12);
}
