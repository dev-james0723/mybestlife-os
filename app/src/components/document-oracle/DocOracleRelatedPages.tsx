"use client";

import { ImageIcon } from "lucide-react";
import type { DocOraclePageRow } from "@/components/document-oracle/DocOracleWorkspace";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import { cn } from "@/lib/utils";
import { cleanDisplayTags } from "@/components/document-oracle/docOracleDisplay";

function kwList(v: unknown): string[] {
  return cleanDisplayTags(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [], 4).tags;
}

export function DocOracleRelatedPages(props: {
  pages: DocOraclePageRow[];
  onSelectPage: (p: DocOraclePageRow) => void;
  onOpenPageDetail: (p: DocOraclePageRow) => void;
}) {
  const { pages, onSelectPage, onOpenPageDetail } = props;
  if (pages.length === 0) {
    return <p className="text-[12px] text-muted-foreground">No pages in this section range yet.</p>;
  }
  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-2">
      {pages.map((p) => (
        <div
          key={p.id}
          className="flex min-w-0 gap-2 rounded-2xl border border-border bg-muted/40 p-3 transition hover:border-border"
        >
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => onSelectPage(p)}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Page {p.page_number}
              </p>
              {p.has_visual_assets ? (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                  <ImageIcon className="h-3 w-3" aria-hidden />
                  images
                </span>
              ) : null}
            </div>
            {p.rendered_image_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={knowledgeFilesApiHref(p.rendered_image_path)}
                alt={`Generated preview for page ${p.page_number}`}
                className="mt-2 h-20 w-full rounded-lg bg-muted object-contain"
              />
            ) : null}
            <p className="mt-2 line-clamp-2 break-words text-[12px] text-muted-foreground [overflow-wrap:anywhere]">{p.page_summary}</p>
            {kwList(p.keywords).length ? (
              <p className="mt-1 line-clamp-2 break-words text-[10px] text-muted-foreground [overflow-wrap:anywhere]">{kwList(p.keywords).join(" · ")}</p>
            ) : null}
          </button>
          <button
            type="button"
            className={cn(
              "shrink-0 self-center rounded-lg border border-border px-2 py-1.5 text-[10px] text-muted-foreground transition hover:border-primary/30 hover:bg-primary/8 hover:text-foreground",
            )}
            onClick={() => onOpenPageDetail(p)}
          >
            Read
          </button>
        </div>
      ))}
    </div>
  );
}
