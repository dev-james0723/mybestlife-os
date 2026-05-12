"use client";

import {
  FileText,
  ImageIcon,
  Layers,
  MessageCircle,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocOracleAnalysis } from "@/components/document-oracle/docOracleWorkspaceTypes";
import type { KnowledgeItem } from "@/types/knowledge";

const quickBtn =
  "inline-flex min-h-[44px] flex-1 min-w-[calc(50%-0.25rem)] touch-manipulation items-center justify-center gap-2 rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-[12px] font-semibold text-foreground/95 transition hover:border-[#C8E53A]/40 hover:bg-[#C8E53A]/10 sm:min-h-0 sm:min-w-0 sm:flex-none sm:px-3.5";

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

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-white/[0.12] bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-black/30 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl [-webkit-backdrop-filter:blur(18px)] sm:p-6",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#C8E53A]/25 bg-[#C8E53A]/10 text-[#C8E53A]">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Document intelligence snapshot
            </p>
            <h2 className="text-balance text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
              {title}
            </h2>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              High-level read of what was extracted and how to explore it.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-2 text-[11px] font-medium text-emerald-100/95">
          <span className="text-emerald-200/80">Extraction</span>
          <span className="mx-1.5 text-emerald-400/50">·</span>
          <span>Normalized workspace</span>
        </div>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] sm:grid-cols-3">
          <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Type</dt>
            <dd className="mt-0.5 font-medium text-foreground">{readyAnalysis.document_type ?? "—"}</dd>
          </div>
          <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Language</dt>
            <dd className="mt-0.5 font-medium text-foreground">{readyAnalysis.language ?? "—"}</dd>
          </div>
          <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Parser</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {readyAnalysis.parser ?? "MinerU"}
              {readyAnalysis.parser_version ? (
                <span className="block text-[11px] font-normal text-muted-foreground">v{readyAnalysis.parser_version}</span>
              ) : null}
            </dd>
          </div>
        </dl>

        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stats</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px] tabular-nums sm:grid-cols-1">
            <li className="flex justify-between gap-2 border-b border-white/5 pb-1.5 sm:border-0 sm:pb-0">
              <span className="text-muted-foreground">Pages</span>
              <span className="font-semibold text-foreground">{pagesDisplay > 0 ? pagesDisplay : "—"}</span>
            </li>
            <li className="flex justify-between gap-2 border-b border-white/5 pb-1.5 sm:border-0 sm:pb-0">
              <span className="text-muted-foreground">Sections</span>
              <span className="font-semibold text-foreground">{sectionCount}</span>
            </li>
            <li className="flex justify-between gap-2 border-b border-white/5 pb-1.5 sm:border-0 sm:pb-0">
              <span className="text-muted-foreground">Chunks</span>
              <span className="font-semibold text-foreground">{chunkCount}</span>
            </li>
            <li className="flex justify-between gap-2 border-b border-white/5 pb-1.5 sm:border-0 sm:pb-0">
              <span className="text-muted-foreground">Glossary</span>
              <span className="font-semibold text-foreground">{glossaryCount}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-muted-foreground">Visuals</span>
              <span className="font-semibold text-foreground">{visualCount}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Quick navigation</p>
        <div className="flex flex-wrap gap-2">
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
