"use client";

import type { ReactNode } from "react";
import {
  BookOpen,
  FileText,
  ImageIcon,
  Layers,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocOracleAnalysis } from "@/components/document-oracle/docOracleWorkspaceTypes";
import type { KnowledgeItem } from "@/types/knowledge";

const quickBtn =
  "inline-flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-border bg-background/55 px-3 text-center text-[12px] font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition-[background,border-color,transform] duration-150 ease-out hover:border-primary/35 hover:bg-primary/8 active:translate-y-px dark:bg-white/[0.035] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

function MetaCard(props: { label: string; value: ReactNode; className?: string }) {
  const { label, value, className } = props;
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-border bg-muted/35 px-3 py-2.5",
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
  const { readyAnalysis, pageCount, sectionCount, chunkCount, glossaryCount, visualCount, onNavigate } = props;
  const pagesDisplay =
    readyAnalysis.total_pages != null && readyAnalysis.total_pages > 0 ? readyAnalysis.total_pages : pageCount;

  const statItems = [
    ["Pages", pagesDisplay > 0 ? pagesDisplay : "—"],
    ["Sections", sectionCount],
    ["Chunks", chunkCount],
    ["Glossary", glossaryCount],
    ["Visuals", visualCount],
  ] as const;

  const quickNavItems = [
    { tab: "chat", label: "Ask Oracle", ariaLabel: "Ask Doc Oracle about this document", Icon: MessageCircle },
    { tab: "pages", label: "Pages", ariaLabel: "Browse document pages", Icon: Layers },
    { tab: "sections", label: "Sections", ariaLabel: "Explore document sections", Icon: BookOpen },
    { tab: "visuals", label: "Visuals", ariaLabel: "View document visuals", Icon: ImageIcon },
    { tab: "source", label: "Source", ariaLabel: "Open source document", Icon: FileText },
  ] as const;

  return (
    <section
      className={cn(
        "w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card/82 p-4 shadow-[0_16px_44px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl [-webkit-backdrop-filter:blur(18px)] dark:bg-card/72 dark:shadow-[0_18px_54px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-5 md:p-6",
      )}
    >
      <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)] md:items-start md:gap-5">
        <div className="min-w-0 space-y-3">
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
            Intelligence summary
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Start with a grounded answer, then jump into pages, sections, visuals, or the original source.
          </p>
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

      <div className="mt-5 rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stats</p>
        <ul className="mt-2 grid min-w-0 grid-cols-2 gap-2 text-[13px] tabular-nums sm:grid-cols-5">
          {statItems.map(([label, value]) => (
            <li key={label} className="rounded-lg border border-border bg-background/55 px-3 py-2">
              <span className="block text-[11px] text-muted-foreground">{label}</span>
              <span className="mt-0.5 block text-base font-semibold leading-none text-foreground">{value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Open</p>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-5">
          {quickNavItems.map(({ tab, label, ariaLabel, Icon }, index) => (
            <button
              key={tab}
              type="button"
              className={cn(quickBtn, index === quickNavItems.length - 1 && "max-sm:col-span-2")}
              onClick={() => onNavigate(tab)}
              aria-label={ariaLabel}
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
