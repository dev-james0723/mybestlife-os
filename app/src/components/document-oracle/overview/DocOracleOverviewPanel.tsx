"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Network } from "lucide-react";
import { DocOracleMarkdown } from "@/components/document-oracle/DocOracleMarkdown";
import { DocOracleSuggestedQuestions } from "@/components/document-oracle/DocOracleSuggestedQuestions";
import type { DocOracleChatRetrievalFocus } from "@/components/document-oracle/DocOracleChatPanel";
import { DocumentSnapshotCard } from "@/components/document-oracle/overview/DocumentSnapshotCard";
import { DocumentTreeMap } from "@/components/document-oracle/overview/DocumentTreeMap";
import { ClickableKeyTopics } from "@/components/document-oracle/overview/ClickableKeyTopics";
import { ClickableTableOfContents } from "@/components/document-oracle/overview/ClickableTableOfContents";
import { OverviewVisualHighlights } from "@/components/document-oracle/overview/OverviewVisualHighlights";
import type {
  DocOracleAnalysis,
  DocOracleGlossaryRow,
  DocOracleSectionRow,
} from "@/components/document-oracle/docOracleWorkspaceTypes";
import type { DocOraclePageRow, DocOracleVisualRow } from "@/components/document-oracle/docOraclePageTypes";
import type { KnowledgeItem } from "@/types/knowledge";
import type { SuggestedQuestionCategory } from "@/lib/document-brain/suggested-questions";
import { Stagger } from "@/components/motion/Stagger";
import { cn } from "@/lib/utils";

const TOPICS_ANCHOR = "doc-oracle-overview-key-topics";

