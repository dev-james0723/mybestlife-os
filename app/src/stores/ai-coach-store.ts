"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CareerCoachCategoryFilter,
  CareerCoachTab,
} from "@/types/ai-coach";

type PersistedSlice = {
  lastTab: CareerCoachTab;
  lastCategory: CareerCoachCategoryFilter;
};

type UIState = PersistedSlice & {
  searchQuery: string;
  createCustomOpen: boolean;
  editingCustomId: string | null;

  setTab: (tab: CareerCoachTab) => void;
  setCategory: (c: CareerCoachCategoryFilter) => void;
  setSearchQuery: (q: string) => void;
  openCreateCustom: () => void;
  closeCreateCustom: () => void;
  startEditCustom: (id: string) => void;
  stopEditCustom: () => void;
};

export const useAICoachStore = create<UIState>()(
  persist(
    (set) => ({
      lastTab: "all",
      lastCategory: "all",
      searchQuery: "",
      createCustomOpen: false,
      editingCustomId: null,

      setTab: (lastTab) => set({ lastTab }),
      setCategory: (lastCategory) => set({ lastCategory }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      openCreateCustom: () =>
        set({ createCustomOpen: true, editingCustomId: null }),
      closeCreateCustom: () =>
        set({ createCustomOpen: false, editingCustomId: null }),
      startEditCustom: (id) =>
        set({ editingCustomId: id, createCustomOpen: true }),
      stopEditCustom: () => set({ editingCustomId: null }),
    }),
    {
      name: "mylifeos-ai-coach-ui",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : (undefined as unknown as Storage),
      ),
      partialize: (state): PersistedSlice => ({
        lastTab: state.lastTab,
        lastCategory: state.lastCategory,
      }),
    },
  ),
);
