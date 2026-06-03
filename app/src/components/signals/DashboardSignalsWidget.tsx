"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Radar, RotateCw, SignalZero } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { getSignalsWidgetCopy } from "@/lib/i18n/signals-widget-ui";
import { getSignalsUiCopy } from "@/lib/i18n/signals-ui";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { useSignalsSummary } from "@/hooks/signals/use-signals-summary";
import { formatRelative, SourceIcon, TopicChip } from "@/components/signals/signal-chrome";
import { SignalThumbnail } from "@/components/signals/SignalThumbnail";
import { Skeleton } from "@/components/ui/skeleton";

const CARD_BASE =
  "block rounded-xl border border-border/60 bg-card/70 px-4 py-3.5 text-left shadow-sm";

/**
 * Dashboard "Today's Signals" widget — the structural twin of
 * `DashboardWeatherWidget`. Shows EXACTLY the Daily Top 3 (capped in the data
 * layer), each as a compact row: headline · topic · source · time · one-line
 * relevance. The whole card links to the Signals page (per-signal deep-link is
 * a clean v2 TODO). Never an infinite mini-feed.
 */
export function DashboardSignalsWidget({ className }: { className?: string }) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getSignalsWidgetCopy(language), [language]);
  const uiCopy = useMemo(() => getSignalsUiCopy(language), [language]);
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const signalsHref = useLocalizedPath("/signals");

  const { state, refresh } = useSignalsSummary();

  if (state.status === "loading") {
    return (
      <div className={cn(CARD_BASE, className)} aria-busy="true">
        <WidgetHeader copy={copy} />
        <div className="mt-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-[85%]" />
              <Skeleton className="h-3 w-[55%]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={cn(CARD_BASE, className)}>
        <div className="flex items-center gap-2.5">
          <SignalZero className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{copy.unavailableTitle}</p>
            <p className="truncate text-xs text-muted-foreground">{copy.unavailableHint}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/40"
          >
            <RotateCw className="h-3 w-3" />
            {copy.retry}
          </button>
          <Link
            href={signalsHref}
            prefetch={false}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
          >
            {copy.openPage}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  const { items } = state;

  return (
    <div
      className={cn(
        CARD_BASE,
        "transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-border",
        className,
      )}
    >
      <Link
        href={signalsHref}
        prefetch={false}
        aria-label={copy.ariaOpen}
        className="flex min-h-11 items-start gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <WidgetHeader copy={copy} />
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
      </Link>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{copy.caughtUp}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((signal) => (
            <li
              key={signal.id}
              className="border-t border-border/40 pt-2.5 first:border-t-0 first:pt-0"
            >
              {/* Deep-link: focus + highlight this exact card on the page (§9). */}
              <Link
                href={`${signalsHref}?focus=${encodeURIComponent(signal.id)}`}
                prefetch={false}
                className="-mx-1 flex min-h-11 gap-2.5 rounded-xl px-1 py-1 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <SignalThumbnail
                  signal={signal}
                  copy={uiCopy}
                  rounded="rounded-lg"
                  className="size-12 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                    {signal.headline}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <TopicChip label={signal.topic} className="py-0" />
                  <span className="inline-flex items-center gap-1 font-medium text-foreground/70">
                    <SourceIcon source={signal.source} size={14} />
                    {signal.source.name}
                  </span>
                    <span aria-hidden className="opacity-50">·</span>
                    <span>{formatRelative(signal.publishedAt, dateLocale)}</span>
                  </div>
                  {signal.whyRelevantToUser && (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/90">
                      {signal.whyRelevantToUser}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WidgetHeader({
  copy,
}: {
  copy: ReturnType<typeof getSignalsWidgetCopy>;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Radar className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold tracking-tight text-foreground">{copy.title}</p>
        <p className="truncate text-xs text-muted-foreground">{copy.subtitle}</p>
      </div>
    </div>
  );
}
