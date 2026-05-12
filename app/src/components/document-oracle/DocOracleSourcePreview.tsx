"use client";

import { ExternalLink } from "lucide-react";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import { cn } from "@/lib/utils";

const limeBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#C8E53A] px-3 py-2 text-[12px] font-semibold text-[#0d0d0d] shadow-sm transition-[filter,transform] duration-[120ms] ease-out hover:scale-[1.02] hover:brightness-[1.12]";

export function DocOracleSourcePreview(props: {
  filePath: string | null | undefined;
  previewPage: number | null;
  className?: string;
}) {
  const { filePath, previewPage, className } = props;
  if (!filePath) {
    return (
      <div className={cn("rounded-2xl border border-border bg-muted/50 p-4 text-[13px] text-muted-foreground", className)}>
        No source file on record.
      </div>
    );
  }

  const base = knowledgeFilesApiHref(filePath);
  const iframeSrc =
    previewPage != null && previewPage > 0 ? `${base}#page=${previewPage}` : base;
  const openHref = previewPage != null && previewPage > 0 ? `${base}#page=${previewPage}` : base;

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Source preview</p>
        <a
          href={openHref}
          target="_blank"
          rel="noreferrer"
          className={cn(limeBtn, "no-underline")}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {previewPage != null && previewPage > 0 ? `Open source at page ${previewPage}` : "Open source"}
        </a>
      </div>
      <div className="min-h-[220px] flex-1 overflow-hidden rounded-2xl border border-border bg-muted sm:min-h-[280px] md:min-h-[360px]">
        <iframe title="Section source PDF" src={iframeSrc} className="h-full min-h-[220px] w-full bg-neutral-900 sm:min-h-[280px] md:min-h-[360px]" />
      </div>
      {previewPage != null && previewPage > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          PDF viewers vary: if the preview does not jump, use the button above for page {previewPage}.
        </p>
      ) : null}
    </div>
  );
}
