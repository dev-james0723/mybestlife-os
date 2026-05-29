"use client";

import { formatDistanceToNowStrict, parseISO } from "date-fns";
import type { Locale } from "date-fns";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SignalContentType, SignalItem } from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";

export function formatRelative(iso: string, locale: Locale): string {
  try {
    return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true, locale });
  } catch {
    return "";
  }
}

export function formatAbsolute(iso: string): string {
  try {
    return parseISO(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Quiet topic pill — never shouting (§19). */
export function TopicChip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/60 bg-card/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

const CONTENT_TYPE_TONE: Record<SignalContentType, string> = {
  breaking: "text-amber-700 dark:text-amber-300 border-amber-400/40 bg-amber-500/10",
  developing: "text-sky-700 dark:text-sky-300 border-sky-400/30 bg-sky-500/10",
  analysis: "text-muted-foreground border-border/60 bg-muted/30",
  opinion: "text-muted-foreground border-border/60 bg-muted/30 italic",
  local: "text-emerald-700 dark:text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
  global: "text-muted-foreground border-border/60 bg-muted/30",
  personal: "text-violet-700 dark:text-violet-300 border-violet-400/30 bg-violet-500/10",
};

export function ContentTypeChip({
  type,
  copy,
}: {
  type: SignalContentType;
  copy: SignalsUiCopy;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        CONTENT_TYPE_TONE[type],
      )}
    >
      {copy.card.contentType[type]}
    </span>
  );
}

/**
 * Source-grounded AI overview (§16). Renders the overview text with a quiet
 * "summarized from the source" note when grounded, or the honest "Overview
 * limited" phrasing otherwise. Never headline-only — the text always comes from
 * real source content or is explicitly labeled as limited.
 */
export function AiOverview({
  signal,
  copy,
  className,
  clamp,
}: {
  signal: SignalItem;
  copy: SignalsUiCopy;
  className?: string;
  clamp?: number;
}) {
  const text = signal.aiOverview ?? signal.summary;
  if (!text) return null;
  const grounded = signal.aiOverviewGrounded !== false;
  return (
    <div className={cn("space-y-1", className)}>
      <p
        className="text-sm leading-relaxed text-foreground/85"
        style={
          clamp
            ? {
                display: "-webkit-box",
                WebkitLineClamp: clamp,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {text}
      </p>
      <p className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
        <Sparkles className="h-3 w-3" aria-hidden />
        {grounded ? copy.card.overviewGroundedNote : copy.card.overview}
      </p>
    </div>
  );
}

/** Source initial monogram — avoids external favicon requests; always visible. */
function SourceMonogram({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "·";
  return (
    <span
      aria-hidden="true"
      className="flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-muted text-[9px] font-bold text-muted-foreground"
    >
      {initial}
    </span>
  );
}

export function SourceLine({
  signal,
  copy,
  dateLocale,
  className,
}: {
  signal: SignalItem;
  copy: SignalsUiCopy;
  dateLocale: Locale;
  className?: string;
}) {
  const published = formatRelative(signal.publishedAt, dateLocale);
  const corroboration = signal.corroborationCount && signal.corroborationCount >= 2;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
        <SourceMonogram name={signal.source.name} />
        {signal.source.name}
      </span>
      {signal.source.domain && (
        <span className="text-muted-foreground/70">{signal.source.domain}</span>
      )}
      <span aria-hidden className="opacity-50">
        ·
      </span>
      <time dateTime={signal.publishedAt} title={formatAbsolute(signal.publishedAt)}>
        {published}
      </time>
      {corroboration && (
        <>
          <span aria-hidden className="opacity-50">
            ·
          </span>
          <span className="text-foreground/70">
            {copy.card.sourcesReporting(signal.corroborationCount as number)}
          </span>
        </>
      )}
    </div>
  );
}
