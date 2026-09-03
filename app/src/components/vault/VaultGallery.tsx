"use client";

import { useMemo } from "react";
import { motion, LayoutGroup, useReducedMotion } from "framer-motion";
import { REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import { EntityCard } from "@/components/shared/entity-card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Star } from "lucide-react";
import type { SoftwareVaultEntry } from "@/types/database";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import {
  useVaultData,
  type VaultFilters,
  type VaultSortKey,
  type VaultViewMode,
  parseMonthlyCost,
} from "@/stores/vault-store";

function costLabel(entry: SoftwareVaultEntry): string {
  if (entry.cost_type === "Free") return "Free";
  if (entry.cost_amount == null) return entry.cost_type;
  return `$${Number(entry.cost_amount).toFixed(2)}${
    entry.cost_period ? `/${entry.cost_period}` : ""
  }`;
}

function costTier(entry: SoftwareVaultEntry): "free" | "low" | "mid" | "high" {
  const monthly = parseMonthlyCost(entry);
  if (entry.cost_type === "Free" || monthly === 0) return "free";
  if (monthly < 10) return "low";
  if (monthly < 30) return "mid";
  return "high";
}

function applyFilters(
  entries: SoftwareVaultEntry[],
  filters: VaultFilters,
): SoftwareVaultEntry[] {
  const q = filters.search.trim().toLowerCase();
  return entries.filter((e) => {
    if (q) {
      const haystack = [e.app_name, e.category, e.tags, e.use_cases, e.why_i_use_it]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.status !== "all" && e.status !== filters.status) return false;
    if (filters.priority !== "all" && e.priority !== filters.priority) return false;
    if (filters.costTier !== "all" && costTier(e) !== filters.costTier) return false;
    if (filters.category !== "all" && e.category !== filters.category) return false;
    return true;
  });
}

function sortEntries(
  entries: SoftwareVaultEntry[],
  sortBy: VaultSortKey,
): SoftwareVaultEntry[] {
  const arr = [...entries];
  switch (sortBy) {
    case "recent":
      return arr.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    case "most-used":
      return arr.sort((a, b) => (b.launch_count ?? 0) - (a.launch_count ?? 0));
    case "cost-desc":
      return arr.sort((a, b) => parseMonthlyCost(b) - parseMonthlyCost(a));
    case "alpha":
    default:
      return arr.sort((a, b) => a.app_name.localeCompare(b.app_name));
  }
}

type Props = {
  entries: SoftwareVaultEntry[];
  viewMode: VaultViewMode;
  onSelect: (id: string) => void;
  emptyState: React.ReactNode;
};

export function VaultGallery({ entries, viewMode, onSelect, emptyState }: Props) {
  const filters = useVaultData((s) => s.filters);
  const sortBy = useVaultData((s) => s.sortBy);
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);
  const prefersReducedMotion = useReducedMotion();

  const rows = useMemo(
    () => sortEntries(applyFilters(entries, filters), sortBy),
    [entries, filters, sortBy],
  );

  if (rows.length === 0) return <>{emptyState}</>;

  return (
    <LayoutGroup>
      <div
        className={
          viewMode === "grid"
            ? "grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "space-y-3"
        }
      >
        {rows.map((entry) => (
          <motion.div
            key={entry.id}
            layoutId={`vault-card-${entry.id}`}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion ? REDUCED_MOTION_FADE : { duration: 0.25, ease: "easeOut" }
            }
            className={viewMode === "grid" ? "h-full" : undefined}
          >
            <EntityCard
              className={viewMode === "grid" ? "h-full" : undefined}
              onClick={() => onSelect(entry.id)}
              icon={
                entry.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote app icon URL
                  <img
                    src={entry.icon_url}
                    alt=""
                    width={28}
                    height={28}
                    className="rounded-md object-contain"
                  />
                ) : (
                  <span className="text-base font-semibold text-primary">
                    {entry.app_name.charAt(0).toUpperCase()}
                  </span>
                )
              }
              title={entry.app_name}
              subtitle={entry.summary ?? entry.category ?? undefined}
              badges={
                <>
                  <StatusBadge value={entry.status} />
                  <Badge variant="outline">{entry.priority}</Badge>
                  <Badge variant="outline">{costLabel(entry)}</Badge>
                  {entry.is_default_stack && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      {copy.gallery.defaultBadge}
                    </Badge>
                  )}
                </>
              }
              meta={
                entry.use_cases && (
                  <p className="line-clamp-2">{entry.use_cases}</p>
                )
              }
            />
          </motion.div>
        ))}
      </div>
    </LayoutGroup>
  );
}
