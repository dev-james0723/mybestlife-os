"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListChecks, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/stores/app-store";
import {
  findPromptById,
  selectVisiblePrompts,
  usePromptStore,
  type PromptSurfaceTab,
} from "@/stores/prompt-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import {
  pickLocalizedText,
  type CustomPrompt,
  type LibraryPrompt,
  type PromptFolder,
} from "@/types/prompt";
import { cn } from "@/lib/utils";
import { AiKnowledgeFilterBar } from "@/components/ai-knowledge/AiKnowledgeFilterBar";
import { TopCategoryRail } from "@/components/ai-knowledge/TopCategoryRail";
import { PromptCard, PromptListRow } from "@/components/ai-knowledge/PromptCard";
import { PromptDetailDrawer } from "@/components/ai-knowledge/PromptDetailDrawer";
import { AiKnowledgeCommandPalette } from "@/components/ai-knowledge/AiKnowledgeCommandPalette";
import {
  ActivityStatsStrip,
  RunActivityPanel,
} from "@/components/ai-knowledge/RunActivityPanel";
import { CustomPromptEditDrawer } from "@/components/ai-knowledge/CustomPromptEditDrawer";
import { useAiKnowledgeRun } from "@/components/ai-knowledge/ai-knowledge-run-context";
import {
  CreatePromptModal,
  type CreatePromptModalStep,
} from "@/components/ai-knowledge/CreatePromptModal";
import { FoldersTab } from "@/components/ai-knowledge/FoldersTab";
import { FolderDetailDrawer } from "@/components/ai-knowledge/FolderDetailDrawer";
import { FolderQuickStrip } from "@/components/ai-knowledge/FolderQuickStrip";
import { PromptSelectionToolbar } from "@/components/ai-knowledge/PromptSelectionToolbar";
import { AddToFolderDialog } from "@/components/ai-knowledge/AddToFolderDialog";

type AnyPrompt = LibraryPrompt | CustomPrompt;

