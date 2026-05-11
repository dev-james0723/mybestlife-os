"use client";

import { useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniSparkline } from "@/components/bio-lab/mini-sparkline";
import type { SparklineCell } from "@/lib/bio-lab/history-summary";
import type { BioLabToolId } from "@/lib/bio-lab/tool-types";
import { BIO_LAB_TOOL_CARD_CHROME } from "@/lib/bio-lab/tool-card-chrome";
import { cn } from "@/lib/utils";

export type BioLabToolCardProps = {
  toolId: BioLabToolId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  /** When set, the card is a single large tap target (opens tool flow). */
  onOpen?: () => void;
  /**
   * Short relative timestamp pill rendered in the corner ("Today" / "2d ago").
   * Pass `null` (or omit) to hide the pill — used for tools the user has
   * never opened.
   */
  lastUsedLabel?: string | null;
  /** Aria label for {@link lastUsedLabel} (e.g. "Last used: Today"). */
  lastUsedAriaLabel?: string;
  /** Optional 7-day usage sparkline data; omit to hide the chart. */
  sparklineCells?: SparklineCell[];
  /** Aria summary for the sparkline (i18n-aware). Required iff `sparklineCells` is set. */
  sparklineAriaLabel?: string;
  /** Tailwind text-color class for today's accent bar. */
  sparklineAccentClassName?: string;
  className?: string;
};

export function BioLabToolCard({
  toolId,
  title,
  subtitle,
  icon: Icon,
  onOpen,
  lastUsedLabel,
  lastUsedAriaLabel,
  sparklineCells,
  sparklineAriaLabel,
  sparklineAccentClassName,
  className,
}: BioLabToolCardProps) {
  const chrome = BIO_LAB_TOOL_CARD_CHROME[toolId];
  const summary = `${title}. ${subtitle}`;
  const reduceMotion = useReducedMotion() ?? false;

  const card = (
    <Card
      size="sm"
      role={onOpen ? undefined : "article"}
      aria-label={onOpen ? undefined : summary}
      className={cn(
        "relative min-h-[128px] overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-none backdrop-blur-[1px]",
        !reduceMotion && "transition-[box-shadow,transform] duration-200 ease-out",
        onOpen &&
          !reduceMotion &&
          "hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/25",
        chrome.card,
        className,
      )}
    >
      {lastUsedLabel ? (
        <span
          className={cn(
            "pointer-events-none absolute top-2 right-2 z-10 inline-flex items-center rounded-full",
            "bg-background/85 px-1.5 py-0.5 text-[0.625rem] font-medium leading-none tabular-nums",
            "text-muted-foreground ring-1 ring-border/60 backdrop-blur-[1px]",
          )}
          aria-label={lastUsedAriaLabel ?? lastUsedLabel}
        >
          {lastUsedLabel}
        </span>
      ) : null}
      <CardHeader className="gap-2 pb-4 pt-4">
        <div className="flex items-start gap-3.5">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/40",
              chrome.iconWrap,
            )}
            aria-hidden
          >
            <Icon className="size-[22px]" strokeWidth={1.65} />
          </span>
          <div className="min-w-0 space-y-1.5 pr-1">
            <CardTitle
              className={cn(
                "text-base font-semibold leading-snug tracking-tight",
                lastUsedLabel && "pr-12",
              )}
            >
              {title}
            </CardTitle>
            <CardDescription
              className={cn(
                "text-xs leading-relaxed text-pretty sm:text-[0.8125rem] sm:leading-relaxed",
                sparklineCells && "pr-16",
              )}
            >
              {subtitle}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {sparklineCells && sparklineAriaLabel ? (
        <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-10">
          <MiniSparkline
            cells={sparklineCells}
            ariaLabel={sparklineAriaLabel}
            accentClassName={sparklineAccentClassName}
          />
        </div>
      ) : null}
    </Card>
  );

  if (!onOpen) {
    return (
      <div role="article" aria-label={summary}>
        {card}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={summary}
      className="w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {card}
    </button>
  );
}
