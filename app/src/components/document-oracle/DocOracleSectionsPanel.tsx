"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, MessageCircle, Search } from "lucide-react";
import {
  buildSectionTree,
  countDescendants,
  flattenSectionTree,
  type SectionTreeNode,
} from "@/components/document-oracle/buildSectionTree";
import { DocOracleRelatedPages } from "@/components/document-oracle/DocOracleRelatedPages";
import { DocOracleRelatedVisuals } from "@/components/document-oracle/DocOracleRelatedVisuals";
import { DocOracleSourcePreview } from "@/components/document-oracle/DocOracleSourcePreview";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import type {
  DocOraclePageRow,
  DocOracleSectionRow,
  DocOracleVisualRow,
} from "@/components/document-oracle/DocOracleWorkspace";
import { cn } from "@/lib/utils";

const limeBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#C8E53A] px-3 py-2 text-[12px] font-semibold text-[#0d0d0d] shadow-sm transition-[filter,transform] duration-[120ms] ease-out hover:scale-[1.02] hover:brightness-[1.12]";

function kwList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 12) : [];
}

function repPages(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is number => typeof x === "number" && Number.isFinite(x)).slice(0, 24);
}

function relatedPagesForSection(section: DocOracleSectionRow, pages: DocOraclePageRow[]): DocOraclePageRow[] {
  const ps = section.page_start;
  const pe = section.page_end;
  const reps = repPages(section.representative_pages);
  const inRange = (p: DocOraclePageRow) => {
    if (ps != null && pe != null) return p.page_number >= ps && p.page_number <= pe;
    if (ps != null && pe == null) return p.page_number === ps;
    if (ps == null && pe != null) return p.page_number <= pe;
    return false;
  };
  let list = pages.filter(inRange);
  if (reps.length) {
    const repSet = new Set(reps);
    const priority = pages.filter((p) => repSet.has(p.page_number));
    const seen = new Set(priority.map((p) => p.id));
    const rest = list.filter((p) => !seen.has(p.id));
    list = [...priority, ...rest];
  }
  if (list.length === 0 && ps != null) {
    return [...pages]
      .sort((a, b) => Math.abs(a.page_number - ps) - Math.abs(b.page_number - ps))
      .slice(0, 5);
  }
  return list;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function subtreeHasMatch(n: SectionTreeNode, m: (s: DocOracleSectionRow) => boolean): boolean {
  if (m(n)) return true;
  return n.children.some((c) => subtreeHasMatch(c, m));
}

function relatedVisualsForSection(
  section: DocOracleSectionRow,
  visuals: DocOracleVisualRow[],
): DocOracleVisualRow[] {
  const ps = section.page_start;
  const pe = section.page_end;
  const sk = kwList(section.keywords).map(norm);

  const inRange = (v: DocOracleVisualRow) => {
    const pg = v.source_page_number;
    if (pg == null || ps == null || pe == null) return false;
    return pg >= ps && pg <= pe;
  };

  let list = visuals.filter(inRange);
  if (list.length === 0 && sk.length) {
    list = visuals.filter((v) => {
      const tags = kwList(v.retrieval_tags).map(norm);
      const title = norm(v.title || "");
      return sk.some((k) => tags.some((t) => t.includes(k) || k.includes(t)) || title.includes(k));
    });
  }
  return list.slice(0, 48);
}

function SectionNavTree(props: {
  nodes: SectionTreeNode[];
  selectedId: string | null;
  onPick: (s: DocOracleSectionRow) => void;
  query: string;
}): ReactNode {
  const { nodes, selectedId, onPick, query } = props;
  const q = query.trim().toLowerCase();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const matches = (s: DocOracleSectionRow) => {
    if (!q) return true;
    if (s.title.toLowerCase().includes(q)) return true;
    return kwList(s.keywords).some((k) => k.toLowerCase().includes(q));
  };

  const renderNodes = (arr: SectionTreeNode[], depth: number): ReactNode => {
    return arr.map((node) => {
      const hasKids = node.children.length > 0;
      const selfMatch = matches(node);
      const childHas = hasKids && subtreeHasMatch(node, matches);
      const visible = !q || selfMatch || childHas;
      if (!visible) return null;

      const defaultExpanded = depth < 2 || Boolean(q);
      const isOpen = open[node.id] ?? defaultExpanded;
      return (
        <div key={node.id} className="select-none">
          <button
            type="button"
            onClick={() => {
              if (hasKids) setOpen((o) => ({ ...o, [node.id]: !isOpen }));
              onPick(node);
            }}
            className={cn(
              "flex w-full items-start gap-1 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition",
              selectedId === node.id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/70",
            )}
            style={{ paddingLeft: 8 + depth * 14 }}
          >
            {hasKids ? (
              isOpen ? (
                <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              )
            ) : (
              <span className="inline-block w-3.5 shrink-0" />
            )}
            <span className="min-w-0 flex-1">
              <span className="font-medium text-foreground">{node.title}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                <span>
                  {node.page_start != null || node.page_end != null
                    ? `pp. ${node.page_start ?? "?"}–${node.page_end ?? "?"}`
                    : "pages n/a"}
                </span>
                {node.children.length > 0 ? (
                  <span className="rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
                    {countDescendants(node)} nested
                  </span>
                ) : null}
              </span>
            </span>
          </button>
          {hasKids && isOpen ? <div>{renderNodes(node.children, depth + 1)}</div> : null}
        </div>
      );
    });
  };

  return <div className="space-y-0.5">{renderNodes(nodes, 0)}</div>;
}

export function DocOracleSectionsPanel(props: {
  sections: DocOracleSectionRow[];
  pages: DocOraclePageRow[];
  visuals: DocOracleVisualRow[];
  filePath: string | null | undefined;
  selectedSection: DocOracleSectionRow | null;
  onSelectSection: (s: DocOracleSectionRow) => void;
  onAskAiSection: (s: DocOracleSectionRow) => void;
  onOpenVisual: (v: DocOracleVisualRow) => void;
  onOpenPageDetail: (p: DocOraclePageRow) => void;
}) {
  const {
    sections,
    pages,
    visuals,
    filePath,
    selectedSection,
    onSelectSection,
    onAskAiSection,
    onOpenVisual,
    onOpenPageDetail,
  } = props;

  const [search, setSearch] = useState("");
  const [previewPage, setPreviewPage] = useState<number | null>(null);

  const tree = useMemo(() => buildSectionTree(sections), [sections]);
  const flat = useMemo(() => flattenSectionTree(tree), [tree]);

  useEffect(() => {
    if (!selectedSection) {
      setPreviewPage(null);
      return;
    }
    const p = selectedSection.page_start;
    setPreviewPage(p != null && p > 0 ? p : null);
  }, [selectedSection?.id, selectedSection?.page_start]);

  const relatedPages = useMemo(
    () => (selectedSection ? relatedPagesForSection(selectedSection, pages) : []),
    [selectedSection, pages],
  );

  const relatedVisualsList = useMemo(
    () => (selectedSection ? relatedVisualsForSection(selectedSection, visuals) : []),
    [selectedSection, visuals],
  );

  const pdfOpenHref =
    filePath && previewPage != null && previewPage > 0
      ? `${knowledgeFilesApiHref(filePath)}#page=${previewPage}`
      : filePath
        ? knowledgeFilesApiHref(filePath)
        : null;

  const header = selectedSection ? (
    <div className="rounded-2xl border border-border bg-muted/50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Selected section</p>
      <p className="mt-1 text-base font-semibold text-foreground">{selectedSection.title}</p>
      <p className="mt-2 text-[12px] text-muted-foreground">{selectedSection.summary}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Pages {selectedSection.page_start ?? "?"} – {selectedSection.page_end ?? "?"}
      </p>
      {kwList(selectedSection.keywords).length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {kwList(selectedSection.keywords).map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(limeBtn)}
          onClick={() => onAskAiSection(selectedSection)}
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Ask AI about this section
        </button>
        {pdfOpenHref ? (
          <a href={pdfOpenHref} target="_blank" rel="noreferrer" className={cn(limeBtn, "no-underline")}>
            Open PDF
          </a>
        ) : null}
      </div>
    </div>
  ) : (
    <p className="rounded-2xl border border-border bg-muted/40 p-4 text-[13px] text-muted-foreground">
      Select a section to see detail, preview, and related pages.
    </p>
  );

  return (
    <div className="flex flex-col gap-4 lg:grid lg:min-h-[480px] lg:grid-cols-[minmax(220px,280px)_1fr] lg:gap-6">
      {/* Navigator */}
      <div className="flex min-h-0 flex-col gap-2 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-8rem)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sections…"
            className="w-full rounded-xl border border-border bg-muted/60 py-2 pl-9 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Mobile: compact dropdown */}
        <div className="lg:hidden">
          <label className="sr-only" htmlFor="doc-oracle-section-select">
            Section
          </label>
          <select
            id="doc-oracle-section-select"
            className="w-full rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-[13px] text-foreground"
            value={selectedSection?.id ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              const row = sections.find((s) => s.id === id);
              if (row) onSelectSection(row);
            }}
          >
            <option value="">Choose a section…</option>
            {flat.map(({ node, depth }) => (
              <option key={node.id} value={node.id}>
                {"—".repeat(depth)} {node.title}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-muted/40 p-2 lg:block">
          {sections.length === 0 ? (
            <p className="p-2 text-[13px] text-muted-foreground">No sections yet.</p>
          ) : (
            <SectionNavTree
              nodes={tree}
              selectedId={selectedSection?.id ?? null}
              onPick={onSelectSection}
              query={search}
            />
          )}
        </div>
      </div>

      {/* Detail + preview + related */}
      <div className="flex min-w-0 flex-col gap-4">
        {header}

        <DocOracleSourcePreview filePath={filePath} previewPage={previewPage} />

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Related pages</p>
          <DocOracleRelatedPages
            pages={relatedPages}
            onSelectPage={(p) => setPreviewPage(p.page_number)}
            onOpenPageDetail={onOpenPageDetail}
          />
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Related visuals</p>
          <DocOracleRelatedVisuals visuals={relatedVisualsList} onOpen={onOpenVisual} />
        </div>
      </div>
    </div>
  );
}
