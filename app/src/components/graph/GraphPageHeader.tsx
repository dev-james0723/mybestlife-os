"use client";

/**
 * GraphPageHeader — compact Liquid Glass header for graph pages.
 *
 * Used by both the Brain page and (when a future use-case wants it) the
 * Knowledge Constellation View. Lives *inside* the graph chrome so it
 * never grows the surrounding scroll context. On mobile the subtitle
 * is collapsible to keep vertical space for the canvas.
 *
 * Visual language: translucent glass with backdrop-blur, soft white
 * inner highlight, and a thin border — see `liquid_glass_ui.md` §8.1.
 */

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";

interface GraphPageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned content slot — small action buttons, badges, etc. */
  actions?: ReactNode;
  className?: string;
}

export function GraphPageHeader({
  title,
  subtitle,
  actions,
  className,
}: GraphPageHeaderProps) {
  const { t: graphT } = useGraphSurface();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  return (
    <header
      className={cn(
        "pointer-events-auto relative mx-3 mt-3 flex items-start gap-3 px-4 py-2.5 sm:px-5 sm:py-3",
        graphT.glass.header,
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            "truncate text-lg font-semibold tracking-tight sm:text-xl",
            graphT.tone.title,
          )}
          style={{ letterSpacing: "-0.01em" }}
        >
          {title}
        </h1>
        {subtitle && (
          <>
            <p
              className={cn(
                "mt-0.5 hidden text-xs leading-relaxed sm:block sm:text-[13px]",
                graphT.tone.muted,
              )}
            >
              {subtitle}
            </p>
            <button
              type="button"
              aria-expanded={mobileExpanded}
              onClick={() => setMobileExpanded((v) => !v)}
              className={cn(
                "mt-0.5 flex items-center gap-1 text-[11px] leading-relaxed sm:hidden",
                graphT.tone.muted,
              )}
            >
              <span>{mobileExpanded ? "Hide details" : "What is this?"}</span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  mobileExpanded && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {mobileExpanded && (
              <p
                className={cn(
                  "mt-1.5 text-[11px] leading-relaxed sm:hidden",
                  graphT.tone.muted,
                )}
              >
                {subtitle}
              </p>
            )}
          </>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
