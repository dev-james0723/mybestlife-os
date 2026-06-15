"use client";

import type { DocOracleVisualRow } from "@/components/document-oracle/DocOracleWorkspace";
import { displayVisualDescription, displayVisualTitle } from "@/components/document-oracle/docOracleVisualLabels";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import { cleanDisplayTags, getDisplayVisualCategory } from "@/components/document-oracle/docOracleDisplay";

function tagList(v: unknown): string[] {
  return cleanDisplayTags(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [], 5).tags;
}

export function DocOracleVisualCard(props: {
  visual: DocOracleVisualRow;
  relatedSectionTitle: string | null;
  onOpen: () => void;
}) {
  const { visual, relatedSectionTitle, onOpen } = props;
  if (!visual.image_path) return null;

  const title = displayVisualTitle(visual);
  const desc = displayVisualDescription(visual);
  const cat = getDisplayVisualCategory(visual.semantic_category || visual.type);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-border bg-card/65 text-left transition hover:border-primary/30 hover:bg-primary/5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={knowledgeFilesApiHref(visual.image_path)}
        alt="Generated preview for this document"
        className="aspect-[4/3] w-full bg-muted object-contain"
      />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            {cat}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {visual.source_page_number != null ? `p.${visual.source_page_number}` : "page unknown"}
          </span>
        </div>
        <p className="line-clamp-2 break-words text-[12px] font-semibold text-foreground [overflow-wrap:anywhere]">{title}</p>
        {relatedSectionTitle ? (
          <p className="line-clamp-1 break-words text-[10px] text-primary [overflow-wrap:anywhere]">Section: {relatedSectionTitle}</p>
        ) : null}
        {desc ? <p className="line-clamp-3 break-words text-[11px] text-muted-foreground [overflow-wrap:anywhere]">{desc}</p> : null}
        {tagList(visual.retrieval_tags).length ? (
          <p className="line-clamp-2 break-words text-[10px] text-muted-foreground/80 [overflow-wrap:anywhere]">{tagList(visual.retrieval_tags).join(" · ")}</p>
        ) : null}
      </div>
    </button>
  );
}
