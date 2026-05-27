"use client";

import { useState } from "react";
import { Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GratefulThing } from "@/types/database";

type Size = "sm" | "md";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
};

const ICON_CLASS: Record<Size, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
};

type Props = {
  entry: Pick<GratefulThing, "photo_url" | "thumbnail_url" | "is_favorite">;
  size?: Size;
  className?: string;
};

/** List/dashboard icon: photo thumbnail or heart/star fallback. */
export function GratitudeEntryIcon({ entry, size = "md", className }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const thumbSrc = entry.thumbnail_url ?? entry.photo_url;

  if (thumbSrc && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbSrc}
        alt=""
        loading="lazy"
        onError={() => setImageFailed(true)}
        className={cn(
          SIZE_CLASS[size],
          "rounded-xl border border-border bg-muted object-cover",
          className,
        )}
      />
    );
  }

  if (entry.is_favorite) {
    return (
      <Star
        className={cn(ICON_CLASS[size], "fill-amber-400 text-amber-500", className)}
      />
    );
  }

  return <Heart className={cn(ICON_CLASS[size], "text-primary", className)} />;
}
