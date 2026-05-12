"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Search, Sparkles } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import type { LocaleUrlSlug } from "@/lib/i18n/locale-slug";
import type { KnowledgeItem } from "@/types/knowledge";
import { DocOracleMarkdown } from "@/components/document-oracle/DocOracleMarkdown";
import {
  DocOracleChatPanel,
  type DocOracleChatPanelHandle,
  type DocOracleChatRetrievalFocus,
} from "@/components/document-oracle/DocOracleChatPanel";
import { DocOracleTabBar } from "@/components/document-oracle/DocOracleTabBar";
import { DocOracleSectionsPanel } from "@/components/document-oracle/DocOracleSectionsPanel";
import { DocOracleVisualsPanel } from "@/components/document-oracle/DocOracleVisualsPanel";
import { DocOracleVisualPreviewModal } from "@/components/document-oracle/DocOracleVisualPreviewModal";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import { displayVisualTitle, getRelatedSectionTitleForVisual } from "@/components/document-oracle/docOracleVisualLabels";

const limeBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#C8E53A] px-4 py-2 text-[13px] font-semibold text-[#0d0d0d] shadow-sm transition-[filter,transform] duration-[120ms] ease-out hover:scale-[1.02] hover:brightness-[1.12]";

export type DocOracleAnalysis = {
  id: string;
  document_title: string | null;
  summary: string | null;
  total_pages: number | null;
  parser: string | null;
  parser_version: string | null;
  status: string;
  document_type: string | null;
  language: string | null;
};

export type DocOraclePageRow = {
  id: string;
  page_number: number;
  page_summary: string | null;
  keywords: unknown;
  has_visual_assets: boolean;
  markdown: string | null;
  rendered_image_path: string | null;
};

export type DocOracleSectionRow = {
  id: string;
  title: string;
  level: number;
  parent_id: string | null;
  page_start: number | null;
  page_end: number | null;
  summary: string | null;
  keywords: unknown;
  representative_pages: unknown;
};

export type DocOracleGlossaryRow = {
  id: string;
  term: string;
  definition: string | null;
  category: string | null;
  pages: unknown;
  related_terms: unknown;
};

export type DocOracleVisualRow = {
  id: string;
  type: string | null;
  semantic_category: string | null;
  title: string | null;
  description: string | null;
  image_path: string | null;
  source_page_number: number | null;
  extracted_labels: unknown;
  retrieval_tags: unknown;
  related_terms: unknown;
  related_sections: unknown;
  confidence: number | null;
};

function kwList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 12) : [];
}

function isCompletedAnalysis(a: DocOracleAnalysis | null): a is DocOracleAnalysis {
  return a?.status === "completed";
}

