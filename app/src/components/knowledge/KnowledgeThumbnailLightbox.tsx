"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExternalLink, Minus, Plus, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { KnowledgeItem } from "@/types/knowledge";
import type { KnowledgeUiCopy } from "@/lib/i18n/knowledge-ui-copy-type";
import {
  resolveKnowledgeLightboxModel,
  type KnowledgeLightboxModel,
} from "@/lib/knowledge/lightbox-resolve";

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 4;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function lightboxSubtitle(item: KnowledgeItem): string | undefined {
  const t =
    item.aiTldr?.trim() ||
    item.aiSummary?.trim() ||
    item.rawContent?.trim()?.slice(0, 280);
  return t || undefined;
}

type LightboxUi = KnowledgeUiCopy["lightbox"];

type Props = {
  item: KnowledgeItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ui: LightboxUi;
};

export function KnowledgeThumbnailLightbox({ item, open, onOpenChange, ui }: Props) {
  const model = React.useMemo(() => resolveKnowledgeLightboxModel(item), [item]);
  const [zoom, setZoom] = React.useState(1);

  if (!model) return null;

  const supportsZoom = model.kind === "image";
  const zoomPercent = Math.round(zoom * 100);

  const handleOpenChange = (next: boolean) => {
    if (next) setZoom(1);
    onOpenChange(next);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/50 supports-backdrop-filter:backdrop-blur-xl supports-backdrop-filter:backdrop-saturate-150" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed z-50 flex max-h-[min(92dvh,calc(100dvh-1rem))] w-[min(calc(100vw-1.5rem),1600px)] flex-col overflow-hidden rounded-2xl border border-white/18",
            "bg-zinc-950/50 text-foreground shadow-[0_8px_32px_rgba(0,0,0,0.45)] supports-backdrop-filter:backdrop-blur-2xl supports-backdrop-filter:backdrop-saturate-150",
            "left-1/2 top-1/2 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          )}
        >
          <DialogPrimitive.Title className="sr-only">{item.title}</DialogPrimitive.Title>

          <div className="flex shrink-0 justify-end px-2 pt-2">
            <DialogPrimitive.Close
              render={
                <Button variant="ghost" size="icon-sm" aria-label={ui.close} type="button" />
              }
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-2 pb-2 pt-0">
            <LightboxBody model={model} item={item} zoom={zoom} setZoom={setZoom} />

            {supportsZoom ? (
              <div
                className={cn(
                  "mt-2 flex shrink-0 flex-wrap items-center justify-center gap-3 rounded-xl border border-white/14 bg-black/35 px-3 py-2",
                  "backdrop-blur-xl backdrop-saturate-150",
                )}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0 border-white/25 bg-white/5 text-white hover:bg-white/10"
                  aria-label={ui.zoomOut}
                  onClick={() => setZoom((z) => clamp(z / 1.15, MIN_ZOOM, MAX_ZOOM))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <input
                  type="range"
                  min={Math.round(MIN_ZOOM * 100)}
                  max={Math.round(MAX_ZOOM * 100)}
                  step={5}
                  value={zoomPercent}
                  aria-label={ui.zoomSliderAria}
                  onChange={(e) => setZoom(clamp(Number(e.target.value) / 100, MIN_ZOOM, MAX_ZOOM))}
                  className="h-1.5 w-[min(44vw,11rem)] cursor-pointer accent-primary"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0 border-white/25 bg-white/5 text-white hover:bg-white/10"
                  aria-label={ui.zoomIn}
                  onClick={() => setZoom((z) => clamp(z * 1.15, MIN_ZOOM, MAX_ZOOM))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="min-w-[3rem] text-center text-[11px] tabular-nums text-white/70">
                  {zoomPercent}%
                </span>
              </div>
            ) : null}

            <div
              className={cn(
                "mt-2 shrink-0 rounded-xl border border-white/14 bg-black/40 px-4 py-3 backdrop-blur-xl backdrop-saturate-150",
              )}
            >
              <p className="text-sm font-semibold leading-snug text-white">{item.title}</p>
              {lightboxSubtitle(item) ? (
                <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-white/65">
                  {lightboxSubtitle(item)}
                </p>
              ) : null}
              {model.kind === "iframe" && item.filePath ? (
                <a
                  href={model.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {ui.openInNewTab}
                </a>
              ) : null}
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

function LightboxBody({
  model,
  item,
  zoom,
  setZoom,
}: {
  model: KnowledgeLightboxModel;
  item: KnowledgeItem;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
}) {
  switch (model.kind) {
    case "image":
      return <ZoomableImage src={model.src} zoom={zoom} setZoom={setZoom} />;
    case "pdf":
      return (
        <iframe
          title={item.title}
          src={model.src}
          className="h-[min(70dvh,calc(100dvh-280px))] min-h-[240px] w-full flex-1 rounded-xl border border-white/12 bg-black/40"
        />
      );
    case "video":
      return (
        <video
          src={model.src}
          controls
          className="max-h-[min(70dvh,calc(100dvh-280px))] w-full flex-1 rounded-xl border border-white/12 bg-black"
        >
          <track kind="captions" />
        </video>
      );
    case "audio":
      return (
        <div className="flex min-h-[120px] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-white/12 bg-black/35 px-4 py-6">
          <audio src={model.src} controls className="w-full max-w-md">
            <track kind="captions" />
          </audio>
        </div>
      );
    case "text":
      return (
        <div
          className={cn(
            "max-h-[min(65dvh,calc(100dvh-300px))] min-h-[200px] flex-1 overflow-y-auto rounded-xl border border-white/12 bg-black/35 px-4 py-3",
            "prose prose-invert prose-sm max-w-none [&_pre]:bg-black/50",
          )}
        >
          {model.format === "markdown" ? (
            <ReactMarkdown>{model.text}</ReactMarkdown>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/88">
              {model.text}
            </pre>
          )}
        </div>
      );
    case "iframe":
      return (
        <iframe
          title={item.title}
          src={model.src}
          className="h-[min(70dvh,calc(100dvh-280px))] min-h-[240px] w-full flex-1 rounded-xl border border-white/12 bg-black/40"
        />
      );
    default:
      return null;
  }
}

function ZoomableImage({
  src,
  zoom,
  setZoom,
}: {
  src: string;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pinchRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0]!, e.touches[1]!];
        pinchRef.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchRef.current == null || pinchRef.current <= 0) return;
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      const newDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = newDist / pinchRef.current;
      pinchRef.current = newDist;
      setZoom((z) => clamp(z * ratio, MIN_ZOOM, MAX_ZOOM));
      e.preventDefault();
    };

    const onTouchEnd = () => {
      pinchRef.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [setZoom]);

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.008;
    setZoom((z) => clamp(z + delta, MIN_ZOOM, MAX_ZOOM));
  };

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-auto overscroll-contain"
      onWheel={onWheel}
    >
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
        }}
        className="flex items-center justify-center p-1"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="max-h-[min(85dvh,calc(100dvh-260px))] max-w-[min(92vw,calc(100vw-3rem))] object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
}
