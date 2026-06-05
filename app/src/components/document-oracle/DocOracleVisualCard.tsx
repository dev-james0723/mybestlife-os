"use client";

import type { DocOracleVisualRow } from "@/components/document-oracle/DocOracleWorkspace";
import { displayVisualDescription, displayVisualTitle } from "@/components/document-oracle/docOracleVisualLabels";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";

function tagList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 8) : [];
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
  const cat = visual.semantic_category || visual.type || "unknown";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card/65 text-left transition hover:border-primary/30 hover:bg-primary/5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={knowledgeFilesApiHref(visual.image_path)}
        alt=""
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            {cat}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {visual.source_page_number != null ? `p.${visual.source_page_number}` : "page unknown"}
          </span>
          {visual.confidence != null && Number.isFinite(visual.confidence) ? (
            <span className="text-[9px] text-muted-foreground/70">conf {visual.confidence.toFixed(1)}</span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-[12px] font-semibold text-foreground">{title}</p>
        {relatedSectionTitle ? (
          <p className="line-clamp-1 text-[10px] text-primary">§ {relatedSectionTitle}</p>
        ) : null}
        {desc ? <p className="line-clamp-3 text-[11px] text-muted-foreground">{desc}</p> : null}
        {tagList(visual.retrieval_tags).length ? (
          <p className="line-clamp-2 text-[10px] text-muted-foreground/80">{tagList(visual.retrieval_tags).join(" · ")}</p>
        ) : null}
      </div>
    </button>
  );
}
