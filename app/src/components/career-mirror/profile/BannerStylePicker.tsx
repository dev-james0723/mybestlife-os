"use client";

import type { KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";

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

/**
 * BannerStylePicker — selectable grid of dark Liquid-Glass banner previews for
 * the AI Career Mirror identity banner.
 *
 * Mirrors `@/components/knowledge/ThumbnailStylePicker` (preview tiles,
 * selection ring + scale, accessible listbox/option roles) but renders each
 * preview purely from CSS using `CAREER_BANNER_PLACEHOLDER_GRADIENTS` plus a
 * small abstract "career path" motif — no external image assets required.
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
              {/* Abstract career motif: glow + rising path with nodes. */}
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(60% 70% at 78% 22%, ${grad.accent}38, transparent 70%)`,
                }}
              />
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 160 90"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M16 74 L46 60 L74 64 L100 42 L126 48 L148 24"
                  stroke={grad.accent}
                  strokeOpacity="0.55"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="46" cy="60" r="2.2" fill={grad.accent} fillOpacity="0.6" />
                <circle cx="100" cy="42" r="2.2" fill={grad.accent} fillOpacity="0.6" />
                <circle cx="148" cy="24" r="4" fill={grad.accent} fillOpacity="0.95" />
              </svg>
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
