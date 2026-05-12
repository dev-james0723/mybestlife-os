"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import type { DocOraclePageRow } from "@/components/document-oracle/docOraclePageTypes";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import { cn } from "@/lib/utils";
import { pageRenderedImageHref } from "@/components/document-oracle/source/pageRenderedImageHref";

function firstPageInOrder(pages: DocOraclePageRow[]): DocOraclePageRow | null {
  if (!pages.length) return null;
  return [...pages].sort((a, b) => a.page_number - b.page_number)[0] ?? null;
}

export function PdfPreviewCard(props: {
  filePath: string;
  pagesSorted: DocOraclePageRow[];
  onOpenLightbox: () => void;
}) {
  const { filePath, pagesSorted, onOpenLightbox } = props;
  const first = useMemo(() => firstPageInOrder(pagesSorted), [pagesSorted]);
  const thumbSrc = useMemo(() => (first ? pageRenderedImageHref(first) : null), [first]);
  const [thumbFailed, setThumbFailed] = useState(false);
  const pdfSrc = useMemo(() => knowledgeFilesApiHref(filePath), [filePath]);

  useEffect(() => {
    setThumbFailed(false);
  }, [thumbSrc]);

  const showImage = Boolean(thumbSrc) && !thumbFailed;

  return (
    <div className="w-full min-w-0">
      <button
        type="button"
        onClick={onOpenLightbox}
        className={cn(
          "group relative w-full min-w-0 overflow-hidden rounded-2xl text-left",
          "border border-white/[0.12] bg-black/30 shadow-[0_16px_48px_rgba(0,0,0,0.55)]",
          "ring-1 ring-black/40 backdrop-blur-md [-webkit-backdrop-filter:blur(16px)]",
          "transition hover:border-white/[0.18] hover:shadow-[0_20px_56px_rgba(0,0,0,0.6)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8E53A]/80",
        )}
        aria-label="Open document viewer"
      >
        <div className="relative aspect-[3/4] w-full min-h-[220px] bg-neutral-100 sm:aspect-[4/5] sm:min-h-[280px] md:min-h-[320px]">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbSrc!}
              alt=""
              className="h-full w-full object-contain object-center"
              onError={() => setThumbFailed(true)}
            />
          ) : (
            <>
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-neutral-100 to-neutral-200/90 p-6 text-neutral-600">
                <FileText className="h-12 w-12 opacity-40" aria-hidden />
                <p className="max-w-[240px] text-center text-[12px] leading-relaxed text-neutral-600">
                  {first
                    ? "First-page screenshot is not available yet. You can still open the full document."
                    : "No page data yet. Open the original file to view the PDF."}
                </p>
              </div>
              <iframe
                title="PDF preview"
                src={pdfSrc}
                className="pointer-events-none absolute inset-0 hidden h-full w-full bg-neutral-900 opacity-90 md:block"
                tabIndex={-1}
              />
            </>
          )}

          <div
            className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
            aria-hidden
          />
        </div>

        <span
          className={cn(
            "pointer-events-none absolute bottom-3 right-3 z-[1]",
            "rounded-full border border-white/10 bg-black/55 px-3.5 py-2 text-[12px] font-semibold text-white",
            "shadow-[0_6px_20px_rgba(0,0,0,0.45)] backdrop-blur-md [-webkit-backdrop-filter:blur(10px)]",
            "max-sm:text-[11px]",
          )}
        >
          <span className="sm:hidden">Tap to Open</span>
          <span className="hidden sm:inline">Click to View</span>
        </span>
      </button>
    </div>
  );
}
