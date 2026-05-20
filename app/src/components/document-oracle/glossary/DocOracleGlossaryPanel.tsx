"use client";

import { useCallback, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { DocOracleAnalysis, DocOracleGlossaryRow, DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import type { DocOracleChatRetrievalFocus } from "@/components/document-oracle/DocOracleChatPanel";
import { GlossaryAlphabetIndex, termAlphabetBucket, type GlossaryLetterFilter } from "@/components/document-oracle/glossary/GlossaryAlphabetIndex";
import { GlossaryCategoryFilters } from "@/components/document-oracle/glossary/GlossaryCategoryFilters";
import { GlossaryTermCard } from "@/components/document-oracle/glossary/GlossaryTermCard";
import { GlossaryTermDetailModal } from "@/components/document-oracle/glossary/GlossaryTermDetailModal";
import {
  categorySortIndex,
  compareGlossaryTermsLocale,
  displayGlossaryCategoryLabel,
  isTraditionalChineseGlossaryContext,
  normalizeGlossaryCategory,
  type GlossaryDocumentContext,
} from "@/components/document-oracle/glossary/glossaryCategoryInference";
import { glossaryMatchesSearch, sectionsOverlappingGlossaryPages } from "@/components/document-oracle/glossary/glossarySearchAndSections";
import { normalizeGlossaryPages } from "@/components/document-oracle/glossary/glossaryNormalize";
import { buildGlossaryTermAskPrompt } from "@/components/document-oracle/glossary/glossaryAskAi";

type Enriched = {
  row: DocOracleGlossaryRow;
  canonical: string;
  label: string;
};

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

function searchScore(term: DocOracleGlossaryRow, q: string, categoryLabel: string): number {
  const qt = q.trim().toLowerCase();
  if (!qt) return 0;
  const t = term.term.toLowerCase();
  const d = (term.definition || "").toLowerCase();
  if (t.startsWith(qt)) return 100;
  if (t.includes(qt)) return 80;
  if (d.includes(qt)) return 60;
  if (categoryLabel.toLowerCase().includes(qt)) return 45;
  const rel = Array.isArray(term.related_terms)
    ? (term.related_terms as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  if (rel.some((r) => r.toLowerCase().includes(qt))) return 40;
  const pagesBlob = normalizeGlossaryPages(term.pages).join(" ");
  if (pagesBlob.includes(qt)) return 35;
  return 10;
}

function sortChipCategories(items: { canonical: string; label: string }[]): string[] {
  const seen = new Set<string>();
  const uniq: { canonical: string; label: string }[] = [];
  for (const it of items) {
    if (seen.has(it.label)) continue;
    seen.add(it.label);
    uniq.push(it);
  }
  uniq.sort((a, b) => {
    const c = categorySortIndex(a.canonical) - categorySortIndex(b.canonical);
    if (c !== 0) return c;
    return a.label.localeCompare(b.label, "en");
  });
  return uniq.map((x) => x.label);
}

type Props = {
  glossary: DocOracleGlossaryRow[];
  sections: DocOracleSectionRow[];
  analysis: DocOracleAnalysis | null;
  /** App locale for collation fallback, e.g. `en` or `zh-TW` */
  appLocale: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filePath: string | null | undefined;
  onOpenSourcePage?: (page: number) => void;
  onFocusSection: (s: DocOracleSectionRow) => void;
  onSwitchToSections: () => void;
  onAskGlossaryInChat: (prompt: string, retrievalFocus: DocOracleChatRetrievalFocus | null) => void;
};

export function DocOracleGlossaryPanel(props: Props) {
  const {
    glossary,
    sections,
    analysis,
    appLocale,
    searchQuery,
    onSearchChange,
    filePath,
    onOpenSourcePage,
    onFocusSection,
    onSwitchToSections,
    onAskGlossaryInChat,
  } = props;

  const docCtx: GlossaryDocumentContext = useMemo(
    () => ({
      language: analysis?.language ?? null,
      documentType: analysis?.document_type ?? null,
    }),
    [analysis?.language, analysis?.document_type],
  );

  const zhUi = isTraditionalChineseGlossaryContext(docCtx);
  const collatorLocale = zhUi ? "zh-Hant" : appLocale.startsWith("zh") ? "zh-Hant" : "en";

  const enriched: Enriched[] = useMemo(() => {
    return glossary.map((row) => {
      const canonical = normalizeGlossaryCategory(row, docCtx);
      const label = displayGlossaryCategoryLabel(canonical, docCtx);
      return { row, canonical, label };
    });
  }, [glossary, docCtx]);

  const [letter, setLetter] = useState<GlossaryLetterFilter>("all");
  const [cat, setCat] = useState<string | "all">("all");
  const [selected, setSelected] = useState<DocOracleGlossaryRow | null>(null);

  const glossaryIndex = useMemo(() => {
    const m = new Map<string, DocOracleGlossaryRow>();
    for (const g of glossary) {
      const k = normKey(g.term);
      if (!m.has(k)) m.set(k, g);
    }
    return m;
  }, [glossary]);

  const afterSearch = useMemo(
    () => enriched.filter((e) => glossaryMatchesSearch(e.row, e.label, searchQuery)),
    [enriched, searchQuery],
  );

  const forLetterAvailability = useMemo(() => {
    return afterSearch.filter((e) => (cat === "all" ? true : e.label === cat));
  }, [afterSearch, cat]);

  const availableLatin = useMemo(() => {
    const s = new Set<string>();
    for (const e of forLetterAvailability) {
      const b = termAlphabetBucket(e.row.term);
      if (b !== "all" && b !== "nonLatin") s.add(b);
    }
    return s;
  }, [forLetterAvailability]);

  const hasNonLatin = useMemo(
    () => forLetterAvailability.some((e) => termAlphabetBucket(e.row.term) === "nonLatin"),
    [forLetterAvailability],
  );

  const matchesLetter = useCallback(
    (e: Enriched) => {
      if (letter === "all") return true;
      const b = termAlphabetBucket(e.row.term);
      if (letter === "nonLatin") return b === "nonLatin";
      return b === letter;
    },
    [letter],
  );

  const forCategoryChips = useMemo(() => afterSearch.filter(matchesLetter), [afterSearch, matchesLetter]);

  const chipCategoryLabels = useMemo(() => {
    return sortChipCategories(forCategoryChips.map((e) => ({ canonical: e.canonical, label: e.label })));
  }, [forCategoryChips]);

  const visible = useMemo(() => {
    let list = afterSearch.filter(matchesLetter);
    if (cat !== "all") list = list.filter((e) => e.label === cat);
    const q = searchQuery.trim();
    if (q) {
      list = [...list].sort((a, b) => {
        const ds = searchScore(b.row, q, b.label) - searchScore(a.row, q, a.label);
        if (ds !== 0) return ds;
        return compareGlossaryTermsLocale(a.row, b.row, collatorLocale);
      });
    } else {
      list = [...list].sort((a, b) => compareGlossaryTermsLocale(a.row, b.row, collatorLocale));
    }
    return list;
  }, [afterSearch, matchesLetter, cat, searchQuery, collatorLocale]);

  const selectedOverlap = useMemo(() => {
    if (!selected) return [];
    return sectionsOverlappingGlossaryPages(normalizeGlossaryPages(selected.pages), sections);
  }, [selected, sections]);

  const selectedLabel = useMemo(() => {
    if (!selected) return "";
    const hit = enriched.find((e) => e.row.id === selected.id);
    return hit?.label ?? displayGlossaryCategoryLabel(normalizeGlossaryCategory(selected, docCtx), docCtx);
  }, [selected, enriched, docCtx]);

  const askAboutTerm = (row: DocOracleGlossaryRow) => {
    const pages = normalizeGlossaryPages(row.pages);
    const lo = pages.length ? Math.min(...pages) : null;
    const hi = pages.length ? Math.max(...pages) : null;
    onAskGlossaryInChat(buildGlossaryTermAskPrompt(row), {
      pageStart: lo,
      pageEnd: hi,
      sectionTitle: null,
    });
  };

  const allLabel = zhUi ? "全部" : "All";
  const nonLatinLabel = zhUi ? "中" : "#";
  const title = zhUi ? "詞彙表" : "Glossary";
  const subtitle = zhUi
    ? `從本文件萃取的 ${glossary.length} 個詞彙與概念。`
    : `${glossary.length} terms and concepts extracted from this document.`;
  const searchPh = zhUi ? "搜尋詞彙…" : "Search terms…";
  const emptyMsg = zhUi ? "沒有符合搜尋的詞彙。" : "No glossary terms match your search.";
  const askAiLabel = zhUi ? "向 Doc Oracle 詢問此詞彙" : "Ask Doc Oracle about this term";
  const openSourceLabel = zhUi ? "開啟來源 PDF" : "Open source PDF";
  const sectionsTabLabel = zhUi ? "章節" : "Sections";

  return (
    <div className="space-y-4 text-[13px] leading-relaxed text-muted-foreground">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">{subtitle}</p>
      </div>

      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPh}
          className="w-full rounded-xl border border-border bg-muted/60 py-2.5 pl-9 pr-10 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          aria-label={searchPh}
        />
        {searchQuery.trim() ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
            onClick={() => onSearchChange("")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <GlossaryAlphabetIndex
        value={letter}
        onChange={setLetter}
        availableLatin={availableLatin}
        hasNonLatin={hasNonLatin}
        nonLatinLabel={nonLatinLabel}
        allLabel={allLabel}
      />

      <GlossaryCategoryFilters categories={chipCategoryLabels} value={cat} onChange={setCat} allLabel={allLabel} />

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-6 text-center text-[13px]">{emptyMsg}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((e) => (
            <GlossaryTermCard
              key={e.row.id}
              term={e.row}
              categoryLabel={e.label}
              onOpen={() => setSelected(e.row)}
              onAskAi={() => askAboutTerm(e.row)}
            />
          ))}
        </div>
      )}

      <GlossaryTermDetailModal
        open={selected != null}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
        term={selected}
        categoryLabel={selectedLabel}
        sectionsOverlap={selectedOverlap}
        glossaryIndex={glossaryIndex}
        filePath={filePath}
        onOpenSourcePage={onOpenSourcePage}
        onFocusSection={onFocusSection}
        onSwitchToSections={onSwitchToSections}
        onAskAiAboutTerm={askAboutTerm}
        onSearchRelated={(label) => onSearchChange(label)}
        onOpenRelatedTerm={(row) => setSelected(row)}
        askAiLabel={askAiLabel}
        openSourceLabel={openSourceLabel}
        sectionsTabLabel={sectionsTabLabel}
        zhUi={zhUi}
      />
    </div>
  );
}
