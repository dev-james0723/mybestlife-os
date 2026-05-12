"use client";

import type { DocOracleVisualRow } from "@/components/document-oracle/DocOracleWorkspace";
import { displayVisualDescription, displayVisualTitle } from "@/components/document-oracle/docOracleVisualLabels";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import { cn } from "@/lib/utils";

function tagList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 6) : [];
}

export function DocOracleRelatedVisuals(props: {
  visuals: DocOracleVisualRow[];
  onOpen: (v: DocOracleVisualRow) => void;
  emptyMessage?: string;
}) {
  const { visuals, onOpen, emptyMessage } = props;
  if (visuals.length === 0) {
    return (
      <p className="text-[12px] text-muted-foreground">
        {emptyMessage ?? "No visuals matched this section."}
      </p>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {visuals.map((v) =>
        v.image_path ? (
          <button
            key={v.id}
            type="button"
            onClick={() => onOpen(v)}
            className="flex gap-2 overflow-hidden rounded-2xl border border-border bg-muted/40 p-2 text-left transition hover:border-[#C8E53A]/35"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={knowledgeFilesApiHref(v.image_path)}
              alt=""
              className="h-20 w-24 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1 py-0.5">
              <p className="line-clamp-2 text-[12px] font-medium text-foreground">{displayVisualTitle(v)}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {v.semantic_category || v.type || "visual"} ·{" "}
                {v.source_page_number != null ? `p.${v.source_page_number}` : "page unknown"}
              </p>
              {displayVisualDescription(v) ? (
                <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{displayVisualDescription(v)}</p>
              ) : null}
              {tagList(v.retrieval_tags).length ? (
                <p className={cn("mt-1 line-clamp-1 text-[9px] text-muted-foreground/80")}>
                  {tagList(v.retrieval_tags).join(" · ")}
                </p>
              ) : null}
            </div>
          </button>
        ) : null,
      )}
    </div>
  );
}
