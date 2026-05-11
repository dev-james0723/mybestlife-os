"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getFallbackForQuote } from "@/lib/quote-library/thumbnail/fallback";
import type { Quote } from "@/types/quote";

export type QuoteCardThumbnailProps = {
  quote: Quote;
  /** Card variant — slightly different gradient strengths per surface. */
  variant?: "compact" | "expanded" | "hero";
  className?: string;
};

/**
 * Renders the cinematic thumbnail layer that sits behind the quote text.
 *
 * Three states:
 *   - `completed` — show the rendered image with a tasteful dark overlay.
 *   - `generating` / `pending` — show the deterministic fallback gradient
 *     plus a soft "conjuring atmosphere" shimmer.
 *   - `failed` / `fallback` / no image yet — show the deterministic gradient
 *     alone (already mood-matched to the quote).
 */
export function QuoteCardThumbnail({
  quote,
  variant = "compact",
  className,
}: QuoteCardThumbnailProps) {
  const fallback = useMemo(() => getFallbackForQuote(quote), [quote]);
  const hasImage = Boolean(
    quote.thumbnail_url && quote.thumbnail_status === "completed",
  );
  const isShimmering =
    quote.thumbnail_status === "generating" ||
    quote.thumbnail_status === "pending";

  const overlayStrength =
    variant === "hero"
      ? "from-black/55 via-black/35 to-black/55"
      : variant === "expanded"
        ? "from-black/45 via-black/25 to-black/55"
        : "from-black/45 via-black/30 to-black/55";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {/* Layer 1: deterministic gradient — always there for instant paint. */}
      <div
        className="absolute inset-0"
        style={{ background: fallback.cssBackground }}
      />

      {/* Layer 2: rendered image (if present). */}
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={quote.thumbnail_url ?? undefined}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full select-none object-cover transition-opacity duration-700 ease-out"
          style={{ opacity: 1 }}
        />
      ) : null}

      {/* Layer 3: dark cinematic overlay for readability. */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br",
          overlayStrength,
        )}
      />

      {/* Layer 4: subtle inner glow + grain feel using radial mask. */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.06),transparent_60%)]" />

      {/* Layer 5: shimmer while generating. */}
      {isShimmering ? (
        <div className="absolute inset-0 overflow-hidden">
          <div className="quote-thumb-shimmer absolute inset-0" />
        </div>
      ) : null}
    </div>
  );
}
