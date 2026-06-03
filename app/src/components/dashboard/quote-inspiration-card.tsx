"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  Quote as QuoteIcon,
  RefreshCw,
  Sparkles,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import {
  getQuoteCategoryLabel,
  getQuoteLibraryUiCopy,
} from "@/lib/i18n/quote-library-ui";
import {
  useDailyInspirationFavorites,
  useInspireMe,
  type FavoriteInspirationItem,
  type InspireMeResult,
} from "@/hooks/use-quote-library-sdk";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import type { QuoteCategory } from "@/types/quote";

interface QuoteInspirationCardProps {
  /** Optional dashboard summary text; feeds into the Inspire-me context. */
  focus?: string;
  className?: string;
}

export function QuoteInspirationCard({
  focus,
  className,
}: QuoteInspirationCardProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const libraryHref = useLocalizedPath("/quote-library");

  const { data: favorites, isLoading: favLoading } = useDailyInspirationFavorites({
    limit: 5,
  });
  const inspire = useInspireMe();
  const [cursor, setCursor] = useState(0);
  const [inspireResult, setInspireResult] = useState<InspireMeResult | null>(
    null,
  );

  // Keep the card pointing at a valid index when favorites change — derived,
  // not an effect, so no cascading renders.
  const pool = useMemo<FavoriteInspirationItem[]>(
    () => favorites ?? [],
    [favorites],
  );
  const safeCursor = pool.length > 0 ? cursor % pool.length : 0;
  const activeFavorite = useMemo<FavoriteInspirationItem | null>(
    () => pool[safeCursor] ?? null,
    [pool, safeCursor],
  );

  const handleShuffle = () => {
    setInspireResult(null);
    if (pool.length === 0) return;
    setCursor((c) => (c + 1) % pool.length);
  };

  const handleInspire = async () => {
    try {
      const result = await inspire.mutateAsync({
        focus: focus?.trim() || undefined,
      });
      setInspireResult(result);
    } catch {
      /* silent — toast handled at SDK level if we ever add one */
    }
  };

  const renderedQuote = inspireResult?.quote
    ? {
        id: inspireResult.quote.id,
        quote_text: inspireResult.quote.quote_text,
        source_author: inspireResult.quote.source_author,
        category: inspireResult.quote.category,
        is_favorite: inspireResult.quote.is_favorite,
      }
    : activeFavorite
      ? {
          id: activeFavorite.quote_id,
          quote_text: activeFavorite.quote_text,
          source_author: activeFavorite.source_author,
          category: activeFavorite.category,
          is_favorite: activeFavorite.is_favorite,
        }
      : null;

  const categoryLabel = renderedQuote?.category
    ? getQuoteCategoryLabel(language, renderedQuote.category as QuoteCategory)
    : null;

  return (
    <GlassTintPanel
      tint="violet"
      className={cn("p-5 md:max-xl:p-6 xl:p-5", className)}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Sparkles className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
        <h2 className="min-w-0 flex-1 text-lg font-semibold tracking-tight">
          {copy.dashboardQuoteTitle}
        </h2>
        <Link
          href={libraryHref}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-11 min-h-11 gap-1 rounded-xl px-3 font-medium",
          )}
        >
          {copy.pageTitle}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {favLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {copy.loadingLibrary}
        </div>
      ) : !renderedQuote ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-border/60 bg-background/40 p-5">
          <p className="text-sm text-muted-foreground [text-wrap:balance]">
            {copy.dashboardQuoteEmpty}
          </p>
          <Link
            href={libraryHref}
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "h-11 min-h-11 rounded-xl px-3",
            )}
          >
            {copy.addQuote}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {categoryLabel ? (
              <Badge
                variant="secondary"
                className="border-0 bg-violet-500/15 font-medium text-violet-800 dark:bg-violet-500/20 dark:text-violet-100"
              >
                {categoryLabel}
              </Badge>
            ) : null}
            {renderedQuote.is_favorite ? (
              <Badge variant="outline" className="gap-1 font-normal">
                <Star
                  className="size-3 fill-amber-400 text-amber-500"
                  aria-hidden
                />
                {copy.filterFavorites}
              </Badge>
            ) : null}
          </div>

          <blockquote className="font-serif text-lg leading-relaxed text-foreground/90 [text-wrap:balance] sm:text-xl">
            <span aria-hidden className="select-none text-muted-foreground/60">
              &ldquo;
            </span>
            {renderedQuote.quote_text}
            <span aria-hidden className="select-none text-muted-foreground/60">
              &rdquo;
            </span>
          </blockquote>
          <p className="text-sm uppercase tracking-[0.08em] text-muted-foreground">
            {renderedQuote.source_author ?? copy.cardAuthorUnknown}
          </p>

          {inspireResult?.reason ? (
            <div className="rounded-lg border-l-2 border-violet-400/60 bg-violet-500/10 px-4 py-3 text-sm text-foreground/85 dark:border-violet-300/40 dark:bg-violet-300/10">
              <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">
                {copy.dashboardInspireReason}
              </p>
              <p className="leading-relaxed [text-wrap:pretty]">
                {inspireResult.reason}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-11 min-h-11 gap-1.5 rounded-xl px-3"
              onClick={() => void handleInspire()}
              disabled={inspire.isPending}
            >
              {inspire.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-3.5" aria-hidden />
              )}
              {inspire.isPending
                ? copy.dashboardInspireThinking
                : copy.dashboardInspireMe}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 min-h-11 gap-1.5 rounded-xl px-3"
              onClick={handleShuffle}
              disabled={favLoading || (favorites?.length ?? 0) < 2}
              aria-label={copy.dashboardQuoteShuffle}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {copy.dashboardQuoteShuffle}
            </Button>
            <Link
              href={libraryHref}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "ml-auto h-11 min-h-11 gap-1 rounded-xl px-3 text-muted-foreground",
              )}
            >
              <QuoteIcon className="size-3.5" aria-hidden />
              {copy.pageTitle}
            </Link>
          </div>
        </div>
      )}
    </GlassTintPanel>
  );
}