export function DocOracleOverviewPanel(props: {
  readyAnalysis: DocOracleAnalysis;
  item: KnowledgeItem;
  pages: DocOraclePageRow[];
  sections: DocOracleSectionRow[];
  glossary: DocOracleGlossaryRow[];
  visuals: DocOracleVisualRow[];
  chunkCount: number;
  overviewBody: string;
  topicList: string[];
  suggestedQuestionCategories: SuggestedQuestionCategory[];
  onAskSuggestedQuestion: (question: string) => void;
  onAskChat: (prompt: string, retrievalFocus: DocOracleChatRetrievalFocus | null) => void;
  setTab: (tab: string) => void;
  setSectionDetail: (s: DocOracleSectionRow) => void;
  setGlossQ: (q: string) => void;
  setVisualPreview: (v: DocOracleVisualRow) => void;
  openSourceAtPage?: (page: number) => void;
}) {
  const {
    readyAnalysis,
    item,
    pages,
    sections,
    glossary,
    visuals,
    chunkCount,
    overviewBody,
    topicList,
    suggestedQuestionCategories,
    onAskSuggestedQuestion,
    onAskChat,
    setTab,
    setSectionDetail,
    setGlossQ,
    setVisualPreview,
    openSourceAtPage,
  } = props;

  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const pageCount = useMemo(() => {
    if (readyAnalysis.total_pages != null && readyAnalysis.total_pages > 0) return readyAnalysis.total_pages;
    return pages.length;
  }, [readyAnalysis.total_pages, pages.length]);

  const topSections = useMemo(() => sections.slice(0, 4), [sections]);

  const summaryText = readyAnalysis.summary ?? "";

  const onAskAboutTopic = (topic: string) => {
    onAskChat(`Explain the topic "${topic}" in this document with page citations.`, null);
  };

  return (
    <Stagger className="min-w-0 w-full max-w-full space-y-5 text-[13px] leading-relaxed text-muted-foreground" y={14}>
      <DocumentSnapshotCard
        readyAnalysis={readyAnalysis}
        item={item}
        pageCount={pageCount}
        sectionCount={sections.length}
        chunkCount={chunkCount}
        glossaryCount={glossary.length}
        visualCount={visuals.length}
        onNavigate={setTab}
      />

      <section className="rounded-2xl border border-border bg-card/80 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] dark:bg-card/70 dark:shadow-[0_14px_42px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.07)] sm:p-5">
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">Executive summary</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Synthesized overview from document analysis.</p>
        <div
          className={cn(
            "mt-3 overflow-y-auto rounded-xl border border-border bg-muted/35 p-4 sm:p-5",
            summaryExpanded ? "max-h-[min(70vh,560px)]" : "max-h-[200px] sm:max-h-[220px]",
          )}
        >
          {summaryText ? (
            <DocOracleMarkdown source={summaryText} />
          ) : (
            <p className="text-muted-foreground">No summary available yet.</p>
          )}
        </div>
        {summaryText.length > 400 ? (
          <button
            type="button"
            onClick={() => setSummaryExpanded((v) => !v)}
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
          >
            {summaryExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" aria-hidden />
                Collapse summary
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" aria-hidden />
                Expand summary
              </>
            )}
          </button>
        ) : null}

        <div className="mt-5 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background/55 px-4 py-3 text-left text-[12px] font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary/8"
          >
            <span>{previewOpen ? "Hide extracted source preview" : "Show extracted source preview"}</span>
            {previewOpen ? <ChevronUp className="h-4 w-4 shrink-0" aria-hidden /> : <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />}
          </button>
          {previewOpen ? (
            <div className="mt-3 max-h-[min(55vh,480px)] overflow-y-auto rounded-xl border border-border bg-muted/35 p-4 sm:p-5">
              {overviewBody ? (
                <DocOracleMarkdown source={overviewBody} />
              ) : (
                <p className="text-muted-foreground">No preview text available.</p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.48)] backdrop-blur-md dark:bg-card/60 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-4">
        <button
          type="button"
          onClick={() => setMapOpen((v) => !v)}
          className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-1 py-1 text-left"
          aria-expanded={mapOpen}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
              <Network className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-foreground">Structure map</span>
              <span className="block truncate text-[12px] text-muted-foreground">
                Optional visual navigation for pages, sections, glossary, visuals, and source.
              </span>
            </span>
          </span>
          {mapOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
        </button>

        {mapOpen ? (
          <div className="mt-3">
            <div className="grid gap-2 md:hidden">
              {[
                { label: "Pages", count: pageCount, tab: "pages" },
                { label: "Sections", count: sections.length, tab: "sections" },
                { label: "Glossary", count: glossary.length, tab: "glossary" },
                { label: "Visuals", count: visuals.length, tab: "visuals" },
                { label: "Source", count: null, tab: "source" },
              ].map((item) => (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => setTab(item.tab)}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-background/45 px-3 py-2 text-left text-[13px] transition hover:border-primary/30 hover:bg-primary/8"
                >
                  <span className="font-semibold text-foreground">{item.label}</span>
                  {typeof item.count === "number" ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                      {item.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="hidden md:block">
              <DocumentTreeMap
                documentTitle={readyAnalysis.document_title ?? item.title}
                pageCount={pageCount}
                sectionCount={sections.length}
                glossaryCount={glossary.length}
                visualCount={visuals.length}
                topicCount={topicList.length}
                topSections={topSections}
                onNavigate={setTab}
                onFocusSection={(s) => {
                  setSectionDetail(s);
                  setTab("sections");
                }}
                topicsAnchorId={TOPICS_ANCHOR}
              />
            </div>
          </div>
        ) : null}
      </section>

      <ClickableKeyTopics
        topics={topicList}
        sections={sections}
        glossary={glossary}
        onAskAboutTopic={onAskAboutTopic}
        setTab={setTab}
        setSectionDetail={setSectionDetail}
        setGlossQ={setGlossQ}
        anchorId={TOPICS_ANCHOR}
      />

      <ClickableTableOfContents
        sections={sections}
        setTab={setTab}
        setSectionDetail={setSectionDetail}
        openSourceAtPage={openSourceAtPage}
      />

      <OverviewVisualHighlights
        visuals={visuals}
        onOpenVisual={setVisualPreview}
        onViewAll={() => setTab("visuals")}
        openSourceAtPage={openSourceAtPage}
      />

      <DocOracleSuggestedQuestions
        categories={suggestedQuestionCategories}
        onAskQuestion={onAskSuggestedQuestion}
        onOpenSourcePage={openSourceAtPage}
      />
    </Stagger>
  );
}
