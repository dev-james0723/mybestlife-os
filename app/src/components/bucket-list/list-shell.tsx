"use client";

import { useMemo } from "react";
import { Compass, Plus, Settings2 } from "lucide-react";

import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading-state";

import { useBucketItems } from "@/hooks/use-bucket-list";
import { useBucketListStore } from "@/stores/bucket-list-store";
import { useBucketListFirstVisit } from "@/hooks/use-bucket-list-first-visit";
import type { BucketItem } from "@/types/bucket-list";

import { BucketStatsStrip } from "./stats-strip";
import { BucketTypeFilterTabs } from "./type-filter-tabs";
import { DreamCard } from "./dream-card";
import { BucketFeaturedRail } from "./featured-rail";
import { BucketRealizedStrip } from "./realized-strip";
import { DreamListRow } from "./dream-list-row";
import { BucketSettingsPopover } from "./settings-popover";

/**
 * Top-level overview shell for the Bucket List page. Responsible for
 * orchestrating the hero + filters + cards + realised strip. Keeps each
 * responsibility in a small component so the tree stays readable.
 */
export function BucketListShell() {
  useBucketListFirstVisit();

  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const { data: items, isLoading } = useBucketItems();
  const filters = useBucketListStore((s) => s.filters);
  const viewMode = useBucketListStore((s) => s.viewMode);
  const setSelectedBucketId = useBucketListStore((s) => s.setSelectedBucketId);
  const openAddSheet = useBucketListStore((s) => s.openAddSheet);
  const openActivateModal = useBucketListStore((s) => s.openActivateModal);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      if (!filters.includeClosed) {
        if (item.status === "completed" || item.status === "archived") {
          return false;
        }
      }
      if (filters.types.length > 0 && !filters.types.includes(item.type)) {
        return false;
      }
      if (
        filters.statuses.length > 0 &&
        !filters.statuses.includes(item.status)
      ) {
        return false;
      }
      if (filters.featuredOnly && !item.is_featured) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const haystack = [
          item.title,
          item.description,
          item.why_this_matters,
          ...item.category_tags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, filters]);

  const realized = useMemo(() => {
    if (!items) return [] as BucketItem[];
    return items
      .filter((b) => b.status === "completed")
      .sort((a, b) =>
        (b.completed_at ?? b.updated_at ?? "").localeCompare(
          a.completed_at ?? a.updated_at ?? "",
        ),
      )
      .slice(0, 6);
  }, [items]);

  const featured = useMemo(() => {
    if (!items) return null;
    const featuredActive = items
      .filter((b) => b.is_featured && b.status !== "completed")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (featuredActive.length > 0) return featuredActive[0];
    const active = items.find(
      (b) =>
        b.status === "active" ||
        b.status === "planning" ||
        b.status === "exploring",
    );
    return active ?? items[0] ?? null;
  }, [items]);

  if (isLoading) return <LoadingPage />;

  return (
    <PageShell
      title={copy.pageTitle}
      description={copy.pageDescription}
      actions={
        <div className="flex items-center gap-2">
          <BucketSettingsPopover
            trigger={
              <Button variant="outline" size="sm" aria-label={copy.settingsAction}>
                <Settings2 className="h-4 w-4" />
              </Button>
            }
          />
          <Button
            size="sm"
            onClick={() => openAddSheet()}
            className="bg-lime-400 text-black hover:bg-lime-300 focus-visible:ring-lime-300/50"
          >
            <Plus className="h-4 w-4" />
            {copy.newDream}
          </Button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          <BucketStatsStrip
            items={items}
            onOpenItem={setSelectedBucketId}
          />

          <BucketTypeFilterTabs />

          {filtered.length === 0 ? (
            items && items.length === 0 ? (
              <EmptyState
                icon={Compass}
                title={copy.emptyAllTitle}
                description={copy.emptyAllDescription}
                action={{
                  label: copy.emptyAllAction,
                  onClick: () => openAddSheet(),
                }}
              />
            ) : (
              <EmptyState
                icon={Compass}
                title={copy.emptyFilteredTitle}
                description={copy.emptyFilteredDescription}
              />
            )
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((item) => (
                <DreamCard
                  key={item.id}
                  item={item}
                  onClick={() => setSelectedBucketId(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((item) => (
                <DreamListRow
                  key={item.id}
                  item={item}
                  onClick={() => setSelectedBucketId(item.id)}
                />
              ))}
            </div>
          )}

          {realized.length > 0 ? (
            <BucketRealizedStrip
              items={realized}
              onSelect={setSelectedBucketId}
            />
          ) : null}
        </div>

        {/* Right rail */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          {featured ? (
            <BucketFeaturedRail
              item={featured}
              onOpenDetail={() => setSelectedBucketId(featured.id)}
              onActivate={() => openActivateModal(featured.id)}
            />
          ) : (
            <EmptyState
              icon={Compass}
              title={copy.noHighlight}
              description={copy.emptyAllDescription}
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
