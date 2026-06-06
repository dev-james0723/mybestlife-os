import { create } from "zustand";
import type {
  KnowledgeItem,
  SmartCollection,
  ContentType,
} from "@/types/knowledge";
import type { KnowledgeCategory } from "@/types/knowledge-source";
import type {
  ConstellationClusterBy,
  ConstellationDepth,
  ConstellationFilters,
  ConstellationGraphMode,
} from "@/types/constellation";
import { DEFAULT_FILTERS } from "@/lib/knowledge/constellation/constants";

/**
 * Quick filter pills shown at the top of the filter bar. They are
 * orthogonal to the per-content-type and per-category filters and apply
 * additional predicates on top.
 */
export type KnowledgeQuickFilter =
  | "recent"
  | "social"
  | "github"
  | "hasMedia"
  | "hasSource"
  | "aiGenerated"
  | "needsReview";

/** Global list sort; `relevance` uses search text when non-empty, else latest. */
export type KnowledgeSortKey =
  | "latest"
  | "updated"
  | "titleAZ"
  | "contentType"
  | "relevance"
  | "linked"
  | "sourceDate";

export type KnowledgeView = "gallery" | "board" | "table" | "constellation";

interface KnowledgeStore {
  items: KnowledgeItem[];
  smartCollections: SmartCollection[];
  currentView: KnowledgeView;
  boardGroupBy: "type" | "collection" | "tag";
  activeTypeFilters: ContentType[];
  activeCategoryFilters: KnowledgeCategory[];
  activeQuickFilters: KnowledgeQuickFilter[];
  /** When set, main list shows only items in this smart collection. */
  activeSmartCollectionId: string | null;
  /**
   * Active tag-taxonomy node. May be a canonical tag id (e.g. `ai-agents`),
   * a top-level category id (e.g. `technology`), or an `__other__:slug` id
   * for unmapped tag buckets. `null` ⇒ no tag filter.
   */
  activeTagId: string | null;
  searchQuery: string;
  selectedItemId: string | null;
  isAIPanelOpen: boolean;
  isAddModalOpen: boolean;
  isMobileSidebarOpen: boolean;
  aiPanelQuery: string;
  aiPanelRetrievalRunId: string | null;
  sortBy: KnowledgeSortKey;

  // ── Constellation View state (Phase 7+) ───────────────────────────
  constellationMode: ConstellationGraphMode;
  constellationDepth: ConstellationDepth;
  constellationSelectedNodeId: string | null;
  constellationSearch: string;
  constellationShowLabels: boolean;
  constellationFilters: ConstellationFilters;
  constellationFiltersOpen: boolean;
  constellationLegendOpen: boolean;
  /**
   * Right-side details / inspection panel visibility.
   * Closed by default so the graph viewport gets maximum space; opens
   * automatically when the user selects a node, dismissable any time.
   */
  constellationInspectorOpen: boolean;
  /** 3D Sphere Mode — how to group nodes into colored regions. */
  constellationClusterBy: ConstellationClusterBy;

  hydrate: (items: KnowledgeItem[], collections: SmartCollection[]) => void;
  upsertItem: (item: KnowledgeItem) => void;
  removeItem: (id: string) => void;
  setItems: (items: KnowledgeItem[]) => void;
  setCollections: (collections: SmartCollection[]) => void;
  setView: (view: KnowledgeView) => void;
  setBoardGroupBy: (groupBy: "type" | "collection" | "tag") => void;
  toggleTypeFilter: (type: ContentType) => void;
  clearTypeFilters: () => void;
  toggleCategoryFilter: (category: KnowledgeCategory) => void;
  clearCategoryFilters: () => void;
  toggleQuickFilter: (filter: KnowledgeQuickFilter) => void;
  clearQuickFilters: () => void;
  setActiveSmartCollectionId: (id: string | null) => void;
  setActiveTagId: (id: string | null) => void;
  clearTagFilter: () => void;
  setSearchQuery: (q: string) => void;
  setSortBy: (sort: KnowledgeSortKey) => void;
  /** Clears search, types, categories, quick filters, collection, and tag filter. */
  clearAllListFilters: () => void;
  openAIPanel: (query?: string, retrievalRunId?: string | null) => void;
  closeAIPanel: () => void;
  openAddModal: () => void;
  closeAddModal: () => void;
  selectItem: (id: string | null) => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;

  // ── Constellation actions ────────────────────────────────────────
  setConstellationMode: (mode: ConstellationGraphMode) => void;
  setConstellationDepth: (depth: ConstellationDepth) => void;
  setConstellationSelectedNodeId: (id: string | null) => void;
  setConstellationSearch: (q: string) => void;
  setConstellationShowLabels: (show: boolean) => void;
  setConstellationFilters: (
    update:
      | Partial<ConstellationFilters>
      | ((prev: ConstellationFilters) => ConstellationFilters),
  ) => void;
  resetConstellationFilters: () => void;
  setConstellationFiltersOpen: (open: boolean) => void;
  setConstellationLegendOpen: (open: boolean) => void;
  setConstellationInspectorOpen: (open: boolean) => void;
  setConstellationClusterBy: (clusterBy: ConstellationClusterBy) => void;
}

