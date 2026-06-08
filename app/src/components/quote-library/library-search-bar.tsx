"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ArrowUpDown, Star, X } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useQuoteLibraryStore } from "@/stores/quote-library-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import type { QuoteSortKey } from "@/types/quote";
import { cn } from "@/lib/utils";
import {
  filterHorizontalScrollClassName,
  filterSearchControlClassName,
} from "@/components/shared/filter-scroll";

export function LibrarySearchBar() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const filters = useQuoteLibraryStore((s) => s.filters);
  const setFilters = useQuoteLibraryStore((s) => s.setFilters);
  const resetFilters = useQuoteLibraryStore((s) => s.resetFilters);
  const sort = useQuoteLibraryStore((s) => s.sort);
  const setSort = useQuoteLibraryStore((s) => s.setSort);

  const sortOptions: { value: QuoteSortKey; label: string }[] = useMemo(
    () => [
      { value: "created_at_desc", label: copy.sortNewest },
      { value: "created_at_asc", label: copy.sortOldest },
      { value: "source_author", label: copy.sortAuthor },
      { value: "category", label: copy.sortCategory },
      { value: "emotion_tone", label: copy.sortTone },
    ],
    [copy.sortAuthor, copy.sortCategory, copy.sortNewest, copy.sortOldest, copy.sortTone],
  );

  const hasActiveFilters =
    filters.search !== "" ||
    filters.favoritesOnly ||
    filters.categories.length > 0 ||
    filters.tones.length > 0 ||
    filters.sourceModules.length > 0 ||
    filters.tags.length > 0 ||
    filters.collectionId !== null ||
    filters.linkedGoalId !== null;

  return (
    <div className={filterHorizontalScrollClassName}>
      <div className={cn(filterSearchControlClassName, "min-w-[240px] lg:max-w-md")}>
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder={copy.searchPlaceholder}
          className="h-11 rounded-xl pl-9"
          aria-label={copy.searchPlaceholder}
        />
      </div>

      <Button
        type="button"
        variant={filters.favoritesOnly ? "default" : "outline"}
        size="sm"
        onClick={() => setFilters({ favoritesOnly: !filters.favoritesOnly })}
        className="h-11 min-h-11 shrink-0 gap-2 rounded-xl px-3"
        aria-pressed={filters.favoritesOnly}
      >
        <Star
          className={cn("size-4", filters.favoritesOnly && "fill-current")}
          aria-hidden
        />
        <span>{copy.filterFavoritesOnly}</span>
      </Button>

      <Select
        value={sort}
        onValueChange={(value) => value && setSort(value as QuoteSortKey)}
      >
        <SelectTrigger className="h-11 min-h-11 w-[180px] shrink-0 rounded-xl">
          <ArrowUpDown className="mr-2 size-4" aria-hidden />
          <SelectValue placeholder={copy.sortPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-11 min-h-11 shrink-0 gap-2 rounded-xl px-3 text-muted-foreground"
        >
          <X className="size-4" aria-hidden />
          {copy.filterClear}
        </Button>
      ) : null}
    </div>
  );
}
