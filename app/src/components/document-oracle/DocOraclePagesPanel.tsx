"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { DocOraclePageRow } from "@/components/document-oracle/docOraclePageTypes";
import {
  getPageTitle,
  inferPageTypeBadge,
  isVisualHeavyPage,
  pageSearchBlob,
} from "@/components/document-oracle/docOraclePageHelpers";
import { DocOraclePageCard } from "@/components/document-oracle/DocOraclePageCard";
import { cn } from "@/lib/utils";

type PageFilterId = "all" | "visuals" | "cover" | "contents" | "tables" | "blank" | "visualHeavy";
type PageSortId = "document" | "visualFirst" | "textHeavy";

const filterDefs: { id: PageFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "visuals", label: "Has visuals" },
  { id: "cover", label: "Cover" },
  { id: "contents", label: "Contents" },
  { id: "tables", label: "Tables" },
  { id: "blank", label: "Blank" },
  { id: "visualHeavy", label: "Visual-heavy" },
];

const sortDefs: { id: PageSortId; label: string }[] = [
  { id: "document", label: "Document order" },
  { id: "visualFirst", label: "Visual pages first" },
  { id: "textHeavy", label: "Text-heavy first" },
];

function matchesFilter(page: DocOraclePageRow, f: PageFilterId): boolean {
  const badge = inferPageTypeBadge(page);
  switch (f) {
    case "all":
      return true;
    case "visuals":
      return page.has_visual_assets;
    case "cover":
      return badge === "cover";
    case "contents":
      return badge === "toc";
    case "tables":
      return badge === "table";
    case "blank":
      return badge === "blank";
    case "visualHeavy":
      return isVisualHeavyPage(page);
    default:
      return true;
  }
}

function applySort(pages: DocOraclePageRow[], sort: PageSortId): DocOraclePageRow[] {
  const copy = [...pages];
  if (sort === "document") {
    copy.sort((a, b) => a.page_number - b.page_number);
    return copy;
  }
  if (sort === "visualFirst") {
    copy.sort((a, b) => {
      const va = a.has_visual_assets ? 1 : 0;
      const vb = b.has_visual_assets ? 1 : 0;
      if (va !== vb) return vb - va;
      return a.page_number - b.page_number;
    });
    return copy;
  }
  copy.sort((a, b) => {
    const la = a.raw_text?.length ?? 0;
    const lb = b.raw_text?.length ?? 0;
    if (la !== lb) return lb - la;
    return a.page_number - b.page_number;
  });
  return copy;
}

export function DocOraclePagesPanel(props: {
  pages: DocOraclePageRow[];
  filePath: string | null | undefined;
  onOpenSourcePage?: (pageNum: number) => void;
  onAskAiPage?: (p: DocOraclePageRow) => void;
  onOpenPageDetail: (p: DocOraclePageRow) => void;
}) {
  const { pages, filePath, onOpenSourcePage, onAskAiPage, onOpenPageDetail } = props;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<PageFilterId>("all");
  const [sort, setSort] = useState<PageSortId>("document");

  const titleByPage = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pages) {
      m.set(p.id, getPageTitle(p));
    }
    return m;
  }, [pages]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = pages.filter((p) => matchesFilter(p, filter));
    if (needle) {
      list = list.filter((p) => pageSearchBlob(p, titleByPage.get(p.id) ?? "").includes(needle));
    }
    return applySort(list, sort);
  }, [pages, q, filter, sort, titleByPage]);

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="mx-auto max-w-6xl space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Pages</h2>
        <p className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          Browse all {pages.length} pages of this document. Click any page for full details.
        </p>
      </div>

      <div className="mx-auto max-w-6xl space-y-4 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-neutral-950/85 to-neutral-950/50 px-3 py-5 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages…"
            className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-[13px] text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-white/20"
            aria-label="Search pages"
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap gap-2">
            {filterDefs.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilter(chip.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition",
                  filter === chip.id
                    ? "border-[#C8E53A]/40 bg-[#C8E53A]/12 text-[#d4f06a]"
                    : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/20 hover:text-foreground",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <label htmlFor="doc-oracle-pages-sort" className="text-[11px] text-muted-foreground">
              Sort
            </label>
            <select
              id="doc-oracle-pages-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as PageSortId)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-foreground"
            >
              {sortDefs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">No pages match your search or filters.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <DocOraclePageCard
                key={p.id}
                page={p}
                filePath={filePath}
                onOpenDetail={onOpenPageDetail}
                onOpenSourcePage={onOpenSourcePage}
                onAskAiPage={onAskAiPage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
