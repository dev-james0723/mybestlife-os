"use client";

import { useEffect, useState } from "react";
import { Newspaper, PlayCircle, LineChart, Radio, Video } from "lucide-react";

import { cn } from "@/lib/utils";
import { TOPIC_VISUALS, topicAccentColor } from "@/lib/signals/constants";
import { resolveDisplayThumbnail } from "@/lib/signals/thumbnails";
import type { SignalItem, SignalMediaType } from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";

const MEDIA_ICON: Record<SignalMediaType, typeof Newspaper> = {
  article: Newspaper,
  video: Video,
  market: LineChart,
  alert: Radio,
  audio: Radio,
};

function gradientFor(topic: string): string {
  const v = TOPIC_VISUALS[topic];
  if (v) return `linear-gradient(135deg, ${v.from}, ${v.to})`;
  const c = topicAccentColor(topic);
  return `linear-gradient(135deg, ${c}, color-mix(in oklab, ${c} 55%, black))`;
}

/**
 * Honest, lazy signal image (§ thumbnails). Renders the REAL source image
 * (native `<img loading="lazy">` — the repo's next/image only allows the
 * Supabase host, so external news images use a plain tag with a skeleton +
 * blur-up). On error or when no real image exists, paints a deterministic
 * Liquid-Glass topic ABSTRACT — never a stock/AI photo of the article. A play
 * overlay marks video; a duration badge shows when the feed provides one.
 */
export function SignalThumbnail({
  signal,
  copy,
  className,
  rounded = "rounded-xl",
  iconClassName,
}: {
  signal: SignalItem;
  copy: SignalsUiCopy;
  className?: string;
  rounded?: string;
  iconClassName?: string;
}) {
  const thumb = resolveDisplayThumbnail(signal);
  const isReal = !thumb.isFallback && !!thumb.url;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reset transient state if the underlying image URL changes (view switches).
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [thumb.url]);

  const showImage = isReal && !failed;
  const isVideo = signal.mediaType === "video";
  const Icon = MEDIA_ICON[signal.mediaType ?? "article"];
  const gradient = gradientFor(signal.topic);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-muted/40",
        rounded,
        className,
      )}
    >
      {/* Gradient base — also the blur-up placeholder beneath a loading image. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: gradient }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-60 mix-blend-soft-light"
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.45), transparent 60%)",
        }}
      />

      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb.url}
          alt={thumb.alt ?? signal.headline}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon
            className={cn("h-1/3 w-1/3 max-h-12 max-w-12 text-white/55", iconClassName)}
            aria-hidden
          />
          {failed && (
            <span className="absolute bottom-1.5 left-2 text-[10px] font-medium text-white/70">
              {copy.card.imageUnavailable}
            </span>
          )}
        </div>
      )}

      {/* Video play affordance */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm ring-1 ring-white/30">
            <PlayCircle className="h-6 w-6 text-white" aria-hidden />
          </span>
        </div>
      )}

      {/* Duration badge */}
      {signal.duration && (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {signal.duration}
        </span>
      )}

      {/* Market tag badge */}
      {signal.mediaType === "market" && signal.marketTag && (
        <span className="absolute left-1.5 top-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {signal.marketTag}
        </span>
      )}
    </div>
  );
}
