"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  VaultCategoryFilter,
  VaultSortKey,
  VaultViewMode,
} from "@/types/career-vault";

type PersistedSlice = {
  viewMode: VaultViewMode;
  sortBy: VaultSortKey;
};

type VaultUiState = PersistedSlice & {
  selectedCategory: VaultCategoryFilter;
  searchQuery: string;
  uploadOpen: boolean;
  deleteTargetId: string | null;

  setViewMode: (mode: VaultViewMode) => void;
  setSortBy: (sort: VaultSortKey) => void;
  setSelectedCategory: (category: VaultCategoryFilter) => void;
  setSearchQuery: (q: string) => void;
  openUpload: () => void;
  closeUpload: () => void;
  setDeleteTargetId: (id: string | null) => void;
};

export const useCareerVaultStore = create<VaultUiState>()(
  persist(
    (set) => ({
      viewMode: "grid",
      sortBy: "recent",
      selectedCategory: "all",
      searchQuery: "",
      uploadOpen: false,
      deleteTargetId: null,

      setViewMode: (viewMode) => set({ viewMode }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      openUpload: () => set({ uploadOpen: true }),
      closeUpload: () => set({ uploadOpen: false }),
      setDeleteTargetId: (deleteTargetId) => set({ deleteTargetId }),
    }),
    {
      name: "mylifeos-career-vault-ui",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : (undefined as unknown as Storage),
      ),
      partialize: (state): PersistedSlice => ({
        viewMode: state.viewMode,
        sortBy: state.sortBy,
      }),
    },
  ),
);