export const useKnowledgeStore = create<KnowledgeStore>()((set) => ({
  items: [],
  smartCollections: [],
  currentView: "gallery",
  boardGroupBy: "type",
  activeTypeFilters: [],
  activeCategoryFilters: [],
  activeQuickFilters: [],
  activeSmartCollectionId: null,
  activeTagId: null,
  searchQuery: "",
  selectedItemId: null,
  isAIPanelOpen: false,
  isAddModalOpen: false,
  isMobileSidebarOpen: false,
  aiPanelQuery: "",
  aiPanelRetrievalRunId: null,
  sortBy: "latest",

  constellationMode: "global",
  constellationDepth: 1,
  constellationSelectedNodeId: null,
  constellationSearch: "",
  constellationShowLabels: false,
  constellationFilters: { ...DEFAULT_FILTERS },
  constellationFiltersOpen: false,
  constellationLegendOpen: false,
  constellationInspectorOpen: false,
  constellationClusterBy: "category",

  hydrate: (items, collections) => set({ items, smartCollections: collections }),

  upsertItem: (item) =>
    set((state) => {
      const idx = state.items.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...state.items];
        next[idx] = item;
        return { items: next };
      }
      return { items: [item, ...state.items] };
    }),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  setItems: (items) => set({ items }),
  setCollections: (collections) => set({ smartCollections: collections }),

  setView: (view) => set({ currentView: view }),
  setBoardGroupBy: (groupBy) => set({ boardGroupBy: groupBy }),

  toggleTypeFilter: (type) =>
    set((state) => {
      const filters = state.activeTypeFilters.includes(type)
        ? state.activeTypeFilters.filter((t) => t !== type)
        : [...state.activeTypeFilters, type];
      return { activeTypeFilters: filters };
    }),

  clearTypeFilters: () => set({ activeTypeFilters: [] }),

  toggleCategoryFilter: (category) =>
    set((state) => {
      const filters = state.activeCategoryFilters.includes(category)
        ? state.activeCategoryFilters.filter((t) => t !== category)
        : [...state.activeCategoryFilters, category];
      return { activeCategoryFilters: filters };
    }),

  clearCategoryFilters: () => set({ activeCategoryFilters: [] }),

  toggleQuickFilter: (filter) =>
    set((state) => {
      const filters = state.activeQuickFilters.includes(filter)
        ? state.activeQuickFilters.filter((f) => f !== filter)
        : [...state.activeQuickFilters, filter];
      return { activeQuickFilters: filters };
    }),

  clearQuickFilters: () => set({ activeQuickFilters: [] }),

  setActiveSmartCollectionId: (id) => set({ activeSmartCollectionId: id }),

  setActiveTagId: (id) => set({ activeTagId: id }),
  clearTagFilter: () => set({ activeTagId: null }),

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSortBy: (sort) => set({ sortBy: sort }),

  clearAllListFilters: () =>
    set({
      searchQuery: "",
      activeTypeFilters: [],
      activeCategoryFilters: [],
      activeQuickFilters: [],
      activeSmartCollectionId: null,
      activeTagId: null,
    }),

  openAIPanel: (query, retrievalRunId) =>
    set({
      isAIPanelOpen: true,
      aiPanelQuery: query ?? "",
      aiPanelRetrievalRunId: retrievalRunId ?? null,
    }),
  closeAIPanel: () => set({ isAIPanelOpen: false }),

  openAddModal: () => set({ isAddModalOpen: true }),
  closeAddModal: () => set({ isAddModalOpen: false }),

  selectItem: (id) => set({ selectedItemId: id }),

  toggleMobileSidebar: () =>
    set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),

  setConstellationMode: (mode) => set({ constellationMode: mode }),
  setConstellationDepth: (depth) => set({ constellationDepth: depth }),
  setConstellationSelectedNodeId: (id) =>
    set({ constellationSelectedNodeId: id }),
  setConstellationSearch: (q) => set({ constellationSearch: q }),
  setConstellationShowLabels: (show) => set({ constellationShowLabels: show }),
  setConstellationFilters: (update) =>
    set((state) => ({
      constellationFilters:
        typeof update === "function"
          ? update(state.constellationFilters)
          : { ...state.constellationFilters, ...update },
    })),
  resetConstellationFilters: () =>
    set({ constellationFilters: { ...DEFAULT_FILTERS } }),
  setConstellationFiltersOpen: (open) =>
    set({ constellationFiltersOpen: open }),
  setConstellationLegendOpen: (open) => set({ constellationLegendOpen: open }),
  setConstellationInspectorOpen: (open) =>
    set({ constellationInspectorOpen: open }),
  setConstellationClusterBy: (clusterBy) =>
    set({ constellationClusterBy: clusterBy }),
}));
