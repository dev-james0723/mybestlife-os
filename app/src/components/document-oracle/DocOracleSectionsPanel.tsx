"use client";

import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { ChevronDown, ChevronRight, MessageCircle, Search } from "lucide-react";
import {
  buildSectionTree,
  countDescendants,
  flattenSectionTree,
  type SectionTreeNode,
} from "@/components/document-oracle/buildSectionTree";
import { DocOracleRelatedPages } from "@/components/document-oracle/DocOracleRelatedPages";
import { DocOracleRelatedVisuals } from "@/components/document-oracle/DocOracleRelatedVisuals";
import { formatDocOraclePageRangeWithLabel } from "@/components/document-oracle/docOraclePageRange";
import { DocOracleSourcePreview } from "@/components/document-oracle/DocOracleSourcePreview";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import type {
  DocOraclePageRow,
  DocOracleSectionRow,
  DocOracleVisualRow,
} from "@/components/document-oracle/DocOracleWorkspace";
import { AnimatedCollapse } from "@/components/motion/AnimatedCollapse";
import { cleanDisplayTags } from "@/components/document-oracle/docOracleDisplay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gsap, registerGSAP } from "@/lib/motion/register-gsap";
import { cn } from "@/lib/utils";

registerGSAP();

const primaryActionBtn =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground shadow-sm transition-[background,transform] duration-150 ease-out hover:bg-primary/90 active:translate-y-px";

