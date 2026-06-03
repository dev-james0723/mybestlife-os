"use client";

import { useState } from "react";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import type { Locale } from "date-fns";
import { Link2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { signalSourceIconUrl } from "@/lib/signals/source-icon-url";
import type {
  SignalContentType,
  SignalItem,
  SignalRelevanceBasis,
  SignalSource,
} from "@/lib/signals/types";
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

/**
 * Brain → Signals connection indicator (§13 read-path, honest + cheap).
 *
 * Surfaces the ALREADY-derived `whyRelevantToUser` (computed deterministically
 * from the Life OS context — no per-card embedding search, which §13 flags as a
 * perf trap) as a subtle persistent strip on personally-relevant cards.
 */
const CONNECTION_BASES: ReadonlySet<SignalRelevanceBasis> = new Set([
  "brain_similarity",
  "project_match",
  "task_match",
  "calendar_proximity",
  "behavior",
]);

export function ConnectionStrip({
  signal,
  className,
}: {
  signal: SignalItem;
  className?: string;
}) {
  if (!signal.whyRelevantToUser || !CONNECTION_BASES.has(signal.relevanceBasis)) {
    return null;
  }
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-500/5 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300",
        className,
      )}
    >
      <Link2 className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{signal.whyRelevantToUser}</span>
    </div>
  );
}

function SourceMonogram({
  name,
  size = 16,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "·";
  const px = `${size}px`;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[4px] bg-muted font-bold text-muted-foreground",
        className,
      )}
      style={{ width: px, height: px, fontSize: Math.max(9, Math.round(size * 0.56)) }}
    >
      {initial}
    </span>
  );
}

/** Publisher mark from domain favicon; falls back to the initial monogram on load error. */
export function SourceIcon({
  source,
  size = 16,
  className,
}: {
  source: SignalSource;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = signalSourceIconUrl(source, size * 2);
  const px = `${size}px`;

  if (!url || failed) {
    return <SourceMonogram name={source.name} size={size} className={className} />;
  }

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 rounded-[4px] border border-border/50 bg-background object-contain", className)}
      style={{ width: px, height: px }}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export function SourceLine({
  signal,
  copy,
  dateLocale,
  className,
  showDomain = true,
}: {
  signal: SignalItem;
  copy: SignalsUiCopy;
  dateLocale: Locale;
  className?: string;
  showDomain?: boolean;
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
        <SourceIcon source={signal.source} size={16} />
        {signal.source.name}
      </span>
      {showDomain && signal.source.domain && (
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
