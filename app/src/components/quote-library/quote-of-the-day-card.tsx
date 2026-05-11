"use client";

import { useMemo } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy, getQuoteCategoryLabel } from "@/lib/i18n/quote-library-ui";
import { useDailyQuote, useDismissDailyQuote } from "@/hooks/use-quote-ai";
import { useToggleFavoriteQuote } from "@/hooks/use-quotes";
import { QuoteCard } from "./quote-card";
import { useQuoteLibraryStore } from "@/stores/quote-library-store";
import type { QuoteCategory } from "@/types/quote";

export function QuoteOfTheDayCard() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const { data, isLoading } = useDailyQuote();
  const dismissMutation = useDismissDailyQuote();
  const toggleFavorite = useToggleFavoriteQuote();
  const setOpenQuoteId = useQuoteLibraryStore((s) => s.setOpenQuoteId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
        <Sparkles className="size-4" aria-hidden />
        {copy.loadingLibrary}
      </div>
    );
  }

  if (!data || !data.quote || data.dismissed) return null;

  const quote = data.quote;
  const categoryLabel = quote.category
    ? getQuoteCategoryLabel(language, quote.category as QuoteCategory)
    : null;

  return (
    <section
      aria-label={copy.qotdTitle}
      className="rounded-2xl bg-gradient-to-br from-primary/[0.06] via-transparent to-primary/[0.04] ring-1 ring-primary/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="size-4" aria-hidden />
          {copy.qotdTitle}
          {categoryLabel ? (
            <Badge variant="outline" className="ml-2 font-normal">
              {categoryLabel}
            </Badge>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={copy.qotdDismiss}
          onClick={() => dismissMutation.mutate(true)}
          className="text-muted-foreground"
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
      <QuoteCard
        quote={quote}
        variant="hero"
        onOpen={() => setOpenQuoteId(quote.id)}
        onFavoriteToggle={(next) =>
          toggleFavorite.mutate({ id: quote.id, favorite: next })
        }
        className="border-none bg-transparent shadow-none ring-0"
      />
    </section>
  );
}
