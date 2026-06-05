"use client";

import { ExternalLink, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DocOracleGlossaryRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import type { DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import { normalizeGlossaryPages, normalizeGlossaryRelatedTerms } from "@/components/document-oracle/glossary/glossaryNormalize";
import { isGenericGlossaryDefinition } from "@/components/document-oracle/glossary/glossaryCategoryInference";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import { formatDocOraclePageRangeWithLabel } from "@/components/document-oracle/docOraclePageRange";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  term: DocOracleGlossaryRow | null;
  categoryLabel: string;
  sectionsOverlap: DocOracleSectionRow[];
  glossaryIndex: Map<string, DocOracleGlossaryRow>;
  filePath: string | null | undefined;
  onOpenSourcePage?: (page: number) => void;
  onFocusSection: (s: DocOracleSectionRow) => void;
  onSwitchToSections: () => void;
  onAskAiAboutTerm: (term: DocOracleGlossaryRow) => void;
  onSearchRelated: (label: string) => void;
  onOpenRelatedTerm: (term: DocOracleGlossaryRow) => void;
  askAiLabel: string;
  openSourceLabel: string;
  sectionsTabLabel: string;
  zhUi: boolean;
};

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

export function GlossaryTermDetailModal(props: Props) {
  const {
    open,
    onOpenChange,
    term,
    categoryLabel,
    sectionsOverlap,
    glossaryIndex,
    filePath,
    onOpenSourcePage,
    onFocusSection,
    onSwitchToSections,
    onAskAiAboutTerm,
    onSearchRelated,
    onOpenRelatedTerm,
    askAiLabel,
    openSourceLabel,
    sectionsTabLabel,
    zhUi,
  } = props;

  if (!term) return null;

  const pages = normalizeGlossaryPages(term.pages);
  const related = normalizeGlossaryRelatedTerms(term.related_terms);
  const rawDef = term.definition?.trim() || "";
  const defIsGeneric = isGenericGlossaryDefinition(rawDef);
  const badge = categoryLabel;

  const resolveRelated = (label: string): DocOracleGlossaryRow | null => {
    const k = normKey(label);
    const direct = glossaryIndex.get(k);
    if (direct) return direct;
    for (const [, g] of glossaryIndex) {
      if (normKey(g.term) === k) return g;
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className={cn(
          "max-h-[min(88dvh,720px)] overflow-y-auto sm:max-w-2xl",
          "max-sm:top-auto max-sm:bottom-4 max-sm:left-1/2 max-sm:max-h-[min(92dvh,780px)] max-sm:max-w-[calc(100%-1.25rem)] max-sm:-translate-x-1/2 max-sm:translate-y-0",
        )}
      >
        <DialogHeader className="space-y-2 pr-8 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {badge}
            </span>
          </div>
          <DialogTitle className="text-left text-xl font-semibold tracking-tight text-foreground">{term.term}</DialogTitle>
          <DialogDescription className="sr-only">Glossary term details and document references</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-[13px] leading-relaxed text-muted-foreground">
          <section className="rounded-2xl border border-border bg-muted/30 p-4 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {zhUi ? "定義" : "Definition"}
            </p>
            {!defIsGeneric && rawDef ? (
              <p className="mt-2 text-[13px] text-foreground/95">{rawDef}</p>
            ) : (
              <div className="mt-2 space-y-2">
                <p>
                  {zhUi
                    ? "尚無定義。請讓 Doc Oracle 根據文件解釋此詞彙。"
                    : "No definition available yet. Ask Doc Oracle to explain this term from the document."}
                </p>
                <p className="text-[12px] text-muted-foreground/90">
                  {zhUi
                    ? "此詞彙出現在文件中，並與下方參考頁面連結。"
                    : "This term appears in the document and is linked to the referenced pages below."}
                </p>
              </div>
            )}
          </section>

          {pages.length > 0 ? (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {zhUi ? "參考頁面" : "Referenced pages"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {pages.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="rounded-lg border border-border/70 bg-muted/35 px-2.5 py-1 text-[12px] font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/8"
                    onClick={() => {
                      onOpenSourcePage?.(p);
                      onOpenChange(false);
                    }}
                  >
                    p.{p}
                  </button>
                ))}
                {filePath ? (
                  <a
                    href={`${knowledgeFilesApiHref(filePath)}#page=${pages[0]}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1 text-[11px] font-semibold text-primary no-underline hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    PDF
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}

          {related.length > 0 ? (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {zhUi ? "相關詞彙" : "Related terms"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {related.map((r) => {
                  const hit = resolveRelated(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      className="max-w-full truncate rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-[12px] font-medium text-foreground transition hover:border-primary/35 hover:bg-primary/8"
                      onClick={() => {
                        if (hit) {
                          onOpenRelatedTerm(hit);
                        } else {
                          onSearchRelated(r);
                          onOpenChange(false);
                        }
                      }}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {sectionsOverlap.length > 0 ? (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {zhUi ? "相關章節" : "Related sections"}
              </p>
              <ul className="mt-2 space-y-2">
                {sectionsOverlap.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-border/50 bg-muted/25 px-3 py-2 text-left text-[12px] transition hover:border-primary/35 hover:bg-primary/8"
                      onClick={() => {
                        onFocusSection(s);
                        onSwitchToSections();
                        onOpenChange(false);
                      }}
                    >
                      <span className="font-semibold text-foreground">{s.title}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {formatDocOraclePageRangeWithLabel(s)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground/80">
                {zhUi ? `將開啟「${sectionsTabLabel}」分頁並選取該章節。` : `Opens the ${sectionsTabLabel} tab with this section selected.`}
              </p>
            </section>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-border/40 pt-4 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:flex-none"
              onClick={() => {
                onAskAiAboutTerm(term);
                onOpenChange(false);
              }}
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              {askAiLabel}
            </button>
            {pages.length > 0 && filePath && onOpenSourcePage ? (
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-4 py-2.5 text-[13px] font-semibold text-foreground transition hover:bg-muted/50 sm:flex-none"
                onClick={() => {
                  onOpenSourcePage(pages[0]);
                  onOpenChange(false);
                }}
              >
                {openSourceLabel}
              </button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
