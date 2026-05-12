"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
    <div className="space-y-6 text-[13px] leading-relaxed text-muted-foreground">
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

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] sm:p-5">
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">Executive summary</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Synthesized overview from document analysis.</p>
        <div
          className={cn(
            "mt-3 overflow-y-auto rounded-xl border border-white/8 bg-white/[0.03] p-4 sm:p-5",
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
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#d4f06a] hover:underline"
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

        <div className="mt-5 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-white/12 bg-black/30 px-4 py-3 text-left text-[12px] font-semibold text-foreground transition hover:border-[#C8E53A]/30"
          >
            <span>{previewOpen ? "Hide extracted preview" : "Show extracted preview"}</span>
            {previewOpen ? <ChevronUp className="h-4 w-4 shrink-0" aria-hidden /> : <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />}
          </button>
          {previewOpen ? (
            <div className="mt-3 max-h-[min(55vh,480px)] overflow-y-auto rounded-xl border border-white/8 bg-black/35 p-4 sm:p-5">
              {overviewBody ? (
                <DocOracleMarkdown source={overviewBody} />
              ) : (
                <p className="text-muted-foreground">No preview text available.</p>
              )}
            </div>
          ) : null}
        </div>
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
    </div>
  );
}
