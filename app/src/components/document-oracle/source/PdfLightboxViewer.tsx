"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, Shrink, X } from "lucide-react";
import type { DocOraclePageRow } from "@/components/document-oracle/docOraclePageTypes";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import { cn } from "@/lib/utils";
import {
  documentHasRenderedPageImages,
  pageRenderedImageHref,
} from "@/components/document-oracle/source/pageRenderedImageHref";

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 2] as const;

function pageLabel(p: DocOraclePageRow): string {
  const raw = p.page_label?.trim();
  if (raw) return raw;
  return `Page ${p.page_number}`;
}

export function PdfLightboxViewer(props: {
  open: boolean;
  onClose: () => void;
  filePath: string;
  pagesSorted: DocOraclePageRow[];
  initialJumpPage?: number | null;
  onJumpApplied?: () => void;
}) {
  const { open, onClose, filePath, pagesSorted, initialJumpPage, onJumpApplied } = props;
  const pdfHref = useMemo(() => knowledgeFilesApiHref(filePath), [filePath]);
  const hasImages = useMemo(() => documentHasRenderedPageImages(pagesSorted), [pagesSorted]);
  const sorted = useMemo(
    () => [...pagesSorted].sort((a, b) => a.page_number - b.page_number),
    [pagesSorted],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const pageElRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const jumpConsumedRef = useRef(false);

  const [currentPage, setCurrentPage] = useState<number>(() => sorted[0]?.page_number ?? 1);
  const [zoomIdx, setZoomIdx] = useState(1);

  const zoom = ZOOM_LEVELS[zoomIdx] ?? 1;

  useEffect(() => {
    if (!open) {
      jumpConsumedRef.current = false;
      setZoomIdx(1);
      return;
    }
    const first = sorted[0]?.page_number ?? 1;
    setCurrentPage(
      initialJumpPage != null && sorted.some((p) => p.page_number === initialJumpPage)
        ? initialJumpPage
        : first,
    );
  }, [open, sorted, initialJumpPage]);

  const scrollToPage = useCallback((pageNum: number) => {
    const el = pageElRefs.current.get(pageNum);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!open || !hasImages) return;
    if (initialJumpPage == null || jumpConsumedRef.current) return;
    if (!sorted.some((p) => p.page_number === initialJumpPage)) return;

    jumpConsumedRef.current = true;
    const run = () => {
      scrollToPage(initialJumpPage);
      onJumpApplied?.();
    };
    const id = window.setTimeout(run, 80);
    return () => window.clearTimeout(id);
  }, [open, hasImages, initialJumpPage, sorted, scrollToPage, onJumpApplied]);

  useEffect(() => {
    if (!open || hasImages) return;
    if (initialJumpPage == null) return;
    onJumpApplied?.();
  }, [open, hasImages, initialJumpPage, onJumpApplied]);

  const updateCurrentFromScroll = useCallback(() => {
    const root = scrollRef.current;
    if (!root || !hasImages) return;
    const rootRect = root.getBoundingClientRect();
    const anchorY = rootRect.top + Math.min(120, rootRect.height * 0.12);
    let best: { page: number; dist: number } | null = null;
    for (const p of sorted) {
      const el = pageElRefs.current.get(p.page_number);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const mid = (r.top + r.bottom) / 2;
      const dist = Math.abs(mid - anchorY);
      if (!best || dist < best.dist) best = { page: p.page_number, dist };
    }
    if (best) setCurrentPage(best.page);
  }, [hasImages, sorted]);

  useEffect(() => {
    if (!open || !hasImages) return;
    const root = scrollRef.current;
    if (!root) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        updateCurrentFromScroll();
      });
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    updateCurrentFromScroll();
    return () => root.removeEventListener("scroll", onScroll);
  }, [open, hasImages, updateCurrentFromScroll, sorted]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const goPrev = useCallback(() => {
    const idx = sorted.findIndex((p) => p.page_number === currentPage);
    if (!hasImages || idx <= 0) return;
    const prev = sorted[idx - 1];
    if (prev) scrollToPage(prev.page_number);
  }, [hasImages, sorted, currentPage, scrollToPage]);

  const goNext = useCallback(() => {
    const idx = sorted.findIndex((p) => p.page_number === currentPage);
    if (!hasImages || idx < 0 || idx >= sorted.length - 1) return;
    const next = sorted[idx + 1];
    if (next) scrollToPage(next.page_number);
  }, [hasImages, sorted, currentPage, scrollToPage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (!hasImages) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, hasImages, goPrev, goNext]);

  const currentIndex = sorted.findIndex((p) => p.page_number === currentPage);

  const zoomOut = useCallback(() => {
    setZoomIdx((i) => Math.max(0, i - 1));
  }, []);

  const zoomIn = useCallback(() => {
    setZoomIdx((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1));
  }, []);

  const fit = useCallback(() => setZoomIdx(1), []);

  const totalPages = sorted.length;
  const canPrev = hasImages && currentIndex > 0;
  const canNext = hasImages && currentIndex >= 0 && currentIndex < sorted.length - 1;

  if (!open || typeof document === "undefined") return null;

  const headerBtn =
    "inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/[0.08] text-white/90 transition hover:bg-white/[0.14] disabled:pointer-events-none disabled:opacity-35";

  const node = (
    <div
      className={cn(
        "fixed inset-0 z-[320] flex items-stretch justify-center p-0 sm:p-4",
        "pt-[max(0px,env(safe-area-inset-top))] pb-[max(0px,env(safe-area-inset-bottom))]",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Document viewer"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/78 backdrop-blur-[2px]"
        aria-label="Close viewer"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-[1] flex min-h-0 w-full min-w-0 flex-col overflow-hidden border border-white/[0.1] bg-[#0b0b0c] shadow-[0_24px_80px_rgba(0,0,0,0.65)]",
          "h-[100dvh] max-h-[100dvh] max-w-[100vw] rounded-none",
          "sm:h-[min(100dvh-2rem,calc(100dvh-2rem))] sm:max-h-[calc(100dvh-2rem)] sm:max-w-[min(92vw,1280px)] sm:rounded-2xl",
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header
          className={cn(
            "flex shrink-0 flex-wrap items-center gap-1.5 border-b border-white/[0.08] bg-black/50 px-2 py-2 backdrop-blur-md sm:gap-2 sm:px-3",
          )}
        >
          {hasImages ? (
            <>
              <button type="button" className={headerBtn} aria-label="Previous page" disabled={!canPrev} onClick={goPrev}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="min-w-0 flex-1 px-1 text-center text-[12px] font-medium tabular-nums text-white/90 sm:text-[13px]">
                <span className="sm:hidden">
                  p.{Math.max(1, currentIndex + 1)} / {Math.max(1, totalPages)}
                </span>
                <span className="hidden sm:inline">
                  {currentIndex >= 0 ? pageLabel(sorted[currentIndex]!) : "—"} · {currentIndex + 1} / {totalPages}
                </span>
              </span>
              <button type="button" className={headerBtn} aria-label="Next page" disabled={!canNext} onClick={goNext}>
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : (
            <span className="flex-1 truncate px-2 text-[12px] font-medium text-white/80">PDF</span>
          )}

          {hasImages ? (
            <>
              <div className="mx-0.5 hidden h-6 w-px bg-white/10 sm:block" aria-hidden />
              <button type="button" className={cn(headerBtn, "hidden sm:inline-flex")} aria-label="Zoom out" onClick={zoomOut}>
                <Minus className="h-4 w-4" />
              </button>
              <button type="button" className={headerBtn} aria-label="Fit width" onClick={fit} title="Fit">
                <Shrink className="h-4 w-4 sm:hidden" />
                <span className="hidden px-2 text-[11px] font-semibold sm:inline">Fit</span>
              </button>
              <button type="button" className={cn(headerBtn, "hidden sm:inline-flex")} aria-label="Zoom in" onClick={zoomIn}>
                <Plus className="h-4 w-4" />
              </button>
              <span className="hidden text-[11px] tabular-nums text-white/50 sm:inline">{Math.round(zoom * 100)}%</span>
            </>
          ) : null}

          <button type="button" className={cn(headerBtn, "ml-auto")} aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-[#121214]">
          {hasImages ? (
            <div
              className="mx-auto w-full max-w-full px-2 py-4 sm:px-4 sm:py-6"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                width: `${100 / zoom}%`,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {sorted.map((p) => {
                const src = pageRenderedImageHref(p);
                return (
                  <div
                    key={p.id}
                    ref={(el) => {
                      if (el) pageElRefs.current.set(p.page_number, el);
                      else pageElRefs.current.delete(p.page_number);
                    }}
                    data-page={p.page_number}
                    className="mx-auto mb-6 w-full max-w-[1100px] last:mb-8"
                  >
                    <p className="mb-2 pl-1 text-[11px] font-medium uppercase tracking-wide text-white/45">
                      {pageLabel(p)}
                    </p>
                    <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="block w-full object-contain object-top" />
                      ) : (
                        <div className="flex min-h-[120px] items-center justify-center bg-neutral-100 p-6 text-center text-[12px] text-neutral-600">
                          No screenshot for this page.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
              <p className="max-w-md text-[13px] leading-relaxed text-white/70">
                Page screenshots are not available yet. If the embedded preview below does not load, try again from a
                desktop browser.
              </p>
              <iframe
                title="PDF"
                src={pdfHref}
                className="mt-4 h-[min(70dvh,720px)] w-full max-w-[960px] rounded-lg border border-white/10 bg-neutral-900"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
