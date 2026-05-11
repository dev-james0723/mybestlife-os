"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  ImageIcon,
  Layers,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import type { LocaleUrlSlug } from "@/lib/i18n/locale-slug";
import type { KnowledgeItem } from "@/types/knowledge";
import { DocOracleMarkdown } from "@/components/document-oracle/DocOracleMarkdown";
import { DocOracleChatPanel } from "@/components/document-oracle/DocOracleChatPanel";

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
};

function knowledgeFilesApiHref(filePath: string): string {
  return `/api/knowledge-files/${filePath.split("/").map(encodeURIComponent).join("/")}`;
}

function kwList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 12) : [];
}

function SectionTree(props: {
  sections: DocOracleSectionRow[];
  onPick: (s: DocOracleSectionRow) => void;
  selectedId: string | null;
}) {
  const { sections, onPick, selectedId } = props;
  const byParent = useMemo(() => {
    const m = new Map<string | null, DocOracleSectionRow[]>();
    for (const s of sections) {
      const k = s.parent_id;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => (a.page_start ?? 0) - (b.page_start ?? 0));
    }
    return m;
  }, [sections]);

  const [open, setOpen] = useState<Record<string, boolean>>({});

  const renderNodes = (parent: string | null, depth: number): ReactNode => {
    const kids = byParent.get(parent) ?? [];
    return kids.map((s) => {
      const hasChildren = (byParent.get(s.id) ?? []).length > 0;
      const isOpen = open[s.id] ?? depth < 2;
      return (
        <div key={s.id} className="select-none">
          <button
            type="button"
            onClick={() => {
              if (hasChildren) setOpen((o) => ({ ...o, [s.id]: !isOpen }));
              onPick(s);
            }}
            className={cn(
              "flex w-full items-start gap-1 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition",
              selectedId === s.id ? "bg-white/[0.12] text-white" : "text-white/75 hover:bg-white/[0.06]",
            )}
            style={{ paddingLeft: 8 + depth * 12 }}
          >
            {hasChildren ? (
              isOpen ? (
                <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/45" aria-hidden />
              ) : (
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/45" aria-hidden />
              )
            ) : (
              <span className="inline-block w-3.5 shrink-0" />
            )}
            <span className="min-w-0 flex-1">
              <span className="font-medium text-white/90">{s.title}</span>
              <span className="mt-0.5 block text-[11px] text-white/45">
                {s.page_start != null || s.page_end != null
                  ? `pp. ${s.page_start ?? "?"}–${s.page_end ?? "?"}`
                  : "pages n/a"}
              </span>
            </span>
          </button>
          {hasChildren && isOpen ? <div>{renderNodes(s.id, depth + 1)}</div> : null}
        </div>
      );
    });
  };

  return <div className="space-y-0.5">{renderNodes(null, 0)}</div>;
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

  const isReady = Boolean(analysis?.status === "completed");

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
    <div className="doc-oracle-workspace relative min-h-[100dvh] w-full overflow-x-hidden bg-[#0f0d0c] text-white">
      <div
        className="doc-oracle-liquid-bg pointer-events-none fixed inset-0 -z-10 bg-[length:120%_120%] bg-center opacity-95"
        style={{
          backgroundImage:
            "linear-gradient(165deg, rgba(26,22,20,0.92) 0%, rgba(12,10,9,0.96) 45%, rgba(8,7,6,0.98) 100%), radial-gradient(ellipse 120% 80% at 50% -20%, rgba(200,229,58,0.08), transparent 55%)",
        }}
        aria-hidden
      />

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
              className="inline-flex items-center gap-2 text-[12px] font-medium text-white/55 transition hover:text-white/85"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Knowledge Base
            </Link>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-[#C8E53A] shadow-inner">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                  {analysis?.document_title ?? item.title}
                </h1>
                <p className="text-[12px] text-white/50">
                  {isReady ? (
                    <>
                      Doc Oracle · {analysis?.parser ?? "MinerU"}
                      {analysis?.parser_version ? ` · ${analysis.parser_version}` : ""}
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
          className={cn("lg-glass-panel min-h-[420px] p-4 sm:p-8")}
        >
          {!isReady ? (
            <div
              role="status"
              className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-amber-50 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)]"
            >
              <p className="font-medium text-amber-100">Workspace shell — extraction not finished</p>
              <p className="mt-1 text-[12px] text-amber-100/85">
                When MinerU completes and normalizes, every tab fills with structured intelligence. Re-open after the
                knowledge card shows <strong className="text-white">ready</strong>.
              </p>
            </div>
          ) : null}

          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 w-full min-w-0 flex-col gap-4">
            <TabsList className="lg-glass-panel-dark flex h-auto w-full min-w-0 flex-wrap justify-start gap-1 overflow-x-auto p-1 sm:flex-nowrap">
              {[
                { id: "overview", label: "Overview", Icon: BookOpen },
                { id: "chat", label: "Chat", Icon: MessageCircle },
                { id: "pages", label: "Pages", Icon: Layers },
                { id: "sections", label: "Sections", Icon: Layers },
                { id: "glossary", label: "Glossary", Icon: BookOpen },
                { id: "visuals", label: "Visuals", Icon: ImageIcon },
                { id: "source", label: "Source", Icon: FileText },
              ].map(({ id, label, Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className={cn(
                    "shrink-0 gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium text-white/55 transition-colors duration-150 ease-out hover:bg-white/[0.05] data-[state=active]:bg-white data-[state=active]:text-[#0d0d0d] data-[state=active]:shadow-sm sm:text-[13px]",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="mt-0 min-h-[280px] space-y-5 text-[13px] leading-relaxed text-white/75">
              {!isReady ? (
                <p className="text-white/70">
                  {analysis
                    ? `Analysis record exists but is not complete yet (status: ${analysis.status}).`
                    : "No `document_analyses` row yet."}
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Document</p>
                      <p className="mt-1 text-base font-semibold text-white">{analysis.document_title ?? item.title}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-white/65">
                        <div>
                          <dt className="text-white/40">Parser</dt>
                          <dd>{analysis.parser ?? "mineru"}</dd>
                        </div>
                        <div>
                          <dt className="text-white/40">Type</dt>
                          <dd>{analysis.document_type ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-white/40">Pages</dt>
                          <dd>{analysis.total_pages ?? pages.length ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-white/40">Language</dt>
                          <dd>{analysis.language ?? "—"}</dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-[11px] text-white/45">
                        Extraction quality: <span className="text-emerald-300/90">normalized workspace</span>
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Structure</p>
                      <div className="mt-2 space-y-1 text-2xl font-semibold tabular-nums text-white">
                        <p>{pages.length} pages</p>
                        <p className="text-base text-white/70">{sections.length} sections</p>
                        <p className="text-base text-white/70">{chunkCount} chunks</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Knowledge</p>
                      <div className="mt-2 space-y-1 text-2xl font-semibold tabular-nums text-white">
                        <p>{glossary.length} glossary</p>
                        <p className="text-base text-white/70">{visuals.length} visuals</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">
                      Executive overview
                    </p>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
                      <DocOracleMarkdown source={analysis.summary ?? ""} />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">
                      Readable preview
                    </p>
                    <div className="max-h-[min(55vh,560px)] overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
                      {overviewBody ? (
                        <DocOracleMarkdown source={overviewBody} />
                      ) : (
                        <p className="text-white/50">No preview text available.</p>
                      )}
                    </div>
                  </div>

                  {topicList.length ? (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">Key topics</p>
                      <div className="flex flex-wrap gap-2">
                        {topicList.map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-[11.5px] text-white/80"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {sections.length ? (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">
                        Table of contents
                      </p>
                      <ul className="space-y-1 rounded-2xl border border-white/10 bg-black/20 p-3 text-[12.5px] text-white/80">
                        {sections.slice(0, 10).map((s) => (
                          <li key={s.id} className="flex justify-between gap-3 border-b border-white/[0.06] py-1.5 last:border-0">
                            <span className="min-w-0 truncate">{s.title}</span>
                            <span className="shrink-0 text-white/45">
                              {s.page_start != null ? `p.${s.page_start}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {visuals.length ? (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">
                        Visual highlights
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {visuals.slice(0, 6).map((v) =>
                          v.image_path ? (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setVisualPreview(v)}
                              className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-left transition hover:border-[#C8E53A]/35"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={knowledgeFilesApiHref(v.image_path)}
                                alt={v.title || "visual"}
                                className="h-28 w-full object-cover"
                              />
                              <p className="truncate px-2 py-1.5 text-[11px] text-white/70">{v.title}</p>
                            </button>
                          ) : null,
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">
                      Suggested questions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {chatStarters.map((q) => (
                        <span
                          key={q}
                          className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11.5px] text-white/75"
                        >
                          {q}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="chat" className="mt-0 min-h-[320px] text-[13px] text-white/70">
              {isReady ? (
                <DocOracleChatPanel documentId={item.id} suggestedPrompts={chatStarters} />
              ) : (
                <p>Chat unlocks when analysis is completed.</p>
              )}
            </TabsContent>

            <TabsContent value="pages" className="mt-0 space-y-3 text-[13px] text-white/70">
              {pages.length === 0 ? (
                <p>No page rows yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {pages.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPageDetail(p)}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-white/20"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#C8E53A]">
                          Page {p.page_number}
                        </p>
                        {p.has_visual_assets ? (
                          <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] text-white/60">
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
                      <p className="mt-2 line-clamp-3 text-[12px] text-white/75">{p.page_summary}</p>
                      {kwList(p.keywords).length ? (
                        <p className="mt-2 text-[11px] text-white/45">{kwList(p.keywords).join(" · ")}</p>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sections" className="mt-0 grid gap-4 text-[13px] text-white/70 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                {sections.length === 0 ? (
                  <p>No sections yet.</p>
                ) : (
                  <SectionTree sections={sections} onPick={setSectionDetail} selectedId={sectionDetail?.id ?? null} />
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                {sectionDetail ? (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Section</p>
                    <p className="mt-1 text-base font-semibold text-white">{sectionDetail.title}</p>
                    <p className="mt-2 text-[12px] text-white/60">{sectionDetail.summary}</p>
                    <p className="mt-2 text-[11px] text-white/45">
                      Pages {sectionDetail.page_start ?? "?"} – {sectionDetail.page_end ?? "?"}
                    </p>
                    {kwList(sectionDetail.keywords).length ? (
                      <p className="mt-2 text-[11px] text-white/50">{kwList(sectionDetail.keywords).join(" · ")}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-white/50">Select a section.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="glossary" className="mt-0 space-y-3 text-[13px] text-white/70">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={glossQ}
                    onChange={(e) => setGlossQ(e.target.value)}
                    placeholder="Search terms…"
                    className="w-full rounded-xl border border-white/12 bg-black/30 py-2 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/35"
                  />
                </div>
                <select
                  value={glossCat}
                  onChange={(e) => setGlossCat(e.target.value as string | "all")}
                  className="rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-[12px] text-white"
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
                    <div key={g.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-white">{g.term}</p>
                        <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] text-white/55">
                          {g.category || "term"}
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] text-white/70">{g.definition}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="visuals" className="mt-0 space-y-3 text-[13px] text-white/70">
              {visuals.length === 0 ? (
                <p>No visual assets were detected in this MinerU output.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visuals.map((v) =>
                    v.image_path ? (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVisualPreview(v)}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-black/25 text-left transition hover:border-[#C8E53A]/35"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={knowledgeFilesApiHref(v.image_path)}
                          alt={v.title || "visual"}
                          className="aspect-[4/3] w-full object-cover"
                        />
                        <div className="space-y-1 p-3">
                          <p className="truncate text-[12px] font-medium text-white">{v.title}</p>
                          <p className="text-[11px] text-white/50">
                            {v.type} · p.{v.source_page_number ?? "?"}
                          </p>
                          <p className="line-clamp-3 text-[11px] text-white/60">{v.description}</p>
                        </div>
                      </button>
                    ) : null,
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="source" className="mt-0 space-y-4 text-[13px] text-white/70">
              {item.filePath ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <a href={knowledgeFilesApiHref(item.filePath)} target="_blank" rel="noreferrer" className={cn(limeBtn, "no-underline")}>
                      <FileText className="h-4 w-4" aria-hidden />
                      Open original file
                    </a>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                    <iframe
                      title="Source document"
                      src={knowledgeFilesApiHref(item.filePath)}
                      className="h-[min(72vh,720px)] w-full bg-neutral-900"
                    />
                  </div>
                  <dl className="grid gap-2 rounded-2xl border border-white/10 bg-black/25 p-4 text-[12px] sm:grid-cols-2">
                    <div>
                      <dt className="text-white/45">Filename</dt>
                      <dd className="text-white/85">{item.filePath.split("/").pop()}</dd>
                    </div>
                    <div>
                      <dt className="text-white/45">Parser version</dt>
                      <dd className="text-white/85">{analysis?.parser_version ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-white/45">Uploaded</dt>
                      <dd className="text-white/85">{item.dateAdded}</dd>
                    </div>
                    <div>
                      <dt className="text-white/45">Modified</dt>
                      <dd className="text-white/85">{item.dateModified}</dd>
                    </div>
                  </dl>
                  {showDebugLink ? (
                    <p className="text-[11px] text-white/40">
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
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-[#141210] p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">Page {pageDetail.page_number}</p>
              <button
                type="button"
                className="rounded-lg border border-white/15 px-3 py-1 text-[12px] text-white/80"
                onClick={() => setPageDetail(null)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-4">
              <DocOracleMarkdown source={pageDetail.markdown || ""} />
            </div>
          </div>
        </div>
      ) : null}

      {visualPreview?.image_path ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/15 bg-[#141210] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-white">{visualPreview.title}</p>
              <button
                type="button"
                className="rounded-lg border border-white/15 px-3 py-1 text-[12px] text-white/80"
                onClick={() => setVisualPreview(null)}
              >
                Close
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={knowledgeFilesApiHref(visualPreview.image_path)}
              alt=""
              className="mt-3 max-h-[75vh] w-full rounded-xl object-contain"
            />
            <p className="mt-3 text-[12px] text-white/65">{visualPreview.description}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
