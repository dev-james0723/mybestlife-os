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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Pages</h2>
        <p className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          Browse all {pages.length} pages of this document. Click any page for full details.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card/70 px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages…"
            className="w-full rounded-xl border border-border bg-background/55 py-2.5 pl-10 pr-3 text-[13px] text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary/40"
            aria-label="Search pages"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap gap-2">
            {filterDefs.map((chip) => (
              <button data-control-variant="outline" data-selected={filter === chip.id}
                key={chip.id}
                type="button"
                onClick={() => setFilter(chip.id)}
                className={cn(
                  "min-h-11 max-w-full rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition sm:min-h-0",
                  filter === chip.id
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border bg-background/45 text-muted-foreground hover:border-primary/25 hover:text-foreground",
                )}
              >
                <span className="line-clamp-1">{chip.label}</span>
              </button>
            ))}
          </div>
          <div className="flex min-w-0 items-center gap-2 lg:shrink-0">
            <label htmlFor="doc-oracle-pages-sort" className="text-[11px] text-muted-foreground">
              Sort
            </label>
            <Select
              value={sort}
              onValueChange={(value) => value && setSort(value as PageSortId)}
              itemToStringLabel={(value) => sortDefs.find((s) => s.id === value)?.label ?? String(value)}
            >
              <SelectTrigger
                id="doc-oracle-pages-sort"
                className="h-11 min-h-11 w-full min-w-0 rounded-xl bg-background/55 text-[12px] sm:w-48"
              >
                <SelectValue placeholder="Sort pages" />
              </SelectTrigger>
              <SelectContent align="end" className="max-w-[min(92vw,16rem)]">
                {sortDefs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">No pages match your search or filters.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
