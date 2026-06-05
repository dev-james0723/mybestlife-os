"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, FileText, MessageCircle, Sparkles } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { OSControl, OSPrimaryAction } from "@/components/ui/os-primitives";
import { cn } from "@/lib/utils";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import type { LocaleUrlSlug } from "@/lib/i18n/locale-slug";
import { urlSlugToAppLocale } from "@/lib/i18n/locale-slug";
import type { KnowledgeItem } from "@/types/knowledge";
import {
  DocOracleChatPanel,
  type DocOracleChatPanelHandle,
  type DocOracleChatRetrievalFocus,
} from "@/components/document-oracle/DocOracleChatPanel";
import { DocOracleTabBar } from "@/components/document-oracle/DocOracleTabBar";
import { DocOracleMindMapPanel } from "@/components/document-oracle/DocOracleMindMapPanel";
import { DocOracleInfographicPanel } from "@/components/document-oracle/infographic/DocOracleInfographicPanel";
import { DocOracleAudioSummaryPanel } from "@/components/document-oracle/audio-summary/DocOracleAudioSummaryPanel";
import { DocOracleSectionsPanel } from "@/components/document-oracle/DocOracleSectionsPanel";
import { DocOracleVisualsPanel } from "@/components/document-oracle/DocOracleVisualsPanel";
import { DocOracleVisualPreviewModal } from "@/components/document-oracle/DocOracleVisualPreviewModal";
import { DocOraclePagesPanel } from "@/components/document-oracle/DocOraclePagesPanel";
import { DocOraclePageDetailModal } from "@/components/document-oracle/DocOraclePageDetailModal";
import { getPageTitle } from "@/components/document-oracle/docOraclePageHelpers";
import type { DocOraclePageRow, DocOracleVisualRow } from "@/components/document-oracle/docOraclePageTypes";
import { displayVisualTitle, getRelatedSectionTitleForVisual } from "@/components/document-oracle/docOracleVisualLabels";
import { DocOracleOverviewPanel } from "@/components/document-oracle/overview/DocOracleOverviewPanel";
import { DocOracleGlossaryPanel } from "@/components/document-oracle/glossary/DocOracleGlossaryPanel";
import { DocOracleSourcePanel } from "@/components/document-oracle/source/DocOracleSourcePanel";
import {
  flattenSuggestedQuestions,
  parseSuggestedQuestionCategoriesPayload,
  type SuggestedQuestionCategory,
} from "@/lib/document-brain/suggested-questions";
import type {
  DocOracleAnalysis,
  DocOracleGlossaryRow,
  DocOracleSectionRow,
} from "@/components/document-oracle/docOracleWorkspaceTypes";
import { gsap, registerGSAP } from "@/lib/motion/register-gsap";

registerGSAP();

