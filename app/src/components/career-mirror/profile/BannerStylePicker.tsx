"use client";

import type { KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

import { cn } from "@/lib/utils";
import {
  CAREER_BANNER_STYLES,
  CAREER_BANNER_PLACEHOLDER_GRADIENTS,
  type CareerBannerStyle,
} from "@/lib/career-mirror/banner/career-banner-style-config";

export type BannerStylePickerProps = {
  value: CareerBannerStyle;
  onChange: (style: CareerBannerStyle) => void;
  /** Localized name (+ optional description) per style. No hardcoded user-facing copy here. */
  labels: Record<CareerBannerStyle, { name: string; description?: string }>;
  /** `scroll` = single horizontal row; `wrap` = flex-wrap grid (default). */
  layout?: "scroll" | "wrap";
  className?: string;
};

const BANNER_STYLE_PREVIEW_SRC: Record<CareerBannerStyle, string> = {
  "editorial-portrait":
    "/career-mirror/banner-style-previews/editorial-portrait.jpg",
  "illustrative-photo":
    "/career-mirror/banner-style-previews/illustrative-photo.jpg",
  "cinematic-founder":
    "/career-mirror/banner-style-previews/cinematic-founder.jpg",
  "minimal-knowledge":
    "/career-mirror/banner-style-previews/minimal-knowledge.jpg",
  "abstract-landscape":
    "/career-mirror/banner-style-previews/abstract-landscape.jpg",
  "brand-poster": "/career-mirror/banner-style-previews/brand-poster.jpg",
};

/**
 * BannerStylePicker — selectable grid of dark Liquid-Glass banner previews for
 * the AI Career Mirror identity banner.
 *
 * Mirrors `@/components/knowledge/ThumbnailStylePicker` (preview tiles,
 * selection ring + scale, accessible listbox/option roles), but uses curated
 * real-photo references in `public/career-mirror/banner-style-previews` so
 * users can visually distinguish each style immediately.
 */
export function BannerStylePicker({
  value,
  onChange,
  labels,
  layout = "wrap",
  className,
}: BannerStylePickerProps) {
  const prefersReduced = useReducedMotion();

  const listClass =
    layout === "scroll"
      ? "flex flex-nowrap gap-3 overflow-x-auto pb-1 pt-0.5 -mx-0.5 px-0.5 [scrollbar-gutter:stable]"
      : "flex flex-wrap gap-3";

  const handleKeyNav = (event: KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % CAREER_BANNER_STYLES.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex =
        (index - 1 + CAREER_BANNER_STYLES.length) % CAREER_BANNER_STYLES.length;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      onChange(CAREER_BANNER_STYLES[nextIndex]);
    }
  };

  return (
    <div className={cn(listClass, className)} role="listbox" aria-orientation="horizontal">
      {CAREER_BANNER_STYLES.map((style, index) => {
        const isSelected = value === style;
        const label = labels[style];
        const grad = CAREER_BANNER_PLACEHOLDER_GRADIENTS[style];
        const previewSrc = BANNER_STYLE_PREVIEW_SRC[style];
        return (
          <motion.button
            key={style}
            type="button"
            role="option"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(style)}
            onKeyDown={(e) => handleKeyNav(e, index)}
            whileTap={prefersReduced ? undefined : { scale: 0.97 }}
            animate={
              prefersReduced ? undefined : { scale: isSelected ? 1.04 : 1 }
            }
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "group flex shrink-0 snap-start flex-col items-start gap-1.5 text-left",
              "rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/50",
            )}
            title={label.description ?? label.name}
          >
            <div
              className={cn(
                "relative w-40 overflow-hidden rounded-xl border-2 transition-all",
                "aspect-video", // 16:9 to match the banner
                isSelected
                  ? "border-[var(--accent-pink)] ring-2 ring-[var(--accent-pink)]/30"
                  : "border-transparent group-hover:border-border",
              )}
              style={{
                background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
              }}
              aria-hidden
            >
              <Image
                src={previewSrc}
                alt={`${label.name} banner style preview`}
                fill
                sizes="160px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/35" />
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(60% 70% at 78% 22%, ${grad.accent}38, transparent 70%)`,
                }}
              />
            </div>
            <span
              className={cn(
                "max-w-40 truncate text-xs font-medium",
                isSelected ? "text-[var(--accent-pink)]" : "text-foreground",
              )}
            >
              {label.name}
            </span>
            {label.description ? (
              <span className="max-w-40 truncate text-[10px] text-muted-foreground">
                {label.description}
              </span>
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}

export default BannerStylePicker;
