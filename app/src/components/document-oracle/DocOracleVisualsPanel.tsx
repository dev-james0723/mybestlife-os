"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { DocOracleSectionRow, DocOracleVisualRow } from "@/components/document-oracle/DocOracleWorkspace";
import { DocOracleVisualCard } from "@/components/document-oracle/DocOracleVisualCard";
import { getRelatedSectionTitleForVisual } from "@/components/document-oracle/docOracleVisualLabels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const VISUAL_TYPE_FILTERS = [
  { id: "all", label: "All types" },
  { id: "diagram", label: "Diagram" },
  { id: "photo", label: "Photo" },
  { id: "table", label: "Table" },
  { id: "charts", label: "Charts" },
  { id: "sketch", label: "Sketch" },
  { id: "mixed", label: "Mixed" },
  { id: "other", label: "Other / Unknown" },
] as const;

type VisualTypeId = (typeof VISUAL_TYPE_FILTERS)[number]["id"];

function typeBlob(v: DocOracleVisualRow): string {
  return [
    v.type,
    v.semantic_category,
    JSON.stringify(v.retrieval_tags),
    JSON.stringify(v.extracted_labels),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(t: string, words: string[]): boolean {
  return words.some((w) => t.includes(w));
}

/** Single primary bucket for filter chips. */
function inferVisualFamily(v: DocOracleVisualRow): Exclude<VisualTypeId, "all"> {
  const t = typeBlob(v);
  if (hasAny(t, ["mixed", "composite", "collage", "montage", "layout pack"])) return "mixed";
  if (hasAny(t, ["table", "tabular", "grid", "spreadsheet", "matrix"])) return "table";
  if (hasAny(t, ["chart", "graph", "plot", "histogram", "bar chart", "pie chart", "line chart"])) return "charts";
  if (hasAny(t, ["diagram", "flowchart", "flow chart", "schematic", "schema", "wireframe", "architecture"])) return "diagram";
  if (hasAny(t, ["sketch", "hand-drawn", "hand drawn", "doodle", "draft", "illustration"])) return "sketch";
  if (
    hasAny(t, ["photo", "photograph", "camera", "picture", "portrait", "snapshot"]) &&
    !hasAny(t, ["chart", "diagram", "plot", "graph", "table"])
  ) {
    return "photo";
  }
  if (hasAny(t, ["image", "figure", "fig", "picture"]) && !hasAny(t, ["chart", "diagram", "table"])) return "photo";
  return "other";
}

function matchesVisualType(v: DocOracleVisualRow, filterId: VisualTypeId): boolean {
  if (filterId === "all") return true;
  return inferVisualFamily(v) === filterId;
}

export function DocOracleVisualsPanel(props: {
  visuals: DocOracleVisualRow[];
  sections: DocOracleSectionRow[];
  onOpen: (v: DocOracleVisualRow) => void;
}) {
  const { visuals, sections, onOpen } = props;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<VisualTypeId>("all");
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
      list = list.filter((v) => matchesVisualType(v, cat));
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
      sorted.sort((a, b) => inferVisualFamily(a).localeCompare(inferVisualFamily(b)));
    }
    return sorted;
  }, [visuals, q, cat, pageFilter, sort]);

  if (visuals.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No generated images are available for this document yet.</p>;
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_minmax(150px,180px)_minmax(140px,170px)_minmax(160px,190px)] lg:items-center">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search visuals…"
            className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-muted/60 py-2 pl-9 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Select
          value={cat}
          onValueChange={(value) => value && setCat(value as VisualTypeId)}
          itemToStringLabel={(value) => VISUAL_TYPE_FILTERS.find((f) => f.id === value)?.label ?? String(value)}
        >
          <SelectTrigger className="h-11 min-h-11 w-full min-w-0 rounded-xl bg-muted/60 text-[12px]">
            <SelectValue placeholder="Visual type" />
          </SelectTrigger>
          <SelectContent align="start" className="max-w-[min(92vw,18rem)]">
            {VISUAL_TYPE_FILTERS.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={pageFilter}
          onValueChange={(value) => value && setPageFilter(value)}
          itemToStringLabel={(value) => (value === "all" ? "All pages" : `Page ${value}`)}
        >
          <SelectTrigger className="h-11 min-h-11 w-full min-w-0 rounded-xl bg-muted/60 text-[12px]">
            <SelectValue placeholder="Page" />
          </SelectTrigger>
          <SelectContent align="start" className="max-w-[min(92vw,16rem)]">
            <SelectItem value="all">All pages</SelectItem>
            {pageOptions.map((p) => (
              <SelectItem key={p} value={String(p)}>
                Page {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(value) => value && setSort(value as "doc" | "page" | "category")}
          itemToStringLabel={(value) =>
            value === "doc" ? "Document order" : value === "page" ? "Page number" : "Visual type"
          }
        >
          <SelectTrigger className="h-11 min-h-11 w-full min-w-0 rounded-xl bg-muted/60 text-[12px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent align="start" className="max-w-[min(92vw,16rem)]">
            <SelectItem value="doc">Document order</SelectItem>
            <SelectItem value="page">Page number</SelectItem>
            <SelectItem value="category">Visual type</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
