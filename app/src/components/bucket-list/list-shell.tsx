"use client";

import { useMemo } from "react";
import { Compass, ImagePlus, Plus, Settings2, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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
import { DreamPatternBanner } from "./dream-pattern-banner";
import {
  bucketEntrance,
  bucketStaggerContainer,
  bucketTabPanel,
} from "./bucket-motion";

/**
 * Top-level overview shell for the Bucket List page. Responsible for
 * orchestrating the hero + filters + cards + realised strip. Keeps each
 * responsibility in a small component so the tree stays readable.
 */
export function BucketListShell() {
  useBucketListFirstVisit();
  const reduceMotion = useReducedMotion() ?? false;

  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const { data: items, isLoading } = useBucketItems();
  const filters = useBucketListStore((s) => s.filters);
  const viewMode = useBucketListStore((s) => s.viewMode);
  const setSelectedBucketId = useBucketListStore((s) => s.setSelectedBucketId);
  const openAddSheet = useBucketListStore((s) => s.openAddSheet);
  const openAiWizard = useBucketListStore((s) => s.openAiWizard);
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
        <motion.div
          {...bucketEntrance(reduceMotion, 0.02, 8)}
          className="flex items-center gap-2"
        >
          <BucketSettingsPopover
            trigger={
              <Button variant="outline" size="sm" aria-label={copy.settingsAction}>
                <Settings2 className="h-4 w-4" />
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => openAddSheet()}
          >
            <Plus className="h-4 w-4" />
            {copy.addManually}
          </Button>
          <Button
            size="sm"
            onClick={() => openAiWizard()}
            aria-label={copy.aiNewDreamAria}
            className="bg-lime-400 text-black hover:bg-lime-300 focus-visible:ring-lime-300/50"
          >
            <Sparkles className="h-4 w-4" />
            {copy.aiNewDream}
          </Button>
        </motion.div>
      }
    >
      <motion.div
        {...bucketEntrance(reduceMotion, 0.04, 14)}
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        {/* Left column */}
        <div className="flex flex-col gap-5">
          <BucketStatsStrip
            items={items}
            onOpenItem={setSelectedBucketId}
          />

          <BucketTypeFilterTabs />

          <DreamPatternBanner items={items} copy={copy} />

          <AnimatePresence mode="wait" initial={false}>
            {filtered.length === 0 ? (
              <motion.div key="empty" {...bucketTabPanel(reduceMotion)}>
                {items && items.length === 0 ? (
                  <BucketDreamEmptyState
                    copy={copy}
                    onAi={() => openAiWizard()}
                    onUpload={() => openAiWizard()}
                    onManual={() => openAddSheet()}
                  />
                ) : (
                  <EmptyState
                    icon={Compass}
                    title={copy.emptyFilteredTitle}
                    description={copy.emptyFilteredDescription}
                  />
                )}
              </motion.div>
            ) : viewMode === "grid" ? (
              <motion.div
                key="grid"
                variants={bucketStaggerContainer(reduceMotion)}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0 }}
                className="grid gap-4 sm:grid-cols-2"
              >
                {filtered.map((item, index) => (
                  <DreamCard
                    key={item.id}
                    item={item}
                    index={index}
                    onClick={() => setSelectedBucketId(item.id)}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                variants={bucketStaggerContainer(reduceMotion)}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0 }}
                className="flex flex-col gap-2"
              >
                {filtered.map((item, index) => (
                  <DreamListRow
                    key={item.id}
                    item={item}
                    index={index}
                    onClick={() => setSelectedBucketId(item.id)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

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
      </motion.div>
    </PageShell>
  );
}

function BucketDreamEmptyState({
  copy,
  onAi,
  onUpload,
  onManual,
}: {
  copy: ReturnType<typeof getBucketListUiCopy>;
  onAi: () => void;
  onUpload: () => void;
  onManual: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-14 text-center shadow-[0_12px_42px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(190,242,100,0.14),transparent_30%),radial-gradient(circle_at_15%_70%,rgba(34,211,238,0.10),transparent_32%)]" />
      <div className="relative mx-auto flex max-w-xl flex-col items-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-lime-300/25 bg-lime-300/10 text-lime-200 shadow-[0_0_30px_rgba(190,242,100,0.16)]">
          <Compass className="h-8 w-8" aria-hidden />
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-white">
          {copy.emptyFutureTitle}
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/62">
          {copy.emptyFutureDescription}
        </p>
        <div className="mt-6 flex w-full flex-col justify-center gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={onAi}
            className="bg-lime-400 text-black hover:bg-lime-300"
          >
            <Sparkles className="h-4 w-4" />
            {copy.aiNewDream}
          </Button>
          <Button type="button" variant="outline" onClick={onUpload}>
            <ImagePlus className="h-4 w-4" />
            {copy.uploadInspiration}
          </Button>
          <Button type="button" variant="outline" onClick={onManual}>
            <Plus className="h-4 w-4" />
            {copy.addManually}
          </Button>
        </div>
      </div>
    </div>
  );
}
