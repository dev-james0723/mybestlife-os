"use client";

import { useMemo, useState } from "react";
import {
  FolderHeart,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
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
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import {
  useDeleteCollection,
  useQuoteCollectionItems,
  useQuoteCollections,
} from "@/hooks/use-quote-collections";
import { useQuotes } from "@/hooks/use-quotes";
import { useQuoteLibraryStore } from "@/stores/quote-library-store";
import { CollectionDialog } from "./collection-dialog";
import { QuoteList } from "./quote-list";
import { cn } from "@/lib/utils";
import type { QuoteCollection } from "@/types/quote";

export function CollectionsTab() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);

  const { data: collections, isLoading } = useQuoteCollections();
  const { data: collectionItems } = useQuoteCollectionItems();
  const { data: quotes } = useQuotes();
  const deleteCollection = useDeleteCollection();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QuoteCollection | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QuoteCollection | null>(
    null,
  );

  const filters = useQuoteLibraryStore((s) => s.filters);
  const setFilters = useQuoteLibraryStore((s) => s.setFilters);
  const openAddSheet = useQuoteLibraryStore((s) => s.openAddSheet);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    (collectionItems ?? []).forEach((item) => {
      map.set(item.collection_id, (map.get(item.collection_id) ?? 0) + 1);
    });
    return map;
  }, [collectionItems]);

  const selectedCollection = useMemo(
    () =>
      collections?.find((c) => c.id === filters.collectionId) ?? null,
    [collections, filters.collectionId],
  );

  const selectedQuotes = useMemo(() => {
    if (!filters.collectionId || !quotes || !collectionItems) return [];
    const ids = new Set(
      collectionItems
        .filter((i) => i.collection_id === filters.collectionId)
        .map((i) => i.quote_id),
    );
    return quotes.filter((q) => ids.has(q.id));
  }, [filters.collectionId, quotes, collectionItems]);

  if (selectedCollection) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({ collectionId: null })}
          >
            ← {copy.tabCollections}
          </Button>
          <h2 className="text-lg font-semibold">{selectedCollection.name}</h2>
          <span className="text-sm text-muted-foreground">
            {copy.collectionMemberCount(counts.get(selectedCollection.id) ?? 0)}
          </span>
          <div className="ml-auto flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditing(selectedCollection);
                setDialogOpen(true);
              }}
              aria-label={copy.collectionRename}
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPendingDelete(selectedCollection)}
              aria-label={copy.collectionDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
        {selectedCollection.description ? (
          <p className="text-sm text-muted-foreground [text-wrap:balance]">
            {selectedCollection.description}
          </p>
        ) : null}

        {selectedQuotes.length === 0 ? (
          <EmptyState
            icon={FolderHeart}
            title={copy.collectionEmptyTitle}
            description={copy.collectionEmptyDescription}
            action={{
              label: copy.addQuote,
              onClick: openAddSheet,
            }}
          />
        ) : (
          <QuoteList quotes={selectedQuotes} />
        )}

        <CollectionDialog
          open={dialogOpen}
          onOpenChange={(next) => {
            if (!next) setEditing(null);
            setDialogOpen(next);
          }}
          editing={editing}
        />

        <AlertDialog
          open={pendingDelete !== null}
          onOpenChange={(next) => {
            if (!next) setPendingDelete(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{copy.collectionDelete}?</AlertDialogTitle>
              <AlertDialogDescription>
                {copy.deleteConfirmDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{copy.buttonCancel}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  if (!pendingDelete) return;
                  try {
                    await deleteCollection.mutateAsync(pendingDelete.id);
                    toast.success(copy.toastDeleted);
                    setPendingDelete(null);
                    setFilters({ collectionId: null });
                  } catch {
                    toast.error(copy.toastDeleteFailed);
                  }
                }}
              >
                {copy.buttonDelete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{copy.collectionsHeading}</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1.5 size-4" aria-hidden />
          {copy.newCollection}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{copy.loadingLibrary}</p>
      ) : (collections?.length ?? 0) === 0 ? (
        <EmptyState
          icon={FolderHeart}
          title={copy.emptyCollectionsTitle}
          description={copy.emptyCollectionsDescription}
          action={{
            label: copy.emptyCollectionsAction,
            onClick: () => setDialogOpen(true),
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(collections ?? []).map((c) => (
            <Card
              key={c.id}
              onClick={() => setFilters({ collectionId: c.id })}
              className={cn(
                "cursor-pointer transition-shadow hover:shadow-md",
              )}
            >
              <CardContent className="flex items-start justify-between gap-3 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FolderHeart className="size-5" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-medium">{c.name}</h3>
                    {c.description ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground [text-wrap:balance]">
                        {c.description}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {copy.collectionMemberCount(counts.get(c.id) ?? 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CollectionDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
          setDialogOpen(next);
        }}
        editing={editing}
      />
    </div>
  );
}
