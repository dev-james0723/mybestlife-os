"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { DocOracleMarkdown } from "@/components/document-oracle/DocOracleMarkdown";
import { DocOracleRelatedVisuals } from "@/components/document-oracle/DocOracleRelatedVisuals";
import {
  copySummaryText,
  displayPageTypeLabel,
  getPageDetailDescription,
  getPageTitle,
  inferPageTypeBadge,
  linkedTermsList,
  pageDetailSuggestedQuestions,
  pageKeywordsList,
} from "@/components/document-oracle/docOraclePageHelpers";
import {
  glossaryTermsForPage,
  sectionForPage,
  sectionKeywordsChips,
} from "@/components/document-oracle/docOraclePageDetailHelpers";
import type { DocOraclePageRow, DocOracleVisualRow } from "@/components/document-oracle/docOraclePageTypes";
import type { DocOracleGlossaryRow, DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import { knowledgeFilesApiHref, sourcePdfHref } from "@/components/document-oracle/docOraclePaths";
import { formatDocOraclePageRangeWithLabel } from "@/components/document-oracle/docOraclePageRange";
import { displayVisualDescription } from "@/components/document-oracle/docOracleVisualLabels";
import { cn } from "@/lib/utils";
import { cleanDisplayTags, sanitizeDisplayTag } from "@/components/document-oracle/docOracleDisplay";

function thumbUrl(page: DocOraclePageRow): string | null {
  const u = page.rendered_image_url?.trim();
  if (u) return u;
  const p = page.rendered_image_path?.trim();
  if (p) return knowledgeFilesApiHref(p);
  return null;
}

const cardShell =
  "rounded-2xl border border-border bg-card/70 px-4 py-4 shadow-inner backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] sm:px-5";

const primaryBtn =
  "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[13px] font-semibold text-primary-foreground shadow-sm transition hover:brightness-[1.03] sm:flex-none sm:py-2.5";

const ghostBtn =
  "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background/60 px-4 py-3 text-[13px] font-medium text-foreground transition hover:border-primary/35 hover:bg-primary/8 sm:flex-none sm:py-2.5";

function pageTypeBadges(page: DocOraclePageRow, badge: ReturnType<typeof inferPageTypeBadge>): string[] {
  const out: (string | null)[] = [];
  out.push(displayPageTypeLabel(badge));
  if (page.has_visual_assets) out.push("has visuals");
  const pt = (page.page_type || "").trim();
  if (pt && pt.toLowerCase() !== badge) out.push(pt);
  return cleanDisplayTags(out, 4).tags;
}

function combinedVisualDescription(visuals: DocOracleVisualRow[]): string {
  const parts = visuals
    .map((v) => displayVisualDescription(v))
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0] ?? "";
  return parts.map((p, i) => `(${i + 1}) ${p}`).join(" ");
}

