"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OSControl, OSFrostedPanel } from "@/components/ui/os-primitives";
import type { NoteFilterState, NoteSortKey } from "@/lib/notes/note-filters";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";
import type { Project } from "@/types/database";

function selectClassName() {
  return "h-11 min-h-11 rounded-lg border border-input bg-background/40 px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-8 sm:min-h-0 dark:bg-input/30";
}

export function NotesTopControlBar({
  copy,
  filter,
  onFilterChange,
  projects,
  tags,
  sortKey,
  onSortChange,
  activeFilterCount,
  onClearFilters,
}: {
  copy: NotesUiCopy;
  filter: NoteFilterState;
  onFilterChange: (patch: Partial<NoteFilterState>) => void;
  projects: Pick<Project, "id" | "name">[];
  tags: string[];
  sortKey: NoteSortKey;
  onSortChange: (next: NoteSortKey) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
}) {
  return (
    <OSFrostedPanel className="p-3" data-notes-reveal>
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter.search}
            onChange={(event) => onFilterChange({ search: event.target.value })}
            placeholder={copy.searchPlaceholder}
            className="bg-background/40 pl-8"
          />
        </div>
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 xl:justify-end">
          <select
            value={filter.projectId}
            onChange={(event) => onFilterChange({ projectId: event.target.value })}
            className={selectClassName()}
            aria-label={copy.projectLabel}
          >
            <option value="all">{copy.allProjects}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={filter.tag}
            onChange={(event) => onFilterChange({ tag: event.target.value })}
            className={selectClassName()}
            aria-label={copy.tagsLabel}
          >
            <option value="all">{copy.allTags}</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={(event) => onSortChange(event.target.value as NoteSortKey)}
            className={selectClassName()}
            aria-label="Sort"
          >
            <option value="updated_at">{copy.sortRecent}</option>
            <option value="created_at">{copy.sortCreated}</option>
            <option value="title">{copy.sortTitle}</option>
          </select>
          <OSControl
            type="button"
            onClick={onClearFilters}
            disabled={activeFilterCount === 0}
          >
            {activeFilterCount > 0 ? (
              <X className="h-4 w-4" />
            ) : (
              <SlidersHorizontal className="h-4 w-4" />
            )}
            <span>{copy.clearFilters}</span>
          </OSControl>
        </div>
      </div>
    </OSFrostedPanel>
  );
}
