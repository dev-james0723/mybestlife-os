"use client";

import { MessageCircle } from "lucide-react";
import type { DocOracleGlossaryRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import { normalizeGlossaryPages, normalizeGlossaryRelatedTerms } from "@/components/document-oracle/glossary/glossaryNormalize";
import { isGenericGlossaryDefinition } from "@/components/document-oracle/glossary/glossaryCategoryInference";
import { cn } from "@/lib/utils";

type Props = {
  term: DocOracleGlossaryRow;
  categoryLabel: string;
  onOpen: () => void;
  onAskAi: () => void;
};

export function GlossaryTermCard(props: Props) {
  const { term, categoryLabel, onOpen, onAskAi } = props;
  const pages = normalizeGlossaryPages(term.pages);
  const related = normalizeGlossaryRelatedTerms(term.related_terms);
  const def = term.definition?.trim() || "";
  const showDef = def && !isGenericGlossaryDefinition(def);
  const previewDef = showDef ? def.slice(0, 160) + (def.length > 160 ? "…" : "") : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group relative w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-left shadow-sm backdrop-blur-md transition",
        "hover:border-[#C8E53A]/35 hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8E53A]/40",
        "[-webkit-backdrop-filter:blur(12px)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground">{term.term}</p>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {categoryLabel}
        </span>
      </div>
      {previewDef ? (
        <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">{previewDef}</p>
      ) : (
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          Tap for details, pages, and related terms — or ask Doc Oracle for a clearer explanation.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {pages.length > 0 ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pages</span>
        ) : null}
        {pages.slice(0, 5).map((p) => (
          <span
            key={p}
            className="rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[11px] text-foreground/90"
          >
            p.{p}
          </span>
        ))}
        {pages.length > 5 ? (
          <span className="text-[11px] text-muted-foreground">+{pages.length - 5}</span>
        ) : null}
      </div>
      {related.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {related.slice(0, 4).map((r) => (
            <span
              key={r}
              className="max-w-[140px] truncate rounded-full border border-border/50 bg-muted/25 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {r}
            </span>
          ))}
          {related.length > 4 ? (
            <span className="text-[10px] text-muted-foreground">+{related.length - 4}</span>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#C8E53A]/40 bg-[#C8E53A]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#d4f06a] transition hover:bg-[#C8E53A]/20"
          onClick={(e) => {
            e.stopPropagation();
            onAskAi();
          }}
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          Ask Doc Oracle
        </button>
      </div>
    </div>
  );
}
