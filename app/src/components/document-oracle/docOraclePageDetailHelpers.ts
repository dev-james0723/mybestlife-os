import type { DocOraclePageRow } from "@/components/document-oracle/docOraclePageTypes";
import { pageKeywordsList } from "@/components/document-oracle/docOraclePageHelpers";

export type PageDetailSectionRow = {
  id: string;
  title: string;
  page_start: number | null;
  page_end: number | null;
  summary: string | null;
  keywords: unknown;
};

export type PageDetailGlossaryRow = {
  id: string;
  term: string;
  definition: string | null;
  category: string | null;
  pages: unknown;
  related_terms: unknown;
};

function kwList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 24) : [];
}

export function glossaryPagesList(pages: unknown): number[] {
  if (!Array.isArray(pages)) return [];
  const out: number[] = [];
  for (const x of pages) {
    if (typeof x === "number" && Number.isFinite(x)) out.push(Math.floor(x));
    else if (typeof x === "string" && /^\d+$/.test(x.trim())) out.push(parseInt(x.trim(), 10));
  }
  return out;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function parsePageLinkedSectionIds(linked: unknown): Set<string> {
  const out = new Set<string>();
  if (!Array.isArray(linked)) return out;
  for (const x of linked) {
    if (typeof x === "string" && x.trim()) out.add(x.trim());
    else if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      if (typeof o.id === "string" && o.id.trim()) out.add(o.id.trim());
      if (typeof o.section_id === "string" && o.section_id.trim()) out.add(o.section_id.trim());
    }
  }
  return out;
}

export function sectionForPage<T extends PageDetailSectionRow>(page: DocOraclePageRow, sections: T[]): T | null {
  const linkedIds = parsePageLinkedSectionIds(page.linked_sections);
  if (linkedIds.size > 0) {
    const byId = sections.find((s) => linkedIds.has(s.id));
    if (byId) return byId;
  }
  const pn = page.page_number;
  const hits = sections.filter((s) => {
    const ps = s.page_start;
    const pe = s.page_end;
    if (ps != null && pe != null) return pn >= ps && pn <= pe;
    if (ps != null && pe == null) return pn === ps;
    if (ps == null && pe != null) return pn <= pe;
    return false;
  });
  if (hits.length === 0) return null;
  hits.sort((a, b) => {
    const spanA = (a.page_end ?? a.page_start ?? 0) - (a.page_start ?? 0);
    const spanB = (b.page_end ?? b.page_start ?? 0) - (b.page_start ?? 0);
    if (spanA !== spanB) return spanA - spanB;
    return (a.page_start ?? 0) - (b.page_start ?? 0);
  });
  return hits[0] ?? null;
}

export function glossaryTermsForPage(page: DocOraclePageRow, glossary: PageDetailGlossaryRow[]): PageDetailGlossaryRow[] {
  const pn = page.page_number;
  const raw = (page.raw_text || "").toLowerCase();
  const md = (page.markdown || "").toLowerCase();
  const blob = `${raw}\n${md}`;
  const pkw = new Set(pageKeywordsList(page).map((k) => norm(k)));

  return glossary.filter((g) => {
    const gPages = glossaryPagesList(g.pages);
    if (gPages.includes(pn)) return true;

    const termLc = norm(g.term);
    if (termLc.length >= 2 && (blob.includes(termLc) || raw.includes(termLc))) return true;

    const related = kwList(g.related_terms).map(norm);
    for (const t of [termLc, ...related]) {
      if (t.length >= 2 && blob.includes(t)) return true;
    }

    for (const k of pkw) {
      if (!k) continue;
      if (k === termLc) return true;
      if (related.some((r) => r === k)) return true;
    }

    return false;
  });
}

export function sectionKeywordsChips(section: PageDetailSectionRow): string[] {
  return kwList(section.keywords).slice(0, 14);
}
