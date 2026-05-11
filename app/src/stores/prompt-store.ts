/**
 * AI Knowledge store — client-side state for the personal prompt arsenal.
 *
 * Responsibilities:
 *   - Cache library/custom/favorite/run lists fetched from the repository.
 *   - Hold UI-only state (active tab, filters, search, selected prompt, etc).
 *   - Expose thin async actions that delegate to `aiKnowledgeRepository` and
 *     keep the in-memory cache consistent.
 *
 * This store deliberately does NOT wrap TanStack Query. We want a single
 * source of truth for the prompt list that downstream selectors (command
 * palette, filters, run history) can cheaply derive from, rather than
 * duplicating the same data in multiple query caches.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  aiKnowledgeRepository,
  type NewPromptRunInput,
  type NewUserPromptInput,
  type UpdateUserPromptInput,
} from "@/lib/repositories/ai-knowledge-prompts";
import type {
  CustomPrompt,
  LibraryPrompt,
  PromptCategory,
  PromptRun,
  PromptTopCategory,
} from "@/types/prompt";

// ---------------------------------------------------------------------------
// UI-only filter / tab state
// ---------------------------------------------------------------------------

export type PromptSurfaceTab =
  | "library"
  | "my_prompts"
  | "favorites"
  | "recent"
  | "activity";

export type PromptLayout = "grid" | "list";

// ---------------------------------------------------------------------------
// Store contract
// ---------------------------------------------------------------------------

interface PromptStoreState {
  // ---- data caches ----
  library: LibraryPrompt[];
  userPrompts: CustomPrompt[];
  categories: PromptCategory[];
  favoriteIds: string[];
  recentRuns: PromptRun[];

  // ---- loading flags ----
  libraryLoaded: boolean;
  userPromptsLoaded: boolean;
  categoriesLoaded: boolean;
  favoritesLoaded: boolean;
  runsLoaded: boolean;
  isLoading: boolean;
  lastError: string | null;

  // ---- UI state ----
  activeTab: PromptSurfaceTab;
  searchQuery: string;
  activeTopCategory: PromptTopCategory | null;
  activeSubCategorySlug: string | null;
  activeTag: string | null;
  selectedPromptId: string | null;
  layout: PromptLayout;
  isPaletteOpen: boolean;

  // ---- setters ----
  setActiveTab: (tab: PromptSurfaceTab) => void;
  setSearchQuery: (q: string) => void;
  setTopCategory: (top: PromptTopCategory | null) => void;
  setSubCategorySlug: (slug: string | null) => void;
  setActiveTag: (tag: string | null) => void;
  setSelectedPromptId: (id: string | null) => void;
  setLayout: (layout: PromptLayout) => void;
  openPalette: () => void;
  closePalette: () => void;
  resetFilters: () => void;

  // ---- data actions ----
  hydrate: (data: {
    library: LibraryPrompt[];
    userPrompts: CustomPrompt[];
    categories: PromptCategory[];
    favoriteIds: string[];
    recentRuns: PromptRun[];
  }) => void;
  fetchLibrary: () => Promise<void>;
  fetchUserPrompts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchFavorites: () => Promise<void>;
  fetchRecentRuns: (limit?: number) => Promise<void>;
  fetchAll: () => Promise<void>;

  toggleFavorite: (libraryPromptId: string) => Promise<void>;
  forkLibraryPrompt: (libraryPromptId: string) => Promise<CustomPrompt>;
  createUserPrompt: (input: NewUserPromptInput) => Promise<CustomPrompt>;
  updateUserPrompt: (
    id: string,
    input: UpdateUserPromptInput,
  ) => Promise<CustomPrompt>;
  deleteUserPrompt: (id: string) => Promise<void>;

  recordRun: (input: NewPromptRunInput) => Promise<PromptRun>;
  updateRun: (
    runId: string,
    patch: {
      status?: PromptRun["status"];
      result_snippet?: string | null;
      error_message?: string | null;
      completed_at?: string | null;
    },
  ) => Promise<PromptRun>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const usePromptStore = create<PromptStoreState>()(
  persist(
    (set, get) => ({
      library: [],
      userPrompts: [],
      categories: [],
      favoriteIds: [],
      recentRuns: [],

      libraryLoaded: false,
      userPromptsLoaded: false,
      categoriesLoaded: false,
      favoritesLoaded: false,
      runsLoaded: false,
      isLoading: false,
      lastError: null,

      activeTab: "library",
      searchQuery: "",
      activeTopCategory: null,
      activeSubCategorySlug: null,
      activeTag: null,
      selectedPromptId: null,
      layout: "grid",
      isPaletteOpen: false,

      // ---- setters ----
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setTopCategory: (top) =>
        set({ activeTopCategory: top, activeSubCategorySlug: null }),
      setSubCategorySlug: (slug) => set({ activeSubCategorySlug: slug }),
      setActiveTag: (tag) => set({ activeTag: tag }),
      setSelectedPromptId: (id) => set({ selectedPromptId: id }),
      setLayout: (layout) => set({ layout }),
      openPalette: () => set({ isPaletteOpen: true }),
      closePalette: () => set({ isPaletteOpen: false }),
      resetFilters: () =>
        set({
          searchQuery: "",
          activeTopCategory: null,
          activeSubCategorySlug: null,
          activeTag: null,
        }),

      // ---- hydration (SSR entrypoint) ----
      hydrate: (data) =>
        set({
          library: data.library,
          userPrompts: data.userPrompts,
          categories: data.categories,
          favoriteIds: data.favoriteIds,
          recentRuns: data.recentRuns,
          libraryLoaded: true,
          userPromptsLoaded: true,
          categoriesLoaded: true,
          favoritesLoaded: true,
          runsLoaded: true,
        }),

      // ---- fetchers ----
      fetchLibrary: async () => {
        set({ isLoading: true, lastError: null });
        try {
          const library = await aiKnowledgeRepository.listLibrary();
          set({ library, libraryLoaded: true, isLoading: false });
        } catch (err) {
          set({ lastError: errorMessage(err), isLoading: false });
          throw err;
        }
      },

      fetchUserPrompts: async () => {
        set({ isLoading: true, lastError: null });
        try {
          const userPrompts = await aiKnowledgeRepository.listUserPrompts();
          set({ userPrompts, userPromptsLoaded: true, isLoading: false });
        } catch (err) {
          set({ lastError: errorMessage(err), isLoading: false });
          throw err;
        }
      },

      fetchCategories: async () => {
        try {
          const categories = await aiKnowledgeRepository.listCategories();
          set({ categories, categoriesLoaded: true });
        } catch (err) {
          set({ lastError: errorMessage(err) });
          throw err;
        }
      },

      fetchFavorites: async () => {
        try {
          const favoriteIds = await aiKnowledgeRepository.listFavoriteIds();
          set({ favoriteIds, favoritesLoaded: true });
        } catch (err) {
          set({ lastError: errorMessage(err) });
          throw err;
        }
      },

      fetchRecentRuns: async (limit = 50) => {
        try {
          const recentRuns = await aiKnowledgeRepository.listRecentRuns(limit);
          set({ recentRuns, runsLoaded: true });
        } catch (err) {
          set({ lastError: errorMessage(err) });
          throw err;
        }
      },

      fetchAll: async () => {
        set({ isLoading: true, lastError: null });
        try {
          const [library, userPrompts, categories, favoriteIds, recentRuns] =
            await Promise.all([
              aiKnowledgeRepository.listLibrary(),
              aiKnowledgeRepository.listUserPrompts(),
              aiKnowledgeRepository.listCategories(),
              aiKnowledgeRepository.listFavoriteIds(),
              aiKnowledgeRepository.listRecentRuns(50),
            ]);
          set({
            library,
            userPrompts,
            categories,
            favoriteIds,
            recentRuns,
            libraryLoaded: true,
            userPromptsLoaded: true,
            categoriesLoaded: true,
            favoritesLoaded: true,
            runsLoaded: true,
            isLoading: false,
          });
        } catch (err) {
          set({ lastError: errorMessage(err), isLoading: false });
          throw err;
        }
      },

      // ---- mutations ----
      toggleFavorite: async (libraryPromptId) => {
        const current = get().favoriteIds;
        const isFav = current.includes(libraryPromptId);
        // Optimistic update
        set({
          favoriteIds: isFav
            ? current.filter((id) => id !== libraryPromptId)
            : [libraryPromptId, ...current],
        });
        try {
          if (isFav) {
            await aiKnowledgeRepository.removeFavorite(libraryPromptId);
          } else {
            await aiKnowledgeRepository.addFavorite(libraryPromptId);
          }
        } catch (err) {
          // Rollback on failure.
          set({ favoriteIds: current, lastError: errorMessage(err) });
          throw err;
        }
      },

      forkLibraryPrompt: async (libraryPromptId) => {
        try {
          const forked = await aiKnowledgeRepository.forkLibraryPrompt(
            libraryPromptId,
          );
          set((state) => ({
            userPrompts: [forked, ...state.userPrompts],
          }));
          return forked;
        } catch (err) {
          set({ lastError: errorMessage(err) });
          throw err;
        }
      },

      createUserPrompt: async (input) => {
        try {
          const created = await aiKnowledgeRepository.createUserPrompt(input);
          set((state) => ({
            userPrompts: [created, ...state.userPrompts],
          }));
          return created;
        } catch (err) {
          set({ lastError: errorMessage(err) });
          throw err;
        }
      },

      updateUserPrompt: async (id, input) => {
        try {
          const updated = await aiKnowledgeRepository.updateUserPrompt(id, input);
          set((state) => ({
            userPrompts: state.userPrompts.map((p) =>
              p.id === id ? updated : p,
            ),
          }));
          return updated;
        } catch (err) {
          set({ lastError: errorMessage(err) });
          throw err;
        }
      },

      deleteUserPrompt: async (id) => {
        const snapshot = get().userPrompts;
        set({ userPrompts: snapshot.filter((p) => p.id !== id) });
        try {
          await aiKnowledgeRepository.deleteUserPrompt(id);
        } catch (err) {
          set({ userPrompts: snapshot, lastError: errorMessage(err) });
          throw err;
        }
      },

      recordRun: async (input) => {
        try {
          const run = await aiKnowledgeRepository.recordRun(input);
          set((state) => ({
            recentRuns: [run, ...state.recentRuns].slice(0, 100),
          }));
          if (run.custom_prompt_id) {
            await aiKnowledgeRepository
              .incrementCustomPromptUsage(run.custom_prompt_id)
              .catch(() => {
                /* non-fatal; telemetry is best-effort */
              });
          }
          return run;
        } catch (err) {
          set({ lastError: errorMessage(err) });
          throw err;
        }
      },

      updateRun: async (runId, patch) => {
        try {
          const updated = await aiKnowledgeRepository.updateRun(runId, patch);
          set((state) => ({
            recentRuns: state.recentRuns.map((r) =>
              r.id === runId ? updated : r,
            ),
          }));
          return updated;
        } catch (err) {
          set({ lastError: errorMessage(err) });
          throw err;
        }
      },
    }),
    {
      name: "mylifeos-ai-knowledge-store",
      partialize: (state) => ({
        // Persist only UI-layer choices; data re-fetched on load.
        activeTab: state.activeTab,
        layout: state.layout,
        activeTopCategory: state.activeTopCategory,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/**
 * Visible prompts for the current tab + filters. Keep this as a selector (not
 * state) so it stays cheap and always reflects the latest filters/data.
 */
export function selectVisiblePrompts(
  state: PromptStoreState,
): Array<LibraryPrompt | CustomPrompt> {
  const q = state.searchQuery.trim().toLowerCase();
  let pool: Array<LibraryPrompt | CustomPrompt>;
  switch (state.activeTab) {
    case "library":
      pool = state.library;
      break;
    case "my_prompts":
      pool = state.userPrompts;
      break;
    case "favorites": {
      const favSet = new Set(state.favoriteIds);
      const libFavs = state.library.filter((p) => favSet.has(p.id));
      const customFavs = state.userPrompts.filter((p) => p.is_favorite);
      pool = [...libFavs, ...customFavs];
      break;
    }
    case "recent": {
      const order = new Map<string, number>();
      state.recentRuns.forEach((r, i) => {
        const key = r.library_prompt_id ?? r.custom_prompt_id;
        if (key && !order.has(key)) order.set(key, i);
      });
      const indexed = [
        ...state.library.filter((p) => order.has(p.id)),
        ...state.userPrompts.filter((p) => order.has(p.id)),
      ];
      indexed.sort(
        (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
      );
      pool = indexed;
      break;
    }
    case "activity":
      pool = [];
      break;
    default:
      pool = [];
  }

  return pool.filter((p) => {
    if (
      state.activeTopCategory &&
      p.top_category !== state.activeTopCategory
    ) {
      return false;
    }
    if (
      state.activeSubCategorySlug &&
      p.sub_category_slug !== state.activeSubCategorySlug
    ) {
      return false;
    }
    if (state.activeTag && !p.tags.includes(state.activeTag)) {
      return false;
    }
    if (q) {
      const hay = [
        p.title_i18n.en,
        p.description_i18n.en,
        p.body,
        ...p.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
