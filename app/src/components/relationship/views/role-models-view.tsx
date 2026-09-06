"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PageShell } from "@/components/shared/page-shell";
import { FilterBar, type ViewMode } from "@/components/shared/filter-bar";
import { LoadingPage } from "@/components/shared/loading-state";
import {
  OSActionRow,
  OSControl,
  OSEmptyState,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import { osDialogSurfaceClassName } from "@/components/ui/os-glass";
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
import { Plus, SearchX, Sparkles, UserRound } from "lucide-react";
import {
  useRoleModels,
  useCreateRoleModel,
  useUpdateRoleModel,
  useDeleteRoleModel,
} from "@/hooks/use-role-models";
import { useProjects } from "@/hooks/use-projects";
import { useGoals } from "@/hooks/use-goals";
import { useNotes } from "@/hooks/use-notes";
import { useTasks } from "@/hooks/use-tasks";
import { useAppStore } from "@/stores/app-store";
import {
  formatRelationshipCopy,
  getRelationshipUiCopy,
} from "@/lib/i18n/relationship-ui";
import { RoleModelEmptyState } from "@/components/relationship/empty-states";
import { RoleModelCard } from "@/components/relationship/role-model-card";
import { RoleModelPhoto } from "@/components/relationship/role-model-photo";
import { RoleModelForm } from "@/components/relationship/role-model-form";
import { RoleModelIntelligenceModal } from "@/components/relationship/role-models/role-model-intelligence-modal";
import { RoleModelPatternBanner } from "@/components/relationship/role-models/role-model-pattern-banner";
import { useRoleModelContextBuilder } from "@/hooks/use-role-model-context-builder";
import { useRoleModelTalk } from "@/hooks/use-role-model-talk";
import { useAboutMe } from "@/hooks/use-about-me";
import {
  deleteRoleModelPhoto,
  isRoleModelStorageUrl,
} from "@/lib/role-models/photo-storage";
import { ROLE_MODEL_SUGGESTED_CATEGORIES } from "@/types/role-model";
import type { RoleModel } from "@/types/database";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type RoleModelsViewProps = {
  /**
   * When true, renders without the outer PageShell (the container provides
   * its own header).
   */
  embedded?: boolean;
};

type SortBy = "created_at" | "name" | "favorites_first";

type FilterState = {
  search: string;
  sortBy: SortBy;
  category: string | null;
  favoritesOnly: boolean;
  viewMode: ViewMode;
};

const DEFAULT_FILTERS: FilterState = {
  search: "",
  sortBy: "created_at",
  category: null,
  favoritesOnly: false,
  viewMode: "grid",
};

export function RoleModelsView({ embedded = false }: RoleModelsViewProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);

  const { data: roleModels, isLoading } = useRoleModels();
  const { data: projects } = useProjects();
  const { data: goals } = useGoals();
  const { data: notes } = useNotes();
  const { data: tasks } = useTasks();
  const { data: aboutMe } = useAboutMe();
  const createRoleModel = useCreateRoleModel();
  const updateRoleModel = useUpdateRoleModel();
  const deleteRoleModel = useDeleteRoleModel();

  // Intelligence Hub: compact Life OS context + "Talk To {name}" routing.
  const buildContext = useRoleModelContextBuilder();
  const talk = useRoleModelTalk(buildContext, {
    enabled: (roleModels?.length ?? 0) > 0,
  });

  const patternRoster = useMemo(
    () =>
      (roleModels ?? []).map((rm) => ({
        id: rm.id,
        name: rm.name,
        category: rm.category,
        blurb: rm.admiration_blurb,
      })),
    [roleModels],
  );
  const aboutMeForPattern = useMemo(
    () =>
      aboutMe
        ? {
            mission: aboutMe.mission,
            coreValues: aboutMe.core_values,
            personality: aboutMe.personality_insights,
          }
        : null,
    [aboutMe],
  );

  // Sort options. `favorites_first` is offered only when the user has at
  // least one favorite, otherwise it would be confusing — the option would
  // exist but have no observable effect.
  const hasAnyFavorite = useMemo(
    () => roleModels?.some((m) => m.is_favorite) ?? false,
    [roleModels],
  );
  const sortOptions = useMemo(() => {
    const base: { value: SortBy; label: string }[] = [
      { value: "created_at", label: copy.rmSortRecentlyAdded },
      { value: "name", label: copy.rmSortName },
    ];
    if (hasAnyFavorite) {
      base.unshift({
        value: "favorites_first",
        label: copy.rmSortFavoritesFirst,
      });
    }
    return base;
  }, [copy.rmSortName, copy.rmSortRecentlyAdded, copy.rmSortFavoritesFirst, hasAnyFavorite]);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<RoleModel | null>(null);
  const [editingFromDetail, setEditingFromDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ---------------------------------------------------------------------------
  // Memoized lookups
  // ---------------------------------------------------------------------------

  const projectMap = useMemo(() => {
    const m = new Map<string, string>();
    projects?.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [projects]);

  const goalMap = useMemo(() => {
    const m = new Map<string, string>();
    goals?.forEach((g) => m.set(g.id, g.name));
    return m;
  }, [goals]);

  const noteMap = useMemo(() => {
    const m = new Map<string, string>();
    notes?.forEach((n) => m.set(n.id, n.title));
    return m;
  }, [notes]);

  // The list of categories actually present in the user's role models, plus
  // suggested ones — keeps the chip row reflective of the real data.
  const categoriesInUse = useMemo(() => {
    const set = new Set<string>();
    roleModels?.forEach((rm) => {
      if (rm.category) set.add(rm.category);
    });
    // Always include the curated taxonomy first so the chip order is stable.
    const ordered: string[] = [];
    for (const c of ROLE_MODEL_SUGGESTED_CATEGORIES) {
      if (set.has(c)) {
        ordered.push(c);
        set.delete(c);
      }
    }
    // Tail with any user-defined categories.
    return [...ordered, ...Array.from(set).sort()];
  }, [roleModels]);

  // ---------------------------------------------------------------------------
  // Filtering & sorting
  // ---------------------------------------------------------------------------

  const filtered = useMemo(() => {
    if (!roleModels) return [];
    let list = roleModels;

    if (filters.favoritesOnly) {
      list = list.filter((m) => m.is_favorite);
    }

    if (filters.category) {
      list = list.filter((m) => m.category === filters.category);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((m) => {
        if (m.name.toLowerCase().includes(q)) return true;
        if (m.bio?.toLowerCase().includes(q)) return true;
        if (m.description?.toLowerCase().includes(q)) return true;
        if (m.admiration_blurb?.toLowerCase().includes(q)) return true;
        if (m.tags.some((t) => t.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (filters.sortBy === "name") return a.name.localeCompare(b.name);
      if (filters.sortBy === "favorites_first") {
        // Favorites bubble to the top; within each bucket fall back to
        // most-recently-added so the rail order matches the recent-add order.
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return sorted;
  }, [roleModels, filters]);

  const favorites = useMemo(
    () => (roleModels ?? []).filter((m) => m.is_favorite),
    [roleModels],
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  // If the user picked "favorites first" but then un-favorited the last
  // entry, demote the sort to recently-added so the dropdown isn't stuck on
  // an option that's no longer offered.
  useEffect(() => {
    if (filters.sortBy === "favorites_first" && !hasAnyFavorite) {
      // Intentional filter cleanup after the last favorite is removed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilters((f) => ({ ...f, sortBy: "created_at" }));
    }
  }, [filters.sortBy, hasAnyFavorite]);

  const handleSortChange = useCallback((value: string) => {
    setFilters((f) => ({
      ...f,
      sortBy:
        value === "name" || value === "favorites_first" ? value : "created_at",
    }));
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setFilters((f) => ({ ...f, search: value }));
  }, []);

  const handleCategorySelect = useCallback((category: string | null) => {
    setFilters((f) => ({ ...f, category }));
  }, []);

  const handleFavoritesToggle = useCallback(() => {
    setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }));
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setFilters((f) => ({ ...f, viewMode: mode }));
  }, []);

  const handleCreateSubmit = async (payload: Parameters<typeof createRoleModel.mutateAsync>[0]) => {
    if (!payload.name) return;
    await createRoleModel.mutateAsync(payload);
    setShowCreate(false);
  };

  const handleEditSubmit = async (payload: Parameters<typeof createRoleModel.mutateAsync>[0]) => {
    if (!selected) return;
    await updateRoleModel.mutateAsync({ id: selected.id, data: payload });
    setEditingFromDetail(false);
  };

  const handleToggleFavorite = (rm: RoleModel) => {
    updateRoleModel.mutate(
      {
        id: rm.id,
        data: { is_favorite: !rm.is_favorite },
      },
      {
        onError: () =>
          toast.error(copy.rmAutoFillErrorGeneric /* generic failure label */),
      },
    );
    if (selected?.id === rm.id) {
      setSelected({ ...rm, is_favorite: !rm.is_favorite });
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    // Snapshot the photo URL before the row disappears from the cache so we
    // can clean up the storage object after the DB delete succeeds. Storage
    // cleanup is best-effort: a failure leaves an orphan object but never
    // blocks or rolls back the DB delete.
    const photoToCleanUp = selected.photo_url ?? selected.image_url ?? null;
    await deleteRoleModel.mutateAsync(selected.id);
    if (photoToCleanUp && isRoleModelStorageUrl(photoToCleanUp)) {
      void deleteRoleModelPhoto(photoToCleanUp);
    }
    setSelected(null);
    setShowDeleteConfirm(false);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) return <LoadingPage />;

  const addButton = (
    <OSPrimaryAction onClick={() => setShowCreate(true)}>
      <Plus className="h-4 w-4 mr-2" />
      {copy.rmAdd}
    </OSPrimaryAction>
  );

  const noResultsAfterFilters = (roleModels?.length ?? 0) > 0 && filtered.length === 0;
  const isEmptyEntirely = (roleModels?.length ?? 0) === 0;

  // Favorites rail: a horizontal strip above the main grid that surfaces the
  // user's most-loved role models for quick re-entry. Only rendered when:
  //  • at least one favorite exists,
  //  • the user isn't currently filtering/searching (rail would be confusing
  //    next to a scoped grid),
  //  • the active sort isn't already "favorites first" (it would duplicate
  //    the visual signal).
  const isFilteringOrSearching =
    !!filters.search ||
    !!filters.category ||
    filters.favoritesOnly ||
    filters.sortBy !== "created_at";
  const showFavoritesRail =
    favorites.length > 0 && !isFilteringOrSearching && filters.viewMode === "grid";

  const body = (
    <div className="space-y-4">
      {!isEmptyEntirely && (
        <RoleModelPatternBanner
          roster={patternRoster}
          aboutMe={aboutMeForPattern}
          onAddRoleModel={() => setShowCreate(true)}
        />
      )}

      <FilterBar
        search={{
          placeholder: copy.rmSearchPlaceholder,
          value: filters.search,
          onChange: handleSearchChange,
        }}
        sort={{
          options: sortOptions,
          value: filters.sortBy,
          onChange: handleSortChange,
        }}
        viewModes={["grid", "list"]}
        activeViewMode={filters.viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {(categoriesInUse.length > 0 || hasAnyFavorite) && (
        <CategoryChipsRow
          allLabel={copy.rmFilterAllCategories}
          favoritesLabel={copy.rmFilterFavoritesOnly}
          favoriteAvailable={hasAnyFavorite}
          favoritesActive={filters.favoritesOnly}
          onToggleFavorites={handleFavoritesToggle}
          categories={categoriesInUse}
          selectedCategory={filters.category}
          onSelectCategory={handleCategorySelect}
          categoryLabel={(slug) => readableCategory(slug, copy)}
        />
      )}

      {showFavoritesRail && (
        <FavoritesRail
          title={copy.rmFavoritesRailTitle}
          favorites={favorites}
          onSelect={(rm) => setSelected(rm)}
          onToggleFavorite={(rm) => handleToggleFavorite(rm)}
          favoriteAddAria={copy.rmFavoriteAddAria}
          favoriteRemoveAria={copy.rmFavoriteRemoveAria}
          openItemAriaTemplate={copy.rmFavoritesRailItemAria}
        />
      )}

      {isEmptyEntirely ? (
        <RoleModelEmptyState onAction={() => setShowCreate(true)} />
      ) : noResultsAfterFilters ? (
        <OSEmptyState
          icon={SearchX}
          title={copy.rmEmptyTitle}
          description={copy.rmEmptyDescNoResults}
          action={
            <OSControl
              variant="ghost"
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  search: "",
                  category: null,
                  favoritesOnly: false,
                }))
              }
            >
              {copy.rmFilterClear}
            </OSControl>
          }
        />
      ) : (
        <div
          className={
            filters.viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-2"
          }
        >
          {filtered.map((rm) => (
            <RoleModelCard
              key={rm.id}
              roleModel={rm}
              onClick={() => setSelected(rm)}
              onToggleFavorite={() => handleToggleFavorite(rm)}
              onTalk={() => talk.talk(rm)}
              compact={filters.viewMode === "list"}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {embedded ? (
        <EmbeddedHeader actions={addButton}>{body}</EmbeddedHeader>
      ) : (
        <PageShell
          title={copy.rmPageTitle}
          description={copy.rmPageDescription}
          actions={addButton}
        >
          {body}
        </PageShell>
      )}

      {/* Create */}
      <RoleModelForm
        open={showCreate}
        mode="create"
        initial={null}
        projects={projects ?? []}
        goals={goals ?? []}
        notes={notes ?? []}
        tasks={tasks ?? []}
        isSaving={createRoleModel.isPending}
        onClose={() => setShowCreate(false)}
        onSubmit={({ payload }) => handleCreateSubmit(payload)}
      />

      {/* Edit (launched from detail) */}
      <RoleModelForm
        open={editingFromDetail && !!selected}
        mode="edit"
        initial={selected}
        projects={projects ?? []}
        goals={goals ?? []}
        notes={notes ?? []}
        tasks={tasks ?? []}
        isSaving={updateRoleModel.isPending}
        onClose={() => setEditingFromDetail(false)}
        onSubmit={({ payload }) => handleEditSubmit(payload)}
        onDelete={() => {
          setEditingFromDetail(false);
          setShowDeleteConfirm(true);
        }}
      />

      {/* Intelligence Modal (replaces the legacy side panel) */}
      <RoleModelIntelligenceModal
        open={!!selected && !editingFromDetail}
        roleModel={selected}
        projectMap={projectMap}
        goalMap={goalMap}
        noteMap={noteMap}
        onClose={() => setSelected(null)}
        onEdit={() => setEditingFromDetail(true)}
        onDelete={() => setShowDeleteConfirm(true)}
        onToggleFavorite={
          selected ? () => handleToggleFavorite(selected) : undefined
        }
        onTalk={(rm, opts) => talk.talk(rm, opts)}
        buildContext={buildContext}
      />

      {/* Neural Skill generation confirm (when no preset/saved lens exists) */}
      <AlertDialog
        open={!!talk.pending}
        onOpenChange={(v) => {
          if (!v) talk.cancelGenerate();
        }}
      >
        <AlertDialogContent className={osDialogSurfaceClassName}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Create a Mind Council lens from {talk.pending?.rm.name ?? "this Role Model"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              We&apos;ll distill {talk.pending?.rm.name ?? "them"} into a reusable Neural Skill — an
              interpretive thinking lens grounded in your Life OS — then open the chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={talk.isGenerating} className="min-h-11 rounded-xl">
              {copy.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void talk.confirmGenerate();
              }}
              disabled={talk.isGenerating}
              className="min-h-11 rounded-xl"
            >
              {talk.isGenerating ? "Generating…" : "Generate Neural Skill"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className={osDialogSurfaceClassName}>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.rmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {formatRelationshipCopy(copy.rmDeleteDescription, {
                name: selected?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">
              {copy.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="min-h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {copy.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function CategoryChipsRow({
  allLabel,
  favoritesLabel,
  favoriteAvailable,
  favoritesActive,
  onToggleFavorites,
  categories,
  selectedCategory,
  onSelectCategory,
  categoryLabel,
}: {
  allLabel: string;
  favoritesLabel: string;
  favoriteAvailable: boolean;
  favoritesActive: boolean;
  onToggleFavorites: () => void;
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
  categoryLabel: (slug: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ChipButton
        active={!selectedCategory}
        onClick={() => onSelectCategory(null)}
      >
        {allLabel}
      </ChipButton>
      {categories.map((c) => (
        <ChipButton
          key={c}
          active={selectedCategory === c}
          onClick={() => onSelectCategory(selectedCategory === c ? null : c)}
        >
          {categoryLabel(c)}
        </ChipButton>
      ))}
      {favoriteAvailable && (
        <>
          <span aria-hidden className="mx-1 h-6 w-px bg-border" />
          <ChipButton
            active={favoritesActive}
            onClick={onToggleFavorites}
            tone="primary"
          >
            <Sparkles
              className="h-3 w-3 mr-1 inline"
              fill={favoritesActive ? "currentColor" : "none"}
            />
            {favoritesLabel}
          </ChipButton>
        </>
      )}
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
  tone = "neutral",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "neutral" | "primary";
}) {
  const activeStyles =
    tone === "primary"
      ? "border-transparent bg-primary text-primary-foreground"
      : "border-transparent bg-secondary text-secondary-foreground";
  const inactiveStyles =
    "border-border bg-background text-foreground hover:bg-muted";

  return (
    <button data-control-variant="outline" data-selected={active}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-normal transition-colors",
        "min-h-11",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        active ? activeStyles : inactiveStyles,
      )}
    >
      {children}
    </button>
  );
}

// ----------------------------------------------------------------------------
// Favorites rail
// ----------------------------------------------------------------------------
//
// A horizontal strip surfacing the user's starred role models. Designed to
// feel like a "shelf" — small, glanceable, and decoupled from the main grid.
// On mobile it scrolls horizontally so we never have to wrap; on larger
// viewports the available width usually fits all favorites without scroll.
function FavoritesRail({
  title,
  favorites,
  onSelect,
  onToggleFavorite,
  favoriteAddAria,
  favoriteRemoveAria,
  openItemAriaTemplate,
}: {
  title: string;
  favorites: RoleModel[];
  onSelect: (rm: RoleModel) => void;
  onToggleFavorite: (rm: RoleModel) => void;
  favoriteAddAria: string;
  favoriteRemoveAria: string;
  /** Template for the avatar button's aria-label, contains a `{name}` token. */
  openItemAriaTemplate: string;
}) {
  return (
    <section
      className="space-y-2"
      aria-labelledby="role-model-favorites-rail-title"
    >
      <div className="flex items-center gap-2">
        <Sparkles
          className="h-3.5 w-3.5 text-primary"
          aria-hidden
          fill="currentColor"
        />
        <h3
          id="role-model-favorites-rail-title"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {title}
        </h3>
      </div>
      {/*
        Wrapper provides the soft "fade-out" gradient on the right edge as a
        scrollability hint. The mask is decorative-only and pointer-events:
        none so it never intercepts clicks on the rightmost card.
      */}
      <div className="relative">
        <div
          className={cn(
            "-mx-1 flex gap-3 overflow-x-auto px-1 pb-1",
            // Hide scrollbar visually on platforms that show one — the rail is
            // small enough that the overflow is discoverable via touch/swipe
            // and visible cards.
            "[scrollbar-width:thin]",
          )}
        >
          {favorites.map((rm) => (
            <FavoriteRailItem
              key={rm.id}
              roleModel={rm}
              onClick={() => onSelect(rm)}
              onToggleFavorite={() => onToggleFavorite(rm)}
              addLabel={favoriteAddAria}
              removeLabel={favoriteRemoveAria}
              openAriaTemplate={openItemAriaTemplate}
            />
          ))}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent"
        />
      </div>
    </section>
  );
}

function FavoriteRailItem({
  roleModel,
  onClick,
  onToggleFavorite,
  addLabel,
  removeLabel,
  openAriaTemplate,
}: {
  roleModel: RoleModel;
  onClick: () => void;
  onToggleFavorite: () => void;
  addLabel: string;
  removeLabel: string;
  openAriaTemplate: string;
}) {
  const photo = roleModel.photo_url ?? roleModel.image_url;
  const openLabel = formatRelationshipCopy(openAriaTemplate, {
    name: roleModel.name,
  });

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        onClick={onClick}
        title={roleModel.name}
        className={cn(
          "block rounded-xl p-1 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "hover:bg-muted/50",
        )}
        aria-label={openLabel}
      >
        {/*
          Base UI Avatar only treats <AvatarImage> as the image source for
          loading state. Our <RoleModelPhoto> never marks the image as loaded,
          so <AvatarFallback> would stay visible beside the photo (split
          circle). Use a plain masked circle instead.
        */}
        <div
          className={cn(
            "relative mx-auto h-14 w-14 overflow-hidden rounded-full bg-muted",
            "ring-2 ring-primary/25 transition-shadow",
            "group-hover:ring-primary/45",
          )}
        >
          {photo ? (
            /*
              Portrait-ish photos often leave the head small inside a square
              crop. Bias object-position upward, then scale from a point near
              the upper-center (typical face band) so the head reads larger and
              more centered — without real face detection.
            */
            <div className="absolute inset-0">
              <div className="absolute inset-0 origin-[50%_32%] scale-[1.22]">
                <RoleModelPhoto
                  src={photo}
                  alt=""
                  pixelSize={72}
                  objectPositionClassName="object-[center_14%]"
                  className="rounded-none"
                />
              </div>
            </div>
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
              <UserRound className="h-5 w-5" aria-hidden />
            </span>
          )}
        </div>
      </button>
      {/* Tap-target for un-favoriting from the rail without opening detail. */}
      <button data-control-variant="ghost"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        aria-label={roleModel.is_favorite ? removeLabel : addLabel}
        aria-pressed={roleModel.is_favorite}
        className={cn(
          "absolute -right-0.5 -top-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full",
          "bg-background/95 ring-1 ring-border/80 shadow-sm",
          "text-[#6b5420] hover:text-[#57431a] dark:text-[#c9a54e] dark:hover:text-[#ddb65e]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <Sparkles className="h-3.5 w-3.5" fill="currentColor" />
      </button>
    </div>
  );
}

function readableCategory(
  slug: string,
  copy: ReturnType<typeof getRelationshipUiCopy>,
): string {
  const map: Record<string, string> = {
    philosopher: copy.rmCategoryPhilosopher,
    scientist: copy.rmCategoryScientist,
    entrepreneur: copy.rmCategoryEntrepreneur,
    artist: copy.rmCategoryArtist,
    writer: copy.rmCategoryWriter,
    athlete: copy.rmCategoryAthlete,
    leader: copy.rmCategoryLeader,
    engineer: copy.rmCategoryEngineer,
    designer: copy.rmCategoryDesigner,
    musician: copy.rmCategoryMusician,
    activist: copy.rmCategoryActivist,
    teacher: copy.rmCategoryTeacher,
    explorer: copy.rmCategoryExplorer,
    spiritual: copy.rmCategorySpiritual,
    other: copy.rmCategoryOther,
  };
  return map[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

function EmbeddedHeader({
  actions,
  children,
}: {
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-start sm:justify-end">
        <OSActionRow>{actions}</OSActionRow>
      </div>
      {children}
    </div>
  );
}
