"use client";

import { ImageIcon } from "lucide-react";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import { displayVisualTitle } from "@/components/document-oracle/docOracleVisualLabels";
import type { DocOracleVisualRow } from "@/components/document-oracle/docOraclePageTypes";
import { cn } from "@/lib/utils";

export function OverviewVisualHighlights(props: {
  visuals: DocOracleVisualRow[];
  maxThumbs?: number;
  onOpenVisual: (v: DocOracleVisualRow) => void;
  onViewAll: () => void;
  openSourceAtPage?: (page: number) => void;
}) {
  const { visuals, maxThumbs = 6, onOpenVisual, onViewAll, openSourceAtPage } = props;
  const withImages = visuals.filter((v) => v.image_path).slice(0, maxThumbs);
  if (!withImages.length) return null;

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-[13px] font-semibold tracking-tight text-foreground">Visual highlights</h3>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="rounded-lg border border-border bg-background/45 px-3 py-1.5 text-[11.5px] font-semibold text-foreground/90 transition hover:border-primary/35 hover:bg-primary/8"
        >
          View all visuals
        </button>
      </div>
      <p className="mb-3 text-[12px] text-muted-foreground">Tap a thumbnail for details, source page, and Ask Doc Oracle.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {withImages.map((v) => (
          <div key={v.id} className="overflow-hidden rounded-2xl border border-border bg-card/60 shadow-inner">
            <button
              type="button"
              onClick={() => onOpenVisual(v)}
              className="block w-full text-left transition hover:opacity-95"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={knowledgeFilesApiHref(v.image_path as string)}
                alt={v.title || "visual"}
                className="h-28 w-full object-cover sm:h-32"
              />
              <div className="space-y-1 px-2.5 py-2">
                <p className="truncate text-[11px] font-semibold text-foreground">{displayVisualTitle(v)}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {[v.semantic_category, v.type].filter(Boolean).join(" · ") || "Visual"}
                </p>
              </div>
            </button>
            <div className="flex items-center justify-between gap-2 border-t border-border px-2.5 py-1.5">
              {v.source_page_number != null && openSourceAtPage ? (
                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-border bg-background/45 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground transition hover:border-primary/40 hover:text-primary",
                  )}
                  onClick={() => openSourceAtPage(v.source_page_number as number)}
                >
                  p.{v.source_page_number}
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  {v.source_page_number != null ? `p.${v.source_page_number}` : ""}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
