"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { BucketDreamImage, BucketType } from "@/types/bucket-list";

type DreamCoverBackgroundProps = {
  image: BucketDreamImage | null;
  type?: BucketType;
  variant?: "card" | "hero" | "thumb";
  className?: string;
  interactive?: boolean;
};

const TYPE_GRADIENT: Record<BucketType, string> = {
  travel: "from-cyan-600/50 via-slate-900/80 to-black/90",
  achievement: "from-amber-600/40 via-slate-900/80 to-black/90",
  growth: "from-emerald-600/45 via-slate-900/80 to-black/90",
  relationship: "from-rose-600/40 via-slate-900/80 to-black/90",
  purchase: "from-indigo-600/45 via-slate-900/80 to-black/90",
  lifestyle: "from-orange-600/40 via-slate-900/80 to-black/90",
};

/**
 * Full-bleed photographic background with cinematic dark gradient overlay.
 * Used by grid cards, list thumbs, detail hero, and featured rail.
 */
export function DreamCoverBackground({
  image,
  type = "travel",
  variant = "card",
  className,
  interactive = false,
}: DreamCoverBackgroundProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [image?.url]);

  const showPhoto = Boolean(image?.url) && !failed;

  const gradientOverlay =
    variant === "hero"
      ? "bg-gradient-to-b from-black/25 via-black/35 to-black/75"
      : variant === "thumb"
        ? "bg-gradient-to-b from-black/15 via-black/30 to-black/70"
        : "bg-gradient-to-b from-black/20 via-black/40 to-black/85";

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        interactive &&
          "transition-transform duration-500 ease-out group-hover:scale-[1.03] group-hover:brightness-110",
        className,
      )}
      aria-hidden
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image!.url}
          alt={image!.alt}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={cn("absolute inset-0 bg-gradient-to-br", TYPE_GRADIENT[type])}
        />
      )}
      <div className={cn("absolute inset-0", gradientOverlay)} />
      {/* Subtle vignette for card readability */}
      {variant === "card" ? (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.35)_100%)]" />
      ) : null}
    </div>
  );
}
