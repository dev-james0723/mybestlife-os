"use client";

/**
 * RelationshipsView
 *
 * The personal-CRM gallery: filter bar → optional empty/loading/error
 * states → responsive card grid → optional detail panel and form modal.
 *
 * Responsibilities:
 *   - Owns gallery filter + sort UI state (URL-sync is intentionally NOT
 *     done here — the page is reachable from the sidebar and from the
 *     Relationship container sub-tab; coupling to `?` params would cause
 *     the two entry points to drift. Could be added in a later phase
 *     once we settle on naming.)
 *   - Wires the React Query hooks for create / update / delete / favorite.
 *   - Translates between the gallery-side filter/sort state and the pure
 *     helpers in `utils/relationship-display.ts` (kept side-effect-free
 *     for testability).
 *   - Renders standalone (with PageShell) or embedded (without).
 */

import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Plus, RefreshCw } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { getRelationshipUiCopy } from "@/lib/i18n/relationship-ui";
import { RelationshipEmptyState } from "@/components/relationship/empty-states";
import { RelationshipCard } from "@/components/relationship/cards/relationship-card";
import { RelationshipFilterBar } from "@/components/relationship/filters/relationship-filter-bar";
import { RelationshipFormModal } from "@/components/relationship/forms/relationship-form-modal";
import { RelationshipDetailPanel } from "@/components/relationship/panel/relationship-detail-panel";
import {
  applyRelationshipFilters,
  sortRelationships,
  type RelationshipFilters,
  type RelationshipSortKey,
} from "@/components/relationship/utils/relationship-display";
import {
  useRelationships,
  useCreateRelationship,
  useUpdateRelationship,
  useDeleteRelationship,
  useToggleRelationshipFavorite,
} from "@/hooks/use-relationships";
import { useProjects } from "@/hooks/use-projects";
import {
  deleteRelationshipPhoto,
  isRelationshipStorageUrl,
} from "@/lib/relationships/photo-storage";
import type { Relationship } from "@/types/database";
import type { RelationshipInsert } from "@/types/relationship";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: RelationshipFilters = {
  search: "",
  category: "all",
  strength: "all",
  favoritesOnly: false,
};

const DEFAULT_SORT: RelationshipSortKey = "last_contact";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type RelationshipsViewProps = {
  /** When true, renders without the outer PageShell (the container provides its own header). */
  embedded?: boolean;
};

