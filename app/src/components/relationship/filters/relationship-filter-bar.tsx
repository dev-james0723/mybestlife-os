"use client";

/**
 * Filter bar for the Relationship gallery.
 *
 * Built on top of the shared `<FilterBar>` so search/sort styling stays
 * consistent with the rest of the app, but adds:
 *   - A "Favorites only" toggle button (the shared bar doesn't have a
 *     boolean chip slot, and we want it visually distinct anyway).
 *   - A "Clear filters" link that's only shown when at least one filter
 *     is non-default. Reduces noise in the resting state.
 */

import { useMemo } from "react";
import { FilterBar } from "@/components/shared/filter-bar";
import { OSControl } from "@/components/ui/os-primitives";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getRelationshipUiCopy } from "@/lib/i18n/relationship-ui";
import {
  CATEGORY_DROPDOWN_ORDER,
  RELATIONSHIP_SORT_KEYS,
  STRENGTH_DROPDOWN_ORDER,
  getCategoryLabel,
  getSortLabel,
  getStrengthLabel,
  type RelationshipFilters,
  type RelationshipSortKey,
} from "@/components/relationship/utils/relationship-display";

type Props = {
  filters: RelationshipFilters;
  onFiltersChange: (next: RelationshipFilters) => void;
  sort: RelationshipSortKey;
  onSortChange: (next: RelationshipSortKey) => void;
};

export function RelationshipFilterBar({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);

  const categoryOptions = useMemo(
    () =>
      CATEGORY_DROPDOWN_ORDER.map((slug) => ({
        value: slug,
        label: getCategoryLabel(slug, copy),
      })),
    [copy],
  );

  const strengthOptions = useMemo(
    () =>
      STRENGTH_DROPDOWN_ORDER.map((slug) => ({
        value: slug,
        label: getStrengthLabel(slug, copy),
      })),
    [copy],
  );

  const sortOptions = useMemo(
    () =>
      RELATIONSHIP_SORT_KEYS.map((k) => ({
        value: k,
        label: getSortLabel(k, copy),
      })),
    [copy],
  );

  const isDirty =
    filters.search !== "" ||
    filters.category !== "all" ||
    filters.strength !== "all" ||
    filters.favoritesOnly;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <FilterBar
        search={{
          placeholder: copy.relSearchPlaceholder,
          value: filters.search,
          onChange: (v) => onFiltersChange({ ...filters, search: v }),
        }}
        filters={[
          {
            key: "category",
            label: copy.relFilterCategory,
            options: categoryOptions,
            value: filters.category,
          },
          {
            key: "strength",
            label: copy.relFilterStrength,
            options: strengthOptions,
            value: filters.strength,
          },
        ]}
        onFilterChange={(key, value) => {
          if (key === "category") {
            onFiltersChange({
              ...filters,
              category: value === "all" ? "all" : (value as typeof filters.category),
            });
          } else if (key === "strength") {
            onFiltersChange({
              ...filters,
              strength: value === "all" ? "all" : (value as typeof filters.strength),
            });
          }
        }}
        sort={{
          options: sortOptions,
          value: sort,
          onChange: (v) => onSortChange(v as RelationshipSortKey),
        }}
      />

      <OSControl
        type="button"
        variant={filters.favoritesOnly ? "default" : "outline"}
        className={cn(
          "gap-1.5",
          filters.favoritesOnly && "bg-amber-500 hover:bg-amber-500/90",
        )}
        onClick={() =>
          onFiltersChange({ ...filters, favoritesOnly: !filters.favoritesOnly })
        }
        aria-pressed={filters.favoritesOnly}
      >
        <Star
          className="h-3.5 w-3.5"
          fill={filters.favoritesOnly ? "currentColor" : "none"}
          strokeWidth={filters.favoritesOnly ? 1.5 : 2}
        />
        {copy.relFilterFavoritesOnly}
      </OSControl>

      {isDirty && (
        <OSControl
          type="button"
          variant="ghost"
          className="gap-1 text-muted-foreground hover:text-foreground"
          onClick={() =>
            onFiltersChange({
              search: "",
              category: "all",
              strength: "all",
              favoritesOnly: false,
            })
          }
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          {copy.relFilterClear}
        </OSControl>
      )}
    </div>
  );
}
