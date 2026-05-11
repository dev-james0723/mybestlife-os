/**
 * Quote Library — UI state store.
 *
 * Holds ephemeral UI state only (tab selection, filter form, the currently
 * open detail/edit sheets). Persistent data flows through React Query
 * (`hooks/use-quotes.ts`) — this store never owns `quotes[]` directly.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_QUOTE_FILTERS,
  type QuoteFilters,
  type QuoteSortKey,
} from "@/types/quote";

export type QuoteLibraryTab = "all" | "collections" | "wisdom";

type QuoteLibraryState = {
  tab: QuoteLibraryTab;
  setTab: (tab: QuoteLibraryTab) => void;

  filters: QuoteFilters;
  setFilters: (filters: Partial<QuoteFilters>) => void;
  resetFilters: () => void;

  sort: QuoteSortKey;
  setSort: (sort: QuoteSortKey) => void;

  /** Which quote (if any) is currently open in the detail view. */
  openQuoteId: string | null;
  setOpenQuoteId: (id: string | null) => void;

  /** Add/edit sheet state. `editingId === null` means we're adding a new one. */
  isAddSheetOpen: boolean;
  editingId: string | null;
  openAddSheet: () => void;
  openEditSheet: (id: string) => void;
  closeSheet: () => void;

  /** Whether to show the AI-enriched badge on cards (user preference). */
  showAiBadge: boolean;
  setShowAiBadge: (next: boolean) => void;
};

const STORAGE_KEY = "mylifeos-quote-library-store";

export const useQuoteLibraryStore = create<QuoteLibraryState>()(
  persist(
    (set) => ({
      tab: "all",
      setTab: (tab) => set({ tab }),

      filters: DEFAULT_QUOTE_FILTERS,
      setFilters: (patch) =>
        set((state) => ({ filters: { ...state.filters, ...patch } })),
      resetFilters: () => set({ filters: DEFAULT_QUOTE_FILTERS }),

      sort: "created_at_desc",
      setSort: (sort) => set({ sort }),

      openQuoteId: null,
      setOpenQuoteId: (id) => set({ openQuoteId: id }),

      isAddSheetOpen: false,
      editingId: null,
      openAddSheet: () => set({ isAddSheetOpen: true, editingId: null }),
      openEditSheet: (id) => set({ isAddSheetOpen: true, editingId: id }),
      closeSheet: () => set({ isAddSheetOpen: false, editingId: null }),

      showAiBadge: true,
      setShowAiBadge: (next) => set({ showAiBadge: next }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        tab: state.tab,
        sort: state.sort,
        showAiBadge: state.showAiBadge,
      }),
    },
  ),
);
