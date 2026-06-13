"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DocOraclePageDetailView } from "@/components/document-oracle/DocOraclePageDetailView";
import type { DocOraclePageRow, DocOracleVisualRow } from "@/components/document-oracle/docOraclePageTypes";
import type { DocOracleGlossaryRow, DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";

export function DocOraclePageDetailModal(props: {
  page: DocOraclePageRow | null;
  orderedPages: DocOraclePageRow[];
  sections: DocOracleSectionRow[];
  glossary: DocOracleGlossaryRow[];
  visualsOnPage: DocOracleVisualRow[];
  filePath: string | null | undefined;
  onClose: () => void;
  onSelectPage: (p: DocOraclePageRow) => void;
  onOpenSourcePage?: (pageNum: number) => void;
  onAskAiPage?: (p: DocOraclePageRow) => void;
  onAskQuestion?: (question: string, page: DocOraclePageRow) => void;
  onOpenVisual: (v: DocOracleVisualRow) => void;
  onFocusSection: (s: DocOracleSectionRow) => void;
}) {
  const {
    page,
    orderedPages,
    sections,
    glossary,
    visualsOnPage,
    filePath,
    onClose,
    onSelectPage,
    onOpenSourcePage,
    onAskAiPage,
    onAskQuestion,
    onOpenVisual,
    onFocusSection,
  } = props;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!page) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [page, onClose]);

  if (!page || !mounted) return null;

  const node = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-6"
      role="dialog"
      aria-modal
      aria-labelledby="doc-oracle-page-detail-title"
      onClick={onClose}
    >
      <div className="flex h-full w-full max-h-[100dvh] min-h-0 max-w-5xl items-stretch sm:h-auto sm:max-h-[min(92dvh,920px)]" onClick={(e) => e.stopPropagation()}>
        <DocOraclePageDetailView
          page={page}
          orderedPages={orderedPages}
          sections={sections}
          glossary={glossary}
          visualsOnPage={visualsOnPage}
          filePath={filePath}
          onClose={onClose}
          onSelectPage={onSelectPage}
          onOpenSourcePage={onOpenSourcePage}
          onAskAiPage={onAskAiPage}
          onAskQuestion={onAskQuestion}
          onOpenVisual={onOpenVisual}
          onFocusSection={onFocusSection}
        />
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
