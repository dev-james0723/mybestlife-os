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
import {
  aiKnowledgeFoldersRepository,
  type NewFolderInput,
  type UpdateFolderInput,
} from "@/lib/repositories/ai-knowledge-folders";
import type {
  CustomPrompt,
  LibraryPrompt,
  PromptCategory,
  PromptFolder,
  PromptFolderItemRef,
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
  | "folders"
  | "recent"
  | "activity";

export type PromptLayout = "grid" | "list";

/**
 * Why the user is in multi-select mode. `manage` shows the full bulk toolbar
 * (add to folder / favorite / delete). `new_folder` means the next confirm
 * action creates a brand-new folder from the selection (AI-named).
 */
export type SelectionIntent = "manage" | "new_folder";

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
  folders: PromptFolder[];

  // ---- loading flags ----
  libraryLoaded: boolean;
  userPromptsLoaded: boolean;
  categoriesLoaded: boolean;
  favoritesLoaded: boolean;
  runsLoaded: boolean;
  foldersLoaded: boolean;
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

  // ---- multi-select (spans tabs so users can collect across Library / My
  //      prompts / Favorites before acting) ----
  selectionMode: boolean;
  selectionIntent: SelectionIntent;
  selectedPromptIds: string[];

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

  // ---- selection setters ----
  setSelectionMode: (on: boolean, intent?: SelectionIntent) => void;
  toggleSelected: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;

  // ---- data actions ----
  hydrate: (data: {
    library: LibraryPrompt[];
    userPrompts: CustomPrompt[];
    categories: PromptCategory[];
    favoriteIds: string[];
    recentRuns: PromptRun[];
    folders?: PromptFolder[];
  }) => void;
  fetchLibrary: () => Promise<void>;
  fetchUserPrompts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchFavorites: () => Promise<void>;
  fetchRecentRuns: (limit?: number) => Promise<void>;
  fetchFolders: () => Promise<void>;
  fetchAll: () => Promise<void>;

  // ---- folder mutations ----
  createFolder: (
    input: NewFolderInput,
    items?: PromptFolderItemRef[],
  ) => Promise<PromptFolder>;
  updateFolder: (id: string, input: UpdateFolderInput) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  addPromptsToFolder: (
    folderId: string,
    refs: PromptFolderItemRef[],
  ) => Promise<void>;
  removePromptFromFolder: (
    folderId: string,
    ref: PromptFolderItemRef,
  ) => Promise<void>;

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
      folders: [],

      libraryLoaded: false,
      userPromptsLoaded: false,
      categoriesLoaded: false,
      favoritesLoaded: false,
      runsLoaded: false,
      foldersLoaded: false,
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

      selectionMode: false,
      selectionIntent: "manage",
      selectedPromptIds: [],

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

      // ---- selection ----
      setSelectionMode: (on, intent) =>
        set((state) => ({
          selectionMode: on,
          selectionIntent: intent ?? (on ? state.selectionIntent : "manage"),
          // Leaving select mode clears the working set.
          selectedPromptIds: on ? state.selectedPromptIds : [],
        })),
      toggleSelected: (id) =>
        set((state) => ({
          selectedPromptIds: state.selectedPromptIds.includes(id)
            ? state.selectedPromptIds.filter((x) => x !== id)
            : [...state.selectedPromptIds, id],
        })),
      setSelectedIds: (ids) => set({ selectedPromptIds: ids }),
      clearSelection: () => set({ selectedPromptIds: [] }),

      // ---- hydration (SSR entrypoint) ----
      hydrate: (data) =>
        set({
          library: data.library,
          userPrompts: data.userPrompts,
          categories: data.categories,
          favoriteIds: data.favoriteIds,
          recentRuns: data.recentRuns,
          folders: data.folders ?? [],
          libraryLoaded: true,
          userPromptsLoaded: true,
          categoriesLoaded: true,
          favoritesLoaded: true,
          runsLoaded: true,
          foldersLoaded: data.folders !== undefined,
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

      fetchFolders: async () => {
        try {
          const folders = await aiKnowledgeFoldersRepository.listFolders();
          set({ folders, foldersLoaded: true });
        } catch (err) {
          // Best-effort: a missing folders migration must never surface as a
          // page-level error. Folders just stay empty until the table exists.
          if (process.env.NODE_ENV !== "production") {
            console.warn("[ai-knowledge] folders fetch failed:", err);
          }
          set({ folders: [], foldersLoaded: false });
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
        // Folders load separately and best-effort: the prompt arsenal must
        // still render even if the folders migration hasn't been applied yet.
        try {
          const folders = await aiKnowledgeFoldersRepository.listFolders();
          set({ folders, foldersLoaded: true });
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[ai-knowledge] folders fetch failed:", err);
          }
          set({ folders: [], foldersLoaded: false });
        }
      },

      // ---- folder mutations ----
      createFolder: async (input, items = []) => {
        try {
          const folder = await aiKnowledgeFoldersRepository.createFolder(input);
          if (items.length > 0) {
            await aiKnowledgeFoldersRepository.addItems(folder.id, items);
          }
          const created: PromptFolder = { ...folder, items };
          set((state) => ({ folders: [created, ...state.folders] }));
          return created;
        } catch (err) {
          // Surfaced via the caller's toast; do NOT set page-level lastError,
          // which would blank the prompt grid.
          throw err;
        }
      },

      updateFolder: async (id, input) => {
        const snapshot = get().folders;
        // Optimistic patch of the metadata fields.
        set({
          folders: snapshot.map((f) =>
            f.id === id
              ? {
                  ...f,
                  name: input.name ?? f.name,
                  summary: input.summary !== undefined ? input.summary : f.summary,
                  icon: input.icon !== undefined ? input.icon : f.icon,
                  color: input.color !== undefined ? input.color : f.color,
                  sort_order: input.sort_order ?? f.sort_order,
                }
              : f,
          ),
        });
        try {
          await aiKnowledgeFoldersRepository.updateFolder(id, input);
        } catch (err) {
          set({ folders: snapshot });
          throw err;
        }
      },

      deleteFolder: async (id) => {
        const snapshot = get().folders;
        set({ folders: snapshot.filter((f) => f.id !== id) });
        try {
          await aiKnowledgeFoldersRepository.deleteFolder(id);
        } catch (err) {
          set({ folders: snapshot });
          throw err;
        }
      },

      addPromptsToFolder: async (folderId, refs) => {
        const snapshot = get().folders;
        set({
          folders: snapshot.map((f) => {
            if (f.id !== folderId) return f;
            const existing = new Set(
              f.items.map((i) => `${i.source}:${i.prompt_id}`),
            );
            const merged = [...f.items];
            for (const ref of refs) {
              const key = `${ref.source}:${ref.prompt_id}`;
              if (!existing.has(key)) {
                existing.add(key);
                merged.push(ref);
              }
            }
            return { ...f, items: merged };
          }),
        });
        try {
          await aiKnowledgeFoldersRepository.addItems(folderId, refs);
        } catch (err) {
          set({ folders: snapshot });
          throw err;
        }
      },

      removePromptFromFolder: async (folderId, ref) => {
        const snapshot = get().folders;
        set({
          folders: snapshot.map((f) =>
            f.id === folderId
              ? {
                  ...f,
                  items: f.items.filter(
                    (i) =>
                      !(i.source === ref.source && i.prompt_id === ref.prompt_id),
                  ),
                }
              : f,
          ),
        });
        try {
          await aiKnowledgeFoldersRepository.removeItem(folderId, ref);
        } catch (err) {
          set({ folders: snapshot });
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
        const foldersSnapshot = get().folders;
        set({
          userPrompts: snapshot.filter((p) => p.id !== id),
          // DB cascades the folder_item rows; mirror that locally.
          folders: foldersSnapshot.map((f) => ({
            ...f,
            items: f.items.filter(
              (i) => !(i.source === "custom" && i.prompt_id === id),
            ),
          })),
        });
        try {
          await aiKnowledgeRepository.deleteUserPrompt(id);
        } catch (err) {
          set({
            userPrompts: snapshot,
            folders: foldersSnapshot,
            lastError: errorMessage(err),
          });
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

/** Resolve a prompt id to its loaded object (library first, then custom). */
export function findPromptById(
  state: Pick<PromptStoreState, "library" | "userPrompts">,
  id: string,
): LibraryPrompt | CustomPrompt | undefined {
  return (
    state.library.find((p) => p.id === id) ??
    state.userPrompts.find((p) => p.id === id)
  );
}

/** Resolve a folder's item refs to the loaded prompt objects, preserving order. */
export function resolveFolderPrompts(
  state: Pick<PromptStoreState, "library" | "userPrompts">,
  folder: PromptFolder,
): Array<LibraryPrompt | CustomPrompt> {
  const out: Array<LibraryPrompt | CustomPrompt> = [];
  for (const ref of folder.items) {
    const p =
      ref.source === "library"
        ? state.library.find((lp) => lp.id === ref.prompt_id)
        : state.userPrompts.find((up) => up.id === ref.prompt_id);
    if (p) out.push(p);
  }
  return out;
}
