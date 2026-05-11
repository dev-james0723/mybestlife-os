"use client";

import { useMemo } from "react";
import { Loader2, Quote as QuoteIcon, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import {
  getQuoteCategoryLabel,
  getQuoteLibraryUiCopy,
} from "@/lib/i18n/quote-library-ui";
import { useResonantQuotes } from "@/hooks/use-quote-library-sdk";
import type { QuoteCategory } from "@/types/quote";

interface ResonantQuotesPanelProps {
  /** The text whose resonance we're computing (e.g. a journal entry body). */
  text: string;
  /** Default 3, max 10. */
  limit?: number;
  /** Extra className on the wrapper. */
  className?: string;
  /** Compact variant drops the heading + subhead so it fits inside a card body. */
  compact?: boolean;
}

export function ResonantQuotesPanel({
  text,
  limit = 3,
  className,
  compact = false,
}: ResonantQuotesPanelProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);

  const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const { data, isLoading, isFetching, refetch, isError } = useResonantQuotes(
    cleaned,
    { limit },
  );

  const body = (() => {
    if (cleaned.length < 24) {
      return (
        <p className="text-sm text-muted-foreground">{copy.resonantEmpty}</p>
      );
    }
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {copy.resonantLoading}
        </div>
      );
    }
    if (isError) {
      return (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{copy.errorGeneric}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
          >
            {copy.resonantRefresh}
          </Button>
        </div>
      );
    }
    if (!data || data.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">{copy.resonantEmpty}</p>
      );
    }
    return (
      <ul className="space-y-3">
        {data.map((match) => {
          const percent = Math.max(
            0,
            Math.min(100, Math.round(match.similarity * 100)),
          );
          const categoryLabel = match.category
            ? getQuoteCategoryLabel(language, match.category as QuoteCategory)
            : null;
          return (
            <li key={match.id}>
              <Card className="border-border/60 bg-background/80">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {categoryLabel ? (
                      <Badge
                        variant="secondary"
                        className="font-normal"
                      >
                        {categoryLabel}
                      </Badge>
                    ) : null}
                    <Badge
                      variant="outline"
                      className="font-normal text-[0.7rem] text-muted-foreground"
                    >
                      {copy.resonantMatchPct(percent)}
                    </Badge>
                  </div>
                  <blockquote className="font-serif text-[15px] leading-relaxed text-foreground/90 [text-wrap:pretty]">
                    <span
                      aria-hidden
                      className="select-none text-muted-foreground/60"
                    >
                      &ldquo;
                    </span>
                    {match.quote_text}
                    <span
                      aria-hidden
                      className="select-none text-muted-foreground/60"
                    >
                      &rdquo;
                    </span>
                  </blockquote>
                  {match.source_author ? (
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      {match.source_author}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    );
  })();

  if (compact) {
    return <div className={className}>{body}</div>;
  }

  return (
    <section className={cn("space-y-3", className)} aria-labelledby="resonant-heading">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Sparkles
            className="mt-0.5 size-4 text-primary"
            aria-hidden
          />
          <div>
            <h3
              id="resonant-heading"
              className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {copy.resonantHeading}
            </h3>
            <p className="text-xs text-muted-foreground/80">
              {copy.resonantSubhead}
            </p>
          </div>
        </div>
        {isFetching && !isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <QuoteIcon className="size-4 text-muted-foreground" aria-hidden />
        )}
      </div>
      {body}
    </section>
  );
}
