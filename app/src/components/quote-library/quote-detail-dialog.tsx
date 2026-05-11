"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
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

  if (!quote) return null;

  const intel = quote.source_intelligence;
  const hasAbout = Boolean(
    intel && (intel.author_bio || intel.historical_context),
  );
  const hasRelated =
    intel && intel.related_quotes && intel.related_quotes.length > 0;

  return (
    <>
      <Dialog
        open={openId !== null}
        onOpenChange={(next) => {
          if (!next) setOpenId(null);
        }}
      >
        <DialogContent
          size="2xl"
          className="max-h-[min(90vh,860px)] overflow-y-auto"
        >
          <DialogHeader className="pr-10">
            <DialogTitle className="sr-only">{copy.cardOpenAria}</DialogTitle>
          </DialogHeader>

          <QuoteCard
            quote={quote}
            variant="expanded"
            onFavoriteToggle={(next) =>
              toggleFavorite.mutate({ id: quote.id, favorite: next })
            }
            className="border-none bg-transparent shadow-none ring-0"
          />

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
            <ManageCollectionsPopover quoteId={quote.id} />
            <QuoteGoalPicker
              quoteId={quote.id}
              currentGoalId={quote.linked_goal_id}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                openEditSheet(quote.id);
                setOpenId(null);
              }}
            >
              <Pencil className="mr-1.5 size-4" aria-hidden />
              {copy.cardEditAria}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1.5 size-4" aria-hidden />
              {copy.buttonDelete}
            </Button>
            {quote.source_author && !quote.source_intelligence ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  enrichMutation.mutate({ quote_id: quote.id })
                }
                disabled={enrichMutation.isPending}
              >
                <Sparkles className="mr-1.5 size-4" aria-hidden />
                {copy.cardAboutAuthor}
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="mr-1.5 size-4" aria-hidden />
              {copy.shareAsImage}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerateThumbnail.mutate(quote.id)}
              disabled={
                regenerateThumbnail.isPending ||
                quote.thumbnail_status === "generating"
              }
              title={copy.thumbnailRegenerate}
            >
              <RefreshCcw
                className={cn(
                  "mr-1.5 size-4",
                  (regenerateThumbnail.isPending ||
                    quote.thumbnail_status === "generating") &&
                    "animate-spin",
                )}
                aria-hidden
              />
              {regenerateThumbnail.isPending ||
              quote.thumbnail_status === "generating"
                ? copy.thumbnailRegenerating
                : copy.thumbnailRegenerate}
            </Button>
            {quote.source_url ? (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto gap-1.5 text-muted-foreground"
                render={
                  <a
                    href={quote.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ExternalLink className="size-4" aria-hidden />
                {copy.labelUrl}
              </Button>
            ) : null}
          </div>

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

          {hasAbout || hasRelated ? (
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger
                render={
                  <button
                    type="button"
                    className="group flex w-full items-center justify-between gap-2 rounded-lg bg-muted/50 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <span>{copy.cardAboutAuthor}</span>
                    <ChevronDown
                      className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                      aria-hidden
                    />
                  </button>
                }
              />
              <CollapsibleContent className="mt-3 space-y-4 rounded-lg border border-border/50 bg-background px-4 py-4">
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
              </CollapsibleContent>
            </Collapsible>
          ) : null}
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
