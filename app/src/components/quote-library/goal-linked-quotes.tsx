"use client";

import { useMemo, useState } from "react";
import { Link2Off, Loader2, Quote as QuoteIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import {
  getQuoteCategoryLabel,
  getQuoteLibraryUiCopy,
} from "@/lib/i18n/quote-library-ui";
import {
  useLinkQuoteToGoal,
  useQuotesForGoal,
} from "@/hooks/use-quote-library-sdk";
import { useQuotes } from "@/hooks/use-quotes";
import type { Quote, QuoteCategory } from "@/types/quote";

interface GoalLinkedQuotesProps {
  goalId: string;
  className?: string;
}

export function GoalLinkedQuotes({ goalId, className }: GoalLinkedQuotesProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);

  const { data: linked, isLoading } = useQuotesForGoal(goalId);
  const link = useLinkQuoteToGoal();
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleUnlink = async (quoteId: string) => {
    try {
      await link.mutateAsync({ quoteId, goalId: null });
      toast.success(copy.unlinkedQuoteFromGoal);
    } catch {
      toast.error(copy.errorGeneric);
    }
  };

  return (
    <section
      className={cn("space-y-3", className)}
      aria-label={copy.goalLinkedQuotes}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <QuoteIcon className="size-4 text-muted-foreground" aria-hidden />
          <h4 className="text-sm font-medium">{copy.goalLinkedQuotes}</h4>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
        >
          {copy.goalLinkQuote}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {copy.loadingLibrary}
        </div>
      ) : (linked?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">
          {copy.goalLinkedQuotesEmpty}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {(linked ?? []).map((quote) => (
            <li
              key={quote.id}
              className="rounded-lg border border-border/60 bg-muted/15 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  {quote.category ? (
                    <Badge variant="secondary" className="font-normal">
                      {getQuoteCategoryLabel(
                        language,
                        quote.category as QuoteCategory,
                      )}
                    </Badge>
                  ) : null}
                  <blockquote className="font-serif text-sm leading-relaxed text-foreground/90 [text-wrap:pretty]">
                    &ldquo;{quote.quote_text}&rdquo;
                  </blockquote>
                  {quote.source_author ? (
                    <p className="text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">
                      {quote.source_author}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => void handleUnlink(quote.id)}
                  disabled={link.isPending}
                  aria-label={copy.unlinkQuoteFromGoal}
                >
                  <Link2Off className="size-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <GoalQuotePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        goalId={goalId}
      />
    </section>
  );
}

interface GoalQuotePickerDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  goalId: string;
}

function GoalQuotePickerDialog({
  open,
  onOpenChange,
  goalId,
}: GoalQuotePickerDialogProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const { data: quotes, isLoading } = useQuotes();
  const { data: linked } = useQuotesForGoal(goalId, open);
  const link = useLinkQuoteToGoal();

  const [query, setQuery] = useState("");

  const linkedIds = useMemo(
    () => new Set((linked ?? []).map((q) => q.id)),
    [linked],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = (quotes ?? []).filter((quote) => !linkedIds.has(quote.id));
    if (!q) return all.slice(0, 100);
    return all
      .filter((quote) => {
        const haystack = [
          quote.quote_text,
          quote.source_author ?? "",
          quote.source_context ?? "",
          (quote.tags ?? []).join(" "),
          quote.category ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 100);
  }, [quotes, query, linkedIds]);

  const handleLink = async (quote: Quote) => {
    try {
      await link.mutateAsync({ quoteId: quote.id, goalId });
      toast.success(copy.linkedQuoteToGoal);
      onOpenChange(false);
    } catch {
      toast.error(copy.errorGeneric);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[min(85vh,760px)] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{copy.goalPickerTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.goalPickerSearch}
            autoFocus
          />
          <ScrollArea className="h-[400px] pr-2">
            {isLoading ? (
              <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {copy.loadingLibrary}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {query.trim() ? copy.emptySearchTitle : copy.emptyAllTitle}
              </p>
            ) : (
              <ul className="space-y-2">
                {filtered.map((quote) => (
                  <li key={quote.id}>
                    <button
                      type="button"
                      onClick={() => void handleLink(quote)}
                      disabled={link.isPending}
                      className={cn(
                        "w-full rounded-lg border border-border/60 bg-background px-3 py-3 text-left transition-colors",
                        "hover:border-primary/40 hover:bg-muted/50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      )}
                    >
                      {quote.category ? (
                        <Badge
                          variant="secondary"
                          className="mb-1.5 font-normal"
                        >
                          {getQuoteCategoryLabel(
                            language,
                            quote.category as QuoteCategory,
                          )}
                        </Badge>
                      ) : null}
                      <blockquote className="font-serif text-sm leading-relaxed text-foreground/90 [text-wrap:pretty]">
                        &ldquo;
                        {quote.quote_text.length > 220
                          ? `${quote.quote_text.slice(0, 220)}…`
                          : quote.quote_text}
                        &rdquo;
                      </blockquote>
                      {quote.source_author ? (
                        <p className="mt-1 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">
                          {quote.source_author}
                        </p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.buttonCancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
