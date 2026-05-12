"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { KnowledgeItem } from "@/types/knowledge";
import type { DocOraclePageRow } from "@/components/document-oracle/docOraclePageTypes";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import { formatKnowledgeLocalDateTime } from "@/lib/i18n/knowledge-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { PdfPreviewCard } from "@/components/document-oracle/source/PdfPreviewCard";
import { PdfLightboxViewer } from "@/components/document-oracle/source/PdfLightboxViewer";
import { documentHasRenderedPageImages } from "@/components/document-oracle/source/pageRenderedImageHref";
import { cn } from "@/lib/utils";

const openOriginalBtnClass = cn(
  "inline-flex w-full max-w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[14px] font-semibold text-white shadow-md transition-colors",
  "border border-rose-900/55 bg-[#7f1d1d] hover:bg-[#991b1b]",
  "no-underline",
);

export function DocOracleSourcePanel(props: {
  item: KnowledgeItem;
  pagesSorted: DocOraclePageRow[];
  appLocale: AppLocale;
  sourceJumpPage: number | null;
  onClearSourceJump: () => void;
  showDebugLink: boolean;
}) {
  const { item, pagesSorted, appLocale, sourceJumpPage, onClearSourceJump, showDebugLink } = props;
  const filePath = item.filePath;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [stagedJumpPage, setStagedJumpPage] = useState<number | null>(null);

  const hasRenderedPages = documentHasRenderedPageImages(pagesSorted);

  useEffect(() => {
    if (sourceJumpPage == null) return;
    setStagedJumpPage(sourceJumpPage);
    setLightboxOpen(true);
    onClearSourceJump();
  }, [sourceJumpPage, onClearSourceJump]);

  if (!filePath) {
    return <p className="text-muted-foreground">No file on record.</p>;
  }

  const fileHref = knowledgeFilesApiHref(filePath);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-full flex-col gap-5">
      <a
        href={fileHref}
        target="_blank"
        rel="noreferrer"
        className={openOriginalBtnClass}
        aria-label="Open original file in new tab"
      >
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        Open Original File in New Tab
      </a>

      {!hasRenderedPages ? (
        <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
          Page screenshots are not available yet. Use the viewer for a desktop PDF preview, or open the original file in a
          new tab on mobile.
        </p>
      ) : null}

      <PdfPreviewCard filePath={filePath} pagesSorted={pagesSorted} onOpenLightbox={() => setLightboxOpen(true)} />

      <dl className="grid gap-2 rounded-2xl border border-border bg-muted/40 p-4 text-[12px] sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Filename</dt>
          <dd className="break-all text-foreground/90">{filePath.split("/").pop()}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Uploaded</dt>
          <dd className="text-foreground/90">{formatKnowledgeLocalDateTime(appLocale, item.dateAdded)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Modified</dt>
          <dd className="text-foreground/90">{formatKnowledgeLocalDateTime(appLocale, item.dateModified)}</dd>
        </div>
      </dl>

      {showDebugLink ? (
        <p className="text-[11px] text-muted-foreground">
          Diagnostics:{" "}
          <a
            className="text-[#C8E53A] underline-offset-4 hover:underline"
            href={`/api/document-brain/${encodeURIComponent(item.id)}/debug`}
            target="_blank"
            rel="noreferrer"
          >
            GET /api/document-brain/…/debug
          </a>{" "}
          (owner-only JSON)
        </p>
      ) : null}

      <PdfLightboxViewer
        open={lightboxOpen}
        onClose={() => {
          setLightboxOpen(false);
          setStagedJumpPage(null);
        }}
        filePath={filePath}
        pagesSorted={pagesSorted}
        initialJumpPage={stagedJumpPage}
        onJumpApplied={() => setStagedJumpPage(null)}
      />
    </div>
  );
}
