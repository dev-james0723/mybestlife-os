import { create } from "zustand";

import {
  DEFAULT_BUCKET_FILTERS,
  type BucketFilters,
  type BucketSortKey,
  type BucketStatus,
  type BucketType,
} from "@/types/bucket-list";

export type BucketViewMode = "grid" | "list";

type BucketListStore = {
  // View
  viewMode: BucketViewMode;
  setViewMode: (mode: BucketViewMode) => void;

  // Sort + filter
  sortKey: BucketSortKey;
  setSortKey: (key: BucketSortKey) => void;

  filters: BucketFilters;
  setSearch: (search: string) => void;
  toggleType: (type: BucketType) => void;
  setTypes: (types: BucketType[]) => void;
  toggleStatus: (status: BucketStatus) => void;
  setStatuses: (statuses: BucketStatus[]) => void;
  setIncludeClosed: (include: boolean) => void;
  setFeaturedOnly: (featured: boolean) => void;
  clearFilters: () => void;

  // Detail + sheet flow
  selectedBucketId: string | null;
  setSelectedBucketId: (id: string | null) => void;

  addSheetOpen: boolean;
  openAddSheet: (preset?: Partial<{ type: BucketType; title: string }>) => void;
  closeAddSheet: () => void;

  addSheetPreset: Partial<{ type: BucketType; title: string }> | null;

  // AI dream capture wizard
  aiWizardOpen: boolean;
  openAiWizard: () => void;
  closeAiWizard: () => void;

  activateModalBucketId: string | null;
  openActivateModal: (bucketId: string) => void;
  closeActivateModal: () => void;

  reflectionSheetBucketId: string | null;
  openReflectionSheet: (bucketId: string) => void;
  closeReflectionSheet: () => void;
};

export const useBucketListStore = create<BucketListStore>((set, get) => ({
  viewMode: "grid",
  setViewMode: (mode) => set({ viewMode: mode }),

  sortKey: "created_desc",
  setSortKey: (key) => set({ sortKey: key }),

  filters: { ...DEFAULT_BUCKET_FILTERS },
  setSearch: (search) =>
    set((s) => ({ filters: { ...s.filters, search } })),
  toggleType: (type) =>
    set((s) => {
      const exists = s.filters.types.includes(type);
      return {
        filters: {
          ...s.filters,
          types: exists
            ? s.filters.types.filter((t) => t !== type)
            : [...s.filters.types, type],
        },
      };
    }),
  setTypes: (types) =>
    set((s) => ({ filters: { ...s.filters, types } })),
  toggleStatus: (status) =>
    set((s) => {
      const exists = s.filters.statuses.includes(status);
      return {
        filters: {
          ...s.filters,
          statuses: exists
            ? s.filters.statuses.filter((st) => st !== status)
            : [...s.filters.statuses, status],
        },
      };
    }),
  setStatuses: (statuses) =>
    set((s) => ({ filters: { ...s.filters, statuses } })),
  setIncludeClosed: (include) =>
    set((s) => ({ filters: { ...s.filters, includeClosed: include } })),
  setFeaturedOnly: (featured) =>
    set((s) => ({ filters: { ...s.filters, featuredOnly: featured } })),
  clearFilters: () => set({ filters: { ...DEFAULT_BUCKET_FILTERS } }),

  selectedBucketId: null,
  setSelectedBucketId: (id) => set({ selectedBucketId: id }),

  addSheetOpen: false,
  addSheetPreset: null,
  openAddSheet: (preset) =>
    set({ addSheetOpen: true, addSheetPreset: preset ?? null }),
  closeAddSheet: () =>
    set({ addSheetOpen: false, addSheetPreset: null }),

  aiWizardOpen: false,
  openAiWizard: () => set({ aiWizardOpen: true }),
  closeAiWizard: () => set({ aiWizardOpen: false }),

  activateModalBucketId: null,
  openActivateModal: (bucketId) => set({ activateModalBucketId: bucketId }),
  closeActivateModal: () => {
    // no-op safeguard if we were mid-saved
    void get();
    set({ activateModalBucketId: null });
  },

  reflectionSheetBucketId: null,
  openReflectionSheet: (bucketId) =>
    set({ reflectionSheetBucketId: bucketId }),
  closeReflectionSheet: () => set({ reflectionSheetBucketId: null }),
}));