function CreatePromptUrlSync({
  onDiscover,
}: {
  onDiscover: (step: CreatePromptModalStep) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const lastHandledSig = useRef<string | null>(null);

  useEffect(() => {
    const create = searchParams.get("create");
    if (!create) {
      lastHandledSig.current = null;
      return;
    }
    const sig = `${pathname}?create=${create}`;
    if (lastHandledSig.current === sig) return;
    lastHandledSig.current = sig;
    if (create === "manual") onDiscover("manual");
    else if (create === "wizard") onDiscover("wizard");
    else onDiscover("pick");
    router.replace(pathname, { scroll: false });
  }, [searchParams, router, pathname, onDiscover]);

  return null;
}

export default function AiKnowledgePage() {
  const { openRun } = useAiKnowledgeRun();
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);

  // --- store slices ---
  const activeTab = usePromptStore((s) => s.activeTab);
  const setActiveTab = usePromptStore((s) => s.setActiveTab);

  const searchQuery = usePromptStore((s) => s.searchQuery);
  const setSearchQuery = usePromptStore((s) => s.setSearchQuery);

  const activeTopCategory = usePromptStore((s) => s.activeTopCategory);
  const setTopCategory = usePromptStore((s) => s.setTopCategory);

  const activeSubCategorySlug = usePromptStore((s) => s.activeSubCategorySlug);
  const setSubCategorySlug = usePromptStore((s) => s.setSubCategorySlug);

  const activeTag = usePromptStore((s) => s.activeTag);
  const setActiveTag = usePromptStore((s) => s.setActiveTag);

  const layout = usePromptStore((s) => s.layout);
  const setLayout = usePromptStore((s) => s.setLayout);

  const resetFilters = usePromptStore((s) => s.resetFilters);

  const library = usePromptStore((s) => s.library);
  const userPrompts = usePromptStore((s) => s.userPrompts);
  const categories = usePromptStore((s) => s.categories);
  const favoriteIds = usePromptStore((s) => s.favoriteIds);
  const recentRuns = usePromptStore((s) => s.recentRuns);

  const isLoading = usePromptStore((s) => s.isLoading);
  const libraryLoaded = usePromptStore((s) => s.libraryLoaded);
  const lastError = usePromptStore((s) => s.lastError);
  const fetchAll = usePromptStore((s) => s.fetchAll);

  const selectedPromptId = usePromptStore((s) => s.selectedPromptId);
  const setSelectedPromptId = usePromptStore((s) => s.setSelectedPromptId);

  const isPaletteOpen = usePromptStore((s) => s.isPaletteOpen);
  const openPalette = usePromptStore((s) => s.openPalette);
  const closePalette = usePromptStore((s) => s.closePalette);

  const toggleFavorite = usePromptStore((s) => s.toggleFavorite);
  const forkLibraryPrompt = usePromptStore((s) => s.forkLibraryPrompt);
  const deleteUserPrompt = usePromptStore((s) => s.deleteUserPrompt);
  const updateUserPrompt = usePromptStore((s) => s.updateUserPrompt);
  const fetchRecentRuns = usePromptStore((s) => s.fetchRecentRuns);

  // --- folders + selection ---
  const folders = usePromptStore((s) => s.folders);
  const foldersLoaded = usePromptStore((s) => s.foldersLoaded);
  const deleteFolder = usePromptStore((s) => s.deleteFolder);

  const selectionMode = usePromptStore((s) => s.selectionMode);
  const selectionIntent = usePromptStore((s) => s.selectionIntent);
  const selectedPromptIds = usePromptStore((s) => s.selectedPromptIds);
  const setSelectionMode = usePromptStore((s) => s.setSelectionMode);
  const toggleSelected = usePromptStore((s) => s.toggleSelected);

  const visible = usePromptStore(useShallow(selectVisiblePrompts));

  const [editPrompt, setEditPrompt] = useState<CustomPrompt | null>(null);
  const [runsRefreshing, setRunsRefreshing] = useState(false);

  const [openFolder, setOpenFolder] = useState<PromptFolder | null>(null);
  const [addToFolderOpen, setAddToFolderOpen] = useState(false);
  const [folderPendingDelete, setFolderPendingDelete] =
    useState<PromptFolder | null>(null);

  const selectedSet = useMemo(
    () => new Set(selectedPromptIds),
    [selectedPromptIds],
  );

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalInitial, setCreateModalInitial] =
    useState<CreatePromptModalStep>("pick");

  const handleDiscoverCreateQuery = useCallback(
    (step: CreatePromptModalStep) => {
      setCreateModalInitial(step);
      setCreateModalOpen(true);
    },
    [],
  );

  const openCreatePromptModal = useCallback(
    (step: CreatePromptModalStep = "pick") => {
      setCreateModalInitial(step);
      setCreateModalOpen(true);
    },
    [],
  );

  const handleCreatedPrompt = useCallback(() => {
    setActiveTab("my_prompts");
    void fetchAll().catch(() => {
      /* surfaced via store.lastError */
    });
  }, [fetchAll, setActiveTab]);

  // --- initial fetch ---
  useEffect(() => {
    if (!libraryLoaded) {
      fetchAll().catch(() => {
        /* surfaced via store.lastError */
      });
    }
  }, [libraryLoaded, fetchAll]);

  // --- derived: tabs ---
  const tabs = useMemo(
    () =>
      [
        { id: "library" as const, label: ui.tabs.library },
        { id: "my_prompts" as const, label: ui.tabs.myPrompts },
        { id: "favorites" as const, label: ui.tabs.favorites },
        { id: "folders" as const, label: ui.tabs.folders },
        { id: "recent" as const, label: ui.tabs.recent },
        { id: "activity" as const, label: ui.tabs.activity },
      ] satisfies Array<{ id: PromptSurfaceTab; label: string }>,
    [ui.tabs],
  );

  // --- derived: available tags from currently loaded prompts ---
  const availableTags = useMemo(() => {
    const s = new Set<string>();
    for (const p of [...library, ...userPrompts]) {
      for (const t of p.tags) s.add(t);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [library, userPrompts]);

  // --- derived: prompts in the active tab (before filters), used for rail counts ---
  const poolForRail = useMemo<AnyPrompt[]>(() => {
    switch (activeTab) {
      case "library":
        return library;
      case "my_prompts":
        return userPrompts;
      case "favorites": {
        const favSet = new Set(favoriteIds);
        return [
          ...library.filter((p) => favSet.has(p.id)),
          ...userPrompts.filter((p) => p.is_favorite),
        ];
      }
      case "recent": {
        const seen = new Set<string>();
        const ordered: AnyPrompt[] = [];
        for (const r of recentRuns) {
          const id = r.library_prompt_id ?? r.custom_prompt_id;
          if (!id || seen.has(id)) continue;
          seen.add(id);
          const p =
            library.find((lp) => lp.id === id) ??
            userPrompts.find((up) => up.id === id);
          if (p) ordered.push(p);
        }
        return ordered;
      }
      case "folders":
      case "activity":
        return [];
    }
  }, [activeTab, library, userPrompts, favoriteIds, recentRuns]);

  const favoritesCount = useMemo(() => {
    const customFav = userPrompts.filter((p) => p.is_favorite).length;
    return favoriteIds.length + customFav;
  }, [favoriteIds, userPrompts]);

  // --- derived: selected prompt object ---
  const selectedPrompt = useMemo<AnyPrompt | null>(() => {
    if (!selectedPromptId) return null;
    return (
      library.find((p) => p.id === selectedPromptId) ??
      userPrompts.find((p) => p.id === selectedPromptId) ??
      null
    );
  }, [selectedPromptId, library, userPrompts]);

  // --- action handlers ---
  const handleToggleFavorite = useCallback(
    async (prompt: AnyPrompt) => {
      if (prompt.source !== "library") {
        // Custom prompts use the `is_favorite` column via updateUserPrompt,
        // which lands with the custom-prompt editor in Phase 3. For now we
        // silently skip to avoid mis-wiring the DB.
        return;
      }
      const wasFav = favoriteIds.includes(prompt.id);
      try {
        await toggleFavorite(prompt.id);
        toast.success(
          wasFav ? ui.toast.favoriteRemoved : ui.toast.favoriteAdded,
        );
      } catch {
        toast.error(ui.toast.favoriteFailed);
      }
    },
    [favoriteIds, toggleFavorite, ui.toast],
  );

  const handleFork = useCallback(
    async (prompt: LibraryPrompt) => {
      try {
        const forked = await forkLibraryPrompt(prompt.id);
        toast.success(
          ui.toast.forked(pickLocalizedText(forked.title_i18n, language)),
        );
        setActiveTab("my_prompts");
        setSelectedPromptId(forked.id);
      } catch {
        toast.error(ui.toast.forkFailed);
      }
    },
    [forkLibraryPrompt, ui.toast, language, setActiveTab, setSelectedPromptId],
  );

  const handleDelete = useCallback(
    async (prompt: CustomPrompt) => {
      try {
        await deleteUserPrompt(prompt.id);
        toast.success(ui.toast.deleted);
        if (selectedPromptId === prompt.id) setSelectedPromptId(null);
      } catch {
        toast.error(ui.toast.deleteFailed);
      }
    },
    [deleteUserPrompt, ui.toast, selectedPromptId, setSelectedPromptId],
  );

  const handleCopyBody = useCallback(
    async (prompt: AnyPrompt) => {
      try {
        await navigator.clipboard.writeText(prompt.body);
        toast.success(ui.toast.copyBodySuccess);
      } catch {
        toast.error(ui.toast.copyBodyFailed);
      }
    },
    [ui.toast],
  );

  const handleRun = useCallback(
    (prompt: AnyPrompt) => {
      openRun(prompt);
    },
    [openRun],
  );

  const handleOpen = useCallback(
    (prompt: AnyPrompt) => setSelectedPromptId(prompt.id),
    [setSelectedPromptId],
  );

  const handleEdit = useCallback((prompt: CustomPrompt) => {
    setSelectedPromptId(null);
    setEditPrompt(prompt);
  }, [setSelectedPromptId]);

  const handleRefreshRuns = useCallback(async () => {
    setRunsRefreshing(true);
    try {
      await fetchRecentRuns(50);
    } catch {
      toast.error(ui.toast.runFailed);
    } finally {
      setRunsRefreshing(false);
    }
  }, [fetchRecentRuns, ui.toast.runFailed]);

  // --- selection + folders ---
  const selectedPrompts = useMemo<AnyPrompt[]>(
    () =>
      selectedPromptIds
        .map((id) => findPromptById({ library, userPrompts }, id))
        .filter((p): p is AnyPrompt => Boolean(p)),
    [selectedPromptIds, library, userPrompts],
  );
  const selectedCustomCount = useMemo(
    () => selectedPrompts.filter((p) => p.source === "custom").length,
    [selectedPrompts],
  );

  const isPromptTab =
    activeTab === "library" ||
    activeTab === "my_prompts" ||
    activeTab === "favorites" ||
    activeTab === "recent";

  const handleToggleSelect = useCallback(
    (prompt: AnyPrompt) => toggleSelected(prompt.id),
    [toggleSelected],
  );

  const handleStartNewFolder = useCallback(() => {
    if (!isPromptTab) setActiveTab("library");
    setSelectionMode(true, "new_folder");
  }, [isPromptTab, setActiveTab, setSelectionMode]);

  const handleOpenFolder = useCallback((folder: PromptFolder) => {
    setOpenFolder(folder);
  }, []);

  const handleAddPromptsToFolder = useCallback(() => {
    setOpenFolder(null);
    if (!isPromptTab) setActiveTab("library");
    setSelectionMode(true, "manage");
  }, [isPromptTab, setActiveTab, setSelectionMode]);

  const handleBulkFavorite = useCallback(async () => {
    if (selectedPrompts.length === 0) return;
    try {
      await Promise.all(
        selectedPrompts.map((p) => {
          if (p.source === "library") {
            return favoriteIds.includes(p.id)
              ? Promise.resolve()
              : toggleFavorite(p.id);
          }
          return p.is_favorite
            ? Promise.resolve()
            : updateUserPrompt(p.id, { is_favorite: true }).then(() => undefined);
        }),
      );
      toast.success(ui.toast.bulkFavorited(selectedPrompts.length));
      setSelectionMode(false);
    } catch {
      toast.error(ui.toast.favoriteFailed);
    }
  }, [
    selectedPrompts,
    favoriteIds,
    toggleFavorite,
    updateUserPrompt,
    ui.toast,
    setSelectionMode,
  ]);

  const handleBulkDelete = useCallback(async () => {
    const customs = selectedPrompts.filter(
      (p): p is CustomPrompt => p.source === "custom",
    );
    const skipped = selectedPrompts.length - customs.length;
    if (customs.length === 0) {
      if (skipped > 0) toast.message(ui.toast.bulkDeleteSkippedLibrary(skipped));
      return;
    }
    try {
      await Promise.all(customs.map((p) => deleteUserPrompt(p.id)));
      toast.success(ui.toast.bulkDeleted(customs.length));
      if (skipped > 0) toast.message(ui.toast.bulkDeleteSkippedLibrary(skipped));
      setSelectionMode(false);
    } catch {
      toast.error(ui.toast.deleteFailed);
    }
  }, [selectedPrompts, deleteUserPrompt, ui.toast, setSelectionMode]);

  const handleConfirmDeleteFolder = useCallback(async () => {
    if (!folderPendingDelete) return;
    const target = folderPendingDelete;
    setFolderPendingDelete(null);
    try {
      await deleteFolder(target.id);
      toast.success(ui.toast.folderDeleted);
      if (openFolder?.id === target.id) setOpenFolder(null);
    } catch {
      toast.error(ui.toast.folderDeleteFailed);
    }
  }, [folderPendingDelete, deleteFolder, ui.toast, openFolder]);

  // Keep the open folder drawer in sync with store updates (rename, add/remove).
  const openFolderLive = useMemo(
    () =>
      openFolder ? folders.find((f) => f.id === openFolder.id) ?? null : null,
    [openFolder, folders],
  );

  return (
    <>
      <Suspense fallback={null}>
        <CreatePromptUrlSync onDiscover={handleDiscoverCreateQuery} />
      </Suspense>
      <PageShell
        title={ui.pageTitle}
        description={ui.pageDescription}
        actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={openPalette}
            aria-label={ui.header.commandPaletteHint}
          >
            <Search className="h-4 w-4" />
            {ui.header.commandPaletteShortcut}
          </Button>
          {isPromptTab && !selectionMode && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setSelectionMode(true, "manage")}
            >
              <ListChecks className="h-4 w-4" />
              {ui.selection.select}
            </Button>
          )}
          <Button
            size="sm"
            className="gap-2"
            onClick={() => openCreatePromptModal("pick")}
          >
            <Plus className="h-4 w-4" />
            {ui.header.createPrompt}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2 border-b overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors -mb-px border-b-2 shrink-0",
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isPromptTab && (
          <>
            <TopCategoryRail
              prompts={poolForRail}
              activeTopCategory={activeTopCategory}
              onSelect={setTopCategory}
            />

            <AiKnowledgeFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeTopCategory={activeTopCategory}
              onTopCategoryChange={setTopCategory}
              activeSubCategorySlug={activeSubCategorySlug}
              onSubCategoryChange={setSubCategorySlug}
              activeTag={activeTag}
              onTagChange={setActiveTag}
              availableTags={availableTags}
              categories={categories}
              layout={layout}
              onLayoutChange={setLayout}
              onClear={resetFilters}
              onOpenPalette={openPalette}
            />

            {!selectionMode && (
              <FolderQuickStrip
                folders={folders}
                onOpenFolder={handleOpenFolder}
                onSeeAll={() => setActiveTab("folders")}
              />
            )}
          </>
        )}

        {activeTab === "activity" ? (
          <div className="space-y-5">
            <ActivityStatsStrip
              runCount={recentRuns.length}
              myPromptsCount={userPrompts.length}
              favoritesCount={favoritesCount}
            />
            <RunActivityPanel
              library={library}
              userPrompts={userPrompts}
              recentRuns={recentRuns}
              isRefreshing={runsRefreshing}
              onRefresh={handleRefreshRuns}
              onOpenRun={openRun}
              onOpenPrompt={(id) => setSelectedPromptId(id)}
            />
          </div>
        ) : activeTab === "folders" ? (
          <FoldersTab
            folders={folders}
            isLoading={isLoading && !foldersLoaded}
            onOpenFolder={handleOpenFolder}
            onNewFolder={handleStartNewFolder}
            onDeleteFolder={setFolderPendingDelete}
          />
        ) : (
          <PromptGrid
            prompts={visible}
            layout={layout}
            favoriteIds={favoriteIds}
            isLoading={isLoading && !libraryLoaded}
            isError={Boolean(lastError)}
            errorMessage={lastError}
            activeTab={activeTab}
            showClearFiltersWhenEmpty={poolForRail.length > 0}
            selectable={selectionMode}
            selectedSet={selectedSet}
            onToggleSelect={handleToggleSelect}
            onOpen={handleOpen}
            onRun={handleRun}
            onToggleFavorite={handleToggleFavorite}
            onFork={handleFork}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onResetFilters={resetFilters}
          />
        )}
      </div>

      <PromptDetailDrawer
        prompt={selectedPrompt}
        open={selectedPrompt !== null}
        onClose={() => setSelectedPromptId(null)}
        isFavorite={
          selectedPrompt?.source === "library"
            ? favoriteIds.includes(selectedPrompt.id)
            : selectedPrompt?.source === "custom"
              ? selectedPrompt.is_favorite
              : false
        }
        onToggleFavorite={handleToggleFavorite}
        onRun={handleRun}
        onCopyBody={handleCopyBody}
        onFork={handleFork}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AiKnowledgeCommandPalette
        open={isPaletteOpen}
        onOpenChange={(v) => (v ? openPalette() : closePalette())}
        library={library}
        userPrompts={userPrompts}
        recentRuns={recentRuns}
        onSelectPrompt={(p) => setSelectedPromptId(p.id)}
        onSwitchTab={setActiveTab}
        onSelectTopCategory={(top) => setTopCategory(top)}
        onCreatePrompt={() => openCreatePromptModal("pick")}
        onResetFilters={resetFilters}
      />

      <CustomPromptEditDrawer
        prompt={editPrompt}
        open={editPrompt !== null}
        onClose={() => setEditPrompt(null)}
      />
    </PageShell>

      <CreatePromptModal
        key={createModalOpen ? createModalInitial : "idle"}
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        initialStep={createModalInitial}
        onCreated={handleCreatedPrompt}
      />

      {selectionMode && (
        <PromptSelectionToolbar
          count={selectedPromptIds.length}
          deletableCount={selectedCustomCount}
          intent={selectionIntent}
          onAddToFolder={() => setAddToFolderOpen(true)}
          onAddFavorites={handleBulkFavorite}
          onDelete={handleBulkDelete}
          onCancel={() => setSelectionMode(false)}
        />
      )}

      <AddToFolderDialog
        open={addToFolderOpen}
        onOpenChange={setAddToFolderOpen}
        prompts={selectedPrompts}
        startInCreate={selectionIntent === "new_folder"}
        onDone={() => setSelectionMode(false)}
      />

      <FolderDetailDrawer
        key={openFolder?.id ?? "none"}
        folder={openFolderLive}
        open={openFolder !== null}
        onClose={() => setOpenFolder(null)}
        onOpenPrompt={(p) => {
          setOpenFolder(null);
          setSelectedPromptId(p.id);
        }}
        onRunPrompt={handleRun}
        onAddPrompts={handleAddPromptsToFolder}
        onDeleteFolder={setFolderPendingDelete}
      />

      <AlertDialog
        open={folderPendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setFolderPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ui.folders.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {folderPendingDelete
                ? ui.folders.deleteConfirmBody(folderPendingDelete.name)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ui.selection.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDeleteFolder}
            >
              {ui.folders.deleteConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Internal: prompt grid/list with loading + empty + error states
// ---------------------------------------------------------------------------

type PromptGridTab = Exclude<PromptSurfaceTab, "activity" | "folders">;

interface PromptGridProps {
  prompts: AnyPrompt[];
  layout: "grid" | "list";
  favoriteIds: string[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  activeTab: PromptGridTab;
  /** When the grid is empty because search/category filters hide rows, offer reset. */
  showClearFiltersWhenEmpty: boolean;
  selectable: boolean;
  selectedSet: Set<string>;
  onToggleSelect: (prompt: AnyPrompt) => void;
  onOpen: (prompt: AnyPrompt) => void;
  onRun: (prompt: AnyPrompt) => void;
  onToggleFavorite: (prompt: AnyPrompt) => void;
  onFork: (prompt: LibraryPrompt) => void;
  onEdit: (prompt: CustomPrompt) => void;
  onDelete: (prompt: CustomPrompt) => void;
  onResetFilters: () => void;
}

function PromptGrid({
  prompts,
  layout,
  favoriteIds,
  isLoading,
  isError,
  errorMessage,
  activeTab,
  showClearFiltersWhenEmpty,
  selectable,
  selectedSet,
  onToggleSelect,
  onOpen,
  onRun,
  onToggleFavorite,
  onFork,
  onEdit,
  onDelete,
  onResetFilters,
}: PromptGridProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);

  if (isLoading) {
    return <PromptGridSkeleton layout={layout} />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={Sparkles}
        title={ui.states.errorTitle}
        description={errorMessage || ui.states.errorBodyGeneric}
      />
    );
  }

  if (prompts.length === 0) {
    const titles: Record<PromptGridTab, string> = {
      library: ui.states.emptyLibraryTitle,
      my_prompts: ui.states.emptyMyPromptsTitle,
      favorites: ui.states.emptyFavoritesTitle,
      recent: ui.states.emptyRecentTitle,
    };
    const descriptions: Record<PromptGridTab, string> = {
      library: ui.states.emptyLibraryDescription,
      my_prompts: ui.states.emptyMyPromptsDescription,
      favorites: ui.states.emptyFavoritesDescription,
      recent: ui.states.emptyRecentDescription,
    };
    return (
      <EmptyState
        icon={Sparkles}
        title={titles[activeTab]}
        description={descriptions[activeTab]}
        action={
          showClearFiltersWhenEmpty
            ? { label: ui.filters.clearFilters, onClick: onResetFilters }
            : undefined
        }
      />
    );
  }

  if (layout === "list") {
    return (
      <ul className="flex flex-col gap-2">
        {prompts.map((p) => {
          const isFav =
            p.source === "library"
              ? favoriteIds.includes(p.id)
              : p.is_favorite;
          return (
            <PromptListRow
              key={p.id}
              prompt={p}
              isFavorite={isFav}
              selectable={selectable}
              selected={selectedSet.has(p.id)}
              onToggleSelect={onToggleSelect}
              onOpen={onOpen}
              onRun={onRun}
              onToggleFavorite={onToggleFavorite}
              onFork={p.source === "library" ? onFork : undefined}
              onEdit={p.source === "custom" ? onEdit : undefined}
              onDelete={p.source === "custom" ? onDelete : undefined}
            />
          );
        })}
      </ul>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {prompts.map((p) => {
        const isFav =
          p.source === "library" ? favoriteIds.includes(p.id) : p.is_favorite;
        return (
          <PromptCard
            key={p.id}
            prompt={p}
            isFavorite={isFav}
            selectable={selectable}
            selected={selectedSet.has(p.id)}
            onToggleSelect={onToggleSelect}
            onOpen={onOpen}
            onRun={onRun}
            onToggleFavorite={onToggleFavorite}
            onFork={p.source === "library" ? onFork : undefined}
            onEdit={p.source === "custom" ? onEdit : undefined}
            onDelete={p.source === "custom" ? onDelete : undefined}
          />
        );
      })}
    </div>
  );
}

function PromptGridSkeleton({ layout }: { layout: "grid" | "list" }) {
  const items = Array.from({ length: 8 });
  if (layout === "list") {
    return (
      <ul className="flex flex-col gap-2">
        {items.map((_, i) => (
          <li
            key={i}
            className="h-16 animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/5"
          />
        ))}
      </ul>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((_, i) => (
        <div
          key={i}
          className="h-48 animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/5"
        />
      ))}
    </div>
  );
}
