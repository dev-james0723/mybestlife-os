"use client";

import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import { gratefulCategoryLabel, type GratefulThingsUiCopy } from "@/lib/i18n/grateful-things-ui";
import {
  getGratitudeHeartCardPreview,
  getGratitudeThumbnailUrl,
} from "@/lib/grateful-things/gratitude-entry-preview";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { GratefulThing } from "@/types/database";

const HEART_VIEWBOX = "0 0 300 280";

const HEART_PATH =
  "M150 260C68 190 25 146 25 87C25 44 58 15 99 15C124 15 143 29 150 51C157 29 176 15 201 15C242 15 275 44 275 87C275 146 232 190 150 260Z";

type GratitudeHeartCardProps = {
  entry: GratefulThing;
  language: AppLocale;
  copy: GratefulThingsUiCopy;
  onClick: () => void;
  className?: string;
};

function cardKeyDown(event: React.KeyboardEvent, onClick: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onClick();
  }
}

export function GratitudeHeartCard({
  entry,
  language,
  copy,
  onClick,
  className,
}: GratitudeHeartCardProps) {
  const clipId = useId().replace(/:/g, "");
  const [imageFailed, setImageFailed] = useState(false);
  const thumbSrc = getGratitudeThumbnailUrl(entry);
  const preview = getGratitudeHeartCardPreview(
    entry.content,
    copy.subtitleHasImage,
    copy.emptyContentReadonly,
  );
  const showPhoto = Boolean(thumbSrc) && !imageFailed;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => cardKeyDown(event, onClick)}
      className={cn(
        "group relative mx-auto aspect-[300/280] w-full cursor-pointer outline-none",
        "max-w-[320px] sm:max-w-[360px] xl:max-w-[390px] 2xl:max-w-[420px]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-4 rounded-full bg-pink-500/10 opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />

      <svg
        viewBox={HEART_VIEWBOX}
        className="gratitude-heart-card-outline h-full w-full overflow-visible transition-transform duration-300 group-hover:scale-[1.018]"
        aria-hidden
      >
        <defs>
          <clipPath id={clipId}>
            <path d={HEART_PATH} />
          </clipPath>
        </defs>

        <path
          d={HEART_PATH}
          fill="rgba(236, 72, 153, 0.08)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.5"
          className="opacity-70 transition-[fill,stroke] duration-300 group-hover:fill-pink-500/15 group-hover:stroke-white/35"
        />

        <g clipPath={`url(#${clipId})`}>
          <foreignObject x="0" y="0" width="300" height="280">
            <div className="relative flex h-[280px] w-[300px] flex-col overflow-hidden bg-background/75 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl dark:bg-background/65">
              {/* Top image zone — heart lobes */}
              <div className="relative h-[42%] shrink-0 overflow-hidden bg-muted">
                {showPhoto && thumbSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbSrc}
                    alt=""
                    loading="lazy"
                    onError={() => setImageFailed(true)}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-background">
                    <Heart className="h-10 w-10 text-pink-300/70 dark:text-pink-400/60" />
                  </div>
                )}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-background via-background/70 to-transparent"
                  aria-hidden
                />
              </div>

              {/* Text stack — flex zones keep category / overview / date from overlapping */}
              <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-2 px-[22%] pb-[13%] pt-1.5 text-center">
                <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-start gap-2">
                  {entry.category ? (
                    <Badge
                      variant="secondary"
                      className="category-pill mx-auto max-w-full shrink-0 truncate rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] leading-tight text-foreground/90 backdrop-blur sm:text-[11px]"
                    >
                      {gratefulCategoryLabel(language, entry.category)}
                    </Badge>
                  ) : null}
                  <p className="mx-auto line-clamp-2 w-full min-h-0 overflow-hidden px-0.5 text-[11px] font-medium leading-snug text-foreground/90 sm:text-xs">
                    {preview}
                  </p>
                </div>

                <p className="w-full shrink-0 truncate text-[9px] leading-none text-muted-foreground sm:text-[10px]">
                  {formatDate(entry.entry_date)}
                </p>
              </div>

              {entry.is_favorite ? (
                <div className="absolute right-[23%] top-[34%] rounded-full bg-background/60 p-1.5 backdrop-blur">
                  <Star className="h-4 w-4 fill-pink-400 text-pink-400" aria-hidden />
                </div>
              ) : null}
            </div>
          </foreignObject>
        </g>

        <path
          d={HEART_PATH}
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1"
          pointerEvents="none"
        />
      </svg>
    </article>
  );
}
