"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocOracleAnalysis } from "@/components/document-oracle/docOracleWorkspaceTypes";
import type { DocOraclePageRow } from "@/components/document-oracle/docOraclePageTypes";
import type { KnowledgeItem } from "@/types/knowledge";
import { pageRenderedImageHref } from "@/components/document-oracle/source/pageRenderedImageHref";
import {
  buildPrimaryDocumentTags,
  getDisplayDocumentType,
  getDisplayLanguage,
} from "@/components/document-oracle/docOracleDisplay";
import { formatKnowledgeLocalDateTime } from "@/lib/i18n/knowledge-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";

type SignalStat = {
  label: string;
  value: number;
  display: string | number;
};

function radarPoint(index: number, total: number, radius: number): string {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  const x = 50 + Math.cos(angle) * radius;
  const y = 50 + Math.sin(angle) * radius;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

function SignalRadar({ stats }: { stats: SignalStat[] }) {
  const numeric = stats.map((s) => Math.max(0, s.value));
  const max = Math.max(...numeric, 1);
  const points = stats
    .map((stat, index) => {
      const strength = Math.max(0.16, Math.min(1, Math.log1p(stat.value) / Math.log1p(max)));
      return radarPoint(index, stats.length, 9 + strength * 31);
    })
    .join(" ");
  const rings = [18, 28, 40];

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-muted/28 p-4 sm:grid-cols-[170px_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-square w-full max-w-[170px]">
        <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" role="img" aria-label="Document signal radar">
          {rings.map((radius) => (
            <polygon
              key={radius}
              points={stats.map((_, index) => radarPoint(index, stats.length, radius)).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              className="text-border"
            />
          ))}
          {stats.map((_, index) => (
            <line
              key={index}
              x1="50"
              y1="50"
              x2={radarPoint(index, stats.length, 42).split(",")[0]}
              y2={radarPoint(index, stats.length, 42).split(",")[1]}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-border"
            />
          ))}
          <polygon points={points} className="fill-primary/20 stroke-primary" strokeWidth="1.4" />
          <circle cx="50" cy="50" r="2.3" className="fill-primary" />
        </svg>
      </div>

      <ul className="grid min-w-0 grid-cols-2 gap-2 text-[12px] tabular-nums sm:grid-cols-5 sm:self-center">
        {stats.map((stat) => {
          const level = Math.max(0.12, Math.min(1, stat.value / max));
          return (
            <li key={stat.label} className="min-w-0 rounded-lg border border-border bg-background/55 p-2.5">
              <span className="block text-[10px] text-muted-foreground">{stat.label}</span>
              <span className="mt-1 block text-base font-semibold leading-none text-foreground">{stat.display}</span>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary/80" style={{ width: `${level * 100}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function firstGeneratedPreview(pages: DocOraclePageRow[]): string | null {
  const firstWithImage = [...pages]
    .sort((a, b) => a.page_number - b.page_number)
    .find((page) => pageRenderedImageHref(page) != null);
  return firstWithImage ? pageRenderedImageHref(firstWithImage) : null;
}

function DocumentGeneratedPreview(props: {
  item: KnowledgeItem;
  pages: DocOraclePageRow[];
  title: string;
  summary: string | null;
}) {
  const { item, pages, title, summary } = props;
  const src = useMemo(() => item.thumbnailUrl ?? item.screenshotUrl ?? firstGeneratedPreview(pages), [item, pages]);
  const [imageState, setImageState] = useState<"loading" | "loaded" | "failed">(src ? "loading" : "failed");

  useEffect(() => {
    setImageState(src ? "loading" : "failed");
  }, [src]);

  const displayTags = useMemo(
    () =>
      buildPrimaryDocumentTags({
        item,
        documentType: null,
        pages,
        visualCount: 0,
        status: item.status,
      }),
    [item, pages],
  );
  const isLoading = Boolean(src) && imageState === "loading";
  const showImage = Boolean(src) && imageState !== "failed";

  return (
    <div className="relative min-h-[230px] w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt="Generated preview for this document"
          className={cn(
            "absolute inset-0 h-full w-full bg-neutral-100 object-contain transition-opacity duration-200 ease-out motion-reduce:transition-none",
            imageState === "loaded" ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setImageState("loaded")}
          onError={() => setImageState("failed")}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/45 p-6 text-center text-[12px] leading-relaxed text-muted-foreground">
          <span>{src ? "Preview image could not be generated." : "Preview image is being prepared."}</span>
        </div>
      )}
      {isLoading ? (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/80 via-background to-muted/55 motion-reduce:animate-none"
          aria-label="Generating preview image"
          role="status"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/18 to-transparent" />
      <div className="relative z-10 flex h-full min-h-[230px] flex-col justify-between p-4 text-white">
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md">
          <ImageIcon className="h-3.5 w-3.5" aria-hidden />
          Generated image
        </div>
        <div className="min-w-0">
          <p className="text-pretty break-words text-lg font-semibold leading-tight [overflow-wrap:anywhere]">{title}</p>
          {summary ? <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-white/72">{summary}</p> : null}
          {displayTags.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {displayTags.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="max-w-full truncate rounded-full border border-white/14 bg-white/10 px-2 py-0.5 text-[10px] text-white/82">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function DocumentSnapshotCard(props: {
  readyAnalysis: DocOracleAnalysis;
  item: KnowledgeItem;
  pages: DocOraclePageRow[];
  pageCount: number;
  sectionCount: number;
  chunkCount: number;
  glossaryCount: number;
  visualCount: number;
  appLocale: AppLocale;
}) {
  const { readyAnalysis, item, pages, pageCount, sectionCount, chunkCount, glossaryCount, visualCount, appLocale } = props;
  const pagesDisplay =
    readyAnalysis.total_pages != null && readyAnalysis.total_pages > 0 ? readyAnalysis.total_pages : pageCount;

  const statItems = [
    { label: "Pages", value: pagesDisplay > 0 ? pagesDisplay : 0, display: pagesDisplay > 0 ? pagesDisplay : "—" },
    { label: "Sections", value: sectionCount, display: sectionCount },
    { label: "Passages", value: chunkCount, display: chunkCount },
    { label: "Glossary", value: glossaryCount, display: glossaryCount },
    { label: "Visuals", value: visualCount, display: visualCount },
  ] satisfies SignalStat[];
  const summary = readyAnalysis.summary?.trim() || item.aiSummary || item.aiContentOverview || null;
  const docType = getDisplayDocumentType(readyAnalysis.document_type, item.contentType);
  const language = getDisplayLanguage(readyAnalysis.language);
  const displayTags = buildPrimaryDocumentTags({
    item,
    documentType: readyAnalysis.document_type,
    pages,
    visualCount,
    status: readyAnalysis.status,
  });

  return (
    <section
      className={cn(
        "w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card/82 p-4 shadow-[0_16px_44px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl [-webkit-backdrop-filter:blur(18px)] dark:bg-card/72 dark:shadow-[0_18px_54px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-5 md:p-6",
      )}
    >
      <div className="flex min-w-0 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.78fr)] lg:items-stretch lg:gap-6">
        <div className="min-w-0 space-y-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold uppercase leading-snug tracking-[0.14em] text-muted-foreground">
                  Document intelligence snapshot
                </p>
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  Ready
                </span>
              </div>
            </div>
          </div>

          <h2 className="w-full min-w-0 max-w-none text-pretty text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
            Document analysis
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Start with a grounded answer, then jump into pages, sections, visuals, or the original source.
          </p>

          <div className="grid min-w-0 gap-2 text-[11px] sm:grid-cols-2">
            <span className="min-w-0 rounded-xl border border-border bg-muted/45 px-3 py-2 text-muted-foreground">
              Type <span className="font-semibold text-foreground">{docType}</span>
            </span>
            <span className="min-w-0 rounded-xl border border-border bg-muted/45 px-3 py-2 text-muted-foreground">
              Language <span className="font-semibold text-foreground">{language}</span>
            </span>
            <span className="min-w-0 rounded-xl border border-border bg-muted/45 px-3 py-2 text-muted-foreground">
              Added <span className="font-semibold text-foreground">{formatKnowledgeLocalDateTime(appLocale, item.dateAdded)}</span>
            </span>
            <span className="min-w-0 rounded-xl border border-border bg-muted/45 px-3 py-2 text-muted-foreground">
              Updated <span className="font-semibold text-foreground">{formatKnowledgeLocalDateTime(appLocale, item.dateModified)}</span>
            </span>
          </div>

          {displayTags.tags.length ? (
            <div className="flex min-w-0 flex-wrap gap-2 text-[11px]" aria-label="Document tags">
              {displayTags.tags.map((tag) => (
                <span
                  key={tag}
                  className="max-w-full truncate rounded-full border border-border bg-background/55 px-2.5 py-1 text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {displayTags.overflow > 0 ? (
                <span className="rounded-full border border-border bg-background/55 px-2.5 py-1 text-muted-foreground">
                  +{displayTags.overflow}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <DocumentGeneratedPreview item={item} pages={pages} title={readyAnalysis.document_title ?? item.title} summary={summary} />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Document signals</p>
        <SignalRadar stats={statItems} />
      </div>
    </section>
  );
}
