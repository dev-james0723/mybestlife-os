"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pencil,
  Trash2,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Share2,
  RefreshCcw,
  Star,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import {
  useDeleteQuote,
  useQuotes,
  useRegenerateQuoteThumbnail,
  useToggleFavoriteQuote,
} from "@/hooks/use-quotes";
import { useSourceIntelligenceMutation } from "@/hooks/use-quote-ai";
import { useQuoteLibraryStore } from "@/stores/quote-library-store";
import dynamic from "next/dynamic";
import { QuoteCard } from "./quote-card";
import { ManageCollectionsPopover } from "./manage-collections-popover";
import { QuoteGoalPicker } from "./quote-goal-picker";

// Lazy-loaded — only enters the bundle when the user taps Share. Canvas
// rendering work is heavy enough to warrant a split.
const ShareQuoteCardDialog = dynamic(
  () =>
    import("./share-quote-card").then((mod) => ({
      default: mod.ShareQuoteCardDialog,
    })),
  { ssr: false },
);

const ACTION_BUTTON_CLASS =
  "h-16 w-full min-w-0 justify-start rounded-xl px-3 text-left text-sm font-medium whitespace-normal sm:h-16 sm:min-h-16 [&_svg]:shrink-0";

export function QuoteDetailDialog() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);

  const openId = useQuoteLibraryStore((s) => s.openQuoteId);
  const setOpenId = useQuoteLibraryStore((s) => s.setOpenQuoteId);
  const openEditSheet = useQuoteLibraryStore((s) => s.openEditSheet);

  const { data: quotes } = useQuotes();
  const deleteMutation = useDeleteQuote();
  const toggleFavorite = useToggleFavoriteQuote();
  const enrichMutation = useSourceIntelligenceMutation();
  const regenerateThumbnail = useRegenerateQuoteThumbnail();

  const quote = useMemo(
    () => quotes?.find((q) => q.id === openId) ?? null,
    [openId, quotes],
  );

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [authorPanelQuoteId, setAuthorPanelQuoteId] = useState<string | null>(
    null,
  );

  if (!quote) return null;

  const intel = quote.source_intelligence;
  const hasAbout = Boolean(
    intel && (intel.author_bio || intel.historical_context),
  );
  const hasRelated =
    intel && intel.related_quotes && intel.related_quotes.length > 0;
  const canOpenAuthorPanel = Boolean(hasAbout || hasRelated);
  const canRequestAuthorInfo = Boolean(
    quote.source_author && !quote.source_intelligence,
  );
  const authorOpen = authorPanelQuoteId === quote.id;
  const authorActionDisabled =
    enrichMutation.isPending || (!canOpenAuthorPanel && !canRequestAuthorInfo);
  const thumbnailBusy =
    regenerateThumbnail.isPending ||
    quote.thumbnail_status === "generating" ||
    quote.thumbnail_status === "pending";
  const thumbnailHasError =
    quote.thumbnail_status === "failed" || Boolean(quote.thumbnail_error);
  const thumbnailActionLabel =
    quote.thumbnail_status === "completed"
      ? copy.detailRefreshThumbnail
      : copy.detailNewThumbnail;

  const handleAuthorAction = () => {
    if (canOpenAuthorPanel) {
      setAuthorPanelQuoteId((currentId) =>
        currentId === quote.id ? null : quote.id,
      );
      return;
    }
    if (canRequestAuthorInfo) {
      enrichMutation.mutate(
        { quote_id: quote.id },
        { onSuccess: () => setAuthorPanelQuoteId(quote.id) },
      );
    }
  };

  return (
    <>
      <Dialog
        open={openId !== null}
        onOpenChange={(next) => {
          if (!next) {
            setOpenId(null);
            setAuthorPanelQuoteId(null);
          }
        }}
      >
        <DialogContent
          size="2xl"
          showCloseButton={false}
          className="max-h-[min(90vh,860px)] overflow-y-auto"
        >
          <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-border/60 pb-3">
            <DialogTitle>{copy.detailTitle}</DialogTitle>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  toggleFavorite.mutate({
                    id: quote.id,
                    favorite: !quote.is_favorite,
                  })
                }
                aria-label={
                  quote.is_favorite
                    ? copy.cardUnfavoriteAria
                    : copy.cardFavoriteAria
                }
                aria-pressed={quote.is_favorite}
                className={cn(
                  "rounded-xl",
                  quote.is_favorite && "text-amber-500 hover:text-amber-500",
                )}
              >
                <Star
                  className={cn("size-4", quote.is_favorite && "fill-current")}
                  aria-hidden
                />
              </Button>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                  />
                }
              >
                <X className="size-4" aria-hidden />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <QuoteCard
            quote={quote}
            variant="expanded"
            showInlineActions={false}
            className="border-none bg-transparent shadow-none ring-0"
          />

          {quote.source_url ? (
            <p className="-mt-1 text-xs text-muted-foreground">
              {copy.labelUrl}:{" "}
              <a
                href={quote.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground"
              >
                {copy.labelUrl}
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </p>
          ) : null}

          <section
            className="space-y-2 border-t border-border/60 pt-4"
            aria-label="Quote actions"
          >
            <div className="grid [grid-template-columns:repeat(2,minmax(0,1fr))] auto-rows-fr gap-3">
              <ManageCollectionsPopover
                quoteId={quote.id}
                triggerClassName={ACTION_BUTTON_CLASS}
              />
              <QuoteGoalPicker
                quoteId={quote.id}
                currentGoalId={quote.linked_goal_id}
                triggerClassName={ACTION_BUTTON_CLASS}
              />
              <Button
                variant="outline"
                size="sm"
                className={ACTION_BUTTON_CLASS}
                onClick={() => {
                  openEditSheet(quote.id);
                  setOpenId(null);
                }}
              >
                <Pencil className="size-4" aria-hidden />
                {copy.cardEditAria}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={ACTION_BUTTON_CLASS}
                onClick={handleAuthorAction}
                disabled={authorActionDisabled}
                aria-expanded={canOpenAuthorPanel ? authorOpen : undefined}
              >
                <Sparkles
                  className={cn(
                    "size-4",
                    enrichMutation.isPending && "animate-pulse",
                  )}
                  aria-hidden
                />
                {copy.detailAuthorInfo}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={ACTION_BUTTON_CLASS}
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="size-4" aria-hidden />
                {copy.detailShareImage}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={ACTION_BUTTON_CLASS}
                onClick={() => regenerateThumbnail.mutate(quote.id)}
                disabled={thumbnailBusy}
                aria-busy={thumbnailBusy}
                title={copy.thumbnailRegenerate}
              >
                <RefreshCcw
                  className={cn("size-4", thumbnailBusy && "animate-spin")}
                  aria-hidden
                />
                {thumbnailBusy
                  ? copy.thumbnailRegenerating
                  : thumbnailActionLabel}
              </Button>
            </div>
            {thumbnailBusy ? (
              <p className="text-xs text-muted-foreground" role="status">
                {copy.toastThumbnailRegenerating}
              </p>
            ) : thumbnailHasError ? (
              <p className="text-xs text-destructive" role="alert">
                {copy.thumbnailFailedHelper}
              </p>
            ) : null}
          </section>

          {process.env.NODE_ENV !== "production" &&
          (quote.thumbnail_mood ||
            quote.thumbnail_palette ||
            quote.thumbnail_provider ||
            quote.thumbnail_error) ? (
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger
                render={
                  <button
                    type="button"
                    className="group flex w-full items-center justify-between gap-2 rounded-lg bg-muted/30 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:bg-muted/60"
                  >
                    <span>{copy.thumbnailMetaTitle}</span>
                    <ChevronDown
                      className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                      aria-hidden
                    />
                  </button>
                }
              />
              <CollapsibleContent className="mt-2 space-y-2 rounded-lg border border-border/50 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
                <DiagRow
                  label={copy.thumbnailMetaMood}
                  value={quote.thumbnail_mood}
                />
                <DiagRow
                  label={copy.thumbnailMetaPalette}
                  value={
                    quote.thumbnail_palette
                      ? quote.thumbnail_palette.join(", ")
                      : null
                  }
                />
                <DiagRow
                  label={copy.thumbnailMetaProvider}
                  value={
                    quote.thumbnail_provider
                      ? `${quote.thumbnail_provider}${
                          quote.thumbnail_version
                            ? ` (${quote.thumbnail_version})`
                            : ""
                        }`
                      : null
                  }
                />
                <DiagRow
                  label={copy.thumbnailMetaGeneratedAt}
                  value={
                    quote.thumbnail_generated_at
                      ? new Date(quote.thumbnail_generated_at).toLocaleString()
                      : null
                  }
                />
                {quote.thumbnail_error ? (
                  <div>
                    <span className="font-medium text-foreground/70">
                      {copy.thumbnailMetaError}:
                    </span>{" "}
                    <code className="break-all text-[11px] text-rose-500/80">
                      {quote.thumbnail_error}
                    </code>
                  </div>
                ) : null}
                {quote.thumbnail_prompt ? (
                  <details className="rounded-md bg-muted/40 p-2">
                    <summary className="cursor-pointer text-xs">
                      {copy.thumbnailMetaPrompt}
                    </summary>
                    <p className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed">
                      {quote.thumbnail_prompt}
                    </p>
                  </details>
                ) : null}
              </CollapsibleContent>
            </Collapsible>
          ) : null}

          {authorOpen && (hasAbout || hasRelated) ? (
            <section className="space-y-4 rounded-lg border border-border/50 bg-background px-4 py-4">
              {intel?.unverified ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
                  {copy.cardSourceUnverified}
                </p>
              ) : null}
              {intel?.author_bio ? (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {copy.cardAboutAuthor}
                  </h3>
                  <p className="text-sm leading-relaxed [text-wrap:pretty]">
                    {intel.author_bio}
                  </p>
                </div>
              ) : null}
              {intel?.historical_context ? (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {copy.labelContext}
                  </h3>
                  <p className="text-sm leading-relaxed [text-wrap:pretty]">
                    {intel.historical_context}
                  </p>
                </div>
              ) : null}
              {hasRelated ? (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {copy.cardRelatedQuotes}
                  </h3>
                  <ul className="space-y-2">
                    {intel.related_quotes.map((rq, index) => (
                      <li
                        key={index}
                        className="rounded-md border-l-2 border-primary/40 bg-muted/40 px-3 py-2 text-sm italic"
                      >
                        &ldquo;{rq.text}&rdquo;
                        {rq.source ? (
                          <span className="ml-1 text-xs not-italic text-muted-foreground">
                            — {rq.source}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          <details className="border-t border-border/60 pt-3">
            <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
              Danger area
            </summary>
            <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
                {copy.buttonDelete}
              </Button>
            </div>
          </details>
        </DialogContent>
      </Dialog>

      <ShareQuoteCardDialog
        open={shareOpen}
        quote={quote}
        onOpenChange={setShareOpen}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.deleteConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.buttonCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate(quote.id);
                setConfirmDelete(false);
                setOpenId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {copy.buttonDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DiagRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-medium text-foreground/70">{label}:</span>
      <span className="break-all text-[11px]">{value}</span>
    </div>
  );
}
