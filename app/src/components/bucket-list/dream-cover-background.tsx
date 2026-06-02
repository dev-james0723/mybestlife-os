"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BucketDreamImage, BucketType } from "@/types/bucket-list";

type DreamCoverBackgroundProps = {
  image: BucketDreamImage | null;
  type?: BucketType;
  variant?: "card" | "hero" | "thumb";
  className?: string;
  interactive?: boolean;
  layoutId?: string;
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
  layoutId,
}: DreamCoverBackgroundProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const imageUrl = image?.url ?? null;
  const showPhoto = Boolean(imageUrl) && failedUrl !== imageUrl;

  const gradientOverlay =
    variant === "hero"
      ? "bg-gradient-to-b from-black/20 via-black/38 to-black/78"
      : variant === "thumb"
        ? "bg-gradient-to-b from-black/12 via-black/32 to-black/78"
        : "bg-gradient-to-b from-black/12 via-black/45 to-black/90";

  return (
    <motion.div
      layoutId={layoutId}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0.2 : 0.55, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image!.url}
          alt={image!.alt}
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center",
            interactive &&
              !reduceMotion &&
              "scale-[1.02] transition-[filter,transform] duration-700 ease-out group-hover:-translate-y-1 group-hover:scale-[1.08] group-hover:blur-[0.5px] group-hover:brightness-110",
          )}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            TYPE_GRADIENT[type],
            interactive &&
              !reduceMotion &&
              "transition-transform duration-700 ease-out group-hover:scale-[1.04]",
          )}
        />
      )}
      <div className={cn("absolute inset-0", gradientOverlay)} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/10" />
      {/* Subtle vignette for card readability */}
      {variant === "card" ? (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.35)_100%)]" />
      ) : null}
    </motion.div>
  );
}
