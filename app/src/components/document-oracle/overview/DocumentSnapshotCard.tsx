"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import {
  FileText,
  ImageIcon,
  Layers,
  MessageCircle,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocOracleAnalysis } from "@/components/document-oracle/docOracleWorkspaceTypes";
import type { KnowledgeItem } from "@/types/knowledge";

const quickBtn =
  "inline-flex min-h-[44px] flex-1 min-w-[calc(50%-0.25rem)] touch-manipulation items-center justify-center gap-2 rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-[12px] font-semibold text-foreground/95 transition hover:border-[#C8E53A]/40 hover:bg-[#C8E53A]/10 sm:min-h-0 sm:min-w-0 sm:flex-none sm:px-3.5";

function MetaCard(props: { label: string; value: ReactNode; className?: string }) {
  const { label, value, className } = props;
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-white/8 bg-black/20 px-3 py-2",
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 min-w-0 break-words font-medium text-foreground">{value}</div>
    </div>
  );
}

export function DocumentSnapshotCard(props: {
  readyAnalysis: DocOracleAnalysis;
  item: KnowledgeItem;
  pageCount: number;
  sectionCount: number;
  chunkCount: number;
  glossaryCount: number;
  visualCount: number;
  onNavigate: (tab: string) => void;
}) {
  const { readyAnalysis, item, pageCount, sectionCount, chunkCount, glossaryCount, visualCount, onNavigate } = props;
  const title = readyAnalysis.document_title ?? item.title;
  const pagesDisplay =
    readyAnalysis.total_pages != null && readyAnalysis.total_pages > 0 ? readyAnalysis.total_pages : pageCount;

  const summaryRaw = readyAnalysis.summary?.trim() ?? "";
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const summaryRegionId = useId();
  const summaryText = summaryRaw;
  const summaryLong = useMemo(() => {
    const lines = summaryText.split(/\n/).filter((l) => l.trim().length > 0);
    return summaryText.length > 320 || lines.length > 4;
  }, [summaryText]);

  return (
    <section
      className={cn(
        "w-full max-w-full overflow-hidden rounded-3xl border border-white/[0.12] bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-black/30 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl [-webkit-backdrop-filter:blur(18px)] sm:p-6 md:p-8",
      )}
    >
      <div className="flex flex-col gap-5 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.85fr)] md:gap-6 md:items-start">
        <div className="min-w-0 w-full max-w-none space-y-4">
          <div className="flex min-w-0 w-full max-w-none items-start gap-3">
            <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#C8E53A]/25 bg-[#C8E53A]/10 text-[#C8E53A]">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="w-full min-w-0 max-w-none pt-1 text-[10px] font-semibold uppercase leading-snug tracking-[0.14em] text-muted-foreground">
                Document intelligence snapshot
              </p>
              <div
                className={cn(
                  "w-full max-w-none shrink-0 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-2 text-left text-[11px] font-medium leading-snug text-emerald-100/95 md:hidden",
                )}
              >
                <span className="text-emerald-200/80">Extraction</span>
                <span className="mx-1.5 text-emerald-400/50">·</span>
                <span>Normalized workspace</span>
              </div>
            </div>
          </div>

          <div className="hidden w-full justify-end md:flex">
            <div
              className={cn(
                "shrink-0 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-2 text-right text-[11px] font-medium leading-snug text-emerald-100/95",
              )}
            >
              <span className="text-emerald-200/80">Extraction</span>
              <span className="mx-1.5 text-emerald-400/50">·</span>
              <span>Normalized workspace</span>
            </div>
          </div>

          <h2
            className={cn(
              "w-full min-w-0 max-w-none text-pretty break-normal text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl",
            )}
          >
            {title}
          </h2>

          {summaryText ? (
            <div className="min-w-0 space-y-2">
              <p
                id={summaryRegionId}
                className={cn(
                  "max-w-none w-full whitespace-pre-line text-sm leading-7 text-white/60 sm:text-base",
                  !summaryExpanded && summaryLong ? "line-clamp-5" : null,
                )}
              >
                {summaryText}
              </p>
              {summaryLong ? (
                <button
                  type="button"
                  onClick={() => setSummaryExpanded((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#d4f06a] hover:underline"
                  aria-expanded={summaryExpanded}
                  aria-controls={summaryRegionId}
                >
                  {summaryExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                      Read more
                    </>
                  )}
                </button>
              ) : null}
            </div>
          ) : (
            <p className="max-w-none w-full text-sm leading-7 text-white/60 sm:text-base">
              High-level read of what was extracted and how to explore it.
            </p>
          )}
        </div>

        <div className="min-w-0 grid grid-cols-2 gap-3 md:grid-cols-1">
          <MetaCard label="Type" value={readyAnalysis.document_type ?? "—"} />
          <MetaCard label="Language" value={readyAnalysis.language ?? "—"} />
          <MetaCard
            className="col-span-2 md:col-span-1"
            label="Parser"
            value={
              <>
                {readyAnalysis.parser ?? "MinerU"}
                {readyAnalysis.parser_version ? (
                  <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                    v{readyAnalysis.parser_version}
                  </span>
                ) : null}
              </>
            }
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-black/25 p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stats</p>
        <ul className="mt-3 grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 text-[13px] tabular-nums sm:grid-cols-3">
          <li className="flex min-w-0 justify-between gap-2 border-b border-white/5 pb-1.5 sm:border-0 sm:pb-0">
            <span className="shrink-0 text-muted-foreground">Pages</span>
            <span className="min-w-0 text-right font-semibold text-foreground">
              {pagesDisplay > 0 ? pagesDisplay : "—"}
            </span>
          </li>
          <li className="flex min-w-0 justify-between gap-2 border-b border-white/5 pb-1.5 sm:border-0 sm:pb-0">
            <span className="shrink-0 text-muted-foreground">Sections</span>
            <span className="font-semibold text-foreground">{sectionCount}</span>
          </li>
          <li className="flex min-w-0 justify-between gap-2 border-b border-white/5 pb-1.5 sm:border-0 sm:pb-0">
            <span className="shrink-0 text-muted-foreground">Chunks</span>
            <span className="font-semibold text-foreground">{chunkCount}</span>
          </li>
          <li className="flex min-w-0 justify-between gap-2 border-b border-white/5 pb-1.5 sm:border-0 sm:pb-0">
            <span className="shrink-0 text-muted-foreground">Glossary</span>
            <span className="font-semibold text-foreground">{glossaryCount}</span>
          </li>
          <li className="flex min-w-0 justify-between gap-2">
            <span className="shrink-0 text-muted-foreground">Visuals</span>
            <span className="font-semibold text-foreground">{visualCount}</span>
          </li>
        </ul>
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Quick navigation</p>
        <div className="flex min-w-0 flex-wrap gap-2">
          <button type="button" className={quickBtn} onClick={() => onNavigate("chat")}>
            <MessageCircle className="h-4 w-4 shrink-0 text-[#C8E53A]" aria-hidden />
            Ask Doc Oracle about this document
          </button>
          <button type="button" className={quickBtn} onClick={() => onNavigate("pages")}>
            <Layers className="h-4 w-4 shrink-0 text-sky-300/90" aria-hidden />
            Browse pages
          </button>
          <button type="button" className={quickBtn} onClick={() => onNavigate("sections")}>
            <BookOpen className="h-4 w-4 shrink-0 text-violet-300/90" aria-hidden />
            Explore sections
          </button>
          <button type="button" className={quickBtn} onClick={() => onNavigate("visuals")}>
            <ImageIcon className="h-4 w-4 shrink-0 text-amber-300/90" aria-hidden />
            View visuals
          </button>
          <button type="button" className={quickBtn} onClick={() => onNavigate("source")}>
            <FileText className="h-4 w-4 shrink-0 text-teal-300/90" aria-hidden />
            Open source
          </button>
        </div>
      </div>
    </section>
  );
}
