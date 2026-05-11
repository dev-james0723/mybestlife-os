"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Quote as QuoteIcon } from "lucide-react";
import { QuoteCard } from "./quote-card";
import { QuoteListSkeleton } from "./quote-card-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import {
  useDeleteQuote,
  useQuotes,
  useToggleFavoriteQuote,
} from "@/hooks/use-quotes";
import {
  useQuoteCollectionItems,
} from "@/hooks/use-quote-collections";
import { useQuoteLibraryStore } from "@/stores/quote-library-store";
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
  buildMembershipMap,
  filterQuotes,
  sortQuotes,
} from "@/lib/quote-library/filter";
import type { Quote } from "@/types/quote";

const VIRTUALIZE_THRESHOLD = 50;

interface QuoteListProps {
  quotes?: Quote[];
  /** Optional override: render an explicit custom empty state. */
  onAddQuote?: () => void;
}

export function QuoteList({ quotes: externalQuotes, onAddQuote }: QuoteListProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);

  const { data: fetchedQuotes, isLoading } = useQuotes();
  const { data: collectionItems } = useQuoteCollectionItems();
  const toggleFavorite = useToggleFavoriteQuote();
  const deleteQuote = useDeleteQuote();
  const openEditSheet = useQuoteLibraryStore((s) => s.openEditSheet);
  const openAddSheet = useQuoteLibraryStore((s) => s.openAddSheet);
  const setFilters = useQuoteLibraryStore((s) => s.setFilters);
  const setOpenQuoteId = useQuoteLibraryStore((s) => s.setOpenQuoteId);

  const filters = useQuoteLibraryStore((s) => s.filters);
  const sort = useQuoteLibraryStore((s) => s.sort);

  const quotes = useMemo<Quote[]>(
    () => externalQuotes ?? fetchedQuotes ?? [],
    [externalQuotes, fetchedQuotes],
  );

  const membership = useMemo(
    () => buildMembershipMap(collectionItems ?? []),
    [collectionItems],
  );

  const visibleQuotes = useMemo(
    () => sortQuotes(filterQuotes(quotes, filters, membership), sort),
    [quotes, filters, membership, sort],
  );

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDelete = useMemo(
    () => quotes.find((q) => q.id === pendingDeleteId) ?? null,
    [pendingDeleteId, quotes],
  );

  if (isLoading && !externalQuotes) {
    return <QuoteListSkeleton />;
  }

  const clearListSearchFilters = () => {
    setFilters({
      search: "",
      categories: [],
      tones: [],
      sourceModules: [],
      tags: [],
      favoritesOnly: false,
      dateRange: { from: null, to: null },
    });
  };

  if (quotes.length === 0) {
    return (
      <EmptyState
        icon={QuoteIcon}
        title={copy.emptyAllTitle}
        description={copy.emptyAllDescription}
        action={
          onAddQuote
            ? { label: copy.emptyAllAction, onClick: onAddQuote }
            : undefined
        }
      />
    );
  }

  if (visibleQuotes.length === 0) {
    return (
      <EmptyState
        icon={QuoteIcon}
        title={copy.emptySearchTitle}
        description={copy.emptySearchDescription}
        action={{
          label: copy.addQuote,
          onClick: openAddSheet,
        }}
        secondaryAction={{
          label: copy.filterClear,
          onClick: clearListSearchFilters,
          variant: "outline",
          showPlus: false,
        }}
      />
    );
  }

  const handleFavoriteToggle = (id: string, next: boolean) => {
    toggleFavorite.mutate({ id, favorite: next });
  };

  return (
    <>
      {visibleQuotes.length > VIRTUALIZE_THRESHOLD ? (
        <VirtualQuoteList
          quotes={visibleQuotes}
          onFavoriteToggle={handleFavoriteToggle}
          onOpen={(id) => setOpenQuoteId(id)}
          onEdit={openEditSheet}
          onDelete={(id) => setPendingDeleteId(id)}
        />
      ) : (
        <AnimatedQuoteList
          quotes={visibleQuotes}
          onFavoriteToggle={handleFavoriteToggle}
          onOpen={(id) => setOpenQuoteId(id)}
          onEdit={openEditSheet}
          onDelete={(id) => setPendingDeleteId(id)}
        />
      )}

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.deleteConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingDelete ? (
            <p className="text-sm text-muted-foreground italic [text-wrap:balance]">
              &ldquo;{pendingDelete.quote_text.slice(0, 180)}
              {pendingDelete.quote_text.length > 180 ? "…" : ""}&rdquo;
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.buttonCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId) {
                  deleteQuote.mutate(pendingDeleteId);
                  setPendingDeleteId(null);
                }
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

function AnimatedQuoteList({
  quotes,
  onFavoriteToggle,
  onOpen,
  onEdit,
  onDelete,
}: {
  quotes: Quote[];
  onFavoriteToggle: (id: string, next: boolean) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {quotes.map((q) => (
          <motion.div
            key={q.id}
            layout={!prefersReducedMotion}
            initial={
              prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <QuoteCard
              quote={q}
              onFavoriteToggle={(next) => onFavoriteToggle(q.id, next)}
              onOpen={() => onOpen(q.id)}
              onEdit={() => onEdit(q.id)}
              onDelete={() => onDelete(q.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function VirtualQuoteList({
  quotes,
  onFavoriteToggle,
  onOpen,
  onEdit,
  onDelete,
}: {
  quotes: Quote[];
  onFavoriteToggle: (id: string, next: boolean) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: quotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 220,
    overscan: 6,
  });

  return (
    <div
      ref={parentRef}
      className="relative h-[70vh] overflow-auto rounded-xl border border-border bg-background/30"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const quote = quotes[virtualRow.index];
          return (
            <div
              key={quote.id}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute left-0 top-0 w-full px-2"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="py-1.5">
                <QuoteCard
                  quote={quote}
                  onFavoriteToggle={(next) => onFavoriteToggle(quote.id, next)}
                  onOpen={() => onOpen(quote.id)}
                  onEdit={() => onEdit(quote.id)}
                  onDelete={() => onDelete(quote.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
