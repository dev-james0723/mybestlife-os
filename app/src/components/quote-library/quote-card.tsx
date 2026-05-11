"use client";

import { useMemo, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Sparkles, Pencil, Trash2, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy, getQuoteCategoryLabel, getQuoteToneLabel } from "@/lib/i18n/quote-library-ui";
import type { Quote, QuoteCategory, QuoteEmotionTone } from "@/types/quote";
import { useQuoteLibraryStore } from "@/stores/quote-library-store";
import { useGoals } from "@/hooks/use-goals";
import { QuoteCardThumbnail } from "./quote-card-thumbnail";

export type QuoteCardVariant = "compact" | "expanded" | "hero";

interface QuoteCardProps {
  quote: Quote;
  variant?: QuoteCardVariant;
  onFavoriteToggle?: (next: boolean) => void;
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isTagging?: boolean;
  className?: string;
}

export function QuoteCard({
  quote,
  variant = "compact",
  onFavoriteToggle,
  onOpen,
  onEdit,
  onDelete,
  isTagging,
  className,
}: QuoteCardProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const showAiBadge = useQuoteLibraryStore((s) => s.showAiBadge);
  const { data: goals } = useGoals();
  const linkedGoal = useMemo(
    () =>
      quote.linked_goal_id
        ? (goals ?? []).find((g) => g.id === quote.linked_goal_id) ?? null
        : null,
    [goals, quote.linked_goal_id],
  );

  const author = quote.source_author?.trim() || copy.cardAuthorUnknown;
  const categoryLabel = quote.category
    ? getQuoteCategoryLabel(language, quote.category as QuoteCategory)
    : null;
  const toneLabel = quote.emotion_tone
    ? getQuoteToneLabel(language, quote.emotion_tone as QuoteEmotionTone)
    : null;

  const handleFavorite = (e: MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(!quote.is_favorite);
  };

  const isHero = variant === "hero";
  const isExpanded = variant === "expanded";
  const isThumbnailGenerating =
    quote.thumbnail_status === "generating" ||
    quote.thumbnail_status === "pending";

  return (
    <Card
      className={cn(
        "group relative isolate overflow-hidden border-white/10 text-white shadow-[0_18px_50px_-22px_rgba(8,11,28,0.55)] transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_28px_72px_-24px_rgba(8,11,28,0.7)]",
        onOpen && "cursor-pointer",
        isHero && "ring-1 ring-white/10",
        className,
      )}
      onClick={onOpen}
    >
      <QuoteCardThumbnail quote={quote} variant={variant} />
      <CardContent
        className={cn(
          "relative z-10 flex flex-col gap-4 text-white",
          variant === "compact" ? "p-5" : "p-6 sm:p-8",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {categoryLabel ? (
              <Badge
                variant="secondary"
                className="border border-white/15 bg-white/15 font-normal text-white backdrop-blur-md"
              >
                {categoryLabel}
              </Badge>
            ) : null}
            {toneLabel ? (
              <Badge
                variant="outline"
                className="border-white/20 bg-white/5 font-normal text-white/90 backdrop-blur-md"
              >
                {toneLabel}
              </Badge>
            ) : null}
            {quote.is_ai_enriched && showAiBadge ? (
              <Badge
                variant="outline"
                className="gap-1 border-amber-300/40 bg-amber-300/15 font-normal text-amber-100 backdrop-blur-md"
                title={copy.cardAiEnriched}
              >
                <Sparkles className="size-3" aria-hidden />
                {copy.cardAiEnriched}
              </Badge>
            ) : null}
            {linkedGoal ? (
              <Badge
                variant="outline"
                className="gap-1 border-white/20 bg-white/5 font-normal text-white/90 backdrop-blur-md"
                title={`${copy.cardLinkedGoal}: ${linkedGoal.name}`}
              >
                <Target className="size-3" aria-hidden />
                {linkedGoal.name.length > 24
                  ? `${linkedGoal.name.slice(0, 24)}…`
                  : linkedGoal.name}
              </Badge>
            ) : null}
            {isThumbnailGenerating ? (
              <Badge
                variant="outline"
                className="gap-1 border-white/20 bg-white/10 font-normal text-white/70 backdrop-blur-md"
                title={copy.thumbnailGenerating}
              >
                <Sparkles className="size-3 animate-pulse" aria-hidden />
                {copy.thumbnailGenerating}
              </Badge>
            ) : null}
            {quote.thumbnail_status === "fallback" ? (
              <Badge
                variant="outline"
                className="border-white/15 bg-white/5 font-normal text-white/70 backdrop-blur-md"
                title={copy.thumbnailFailedHelper}
              >
                {copy.thumbnailFallbackBadge}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleFavorite}
              aria-label={
                quote.is_favorite
                  ? copy.cardUnfavoriteAria
                  : copy.cardFavoriteAria
              }
              aria-pressed={quote.is_favorite}
              className={cn(
                "text-white/75 hover:bg-white/10 hover:text-white",
                quote.is_favorite && "text-amber-300 hover:text-amber-200",
              )}
            >
              <Star
                className={cn("size-4", quote.is_favorite && "fill-current")}
                aria-hidden
              />
            </Button>
            {onEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                aria-label={copy.cardEditAria}
                className="text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                aria-label={copy.cardDeleteAria}
                className="text-white/70 hover:bg-white/10 hover:text-rose-300"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>
        </div>

        <blockquote
          className={cn(
            "font-serif text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)] [text-wrap:balance]",
            isHero
              ? "text-2xl leading-snug sm:text-3xl"
              : isExpanded
                ? "text-xl leading-relaxed sm:text-2xl"
                : "text-lg leading-relaxed",
          )}
        >
          <span aria-hidden className="mr-1 select-none text-white/45">
            &ldquo;
          </span>
          {quote.quote_text}
          <span aria-hidden className="ml-1 select-none text-white/45">
            &rdquo;
          </span>
        </blockquote>

        <div className="flex flex-col gap-2 text-sm text-white/75">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium uppercase tracking-[0.08em] text-white/85">
              {author}
            </span>
            {quote.source_context ? (
              <span className="italic text-white/65">
                — {quote.source_context}
              </span>
            ) : null}
          </div>
          {quote.tags.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label={copy.labelTags}>
              {quote.tags.map((tag) => (
                <li key={tag}>
                  <Badge
                    variant="outline"
                    className="border-white/15 bg-white/5 font-normal text-xs text-white/75 backdrop-blur-md"
                  >
                    #{tag}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : isTagging ? (
            <span className="text-xs italic text-white/55">
              {copy.toastTaggingInProgress}
            </span>
          ) : null}

          {quote.personal_note ? (
            <p className="mt-1 rounded-md border-l-2 border-white/30 bg-black/20 px-3 py-2 text-sm italic text-white/85 backdrop-blur-md">
              {quote.personal_note}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