export function DocOracleWorkspace(props: {
  locale: LocaleUrlSlug;
  item: KnowledgeItem;
  analysis: DocOracleAnalysis | null;
  pages: DocOraclePageRow[];
  sections: DocOracleSectionRow[];
  glossary: DocOracleGlossaryRow[];
  visuals: DocOracleVisualRow[];
  chunkCount: number;
  suggestedQuestions: string[];
  showDebugLink: boolean;
}) {
  const { locale, item, analysis, pages, sections, glossary, visuals, chunkCount, suggestedQuestions, showDebugLink } =
    props;
  const backHref = useMemo(() => withLocalePrefix(locale, "/knowledge-base"), [locale]);
  const [tab, setTab] = useState("overview");
  const [pageDetail, setPageDetail] = useState<DocOraclePageRow | null>(null);
  const [sectionDetail, setSectionDetail] = useState<DocOracleSectionRow | null>(null);
  const [glossQ, setGlossQ] = useState("");
  const [glossCat, setGlossCat] = useState<string | "all">("all");
  const [visualPreview, setVisualPreview] = useState<DocOracleVisualRow | null>(null);
  const chatRef = useRef<DocOracleChatPanelHandle>(null);

  const focusForSection = (s: DocOracleSectionRow): DocOracleChatRetrievalFocus => ({
    pageStart: s.page_start,
    pageEnd: s.page_end,
    sectionTitle: s.title,
  });

  const handleAskSection = (s: DocOracleSectionRow) => {
    const prompt = `Please summarize this section with citations:
Section: ${s.title}
Page range: ${s.page_start ?? "?"}-${s.page_end ?? "?"}
Focus on key requirements, action items, dates, people, fees, and related visuals.
Cite only supported document passages and include page numbers where possible.`;
    setTab("chat");
    requestAnimationFrame(() => {
      void chatRef.current?.sendMessage(prompt, focusForSection(s));
    });
  };

  const handleAskVisual = (v: DocOracleVisualRow) => {
    const prompt = `Please describe this visual and its role in the document with citations:
Visual: ${displayVisualTitle(v)}
Page: ${v.source_page_number ?? "unknown"}
Explain what it shows and how it relates to the surrounding document. Cite pages where possible.`;
    setVisualPreview(null);
    setTab("chat");
    requestAnimationFrame(() => {
      const pg = v.source_page_number;
      void chatRef.current?.sendMessage(prompt, {
        pageStart: pg,
        pageEnd: pg,
        sectionTitle: null,
      });
    });
  };

  const readyAnalysis = isCompletedAnalysis(analysis) ? analysis : null;
  const isReady = readyAnalysis !== null;

  const topicList = useMemo(() => {
    const fromSections = sections.slice(0, 12).map((s) => s.title);
    const fromGloss = glossary.slice(0, 16).map((g) => g.term);
    return Array.from(new Set([...fromSections, ...fromGloss])).slice(0, 18);
  }, [sections, glossary]);

  const overviewBody = useMemo(() => {
    const joined = pages
      .slice(0, 4)
      .map((p) => p.markdown || "")
      .join("\n\n---\n\n");
    const cap = joined.slice(0, 14_000);
    return cap || item.rawContent?.slice(0, 14_000) || "";
  }, [pages, item.rawContent]);

  const filteredGlossary = useMemo(() => {
    const q = glossQ.trim().toLowerCase();
    return glossary.filter((g) => {
      if (glossCat !== "all" && (g.category || "").toLowerCase() !== glossCat.toLowerCase()) return false;
      if (!q) return true;
      return (
        g.term.toLowerCase().includes(q) ||
        (g.definition || "").toLowerCase().includes(q) ||
        kwList(g.related_terms).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [glossary, glossQ, glossCat]);

  const glossCategories = useMemo(() => {
    const s = new Set<string>();
    for (const g of glossary) {
      if (g.category) s.add(g.category);
    }
    return Array.from(s);
  }, [glossary]);

  const chatStarters = useMemo(() => {
    const base = suggestedQuestions.length
      ? suggestedQuestions
      : [
          "What is this document mainly about?",
          "Summarize the key requirements.",
          "What are the important dates, fees, or action items?",
        ];
    return base;
  }, [suggestedQuestions]);

  return (
    <div className="doc-oracle-workspace relative min-h-[100dvh] w-full overflow-x-hidden pt-[max(0px,env(safe-area-inset-top))] text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-2">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Knowledge Base
            </Link>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/60 text-[#C8E53A] shadow-inner">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                  {analysis?.document_title ?? item.title}
                </h1>
                <p className="text-[12px] text-muted-foreground">
                  {isReady ? (
                    <>
                      Doc Oracle · {readyAnalysis.parser ?? "MinerU"}
                      {readyAnalysis.parser_version ? ` · ${readyAnalysis.parser_version}` : ""}
                    </>
                  ) : (
                    <>
                      Doc Oracle ·{" "}
                      {analysis?.status
                        ? `Analysis: ${analysis.status}`
                        : "Waiting for extraction (no analysis row yet)"}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {item.filePath ? (
              <a
                href={knowledgeFilesApiHref(item.filePath)}
                target="_blank"
                rel="noreferrer"
                className={cn(limeBtn, "no-underline")}
                aria-label="Open original file in a new tab"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Source file
              </a>
            ) : null}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4, ease: "easeOut" }}
          className={cn("lg-glass-panel min-h-[420px] overflow-visible p-4 sm:p-8")}
        >
          {!isReady ? (
            <div
              role="status"
              className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-amber-50 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)]"
            >
              <p className="font-medium text-amber-100">Workspace shell — extraction not finished</p>
              <p className="mt-1 text-[12px] text-amber-100/85">
                When MinerU completes and normalizes, every tab fills with structured intelligence. Re-open after the
                knowledge card shows <strong className="text-foreground">ready</strong>.
              </p>
            </div>
          ) : null}

          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 w-full min-w-0 flex-col gap-4">
            <DocOracleTabBar />

            <TabsContent value="overview" className="mt-0 min-h-[280px] space-y-5 text-[13px] leading-relaxed text-muted-foreground">
              {!isReady ? (
                <p className="text-muted-foreground">
                  {analysis
                    ? `Analysis record exists but is not complete yet (status: ${analysis.status}).`
                    : "No `document_analyses` row yet."}
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-muted/50 p-4 sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Document</p>
                      <p className="mt-1 text-base font-semibold text-foreground">{readyAnalysis.document_title ?? item.title}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-muted-foreground">
                        <div>
                          <dt className="text-muted-foreground">Parser</dt>
                          <dd>{readyAnalysis.parser ?? "mineru"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Type</dt>
                          <dd>{readyAnalysis.document_type ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Pages</dt>
                          <dd>
                            {readyAnalysis.total_pages != null && readyAnalysis.total_pages > 0
                              ? readyAnalysis.total_pages
                              : pages.length > 0
                                ? pages.length
                                : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Language</dt>
                          <dd>{readyAnalysis.language ?? "—"}</dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Extraction quality: <span className="text-emerald-300/90">normalized workspace</span>
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-muted/50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Structure</p>
                      <div className="mt-2 space-y-1 text-2xl font-semibold tabular-nums text-foreground">
                        <p>{pages.length} pages</p>
                        <p className="text-base text-muted-foreground">{sections.length} sections</p>
                        <p className="text-base text-muted-foreground">{chunkCount} chunks</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-muted/50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Knowledge</p>
                      <div className="mt-2 space-y-1 text-2xl font-semibold tabular-nums text-foreground">
                        <p>{glossary.length} glossary</p>
                        <p className="text-base text-muted-foreground">{visuals.length} visuals</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Executive overview
                    </p>
                    <div className="rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
                      <DocOracleMarkdown source={readyAnalysis.summary ?? ""} />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Readable preview
                    </p>
                    <div className="max-h-[min(55vh,560px)] overflow-y-auto rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
                      {overviewBody ? (
                        <DocOracleMarkdown source={overviewBody} />
                      ) : (
                        <p className="text-muted-foreground">No preview text available.</p>
                      )}
                    </div>
                  </div>

                  {topicList.length ? (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Key topics</p>
                      <div className="flex flex-wrap gap-2">
                        {topicList.map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-border bg-muted/50 px-3 py-1 text-[11.5px] text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {sections.length ? (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Table of contents
                      </p>
                      <ul className="space-y-1 rounded-2xl border border-border bg-muted/40 p-3 text-[12.5px] text-muted-foreground">
                        {sections.slice(0, 10).map((s) => (
                          <li key={s.id} className="flex justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
                            <span className="min-w-0 truncate">{s.title}</span>
                            <span className="shrink-0 text-muted-foreground">
                              {s.page_start != null ? `p.${s.page_start}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {visuals.length ? (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Visual highlights
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {visuals.slice(0, 6).map((v) =>
                          v.image_path ? (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setVisualPreview(v)}
                              className="overflow-hidden rounded-2xl border border-border bg-muted/60 text-left transition hover:border-[#C8E53A]/35"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={knowledgeFilesApiHref(v.image_path)}
                                alt={v.title || "visual"}
                                className="h-28 w-full object-cover"
                              />
                              <p className="truncate px-2 py-1.5 text-[11px] text-muted-foreground">
                                {displayVisualTitle(v)}
                              </p>
                            </button>
                          ) : null,
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Suggested questions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {chatStarters.map((q) => (
                        <span
                          key={q}
                          className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[11.5px] text-muted-foreground"
                        >
                          {q}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="chat" className="mt-0 min-h-[320px] text-[13px] text-muted-foreground">
              {isReady ? (
                <DocOracleChatPanel
                  panelRef={chatRef}
                  documentId={item.id}
                  suggestedPrompts={chatStarters}
                />
              ) : (
                <p>Chat unlocks when analysis is completed.</p>
              )}
            </TabsContent>

            <TabsContent value="pages" className="mt-0 space-y-3 text-[13px] text-muted-foreground">
              {pages.length === 0 ? (
                <p>No page rows yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {pages.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPageDetail(p)}
                      className="rounded-2xl border border-border bg-muted/40 p-4 text-left transition hover:border-border"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#C8E53A]">
                          Page {p.page_number}
                        </p>
                        {p.has_visual_assets ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            visuals
                          </span>
                        ) : null}
                      </div>
                      {p.rendered_image_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={knowledgeFilesApiHref(p.rendered_image_path)}
                          alt=""
                          className="mt-2 h-24 w-full rounded-lg object-cover"
                        />
                      ) : null}
                      <p className="mt-2 line-clamp-3 text-[12px] text-muted-foreground">{p.page_summary}</p>
                      {kwList(p.keywords).length ? (
                        <p className="mt-2 text-[11px] text-muted-foreground">{kwList(p.keywords).join(" · ")}</p>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sections" className="mt-0 text-[13px] text-muted-foreground">
              {sections.length === 0 ? (
                <p>No sections yet.</p>
              ) : (
                <DocOracleSectionsPanel
                  sections={sections}
                  pages={pages}
                  visuals={visuals}
                  filePath={item.filePath}
                  selectedSection={sectionDetail}
                  onSelectSection={setSectionDetail}
                  onAskAiSection={handleAskSection}
                  onOpenVisual={setVisualPreview}
                  onOpenPageDetail={setPageDetail}
                />
              )}
            </TabsContent>

            <TabsContent value="glossary" className="mt-0 space-y-3 text-[13px] text-muted-foreground">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={glossQ}
                    onChange={(e) => setGlossQ(e.target.value)}
                    placeholder="Search terms…"
                    className="w-full rounded-xl border border-border bg-muted/60 py-2 pl-9 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <select
                  value={glossCat}
                  onChange={(e) => setGlossCat(e.target.value as string | "all")}
                  className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-[12px] text-foreground"
                >
                  <option value="all">All categories</option>
                  {glossCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              {filteredGlossary.length === 0 ? (
                <p>No matching terms.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredGlossary.map((g) => (
                    <div key={g.id} className="rounded-2xl border border-border bg-muted/40 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-foreground">{g.term}</p>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {g.category || "term"}
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] text-muted-foreground">{g.definition}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="visuals" className="mt-0 text-[13px] text-muted-foreground">
              <DocOracleVisualsPanel sections={sections} visuals={visuals} onOpen={setVisualPreview} />
            </TabsContent>

            <TabsContent value="source" className="mt-0 space-y-4 text-[13px] text-muted-foreground">
              {item.filePath ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <a href={knowledgeFilesApiHref(item.filePath)} target="_blank" rel="noreferrer" className={cn(limeBtn, "no-underline")}>
                      <FileText className="h-4 w-4" aria-hidden />
                      Open original file
                    </a>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                    <iframe
                      title="Source document"
                      src={knowledgeFilesApiHref(item.filePath)}
                      className="h-[min(72vh,720px)] w-full bg-neutral-900"
                    />
                  </div>
                  <dl className="grid gap-2 rounded-2xl border border-border bg-muted/40 p-4 text-[12px] sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Filename</dt>
                      <dd className="text-foreground/90">{item.filePath.split("/").pop()}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Parser version</dt>
                      <dd className="text-foreground/90">{analysis?.parser_version ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Uploaded</dt>
                      <dd className="text-foreground/90">{item.dateAdded}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Modified</dt>
                      <dd className="text-foreground/90">{item.dateModified}</dd>
                    </div>
                  </dl>
                  {showDebugLink ? (
                    <p className="text-[11px] text-muted-foreground">
                      Diagnostics:{" "}
                      <a
                        className="text-[#C8E53A] underline-offset-4 hover:underline"
                        href={`/api/document-brain/${encodeURIComponent(item.id)}/debug`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        GET /api/document-brain/…/debug
                      </a>{" "}
                      (owner-only JSON)
                    </p>
                  ) : null}
                </>
              ) : (
                <p>No file on record.</p>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {pageDetail ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal
        >
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Page {pageDetail.page_number}</p>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1 text-[12px] text-muted-foreground"
                onClick={() => setPageDetail(null)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-muted/60 p-4">
              <DocOracleMarkdown source={pageDetail.markdown || ""} />
            </div>
          </div>
        </div>
      ) : null}

      {visualPreview?.image_path ? (
        <DocOracleVisualPreviewModal
          visual={visualPreview}
          filePath={item.filePath}
          relatedSectionTitle={getRelatedSectionTitleForVisual(visualPreview, sections)}
          onClose={() => setVisualPreview(null)}
          onAskAiVisual={handleAskVisual}
        />
      ) : null}
    </div>
  );
}
