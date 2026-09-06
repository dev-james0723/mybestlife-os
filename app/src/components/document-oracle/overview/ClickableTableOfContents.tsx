"use client";

import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import { formatDocOraclePageRange } from "@/components/document-oracle/docOraclePageRange";

function compactText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[*_`#>-]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export function ClickableTableOfContents(props: {
  sections: DocOracleSectionRow[];
  maxItems?: number;
  setTab: (tab: string) => void;
  setSectionDetail: (s: DocOracleSectionRow) => void;
  openSourceAtPage?: (page: number) => void;
}) {
  const { sections, maxItems = 12, setTab, setSectionDetail, openSourceAtPage } = props;
  const list = sections.slice(0, maxItems);
  if (!list.length) return null;

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">Table of contents</h3>
      </div>
      <p className="mb-3 text-[12px] text-muted-foreground">Open a section in the Sections tab, or jump to a page in Source.</p>
      <ul className="space-y-2">
        {list.map((s) => {
          const indent = Math.min(Math.max((s.level ?? 1) - 1, 0), 4);
          const titleKey = compactText(s.title);
          const summary = s.summary?.trim() ?? "";
          const showSummary = summary.length > 0 && compactText(summary) !== titleKey;
          const pageRange = formatDocOraclePageRange(s);
          return (
            <li key={s.id}>
              <div
                className={cn(
                  "w-full rounded-xl border border-border bg-card/70 p-3 transition hover:border-primary/25 hover:bg-primary/8",
                  "touch-manipulation",
                )}
                style={{ paddingLeft: `${12 + indent * 14}px` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSectionDetail(s);
                      setTab("sections");
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block text-[13px] font-semibold leading-snug text-foreground">{s.title}</span>
                    {showSummary ? (
                      <span className="mt-1.5 line-clamp-2 block text-[12px] leading-relaxed text-muted-foreground">
                        {summary}
                      </span>
                    ) : null}
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {s.page_start != null && openSourceAtPage ? (
                      <button data-control-variant="outline"
                        type="button"
                        className="rounded-full border border-border bg-background/55 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground transition hover:border-primary/35 hover:text-primary"
                        onClick={() => {
                          openSourceAtPage(s.page_start as number);
                        }}
                        aria-label={`Open ${pageRange || `P.${s.page_start}`} in source`}
                      >
                        {pageRange || `P.${s.page_start}`}
                      </button>
                    ) : (
                      <span className="text-[11px] tabular-nums text-muted-foreground">{pageRange}</span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