export type { DocOracleAnalysis, DocOracleGlossaryRow, DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";

export type { DocOraclePageRow, DocOracleVisualRow } from "@/components/document-oracle/docOraclePageTypes";

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
  suggestedQuestionCategories: SuggestedQuestionCategory[];
  showDebugLink: boolean;
}) {
  const { locale, item, analysis, pages, sections, glossary, visuals, chunkCount, suggestedQuestionCategories, showDebugLink } =
    props;
  const appLocale = urlSlugToAppLocale(locale);
  const backHref = useMemo(() => withLocalePrefix(locale, "/knowledge-base"), [locale]);
  const [tab, setTab] = useState("overview");
  const [pageDetail, setPageDetail] = useState<DocOraclePageRow | null>(null);
  const [sectionDetail, setSectionDetail] = useState<DocOracleSectionRow | null>(null);
  const [glossQ, setGlossQ] = useState("");
  const [visualPreview, setVisualPreview] = useState<DocOracleVisualRow | null>(null);
  const [sourcePage, setSourcePage] = useState<number | null>(null);
  const [pendingChatRequest, setPendingChatRequest] = useState<{
    id: string;
    prompt: string;
    retrievalFocus: DocOracleChatRetrievalFocus | null;
  } | null>(null);
  const [enrichedCategories, setEnrichedCategories] = useState<{
    documentId: string;
    categories: SuggestedQuestionCategory[];
  } | null>(null);
  const chatRef = useRef<DocOracleChatPanelHandle>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const displayedCategories =
    enrichedCategories?.documentId === item.id ? enrichedCategories.categories : suggestedQuestionCategories;

  useEffect(() => {
    if (!isCompletedAnalysis(analysis)) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/document-brain/${encodeURIComponent(item.id)}/suggested-questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
          if (!res.ok || cancelled) return;
          const data: unknown = await res.json();
          if (cancelled || !data || typeof data !== "object") return;
          const o = data as Record<string, unknown>;
          if (o.source !== "gemini") return;
          const cats = parseSuggestedQuestionCategoriesPayload(data);
          if (cats.length >= 2) setEnrichedCategories({ documentId: item.id, categories: cats });
        } catch {
          /* optional enrichment — ignore */
        }
      })();
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [analysis, item.id]);

  const pagesInDocOrder = useMemo(() => [...pages].sort((a, b) => a.page_number - b.page_number), [pages]);

  const visualsForPageDetail = useMemo(() => {
    if (!pageDetail) return [];
    const n = pageDetail.page_number;
    return visuals.filter((v) => v.source_page_number === n);
  }, [pageDetail, visuals]);

  const openSourceAtPage = (page: number) => {
    if (!Number.isFinite(page)) return;
    setSourcePage(Math.floor(page));
    setTab("source");
  };

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

  const handleAskPage = (p: DocOraclePageRow) => {
    setPageDetail(null);
    const pageTitle = getPageTitle(p);
    const prompt = `Please explain page ${p.page_number}: ${pageTitle}. Summarize the key points, cite this page, and mention any related visuals.`;
    setPendingChatRequest({
      id: newChatRequestId(),
      prompt,
      retrievalFocus: {
        pageStart: p.page_number,
        pageEnd: p.page_number,
        sectionTitle: null,
      },
    });
    setTab("chat");
  };

  const handlePageDetailQuestion = (question: string, p: DocOraclePageRow) => {
    setPageDetail(null);
    setPendingChatRequest({
      id: newChatRequestId(),
      prompt: question,
      retrievalFocus: {
        pageStart: p.page_number,
        pageEnd: p.page_number,
        sectionTitle: null,
      },
    });
    setTab("chat");
  };

  const handleFocusSectionFromPage = (s: DocOracleSectionRow) => {
    setPageDetail(null);
    setSectionDetail(s);
    setTab("sections");
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

  const chatStarters = useMemo(
    () => flattenSuggestedQuestions(displayedCategories, 24),
    [displayedCategories],
  );

  const handleTabChange = (v: string) => {
    setTab(v);
    if (v !== "source") setSourcePage(null);
  };

  const newChatRequestId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `rq-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

  const askSuggestedQuestion = (question: string) => {
    setPendingChatRequest({
      id: newChatRequestId(),
      prompt: question,
      retrievalFocus: null,
    });
    handleTabChange("chat");
  };

  const handleAskGlossaryInChat = (prompt: string, retrievalFocus: DocOracleChatRetrievalFocus | null) => {
    setPendingChatRequest({
      id: newChatRequestId(),
      prompt,
      retrievalFocus,
    });
    handleTabChange("chat");
  };

  const askChatFromOverview = (prompt: string, retrievalFocus: DocOracleChatRetrievalFocus | null) => {
    setPendingChatRequest({
      id: newChatRequestId(),
      prompt,
      retrievalFocus,
    });
    handleTabChange("chat");
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);
          const shellItems = gsap.utils.toArray<HTMLElement>("[data-doc-oracle-shell]", workspaceRef.current);
          if (reduceMotion) {
            gsap.set(shellItems, { autoAlpha: 1, clearProps: "transform" });
            return;
          }
          gsap.from(shellItems, {
            autoAlpha: 0,
            y: 12,
            duration: 0.46,
            ease: "power2.out",
            stagger: 0.07,
          });
        },
      );
      return () => mm.revert();
    },
    { scope: workspaceRef },
  );

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);
          const panel = workspaceRef.current?.querySelector<HTMLElement>('[data-doc-oracle-tab-panel][data-state="active"]');
          if (!panel) return;
          if (reduceMotion) {
            gsap.set(panel, { autoAlpha: 1, clearProps: "transform" });
            return;
          }
          gsap.fromTo(
            panel,
            { autoAlpha: 0, y: 8 },
            { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out", overwrite: "auto" },
          );
        },
      );
      return () => mm.revert();
    },
    { scope: workspaceRef, dependencies: [tab], revertOnUpdate: true },
  );

  return (
    <div ref={workspaceRef} className="doc-oracle-workspace relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden pt-[max(0px,env(safe-area-inset-top))] text-foreground">
      <div className="mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col gap-3 px-0 py-3 sm:gap-5 sm:px-4 sm:py-8 md:px-6 md:py-10 lg:max-w-6xl xl:max-w-7xl">
        <div
          data-doc-oracle-shell
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
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/60 text-primary shadow-inner">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h1 className="text-pretty break-words text-lg font-semibold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-xl">
                  {analysis?.document_title ?? item.title}
                </h1>
                <p className="truncate text-[12px] text-muted-foreground">
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
          <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end">
            <OSPrimaryAction
              type="button"
              osSize="compact"
              onClick={() => handleTabChange("chat")}
              disabled={!isReady}
              aria-label="Ask Doc Oracle"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Ask
            </OSPrimaryAction>
            {item.filePath ? (
              <OSControl
                type="button"
                osSize="compact"
                onClick={() => handleTabChange("source")}
                aria-label="Open source document"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Source
              </OSControl>
            ) : null}
          </div>
        </div>

        <div
          data-doc-oracle-shell
          className={cn("lg-glass-panel flex min-h-[420px] flex-1 flex-col overflow-visible rounded-2xl px-2 py-3 sm:rounded-[20px] sm:px-4 sm:py-6 md:px-5")}
        >
          {!isReady ? (
            <div
              role="status"
              className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-amber-950 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] dark:text-amber-50"
            >
              <p className="font-medium text-amber-950 dark:text-amber-100">Workspace shell — extraction not finished</p>
              <p className="mt-1 text-[12px] text-amber-900/85 dark:text-amber-100/85">
                When MinerU completes and normalizes, every tab fills with structured intelligence. Re-open after the
                knowledge card shows <strong className="text-foreground">ready</strong>.
              </p>
            </div>
          ) : null}

          <Tabs value={tab} onValueChange={handleTabChange} className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
            <DocOracleTabBar value={tab} onValueChange={handleTabChange} />

            <TabsContent
              value="overview"
              id="doc-oracle-panel-overview"
              aria-labelledby="doc-oracle-tab-overview"
              data-doc-oracle-tab-panel
              className="mt-0 min-h-[280px] min-w-0 w-full max-w-full space-y-5 text-[13px] leading-relaxed text-muted-foreground"
            >
              {!isReady ? (
                <p className="text-muted-foreground">
                  {analysis
                    ? `Analysis record exists but is not complete yet (status: ${analysis.status}).`
                    : "No `document_analyses` row yet."}
                </p>
              ) : (
                <DocOracleOverviewPanel
                  readyAnalysis={readyAnalysis}
                  item={item}
                  pages={pages}
                  sections={sections}
                  glossary={glossary}
                  visuals={visuals}
                  chunkCount={chunkCount}
                  overviewBody={overviewBody}
                  topicList={topicList}
                  suggestedQuestionCategories={displayedCategories}
                  onAskChat={askChatFromOverview}
                  onAskSuggestedQuestion={askSuggestedQuestion}
                  setTab={handleTabChange}
                  setSectionDetail={setSectionDetail}
                  setGlossQ={setGlossQ}
                  setVisualPreview={setVisualPreview}
                  openSourceAtPage={item.filePath ? openSourceAtPage : undefined}
                />
              )}
            </TabsContent>

            <TabsContent
              value="mindMap"
              id="doc-oracle-panel-mindMap"
              aria-labelledby="doc-oracle-tab-mindMap"
              data-doc-oracle-tab-panel
              className="mt-0 min-w-0 text-[13px] text-muted-foreground"
            >
              {!isReady ? (
                <p className="text-muted-foreground">Mind Map will appear after document analysis is complete.</p>
              ) : (
                <DocOracleMindMapPanel
                  documentId={item.id}
                  sections={sections}
                  glossary={glossary}
                  visuals={visuals}
                  onOpenSourcePage={item.filePath ? openSourceAtPage : () => {}}
                  onOpenVisual={setVisualPreview}
                  onFocusGlossary={(g) => {
                    setGlossQ(g.term);
                    handleTabChange("glossary");
                  }}
                  onFocusSection={(s) => {
                    setSectionDetail(s);
                    setTab("sections");
                  }}
                  onAskMindMapNode={(prompt, retrievalFocus) => {
                    setPendingChatRequest({
                      id: newChatRequestId(),
                      prompt,
                      retrievalFocus,
                    });
                    setTab("chat");
                  }}
                />
              )}
            </TabsContent>

            <TabsContent
              value="chat"
              id="doc-oracle-panel-chat"
              aria-labelledby="doc-oracle-tab-chat"
              data-doc-oracle-tab-panel
              className="mt-0 flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col text-[13px] text-muted-foreground"
            >
              {isReady ? (
                <DocOracleChatPanel
                  panelRef={chatRef}
                  documentId={item.id}
                  suggestedPrompts={chatStarters}
                  filePath={item.filePath}
                  pendingChatRequest={pendingChatRequest}
                  onPendingChatConsumed={(id) => {
                    setPendingChatRequest((cur) => (cur?.id === id ? null : cur));
                  }}
                  onOpenSourcePage={item.filePath ? openSourceAtPage : undefined}
                  onOpenVisualById={(id) => {
                    const v = visuals.find((x) => x.id === id);
                    if (v) setVisualPreview(v);
                  }}
                />
              ) : (
                <p>Chat unlocks when analysis is completed.</p>
              )}
            </TabsContent>

            <TabsContent
              value="pages"
              id="doc-oracle-panel-pages"
              aria-labelledby="doc-oracle-tab-pages"
              data-doc-oracle-tab-panel
              className="mt-0 min-w-0 text-[13px] text-muted-foreground"
            >
              {pages.length === 0 ? (
                <p>No page rows yet.</p>
              ) : (
                <DocOraclePagesPanel
                  pages={pages}
                  filePath={item.filePath}
                  onOpenSourcePage={item.filePath ? openSourceAtPage : undefined}
                  onAskAiPage={isReady ? handleAskPage : undefined}
                  onOpenPageDetail={setPageDetail}
                />
              )}
            </TabsContent>

            <TabsContent
              value="sections"
              id="doc-oracle-panel-sections"
              aria-labelledby="doc-oracle-tab-sections"
              data-doc-oracle-tab-panel
              className="mt-0 text-[13px] text-muted-foreground"
            >
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

            <TabsContent
              value="glossary"
              id="doc-oracle-panel-glossary"
              aria-labelledby="doc-oracle-tab-glossary"
              data-doc-oracle-tab-panel
              className="mt-0 min-w-0 text-[13px] text-muted-foreground"
            >
              {!isReady ? (
                <p className="text-muted-foreground">Glossary appears after document analysis is complete.</p>
              ) : (
                <DocOracleGlossaryPanel
                  glossary={glossary}
                  sections={sections}
                  analysis={readyAnalysis}
                  appLocale={appLocale}
                  searchQuery={glossQ}
                  onSearchChange={setGlossQ}
                  filePath={item.filePath}
                  onOpenSourcePage={item.filePath ? openSourceAtPage : undefined}
                  onFocusSection={(s) => {
                    setSectionDetail(s);
                  }}
                  onSwitchToSections={() => setTab("sections")}
                  onAskGlossaryInChat={handleAskGlossaryInChat}
                />
              )}
            </TabsContent>

            <TabsContent
              value="visuals"
              id="doc-oracle-panel-visuals"
              aria-labelledby="doc-oracle-tab-visuals"
              data-doc-oracle-tab-panel
              className="mt-0 text-[13px] text-muted-foreground"
            >
              <DocOracleVisualsPanel sections={sections} visuals={visuals} onOpen={setVisualPreview} />
            </TabsContent>

            <TabsContent
              value="infographic"
              id="doc-oracle-panel-infographic"
              aria-labelledby="doc-oracle-tab-infographic"
              data-doc-oracle-tab-panel
              className="mt-0 min-w-0 text-[13px] text-muted-foreground"
            >
              <DocOracleInfographicPanel documentId={item.id} enabled={isReady} />
            </TabsContent>

            <TabsContent
              value="audio_summary"
              id="doc-oracle-panel-audio_summary"
              aria-labelledby="doc-oracle-tab-audio_summary"
              data-doc-oracle-tab-panel
              className="mt-0 min-w-0 text-[13px] text-muted-foreground"
            >
              <DocOracleAudioSummaryPanel
                documentId={item.id}
                enabled={isReady}
                onOpenSourcePage={item.filePath ? openSourceAtPage : undefined}
              />
            </TabsContent>

            <TabsContent
              value="source"
              id="doc-oracle-panel-source"
              aria-labelledby="doc-oracle-tab-source"
              data-doc-oracle-tab-panel
              className="mt-0 text-[13px] text-muted-foreground"
            >
              <DocOracleSourcePanel
                item={item}
                pagesSorted={pagesInDocOrder}
                appLocale={appLocale}
                sourceJumpPage={sourcePage}
                onClearSourceJump={() => setSourcePage(null)}
                showDebugLink={showDebugLink}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {pageDetail ? (
        <DocOraclePageDetailModal
          page={pageDetail}
          orderedPages={pagesInDocOrder}
          sections={sections}
          glossary={glossary}
          visualsOnPage={visualsForPageDetail}
          filePath={item.filePath}
          onClose={() => setPageDetail(null)}
          onSelectPage={setPageDetail}
          onOpenSourcePage={item.filePath ? openSourceAtPage : undefined}
          onAskAiPage={isReady ? handleAskPage : undefined}
          onAskQuestion={isReady ? handlePageDetailQuestion : undefined}
          onOpenVisual={(v) => {
            setPageDetail(null);
            setVisualPreview(v);
          }}
          onFocusSection={handleFocusSectionFromPage}
        />
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
