import { create } from "zustand";
import type { Idea } from "@/types/database";
import type {
  IdeasLibraryScope,
  IdeasQuickFilter,
  IdeasRelatedScopeFilter,
  IdeasSortKey,
  IdeasView,
} from "@/lib/ideas/ideas-list-types";

export type {
  IdeasLibraryScope,
  IdeasQuickFilter,
  IdeasRelatedScopeFilter,
  IdeasSortKey,
  IdeasView,
} from "@/lib/ideas/ideas-list-types";

interface IdeasStore {
  items: Idea[];
  selectedIdeaId: string | null;
  currentView: IdeasView;
  boardGroupBy: "status" | "category" | "source_type";
  ideaStatusScope: IdeasLibraryScope;
  activeSourceFilters: Idea["source_type"][];
  activeCategoryFilters: string[];
  activeTagToken: string | null;
  activeQuickFilters: IdeasQuickFilter[];
  relatedScopeFilter: IdeasRelatedScopeFilter;
  searchQuery: string;
  sortBy: IdeasSortKey;
  isAddModalOpen: boolean;
  isMobileSidebarOpen: boolean;

  hydrate: (ideas: Idea[]) => void;
  upsertIdea: (idea: Idea) => void;
  removeIdea: (id: string) => void;
  setSelectedIdeaId: (id: string | null) => void;
  setView: (view: IdeasView) => void;
  setBoardGroupBy: (g: IdeasStore["boardGroupBy"]) => void;
  setIdeaStatusScope: (scope: IdeasLibraryScope) => void;
  toggleSourceFilter: (t: Idea["source_type"]) => void;
  clearSourceFilters: () => void;
  toggleCategoryFilter: (slug: string) => void;
  clearCategoryFilters: () => void;
  setActiveTagToken: (token: string | null) => void;
  toggleQuickFilter: (f: IdeasQuickFilter) => void;
  clearQuickFilters: () => void;
  setRelatedScopeFilter: (f: IdeasRelatedScopeFilter) => void;
  setSearchQuery: (q: string) => void;
  setSortBy: (s: IdeasSortKey) => void;
  openAddModal: () => void;
  closeAddModal: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  clearAllListFilters: () => void;
}

export const useIdeasStore = create<IdeasStore>()((set) => ({
  items: [],
  selectedIdeaId: null,
  currentView: "gallery",
  boardGroupBy: "status",
  ideaStatusScope: "all",
  activeSourceFilters: [],
  activeCategoryFilters: [],
  activeTagToken: null,
  activeQuickFilters: [],
  relatedScopeFilter: "none",
  searchQuery: "",
  sortBy: "latest",
  isAddModalOpen: false,
  isMobileSidebarOpen: false,

  hydrate: (ideas) => set({ items: Array.isArray(ideas) ? ideas : [] }),

  upsertIdea: (idea) =>
    set((state) => {
      const idx = state.items.findIndex((i) => i.id === idea.id);
      if (idx >= 0) {
        const next = [...state.items];
        next[idx] = idea;
        return { items: next };
      }
      return { items: [idea, ...state.items] };
    }),

  removeIdea: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
      selectedIdeaId: state.selectedIdeaId === id ? null : state.selectedIdeaId,
    })),

  setSelectedIdeaId: (id) => set({ selectedIdeaId: id }),

  setView: (view) => set({ currentView: view }),

  setBoardGroupBy: (boardGroupBy) => set({ boardGroupBy }),

  setIdeaStatusScope: (ideaStatusScope) => set({ ideaStatusScope }),

  toggleSourceFilter: (t) =>
    set((state) => {
      const has = state.activeSourceFilters.includes(t);
      return {
        activeSourceFilters: has
          ? state.activeSourceFilters.filter((x) => x !== t)
          : [...state.activeSourceFilters, t],
      };
    }),

  clearSourceFilters: () => set({ activeSourceFilters: [] }),

  toggleCategoryFilter: (slug) =>
    set((state) => {
      const has = state.activeCategoryFilters.includes(slug);
      return {
        activeCategoryFilters: has
          ? state.activeCategoryFilters.filter((x) => x !== slug)
          : [...state.activeCategoryFilters, slug],
      };
    }),

  clearCategoryFilters: () => set({ activeCategoryFilters: [] }),

  setActiveTagToken: (activeTagToken) => set({ activeTagToken }),

  toggleQuickFilter: (f) =>
    set((state) => {
      const has = state.activeQuickFilters.includes(f);
      return {
        activeQuickFilters: has
          ? state.activeQuickFilters.filter((x) => x !== f)
          : [...state.activeQuickFilters, f],
      };
    }),

  clearQuickFilters: () => set({ activeQuickFilters: [] }),

  setRelatedScopeFilter: (relatedScopeFilter) => set({ relatedScopeFilter }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSortBy: (sortBy) => set({ sortBy }),

  openAddModal: () => set({ isAddModalOpen: true }),

  closeAddModal: () => set({ isAddModalOpen: false }),

  toggleMobileSidebar: () =>
    set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),

  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),

  clearAllListFilters: () =>
    set({
      ideaStatusScope: "all",
      activeSourceFilters: [],
      activeCategoryFilters: [],
      activeTagToken: null,
      activeQuickFilters: [],
      relatedScopeFilter: "none",
      searchQuery: "",
    }),
}));
