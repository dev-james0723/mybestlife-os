"use client";

import { useMemo } from "react";
import { Check, FolderHeart, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import {
  useAddQuoteToCollection,
  useQuoteCollectionItems,
  useQuoteCollections,
  useRemoveQuoteFromCollection,
} from "@/hooks/use-quote-collections";
import { cn } from "@/lib/utils";

interface Props {
  quoteId: string;
  triggerClassName?: string;
}

export function ManageCollectionsPopover({ quoteId, triggerClassName }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);

  const { data: collections } = useQuoteCollections();
  const { data: items } = useQuoteCollectionItems();
  const addToCollection = useAddQuoteToCollection();
  const removeFromCollection = useRemoveQuoteFromCollection();

  const memberOf = useMemo(() => {
    const set = new Set<string>();
    (items ?? []).forEach((item) => {
      if (item.quote_id === quoteId) set.add(item.collection_id);
    });
    return set;
  }, [items, quoteId]);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("gap-2", triggerClassName)}
          >
            <FolderPlus className="size-4" aria-hidden />
            {copy.collectionMembershipAdd}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-72 p-2">
        {(collections?.length ?? 0) === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            {copy.emptyCollectionsTitle}
          </p>
        ) : (
          <ul className="flex flex-col" role="listbox">
            {(collections ?? []).map((collection) => {
              const isMember = memberOf.has(collection.id);
              return (
                <li key={collection.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isMember) {
                        removeFromCollection.mutate({
                          collectionId: collection.id,
                          quoteId,
                        });
                      } else {
                        addToCollection.mutate({
                          collectionId: collection.id,
                          quoteId,
                        });
                      }
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                      "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                    )}
                    role="option"
                    aria-selected={isMember}
                  >
                    <FolderHeart
                      className="size-4 text-primary"
                      aria-hidden
                    />
                    <span className="flex-1 truncate">{collection.name}</span>
                    {isMember ? (
                      <Check className="size-4 text-primary" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