export function DocOraclePageDetailView(props: {
  page: DocOraclePageRow;
  orderedPages: DocOraclePageRow[];
  sections: DocOracleSectionRow[];
  glossary: DocOracleGlossaryRow[];
  visualsOnPage: DocOracleVisualRow[];
  filePath: string | null | undefined;
  onClose: () => void;
  onSelectPage: (p: DocOraclePageRow) => void;
  onOpenSourcePage?: (pageNum: number) => void;
  onAskAiPage?: (p: DocOraclePageRow) => void;
  onAskQuestion?: (question: string, page: DocOraclePageRow) => void;
  onOpenVisual: (v: DocOracleVisualRow) => void;
  onFocusSection: (s: DocOracleSectionRow) => void;
}) {
  const {
    page,
    orderedPages,
    sections,
    glossary,
    visualsOnPage,
    filePath,
    onClose,
    onSelectPage,
    onOpenSourcePage,
    onAskAiPage,
    onAskQuestion,
    onOpenVisual,
    onFocusSection,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [failedHeroKey, setFailedHeroKey] = useState<string | null>(null);

  const title = useMemo(() => getPageTitle(page), [page]);
  const badge = useMemo(() => inferPageTypeBadge(page), [page]);
  const badges = useMemo(() => pageTypeBadges(page, badge), [page, badge]);
  const primaryDescription = useMemo(() => {
    const im = page.interpreted_page_meaning?.trim();
    const sm = page.page_summary?.trim();
    if (im) return im;
    if (sm) return sm;
    return "";
  }, [page]);
  const secondaryDescription = useMemo(() => {
    const im = page.interpreted_page_meaning?.trim();
    const sm = page.page_summary?.trim();
    if (im && sm && im !== sm) return sm;
    return "";
  }, [page]);
  const fallbackLong = useMemo(() => {
    if (primaryDescription) return "";
    return getPageDetailDescription(page);
  }, [page, primaryDescription]);

  const relatedSection = useMemo(() => sectionForPage(page, sections), [page, sections]);
  const relatedGlossary = useMemo(() => glossaryTermsForPage(page, glossary), [page, glossary]);
  const keywords = useMemo(() => pageKeywordsList(page), [page]);
  const linked = useMemo(() => linkedTermsList(page), [page]);
  const keywordTags = useMemo(() => cleanDisplayTags(keywords, 8).tags, [keywords]);
  const linkedTags = useMemo(() => cleanDisplayTags(linked, 8).tags, [linked]);
  const questions = useMemo(() => pageDetailSuggestedQuestions(page), [page]);
  const hero = thumbUrl(page);
  const heroKey = `${page.id}:${hero ?? ""}`;
  const visualNarrative = useMemo(() => combinedVisualDescription(visualsOnPage), [visualsOnPage]);

  const pageIndex = useMemo(
    () => orderedPages.findIndex((p) => p.id === page.id || p.page_number === page.page_number),
    [orderedPages, page],
  );
  const prevPage = pageIndex > 0 ? orderedPages[pageIndex - 1] : null;
  const nextPage = pageIndex >= 0 && pageIndex < orderedPages.length - 1 ? orderedPages[pageIndex + 1] : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [page.id]);

  const sectionTags = relatedSection ? sectionKeywordsChips(relatedSection) : [];

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(copySummaryText(page, title));
    } catch {
      /* ignore */
    }
  };

  const sourceHref = filePath ? sourcePdfHref(filePath, page.page_number) : null;

  return (
    <div className="flex max-h-[min(92dvh,920px)] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl">
      <header className="shrink-0 border-b border-border bg-background/80 px-3 py-3 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-[12px] font-medium text-foreground transition hover:border-primary/35 hover:bg-primary/8"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">All Pages</span>
          </button>
          <div className="mx-auto flex flex-1 items-center justify-center gap-1 sm:mx-0 sm:justify-end sm:gap-2 lg:justify-center">
            <button
              type="button"
              disabled={!prevPage}
              onClick={() => prevPage && onSelectPage(prevPage)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/55 text-muted-foreground transition hover:border-primary/35 hover:bg-primary/8 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <span className="min-w-[4.5rem] rounded-xl border border-border bg-card/75 px-3 py-2 text-center text-[12px] font-semibold tabular-nums text-foreground">
              p.{page.page_number}
            </span>
            <button
              type="button"
              disabled={!nextPage}
              onClick={() => nextPage && onSelectPage(nextPage)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/55 text-muted-foreground transition hover:border-primary/35 hover:bg-primary/8 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
              aria-label="Next page"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => void copyAll()}
            className="ml-auto hidden h-10 items-center gap-1.5 rounded-xl border border-border bg-background/45 px-3 text-[12px] text-muted-foreground transition hover:border-primary/35 hover:bg-primary/8 hover:text-foreground sm:inline-flex"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            Copy
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
            {hero && failedHeroKey !== heroKey ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-100 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero}
                  alt={`Generated preview for page ${page.page_number}`}
                  className="max-h-[min(52vh,560px)] w-full object-contain object-center sm:max-h-[min(60vh,640px)]"
                  onError={() => setFailedHeroKey(heroKey)}
                />
              </div>
            ) : (
              <div className={cn(cardShell, "border-dashed bg-card/45")}>
                <p className="text-[12px] font-medium text-muted-foreground">Preview image could not be generated.</p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground/90">
                  The page summary is still available.
                </p>
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <section className={cardShell} aria-labelledby="doc-oracle-page-summary-h">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                <h2 id="doc-oracle-page-summary-h" className="text-[13px] font-semibold text-foreground">
                  Page summary
                </h2>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {badges.map((b) => (
                  <span
                    key={b}
                    className="max-w-full truncate rounded-full border border-border bg-background/55 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {b}
                  </span>
                ))}
              </div>
              <p id="doc-oracle-page-detail-title" className="mt-3 break-words text-base font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
                {title}
              </p>
              {relatedSection ? (
                <p className="mt-1 break-words text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                  Section: <span className="text-foreground/80">{relatedSection.title}</span>
                </p>
              ) : null}
              {primaryDescription ? (
                <p className="mt-3 break-words text-[13px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{primaryDescription}</p>
              ) : null}
              {secondaryDescription ? (
                <p className="mt-3 break-words text-[13px] leading-relaxed text-muted-foreground/95 [overflow-wrap:anywhere]">{secondaryDescription}</p>
              ) : null}
              {fallbackLong && !primaryDescription ? (
                <p className="mt-3 break-words text-[13px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{fallbackLong}</p>
              ) : null}
            </section>

            {keywordTags.length + linkedTags.length > 0 ? (
              <section className={cardShell} aria-labelledby="doc-oracle-page-kw-h">
                <h3 id="doc-oracle-page-kw-h" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Keywords
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {keywordTags.map((k) => (
                    <span
                      key={`k-${k}`}
                      className="max-w-full truncate rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11.5px] text-primary"
                    >
                      {k}
                    </span>
                  ))}
                  {linkedTags.map((t) => (
                    <span
                      key={`l-${t}`}
                      className="max-w-full truncate rounded-full border border-border bg-background/45 px-3 py-1 text-[11px] text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <section className={cardShell} aria-labelledby="doc-oracle-page-gloss-h">
              <h3 id="doc-oracle-page-gloss-h" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Glossary · this page
              </h3>
              {relatedGlossary.length === 0 ? (
                <p className="mt-3 text-[12px] text-muted-foreground">No glossary terms matched this page.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {relatedGlossary.slice(0, 16).map((g) => (
                    <li key={g.id} className="rounded-xl border border-border bg-background/45 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold text-foreground">{g.term}</p>
                        {sanitizeDisplayTag(g.category) ? (
                          <span className="shrink-0 rounded-full border border-border bg-card/70 px-2 py-0.5 text-[10px] text-muted-foreground">
                            {sanitizeDisplayTag(g.category)}
                          </span>
                        ) : null}
                      </div>
                      {g.definition ? (
                        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{g.definition}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={cardShell} aria-labelledby="doc-oracle-page-sec-h">
              <h3 id="doc-oracle-page-sec-h" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Section
              </h3>
              {relatedSection ? (
                <button
                  type="button"
                  onClick={() => onFocusSection(relatedSection)}
                  className="mt-3 w-full rounded-xl border border-border bg-background/45 p-3 text-left transition hover:border-primary/35 hover:bg-primary/8"
                >
                  <p className="text-[14px] font-semibold text-foreground">{relatedSection.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDocOraclePageRangeWithLabel(relatedSection)}
                  </p>
                  {relatedSection.summary ? (
                    <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{relatedSection.summary}</p>
                  ) : null}
                  {sectionTags.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {sectionTags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-border bg-card/55 px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-2 text-[10px] font-medium text-primary">Open in Sections tab</p>
                </button>
              ) : (
                <p className="mt-3 text-[12px] text-muted-foreground">No section range matched this page.</p>
              )}
            </section>

            <section className={cardShell} aria-labelledby="doc-oracle-page-vis-h">
              <h3 id="doc-oracle-page-vis-h" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Generated images · this page
              </h3>
              <div className="mt-3">
                <DocOracleRelatedVisuals visuals={visualsOnPage} onOpen={onOpenVisual} emptyMessage="No generated images on this page." />
              </div>
            </section>

            {page.has_visual_assets ? (
              <section className={cardShell} aria-labelledby="doc-oracle-page-visd-h">
                <h3 id="doc-oracle-page-visd-h" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Visual description
                </h3>
                {visualNarrative ? (
                  <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{visualNarrative}</p>
                ) : (
                  <p className="mt-3 text-[12px] text-muted-foreground">No visual description is available for this page.</p>
                )}
              </section>
            ) : (
              <section className={cn(cardShell, "opacity-80")} aria-labelledby="doc-oracle-page-visd-empty">
                <h3 id="doc-oracle-page-visd-empty" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Visual description
                </h3>
                <p className="mt-3 text-[12px] text-muted-foreground">No generated images on this page.</p>
              </section>
            )}

            <section className={cardShell} aria-labelledby="doc-oracle-page-q-h">
              <h3 id="doc-oracle-page-q-h" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Questions about this page
              </h3>
              <ul className="mt-3 space-y-2">
                {questions.map((q) => (
                  <li key={q}>
                    {onAskQuestion ? (
                      <button
                        type="button"
                        onClick={() => onAskQuestion(q, page)}
                        className="w-full rounded-xl border border-border bg-background/45 px-3 py-2.5 text-left text-[12.5px] leading-snug text-muted-foreground transition hover:border-primary/35 hover:bg-primary/8 hover:text-foreground"
                      >
                        {q}
                      </button>
                    ) : (
                      <div className="rounded-xl border border-border bg-background/35 px-3 py-2.5 text-[12.5px] text-muted-foreground">{q}</div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <details className={cardShell}>
              <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Page text
              </summary>
              <div className="mt-3 max-h-[280px] overflow-y-auto rounded-xl border border-border bg-background/50 p-3">
                <DocOracleMarkdown className="text-[12px]" source={page.markdown || ""} />
              </div>
            </details>
          </div>
        </div>
      </div>

      <footer className="shrink-0 border-t border-border bg-background/80 px-3 py-3 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] sm:px-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex w-full gap-2 sm:w-auto sm:flex-1">
            {onAskAiPage ? (
              <button type="button" className={primaryBtn} onClick={() => onAskAiPage(page)}>
                <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                Ask Doc Oracle about this page
              </button>
            ) : null}
          </div>
          <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
            {filePath && onOpenSourcePage ? (
              <button type="button" className={ghostBtn} onClick={() => onOpenSourcePage(page.page_number)}>
                <FileText className="h-4 w-4 shrink-0" aria-hidden />
                Open Source PDF
              </button>
            ) : null}
            {sourceHref ? (
              <a
                href={sourceHref}
                target="_blank"
                rel="noreferrer"
                className={cn(ghostBtn, "no-underline")}
                aria-label="Open source PDF in new tab at this page"
              >
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                New tab
              </a>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
