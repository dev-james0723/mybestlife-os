"use client";

import { useMemo } from "react";
import { FilterBar, type FilterConfig } from "@/components/shared/filter-bar";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import {
  useVaultData,
  type VaultSortKey,
  type VaultViewMode,
} from "@/stores/vault-store";
import type { SoftwareVaultEntry } from "@/types/database";

type Props = {
  entries: SoftwareVaultEntry[];
};

export function VaultFilterBar({ entries }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);
  const filters = useVaultData((s) => s.filters);
  const setFilters = useVaultData((s) => s.setFilters);
  const sortBy = useVaultData((s) => s.sortBy);
  const setSort = useVaultData((s) => s.setSort);
  const viewMode = useVaultData((s) => s.viewMode);
  const setViewMode = useVaultData((s) => s.setViewMode);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((e) => e.category?.trim())
            .filter((c): c is string => !!c && c.length > 0),
        ),
      ).sort(),
    [entries],
  );

  const filterConfigs: FilterConfig[] = [
    {
      key: "status",
      label: copy.gallery.filters.status,
      value: filters.status,
      options: [
        { value: "Testing", label: "Testing" },
        { value: "Active", label: "Active" },
        { value: "Retired", label: "Retired" },
        { value: "Wishlist", label: "Wishlist" },
      ],
    },
    {
      key: "priority",
      label: copy.gallery.filters.priority,
      value: filters.priority,
      options: [
        { value: "Must-have", label: "Must-have" },
        { value: "Nice-to-have", label: "Nice-to-have" },
        { value: "Optional", label: "Optional" },
      ],
    },
    {
      key: "costTier",
      label: copy.gallery.filters.costTier,
      value: filters.costTier,
      options: [
        { value: "free", label: "Free" },
        { value: "low", label: "< $10/mo" },
        { value: "mid", label: "$10–30/mo" },
        { value: "high", label: "$30+/mo" },
      ],
    },
    ...(categories.length > 0
      ? [
          {
            key: "category",
            label: copy.gallery.filters.category,
            value: filters.category,
            options: categories.map((c) => ({ value: c, label: c })),
          },
        ]
      : []),
  ];

  const sortOptions: { value: VaultSortKey; label: string }[] = [
    { value: "alpha", label: copy.gallery.sort.alpha },
    { value: "recent", label: copy.gallery.sort.recent },
    { value: "most-used", label: copy.gallery.sort.mostUsed },
    { value: "cost-desc", label: copy.gallery.sort.costDesc },
  ];

  return (
    <FilterBar
      search={{
        placeholder: copy.gallery.searchPlaceholder,
        value: filters.search,
        onChange: (v) => setFilters({ search: v }),
      }}
      filters={filterConfigs}
      onFilterChange={(key, value) => setFilters({ [key]: value })}
      sort={{
        options: sortOptions,
        value: sortBy,
        onChange: (v) => setSort(v as VaultSortKey),
      }}
      viewModes={["grid", "list"]}
      activeViewMode={viewMode}
      onViewModeChange={(m) => setViewMode(m as VaultViewMode)}
    />
  );
}
