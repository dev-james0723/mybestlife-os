"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { quotesRepository } from "@/lib/repositories/quotes";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import { useAppStore } from "@/stores/app-store";
import type { CreateQuoteInput, Quote, UpdateQuoteInput } from "@/types/quote";

const LIST_KEY = ["quotes"] as const;

export function useQuotes() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: quotesRepository.list,
    staleTime: 30_000,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuoteInput) => quotesRepository.create(input),
    onSuccess: (created) => {
      queryClient.setQueryData<Quote[]>(LIST_KEY, (prev) =>
        prev ? [created, ...prev.filter((q) => q.id !== created.id)] : [created],
      );
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.success(copy.toastSaved);

      // Fire Smart Tagging in the background if the user didn't already set
      // a category + tags. Intentionally non-blocking: if the AI call fails
      // the quote still saved. `useSmartTaggingMutation` surfaces its own
      // toasts, so we don't handle UI here.
      const needsTagging =
        !created.category || created.tags.length === 0 || !created.emotion_tone;
      if (needsTagging) {
        void fetch("/api/quote-library/smart-tagging", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quote_id: created.id,
            quote_text: created.quote_text,
            source_author: created.source_author,
            source_context: created.source_context,
            language: useAppStore.getState().language,
          }),
        })
          .then(async (res) => {
            if (!res.ok) return;
            const data = (await res.json().catch(() => null)) as {
              quote?: Quote;
            } | null;
            if (data?.quote) {
              queryClient.setQueryData<Quote[]>(LIST_KEY, (prev) =>
                prev
                  ? prev.map((q) => (q.id === data.quote!.id ? data.quote! : q))
                  : prev,
              );
            }
          })
          .catch(() => {
            /* non-blocking; user already has the quote */
          });
      }

      // Cinematic thumbnail generation is fire-and-forget too. The server
      // route handles its own state machine (`pending` → `generating` →
      // `completed` / `failed` / `fallback`), so we only need to refresh the
      // local cache once the pipeline returns. UX-wise the card shows a
      // mood-matched fallback gradient until the real image arrives.
      void fetch("/api/quote-library/generate-quote-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: created.id }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json().catch(() => null)) as {
            quote?: Quote;
          } | null;
          if (data?.quote) {
            queryClient.setQueryData<Quote[]>(LIST_KEY, (prev) =>
              prev
                ? prev.map((q) => (q.id === data.quote!.id ? data.quote! : q))
                : prev,
            );
          }
        })
        .catch(() => {
          /* non-fatal — fallback gradient already covers the card */
        });

      // Source Intelligence is also fire-and-forget when author is present.
      if (created.source_author && !created.source_intelligence) {
        void fetch("/api/quote-library/source-intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quote_id: created.id }),
        })
          .then(async (res) => {
            if (!res.ok) return;
            const data = (await res.json().catch(() => null)) as {
              quote?: Quote;
            } | null;
            if (data?.quote) {
              queryClient.setQueryData<Quote[]>(LIST_KEY, (prev) =>
                prev
                  ? prev.map((q) => (q.id === data.quote!.id ? data.quote! : q))
                  : prev,
              );
            }
          })
          .catch(() => {
            /* enrichment failure is non-fatal */
          });
      }
    },
    onError: () => {
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.error(copy.toastSaveFailed);
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuoteInput }) =>
      quotesRepository.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: LIST_KEY });
      const previous = queryClient.getQueryData<Quote[]>(LIST_KEY);
      if (previous) {
        queryClient.setQueryData<Quote[]>(
          LIST_KEY,
          previous.map((q) => (q.id === id ? { ...q, ...data } : q)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(LIST_KEY, context.previous);
      }
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.error(copy.toastUpdateFailed);
    },
    onSuccess: (updated, variables) => {
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.success(copy.toastUpdated);

      // If a generation-relevant field changed (text, author, tags, category),
      // regenerate the thumbnail so the background continues to match the
      // quote. Best-effort: server runs the pipeline async and updates the
      // row when ready.
      const regenFields: Array<keyof typeof variables.data> = [
        "quote_text",
        "source_author",
        "tags",
        "category",
        "emotion_tone",
      ];
      const shouldRegen = regenFields.some((k) => k in variables.data);
      if (shouldRegen) {
        void fetch("/api/quote-library/regenerate-quote-thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quote_id: updated.id }),
        })
          .then(async (res) => {
            if (!res.ok) return;
            const data = (await res.json().catch(() => null)) as {
              quote?: Quote;
            } | null;
            if (data?.quote) {
              queryClient.setQueryData<Quote[]>(LIST_KEY, (prev) =>
                prev
                  ? prev.map((q) => (q.id === data.quote!.id ? data.quote! : q))
                  : prev,
              );
            }
          })
          .catch(() => {
            /* non-fatal — old thumbnail still sits on the card */
          });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

/**
 * Manual "Regenerate thumbnail" action wired into the quote detail dialog.
 * Optimistically flips `thumbnail_status` to `generating` so the UI can show
 * the shimmer state immediately.
 */
export function useRegenerateQuoteThumbnail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const res = await fetch(
        "/api/quote-library/regenerate-quote-thumbnail",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quote_id: quoteId }),
        },
      );
      // The route always returns 200 once auth passes (even on logical
      // failure it returns 200 with `ok: false`). Treat real HTTP errors
      // as exceptional, but otherwise pass through so onSuccess can show
      // the right toast based on the resulting `thumbnail_status`.
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `http_${res.status}`);
      }
      return (await res.json()) as {
        ok: boolean;
        quote?: Quote;
        error?: string;
      };
    },
    onMutate: async (quoteId) => {
      await queryClient.cancelQueries({ queryKey: LIST_KEY });
      const previous = queryClient.getQueryData<Quote[]>(LIST_KEY);
      if (previous) {
        queryClient.setQueryData<Quote[]>(
          LIST_KEY,
          previous.map((q) =>
            q.id === quoteId
              ? { ...q, thumbnail_status: "generating", thumbnail_error: null }
              : q,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(LIST_KEY, context.previous);
      }
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.error(copy.toastThumbnailRegenerateFailed);
    },
    onSuccess: (data) => {
      if (data.quote) {
        queryClient.setQueryData<Quote[]>(LIST_KEY, (prev) =>
          prev ? prev.map((q) => (q.id === data.quote!.id ? data.quote! : q)) : prev,
        );
      }
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      const status = data.quote?.thumbnail_status;
      if (status === "completed") {
        toast.success(copy.toastThumbnailReady);
      } else if (status === "fallback" || status === "failed") {
        toast.message(copy.toastThumbnailFallback);
      } else {
        toast.message(copy.toastThumbnailRegenerating);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quotesRepository.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: LIST_KEY });
      const previous = queryClient.getQueryData<Quote[]>(LIST_KEY);
      if (previous) {
        queryClient.setQueryData<Quote[]>(
          LIST_KEY,
          previous.filter((q) => q.id !== id),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(LIST_KEY, context.previous);
      }
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.error(copy.toastDeleteFailed);
    },
    onSuccess: () => {
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.success(copy.toastDeleted);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useToggleFavoriteQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      quotesRepository.setFavorite(id, favorite),
    onMutate: async ({ id, favorite }) => {
      await queryClient.cancelQueries({ queryKey: LIST_KEY });
      const previous = queryClient.getQueryData<Quote[]>(LIST_KEY);
      if (previous) {
        queryClient.setQueryData<Quote[]>(
          LIST_KEY,
          previous.map((q) =>
            q.id === id ? { ...q, is_favorite: favorite } : q,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(LIST_KEY, context.previous);
      }
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.error(copy.toastFavoriteFailed);
    },
    onSuccess: (_data, variables) => {
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.success(
        variables.favorite ? copy.toastFavorited : copy.toastUnfavorited,
        { duration: 1800 },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useClearSeedQuotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => quotesRepository.clearSeeds(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
