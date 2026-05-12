"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { DocOracleSectionRow, DocOracleVisualRow } from "@/components/document-oracle/DocOracleWorkspace";
import { DocOracleVisualCard } from "@/components/document-oracle/DocOracleVisualCard";
import { getRelatedSectionTitleForVisual } from "@/components/document-oracle/docOracleVisualLabels";

const CATEGORIES = [
  "all",
  "image",
  "table",
  "figure",
  "chart",
  "formula",
  "diagram",
  "unknown",
] as const;

type Cat = (typeof CATEGORIES)[number];
export function DocOracleVisualsPanel(props: {
  visuals: DocOracleVisualRow[];
  sections: DocOracleSectionRow[];
  onOpen: (v: DocOracleVisualRow) => void;
}) {
  const { visuals, sections, onOpen } = props;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Cat>("all");
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [sort, setSort] = useState<"doc" | "page" | "category">("doc");

  const pageOptions = useMemo(() => {
    const nums = new Set<number>();
    for (const v of visuals) {
      if (v.source_page_number != null) nums.add(v.source_page_number);
    }
    return Array.from(nums).sort((a, b) => a - b);
  }, [visuals]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = visuals.filter((v) => v.image_path);
    if (cat !== "all") {
      list = list.filter((v) => {
        const a = (v.semantic_category || v.type || "unknown").toLowerCase();
        return a.includes(cat) || (cat === "image" && a === "image");
      });
    }
    if (pageFilter !== "all") {
      const pn = Number(pageFilter);
      if (Number.isFinite(pn)) list = list.filter((v) => v.source_page_number === pn);
    }
    if (t) {
      list = list.filter((v) => {
        const blob = [
          v.title,
          v.description,
          v.type,
          v.semantic_category,
          JSON.stringify(v.retrieval_tags),
          JSON.stringify(v.extracted_labels),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(t);
      });
    }
    const sorted = [...list];
    if (sort === "page") {
      sorted.sort((a, b) => {
        const ap = a.source_page_number ?? 99999;
        const bp = b.source_page_number ?? 99999;
        if (ap !== bp) return ap - bp;
        return (a.title || "").localeCompare(b.title || "");
      });
    } else if (sort === "category") {
      sorted.sort((a, b) =>
        (a.semantic_category || a.type || "").localeCompare(b.semantic_category || b.type || ""),
      );
    }
    return sorted;
  }, [visuals, q, cat, pageFilter, sort]);

  if (visuals.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No visual assets were detected in this MinerU output.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search visuals…"
            className="w-full rounded-xl border border-border bg-muted/60 py-2 pl-9 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value as Cat)}
          className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-[12px] text-foreground lg:w-40"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </select>
        <select
          value={pageFilter}
          onChange={(e) => setPageFilter(e.target.value)}
          className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-[12px] text-foreground lg:w-44"
        >
          <option value="all">All pages</option>
          {pageOptions.map((p) => (
            <option key={p} value={String(p)}>
              Page {p}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "doc" | "page" | "category")}
          className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-[12px] text-foreground lg:w-48"
        >
          <option value="doc">Document order</option>
          <option value="page">Page number</option>
          <option value="category">Category</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((v) => (
          <DocOracleVisualCard
            key={v.id}
            visual={v}
            relatedSectionTitle={getRelatedSectionTitleForVisual(v, sections)}
            onOpen={() => onOpen(v)}
          />
        ))}
      </div>
      {filtered.length === 0 ? <p className="text-[13px] text-muted-foreground">No visuals match filters.</p> : null}
    </div>
  );
}