export function RelationshipsView({
  embedded = false,
}: RelationshipsViewProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const reduce = useReducedMotion();

  // ---- Data ----
  const {
    data: relationships,
    isLoading,
    isError,
    refetch,
  } = useRelationships();
  const { data: projects } = useProjects();
  const createMutation = useCreateRelationship();
  const updateMutation = useUpdateRelationship();
  const deleteMutation = useDeleteRelationship();
  const toggleFavoriteMutation = useToggleRelationshipFavorite();

  // ---- UI state ----
  const [filters, setFilters] = useState<RelationshipFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<RelationshipSortKey>(DEFAULT_SORT);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Relationship | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Look up the selected row from the live list (instead of holding a
  // stale snapshot) so the detail panel reflects optimistic updates.
  const selected = useMemo(
    () =>
      selectedId
        ? (relationships ?? []).find((r) => r.id === selectedId) ?? null
        : null,
    [selectedId, relationships],
  );

  // ---- Derived list ----
  const visibleRelationships = useMemo(() => {
    const filtered = applyRelationshipFilters(relationships ?? [], filters);
    return sortRelationships(filtered, sort);
  }, [relationships, filters, sort]);

  // ---- Handlers ----
  const handleCreate = useCallback(
    (payload: RelationshipInsert) => {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setFormOpen(false);
          setEditing(null);
        },
      });
    },
    [createMutation],
  );

  const handleUpdate = useCallback(
    (payload: RelationshipInsert) => {
      if (!editing) return;
      // If the user replaced the photo, best-effort-clean the previous
      // storage object. The form already does this on inline replacement,
      // but a second guard here covers the "remove photo" path on edit.
      if (
        editing.photo_url &&
        editing.photo_url !== payload.photo_url &&
        isRelationshipStorageUrl(editing.photo_url)
      ) {
        void deleteRelationshipPhoto(editing.photo_url);
      }
      updateMutation.mutate(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            setFormOpen(false);
            setEditing(null);
          },
        },
      );
    },
    [editing, updateMutation],
  );

  const handleDelete = useCallback(() => {
    if (!selected) return;
    if (selected.photo_url && isRelationshipStorageUrl(selected.photo_url)) {
      void deleteRelationshipPhoto(selected.photo_url);
    }
    deleteMutation.mutate(selected.id);
    setSelectedId(null);
  }, [selected, deleteMutation]);

  const handleToggleFavorite = useCallback(
    (r: Relationship) => {
      toggleFavoriteMutation.mutate({ id: r.id, next: !r.is_favorite });
    },
    [toggleFavoriteMutation],
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openEditFromDetail = useCallback(() => {
    if (!selected) return;
    setEditing(selected);
    setFormOpen(true);
  }, [selected]);

  // ---- Render ----
  const newButton = (
    <Button onClick={openCreate} size="sm">
      <Plus className="mr-1.5 h-3.5 w-3.5" />
      {copy.relNew}
    </Button>
  );

  let body: ReactNode;

  if (isLoading) {
    body = <LoadingPage />;
  } else if (isError) {
    body = (
      <ErrorPanel
        message={copy.relLoadError}
        retryLabel={copy.relLoadErrorRetry}
        onRetry={() => void refetch()}
      />
    );
  } else if ((relationships ?? []).length === 0) {
    body = <RelationshipEmptyState onAction={openCreate} />;
  } else if (visibleRelationships.length === 0) {
    body = (
      <NoResultsPanel
        title={copy.relNoResultsTitle}
        description={copy.relNoResultsDescription}
        clearLabel={copy.relFilterClear}
        onClear={() => setFilters(DEFAULT_FILTERS)}
      />
    );
  } else {
    body = (
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        role="list"
      >
        <AnimatePresence initial={false}>
          {visibleRelationships.map((r, index) => (
            <motion.div
              key={r.id}
              role="listitem"
              initial={
                reduce ? false : { opacity: 0, y: 6 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
              transition={{
                duration: 0.22,
                delay: reduce ? 0 : Math.min(index * 0.02, 0.12),
                ease: [0.16, 1, 0.3, 1] as const,
              }}
            >
              <RelationshipCard
                relationship={r}
                onClick={() => setSelectedId(r.id)}
                onToggleFavorite={() => handleToggleFavorite(r)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  const showFilterBar = !isLoading && !isError && (relationships ?? []).length > 0;

  const inner = (
    <div className="space-y-5">
      {showFilterBar && (
        <RelationshipFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
        />
      )}
      {body}

      <RelationshipFormModal
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        initial={editing ?? undefined}
        projects={projects ?? []}
        onSubmit={editing ? handleUpdate : handleCreate}
        isSubmitting={
          editing ? updateMutation.isPending : createMutation.isPending
        }
      />

      <RelationshipDetailPanel
        relationship={selected}
        projects={projects ?? []}
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        onEdit={openEditFromDetail}
        onDelete={handleDelete}
        onToggleFavorite={() => selected && handleToggleFavorite(selected)}
      />
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">{newButton}</div>
        {inner}
      </div>
    );
  }

  return (
    <PageShell
      title={copy.relPageTitle}
      description={copy.relPageDescription}
      actions={newButton}
    >
      {inner}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Inline state panels
// ---------------------------------------------------------------------------

function ErrorPanel({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
    >
      <p className="text-sm text-destructive">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        {retryLabel}
      </Button>
    </div>
  );
}

function NoResultsPanel({
  title,
  description,
  clearLabel,
  onClear,
}: {
  title: string;
  description: string;
  clearLabel: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button size="sm" variant="ghost" onClick={onClear}>
        {clearLabel}
      </Button>
    </div>
  );
}
