"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import { gratefulCategoryLabel } from "@/lib/i18n/grateful-things-ui";
import {
  getGratitudeEntryPreview,
  getGratitudeThumbnailUrl,
} from "@/lib/grateful-things/gratitude-entry-preview";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { GratefulThing } from "@/types/database";

type Props = {
  entry: GratefulThing;
  language: AppLocale;
  imageFallback: string;
  onClick: () => void;
  className?: string;
};

function cardKeyDown(event: React.KeyboardEvent, onClick: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onClick();
  }
}

export function GratitudeGridCard({
  entry,
  language,
  imageFallback,
  onClick,
  className,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const thumbSrc = getGratitudeThumbnailUrl(entry);
  const preview = getGratitudeEntryPreview(entry.content, imageFallback);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => cardKeyDown(e, onClick)}
      className={cn(
        "group cursor-pointer overflow-hidden rounded-2xl border border-border bg-card/80 shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {thumbSrc && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbSrc}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-background">
            <Heart className="h-10 w-10 text-pink-300/60 dark:text-pink-400/50" />
          </div>
        )}
        {entry.is_favorite ? (
          <div className="absolute right-3 top-3 rounded-full bg-background/80 p-1.5 backdrop-blur">
            <Star className="h-4 w-4 fill-pink-400 text-pink-400" aria-hidden />
          </div>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        {entry.category ? (
          <Badge variant="secondary" className="w-fit text-xs">
            {gratefulCategoryLabel(language, entry.category)}
          </Badge>
        ) : null}
        {preview ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-foreground">{preview}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{formatDate(entry.entry_date)}</p>
      </div>
    </article>
  );
}
