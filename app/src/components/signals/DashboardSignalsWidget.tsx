"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Radar, RotateCw, SignalZero } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { getSignalsWidgetCopy } from "@/lib/i18n/signals-widget-ui";
import { getSignalsUiCopy } from "@/lib/i18n/signals-ui";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { useSignalsSummary } from "@/hooks/signals/use-signals-summary";
import { formatRelative, SourceIcon } from "@/components/signals/signal-chrome";
import { SignalThumbnail } from "@/components/signals/SignalThumbnail";
import { Skeleton } from "@/components/ui/skeleton";
import type { SignalItem } from "@/lib/signals/types";

const CARD_BASE =
  "block rounded-xl border border-border/60 bg-card/70 px-4 py-3.5 text-left shadow-sm";
const DASHBOARD_SIGNALS_GALLERY_INTERVAL_MS = 5_000;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

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
        <div className="mt-3 overflow-hidden rounded-xl border border-border/50">
          <Skeleton className="h-64 w-full rounded-none sm:h-72" />
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
        <SignalsWidgetGallery
          items={items}
          copy={copy}
          uiCopy={uiCopy}
          signalsHref={signalsHref}
          dateLocale={dateLocale}
        />
      )}
    </div>
  );
}

function SignalsWidgetGallery({
  items,
  copy,
  uiCopy,
  signalsHref,
  dateLocale,
}: {
  items: SignalItem[];
  copy: ReturnType<typeof getSignalsWidgetCopy>;
  uiCopy: ReturnType<typeof getSignalsUiCopy>;
  signalsHref: string;
  dateLocale: ReturnType<typeof getDateFnsLocale>;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;
  const activeIndex = count === 0 ? 0 : Math.min(index, count - 1);

  useEffect(() => {
    if (reducedMotion || paused || count <= 1) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, DASHBOARD_SIGNALS_GALLERY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count, paused, reducedMotion]);

  return (
    <div
      className="mt-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-xl border border-border/55 bg-muted/30 shadow-sm">
        <div
          className={cn(
            "flex",
            reducedMotion
              ? "transition-none"
              : "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          )}
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {items.map((signal, i) => (
            <Link
              key={signal.id}
              href={`${signalsHref}?focus=${encodeURIComponent(signal.id)}`}
              prefetch={false}
              aria-label={`${copy.ariaOpen}: ${signal.headline}`}
              aria-hidden={i !== activeIndex}
              tabIndex={i === activeIndex ? 0 : -1}
              className="relative block h-64 w-full shrink-0 overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:h-72"
            >
              <SignalThumbnail
                signal={signal}
                copy={uiCopy}
                rounded="rounded-none"
                className="absolute inset-0 h-full w-full"
                iconClassName="text-white/65"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.34)_42%,rgba(0,0,0,0.86)_100%)]"
              />
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(80%_90%_at_18%_100%,rgba(255,255,255,0.2),transparent_70%)]"
              />

              <ChevronRight className="absolute right-3 top-3 z-10 h-5 w-5 rounded-full bg-black/25 p-0.5 text-white/80 ring-1 ring-white/20 backdrop-blur-sm" />

              <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 p-4 text-white sm:p-5 sm:pl-16">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                  <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-white backdrop-blur-md">
                    {signal.topic}
                  </span>
                  {signal.isDemo && (
                    <span className="rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-white/80 backdrop-blur-md">
                      {copy.demoTag}
                    </span>
                  )}
                </div>

                <h3 className="line-clamp-3 text-lg font-semibold leading-tight tracking-tight text-white drop-shadow-sm sm:text-xl">
                  {signal.headline}
                </h3>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-white/82">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <SourceIcon
                      source={signal.source}
                      size={16}
                      className="border-white/30 bg-white/90"
                    />
                    <span className="max-w-[11rem] truncate">{signal.source.name}</span>
                  </span>
                  <span aria-hidden className="text-white/45">
                    ·
                  </span>
                  <span>{formatRelative(signal.publishedAt, dateLocale)}</span>
                </div>

                {signal.whyRelevantToUser && (
                  <p className="line-clamp-2 text-sm leading-snug text-white/86">
                    {signal.whyRelevantToUser}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {count > 1 && (
          <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/22 px-2 py-1 backdrop-blur-md">
            {items.map((signal, i) => (
              <button
                key={signal.id}
                type="button"
                aria-label={`${i + 1}`}
                aria-current={i === activeIndex}
                onClick={() => setIndex(i)}
                className="flex h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/45 hover:bg-white/75",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
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
