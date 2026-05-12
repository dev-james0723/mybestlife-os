"use client";

import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import { kwList } from "@/components/document-oracle/overview/overviewHelpers";

function pageRange(s: DocOracleSectionRow): string {
  const a = s.page_start;
  const b = s.page_end;
  if (a != null && b != null && b !== a) return `p.${a}–${b}`;
  if (a != null) return `p.${a}`;
  return "";
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
        <BookOpen className="h-4 w-4 text-[#C8E53A]/80" aria-hidden />
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">Table of contents</h3>
      </div>
      <p className="mb-3 text-[12px] text-muted-foreground">Open a section in the Sections tab, or jump to a page in Source.</p>
      <ul className="space-y-2">
        {list.map((s) => {
          const indent = Math.min(Math.max((s.level ?? 1) - 1, 0), 4);
          const tags = kwList(s.keywords);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setSectionDetail(s);
                  setTab("sections");
                }}
                className={cn(
                  "w-full rounded-xl border border-white/10 bg-black/25 p-3 text-left transition hover:border-[#C8E53A]/35 hover:bg-[#C8E53A]/[0.06]",
                  "touch-manipulation",
                )}
                style={{ paddingLeft: `${12 + indent * 14}px` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-foreground">{s.title}</span>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {s.page_start != null && openSourceAtPage ? (
                      <button
                        type="button"
                        className="rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground transition hover:border-[#C8E53A]/40 hover:text-[#d4f06a]"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openSourceAtPage(s.page_start as number);
                        }}
                      >
                        {pageRange(s) || `p.${s.page_start}`}
                      </button>
                    ) : (
                      <span className="text-[11px] tabular-nums text-muted-foreground">{pageRange(s)}</span>
                    )}
                  </div>
                </div>
                {s.summary ? (
                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{s.summary}</p>
                ) : null}
                {tags.length > 0 ? (
                  <p className="mt-2 text-[10.5px] text-muted-foreground/90">
                    <span className="font-medium text-muted-foreground/80">Keywords: </span>
                    {tags.slice(0, 6).join(" · ")}
                  </p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
