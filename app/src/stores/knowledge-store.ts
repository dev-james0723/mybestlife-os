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
import {
  cleanActiveKnowledgeQuickFilterIds,
  getDefaultKnowledgeQuickFilters,
  type KnowledgeQuickFilterDefinition,
} from "@/lib/knowledge/quick-filters";

export type KnowledgeQuickFilterId = string;

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

export type PendingKnowledgeAdd =
  | { tab: "file"; files: File[] }
  | { tab: "url"; url: string }
  | { tab: "text"; text: string };

type OpenAIPanelOptions = {
  handoff?: boolean;
};

export const KNOWLEDGE_CARDS_PER_PAGE_OPTIONS = [
  10,
  15,
  20,
  25,
  30,
  50,
  60,
  100,
  500,
] as const;
export const DEFAULT_KNOWLEDGE_CARDS_PER_PAGE = 500;
export const MIN_KNOWLEDGE_CARDS_PER_PAGE = 1;
export const MAX_KNOWLEDGE_CARDS_PER_PAGE = 500;

export function normalizeKnowledgeCardsPerPage(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_KNOWLEDGE_CARDS_PER_PAGE;
  return Math.min(
    MAX_KNOWLEDGE_CARDS_PER_PAGE,
    Math.max(MIN_KNOWLEDGE_CARDS_PER_PAGE, Math.round(value)),
  );
}

export function isKnowledgeCardsPerPagePreset(value: number): boolean {
  return KNOWLEDGE_CARDS_PER_PAGE_OPTIONS.includes(
    value as (typeof KNOWLEDGE_CARDS_PER_PAGE_OPTIONS)[number],
  );
}

interface KnowledgeStore {
  items: KnowledgeItem[];
  smartCollections: SmartCollection[];
  currentView: KnowledgeView;
  currentPage: number;
  cardsPerPage: number;
  boardGroupBy: "type" | "collection" | "tag";
  activeTypeFilters: ContentType[];
  activeCategoryFilters: KnowledgeCategory[];
  quickFilterDefinitions: KnowledgeQuickFilterDefinition[];
  activeQuickFilters: KnowledgeQuickFilterId[];
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
  pendingKnowledgeAdd: PendingKnowledgeAdd | null;
  aiPanelQuery: string;
  aiPanelRetrievalRunId: string | null;
  aiPanelHandoffId: number;
  aiPanelHandoffQuery: string | null;
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
  setCurrentPage: (page: number) => void;
  setCardsPerPage: (count: number) => void;
  setBoardGroupBy: (groupBy: "type" | "collection" | "tag") => void;
  toggleTypeFilter: (type: ContentType) => void;
  clearTypeFilters: () => void;
  toggleCategoryFilter: (category: KnowledgeCategory) => void;
  clearCategoryFilters: () => void;
  setQuickFilterDefinitions: (defs: KnowledgeQuickFilterDefinition[]) => void;
  toggleQuickFilter: (filter: KnowledgeQuickFilterId) => void;
  clearQuickFilters: () => void;
  setActiveSmartCollectionId: (id: string | null) => void;
  setActiveTagId: (id: string | null) => void;
  clearTagFilter: () => void;
  setSearchQuery: (q: string) => void;
  setSortBy: (sort: KnowledgeSortKey) => void;
  /** Clears search, types, categories, quick filters, collection, and tag filter. */
  clearAllListFilters: () => void;
  openAIPanel: (
    query?: string,
    retrievalRunId?: string | null,
    options?: OpenAIPanelOptions,
  ) => void;
  closeAIPanel: () => void;
  openAddModal: (pending?: PendingKnowledgeAdd | null) => void;
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
  currentPage: 1,
  cardsPerPage: DEFAULT_KNOWLEDGE_CARDS_PER_PAGE,
  boardGroupBy: "type",
  activeTypeFilters: [],
  activeCategoryFilters: [],
  quickFilterDefinitions: getDefaultKnowledgeQuickFilters(),
  activeQuickFilters: [],
  activeSmartCollectionId: null,
  activeTagId: null,
  searchQuery: "",
  selectedItemId: null,
  isAIPanelOpen: false,
  isAddModalOpen: false,
  isMobileSidebarOpen: false,
  pendingKnowledgeAdd: null,
  aiPanelQuery: "",
  aiPanelRetrievalRunId: null,
  aiPanelHandoffId: 0,
  aiPanelHandoffQuery: null,
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
  setCurrentPage: (page) =>
    set({ currentPage: Math.max(1, Math.floor(page)) }),
  setCardsPerPage: (count) =>
    set({
      cardsPerPage: normalizeKnowledgeCardsPerPage(count),
      currentPage: 1,
    }),
  setBoardGroupBy: (groupBy) => set({ boardGroupBy: groupBy }),

