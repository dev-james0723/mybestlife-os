"use client";

import { useEffect, useState } from "react";
import type { KnowledgeItem } from "@/types/knowledge";
import type { DocOraclePageRow } from "@/components/document-oracle/docOraclePageTypes";
import { formatKnowledgeLocalDateTime } from "@/lib/i18n/knowledge-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { PdfPreviewCard } from "@/components/document-oracle/source/PdfPreviewCard";
import { PdfLightboxViewer } from "@/components/document-oracle/source/PdfLightboxViewer";

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

  useEffect(() => {
    if (sourceJumpPage == null) return;
    setStagedJumpPage(sourceJumpPage);
    setLightboxOpen(true);
    onClearSourceJump();
  }, [sourceJumpPage, onClearSourceJump]);

  if (!filePath) {
    return <p className="text-muted-foreground">No file on record.</p>;
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-full flex-col gap-5">
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