function kwList(v: unknown): string[] {
  return cleanDisplayTags(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [], 8).tags;
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
            data-doc-oracle-section-nav-item
            data-doc-oracle-section-selected={selectedId === node.id ? "true" : undefined}
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
                <span>{formatDocOraclePageRangeWithLabel(node)}</span>
                {node.children.length > 0 ? (
                  <span className="rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
                    {countDescendants(node)} nested
                  </span>
                ) : null}
              </span>
            </span>
          </button>
          {hasKids ? <AnimatedCollapse open={isOpen}>{renderNodes(node.children, depth + 1)}</AnimatedCollapse> : null}
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

  const rootRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [manualPreview, setManualPreview] = useState<{ sectionId: string; page: number } | null>(null);

  const tree = useMemo(() => buildSectionTree(sections), [sections]);
  const flat = useMemo(() => flattenSectionTree(tree), [tree]);

  const defaultPreviewPage =
    selectedSection?.page_start != null && selectedSection.page_start > 0 ? selectedSection.page_start : null;
  const previewPage =
    selectedSection && manualPreview?.sectionId === selectedSection.id ? manualPreview.page : defaultPreviewPage;
  const selectSection = (section: DocOracleSectionRow) => {
    setManualPreview(null);
    onSelectSection(section);
  };

  const relatedPages = useMemo(
    () => (selectedSection ? relatedPagesForSection(selectedSection, pages) : []),
    [selectedSection, pages],
  );

  const relatedVisualsList = useMemo(
    () => (selectedSection ? relatedVisualsForSection(selectedSection, visuals) : []),
    [selectedSection, visuals],
  );

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: "(prefers-reduced-motion: reduce)" }, (context) => {
        const reduceMotion = Boolean(context.conditions?.reduceMotion);
        const detailItems = gsap.utils.toArray<HTMLElement>("[data-doc-oracle-section-motion]", root);
        const selectedItem = root.querySelector<HTMLElement>('[data-doc-oracle-section-selected="true"]');

        if (reduceMotion) {
          gsap.set(detailItems, { autoAlpha: 1, clearProps: "transform,filter" });
          gsap.set(selectedItem, { clearProps: "transform,boxShadow" });
          return;
        }

        if (selectedItem) {
          gsap.fromTo(
            selectedItem,
            { x: -2, scale: 0.992, boxShadow: "0 0 0 rgba(0,0,0,0)" },
            {
              x: 0,
              scale: 1,
              boxShadow: "0 10px 28px rgba(0,0,0,0.14)",
              duration: 0.34,
              ease: "power3.out",
              overwrite: "auto",
              clearProps: "transform,boxShadow",
            },
          );
        }

        if (detailItems.length) {
          gsap.fromTo(
            detailItems,
            { autoAlpha: 0, y: 10, scale: 0.986, filter: "blur(4px)" },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              duration: 0.32,
              ease: "power3.out",
              stagger: 0.045,
              overwrite: "auto",
              clearProps: "transform,filter",
            },
          );
        }
      });
      return () => mm.revert();
    },
    {
      scope: rootRef,
      dependencies: [selectedSection?.id, previewPage, relatedPages.length, relatedVisualsList.length],
      revertOnUpdate: true,
    },
  );

  const pdfOpenHref =
    filePath && previewPage != null && previewPage > 0
      ? `${knowledgeFilesApiHref(filePath)}#page=${previewPage}`
      : filePath
        ? knowledgeFilesApiHref(filePath)
        : null;

  const header = selectedSection ? (
    <div className="rounded-2xl border border-border bg-muted/50 p-4" data-doc-oracle-section-motion>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Selected section</p>
      <p className="mt-1 text-base font-semibold text-foreground">{selectedSection.title}</p>
      <p className="mt-2 text-[12px] text-muted-foreground">{selectedSection.summary}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {formatDocOraclePageRangeWithLabel(selectedSection)}
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
          className={cn(primaryActionBtn)}
          onClick={() => onAskAiSection(selectedSection)}
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Ask Doc Oracle about this section
        </button>
        {pdfOpenHref ? (
          <a href={pdfOpenHref} target="_blank" rel="noreferrer" className={cn(primaryActionBtn, "no-underline")}>
            Open PDF
          </a>
        ) : null}
      </div>
    </div>
  ) : (
    <p className="rounded-2xl border border-border bg-muted/40 p-4 text-[13px] text-muted-foreground" data-doc-oracle-section-motion>
      Select a section to see detail, preview, and related pages.
    </p>
  );

  return (
    <div ref={rootRef} className="flex flex-col gap-4 md:grid md:min-h-[480px] md:grid-cols-[minmax(200px,0.38fr)_minmax(0,1fr)] md:gap-5 lg:grid-cols-[minmax(220px,280px)_1fr] lg:gap-6">
      {/* Navigator */}
      <div className="flex min-h-0 flex-col gap-2 md:sticky md:top-4 md:max-h-[calc(100dvh-8rem)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sections…"
            className="w-full rounded-xl border border-border bg-muted/60 py-2 pl-9 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Narrow screens: compact dropdown */}
        <div className="md:hidden">
          <Select
            value={selectedSection?.id ?? "__none"}
            onValueChange={(id) => {
              if (id === "__none") return;
              const row = sections.find((s) => s.id === id);
              if (row) selectSection(row);
            }}
            itemToStringLabel={(id) => (id === "__none" ? "Choose a section" : sections.find((s) => s.id === id)?.title ?? "Choose a section")}
          >
            <SelectTrigger className="h-11 min-h-11 w-full min-w-0 rounded-xl bg-muted/60 text-[13px]">
              <SelectValue placeholder="Choose a section..." />
            </SelectTrigger>
            <SelectContent align="start" className="max-w-[min(92vw,22rem)]">
              <SelectItem value="__none">Choose a section...</SelectItem>
              {flat.map(({ node, depth }) => (
                <SelectItem key={node.id} value={node.id}>
                  <span className="truncate">
                    {"-".repeat(depth)} {node.title}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-muted/40 p-2 md:block">
          {sections.length === 0 ? (
            <p className="p-2 text-[13px] text-muted-foreground">No sections are available yet.</p>
          ) : (
            <SectionNavTree
              nodes={tree}
              selectedId={selectedSection?.id ?? null}
              onPick={selectSection}
              query={search}
            />
          )}
        </div>
      </div>

      {/* Detail + preview + related */}
      <div className="flex min-w-0 flex-col gap-4">
        {header}

        <div data-doc-oracle-section-motion>
          <DocOracleSourcePreview filePath={filePath} previewPage={previewPage} />
        </div>

        <div data-doc-oracle-section-motion>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Related pages</p>
          <DocOracleRelatedPages
            pages={relatedPages}
            onSelectPage={(p) => {
              if (!selectedSection) return;
              setManualPreview({ sectionId: selectedSection.id, page: p.page_number });
            }}
            onOpenPageDetail={onOpenPageDetail}
          />
        </div>

        <div data-doc-oracle-section-motion>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Related visuals</p>
          <DocOracleRelatedVisuals visuals={relatedVisualsList} onOpen={onOpenVisual} />
        </div>
      </div>
    </div>
  );
}
