"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { quoteCollectionsRepository } from "@/lib/repositories/quotes";
import type { QuoteCollection, QuoteCollectionItem } from "@/types/quote";

const COLLECTIONS_KEY = ["quote-collections"] as const;
const ITEMS_KEY = ["quote-collection-items"] as const;

export function useQuoteCollections() {
  return useQuery({
    queryKey: COLLECTIONS_KEY,
    queryFn: quoteCollectionsRepository.list,
    staleTime: 60_000,
  });
}

export function useQuoteCollectionItems() {
  return useQuery({
    queryKey: ITEMS_KEY,
    queryFn: quoteCollectionsRepository.listItems,
    staleTime: 60_000,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      description?: string | null;
      color?: string | null;
      icon?: string | null;
    }) => quoteCollectionsRepository.create(input),
    onSuccess: (created) => {
      queryClient.setQueryData<QuoteCollection[]>(COLLECTIONS_KEY, (prev) =>
        prev ? [created, ...prev] : [created],
      );
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_KEY });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        name: string;
        description: string | null;
        color: string | null;
        icon: string | null;
      }>;
    }) => quoteCollectionsRepository.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<QuoteCollection[]>(COLLECTIONS_KEY, (prev) =>
        prev ? prev.map((c) => (c.id === updated.id ? updated : c)) : prev,
      );
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quoteCollectionsRepository.delete(id),
    onSuccess: (_void, id) => {
      queryClient.setQueryData<QuoteCollection[]>(COLLECTIONS_KEY, (prev) =>
        prev ? prev.filter((c) => c.id !== id) : prev,
      );
      queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
    },
  });
}

export function useAddQuoteToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, quoteId }: { collectionId: string; quoteId: string }) =>
      quoteCollectionsRepository.addQuoteToCollection(collectionId, quoteId),
    onSuccess: (created) => {
      queryClient.setQueryData<QuoteCollectionItem[]>(ITEMS_KEY, (prev) =>
        prev ? [created, ...prev] : [created],
      );
    },
  });
}

export function useRemoveQuoteFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, quoteId }: { collectionId: string; quoteId: string }) =>
      quoteCollectionsRepository.removeQuoteFromCollection(collectionId, quoteId),
    onSuccess: (_void, vars) => {
      queryClient.setQueryData<QuoteCollectionItem[]>(ITEMS_KEY, (prev) =>
        prev
          ? prev.filter(
              (item) =>
                !(item.collection_id === vars.collectionId && item.quote_id === vars.quoteId),
            )
          : prev,
      );
    },
  });
}
