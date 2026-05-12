"use client";

import { ExternalLink, MessageCircle } from "lucide-react";
import type { DocOracleVisualRow } from "@/components/document-oracle/DocOracleWorkspace";
import { displayVisualDescription, displayVisualTitle } from "@/components/document-oracle/docOracleVisualLabels";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import { cn } from "@/lib/utils";

const limeBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#C8E53A] px-3 py-2 text-[12px] font-semibold text-[#0d0d0d] shadow-sm transition-[filter,transform] duration-[120ms] ease-out hover:scale-[1.02] hover:brightness-[1.12]";

function tagList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 16) : [];
}

export function DocOracleVisualPreviewModal(props: {
  visual: DocOracleVisualRow;
  filePath: string | null | undefined;
  relatedSectionTitle: string | null;
  onClose: () => void;
  onAskAiVisual: (v: DocOracleVisualRow) => void;
}) {
  const { visual, filePath, relatedSectionTitle, onClose, onAskAiVisual } = props;
  if (!visual.image_path) return null;

  const src = knowledgeFilesApiHref(visual.image_path);
  const page = visual.source_page_number;
  const sourceHref =
    filePath && page != null && page > 0
      ? `${knowledgeFilesApiHref(filePath)}#page=${page}`
      : filePath
        ? knowledgeFilesApiHref(filePath)
        : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal
    >
      <div className="max-h-[min(92dvh,900px)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/15 bg-[#141210] p-4 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
              {visual.semantic_category || visual.type || "visual"}
              {page != null ? ` · page ${page}` : " · page unknown"}
            </p>
            <p className="mt-1 text-base font-semibold text-white">{displayVisualTitle(visual)}</p>
            {relatedSectionTitle ? (
              <p className="mt-1 text-[12px] text-[#C8E53A]/90">Related section: {relatedSectionTitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 py-1 text-[12px] text-white/80"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="mt-3 max-h-[55vh] w-full rounded-xl object-contain" />

        {displayVisualDescription(visual) ? (
          <p className="mt-3 text-[13px] leading-relaxed text-white/70">{displayVisualDescription(visual)}</p>
        ) : null}

        <div className="mt-4 space-y-2">
          {tagList(visual.extracted_labels).length ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Labels</p>
              <p className="text-[12px] text-white/70">{tagList(visual.extracted_labels).join(", ")}</p>
            </div>
          ) : null}
          {tagList(visual.retrieval_tags).length ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Tags</p>
              <p className="text-[12px] text-white/70">{tagList(visual.retrieval_tags).join(", ")}</p>
            </div>
          ) : null}
          {tagList(visual.related_terms).length ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Related terms</p>
              <p className="text-[12px] text-white/70">{tagList(visual.related_terms).join(", ")}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {sourceHref ? (
            <a href={sourceHref} target="_blank" rel="noreferrer" className={cn(limeBtn, "no-underline")}>
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open source page
            </a>
          ) : null}
          <button type="button" className={cn(limeBtn)} onClick={() => onAskAiVisual(visual)}>
            <MessageCircle className="h-4 w-4" aria-hidden />
            Ask AI about this visual
          </button>
        </div>
      </div>
    </div>
  );
}