  toggleTypeFilter: (type) =>
    set((state) => {
      const filters = state.activeTypeFilters.includes(type)
        ? state.activeTypeFilters.filter((t) => t !== type)
        : [...state.activeTypeFilters, type];
      return { activeTypeFilters: filters, currentPage: 1 };
    }),

  clearTypeFilters: () => set({ activeTypeFilters: [], currentPage: 1 }),

  toggleCategoryFilter: (category) =>
    set((state) => {
      const filters = state.activeCategoryFilters.includes(category)
        ? state.activeCategoryFilters.filter((t) => t !== category)
        : [...state.activeCategoryFilters, category];
      return { activeCategoryFilters: filters, currentPage: 1 };
    }),

  clearCategoryFilters: () => set({ activeCategoryFilters: [], currentPage: 1 }),

  setQuickFilterDefinitions: (defs) =>
    set((state) => ({
      quickFilterDefinitions: defs,
      activeQuickFilters: cleanActiveKnowledgeQuickFilterIds(
        state.activeQuickFilters,
        defs,
      ),
    })),

  toggleQuickFilter: (filter) =>
    set((state) => {
      const filters = state.activeQuickFilters.includes(filter)
        ? state.activeQuickFilters.filter((f) => f !== filter)
        : [...state.activeQuickFilters, filter];
      return {
        activeQuickFilters: cleanActiveKnowledgeQuickFilterIds(
          filters,
          state.quickFilterDefinitions,
        ),
        currentPage: 1,
      };
    }),

  clearQuickFilters: () => set({ activeQuickFilters: [], currentPage: 1 }),

  setActiveSmartCollectionId: (id) =>
    set({ activeSmartCollectionId: id, currentPage: 1 }),

  setActiveTagId: (id) => set({ activeTagId: id, currentPage: 1 }),
  clearTagFilter: () => set({ activeTagId: null, currentPage: 1 }),

  setSearchQuery: (q) => set({ searchQuery: q, currentPage: 1 }),
  setSortBy: (sort) => set({ sortBy: sort, currentPage: 1 }),

  clearAllListFilters: () =>
    set({
      searchQuery: "",
      activeTypeFilters: [],
      activeCategoryFilters: [],
      activeQuickFilters: [],
      activeSmartCollectionId: null,
      activeTagId: null,
      currentPage: 1,
    }),

  openAIPanel: (query, retrievalRunId, options) =>
    set((state) => {
      const normalizedQuery = query ?? "";
      const shouldHandoff =
        Boolean(options?.handoff) || Boolean(normalizedQuery.trim() && retrievalRunId);
      return {
        isAIPanelOpen: true,
        aiPanelQuery: normalizedQuery,
        aiPanelRetrievalRunId: retrievalRunId ?? null,
        aiPanelHandoffId:
          shouldHandoff && normalizedQuery.trim()
            ? state.aiPanelHandoffId + 1
            : state.aiPanelHandoffId,
        aiPanelHandoffQuery:
          shouldHandoff && normalizedQuery.trim() ? normalizedQuery : null,
      };
    }),
  closeAIPanel: () =>
    set({ isAIPanelOpen: false, aiPanelHandoffId: 0, aiPanelHandoffQuery: null }),

  openAddModal: (pending) =>
    set({
      isAddModalOpen: true,
      pendingKnowledgeAdd: pending ?? null,
    }),
  closeAddModal: () => set({ isAddModalOpen: false, pendingKnowledgeAdd: null }),

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
