"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  Compass,
  ImagePlus,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

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
import {
  bucketControlSize,
  bucketGlassControl,
  bucketGlassPanel,
  bucketIconControlSize,
  bucketPrimaryControl,
  bucketSheen,
} from "./bucket-glass";

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

  const {
    data: items,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useBucketItems();
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

  if (isLoading) {
    return (
      <PageShell
        title={copy.pageTitle}
        description={copy.pageDescription}
        actions={
          <BucketShellActions
            copy={copy}
            reduceMotion={reduceMotion}
            onManual={() => openAddSheet()}
            onAi={() => openAiWizard()}
            disabled
          />
        }
      >
        <BucketListLoadingState />
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell
        title={copy.pageTitle}
        description={copy.pageDescription}
        actions={
          <BucketShellActions
            copy={copy}
            reduceMotion={reduceMotion}
            onManual={() => openAddSheet()}
            onAi={() => openAiWizard()}
          />
        }
      >
        <BucketListErrorState
          isRetrying={isFetching}
          onRetry={() => {
            void refetch();
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={copy.pageTitle}
      description={copy.pageDescription}
      actions={
        <BucketShellActions
          copy={copy}
          reduceMotion={reduceMotion}
          onManual={() => openAddSheet()}
          onAi={() => openAiWizard()}
        />
      }
    >
      <motion.div
        {...bucketEntrance(reduceMotion, 0.04, 14)}
        className="grid min-w-0 gap-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-0 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        {/* Left column */}
        <div className="flex min-w-0 flex-col gap-5">
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
        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
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

function BucketShellActions({
  copy,
  disabled = false,
  onAi,
  onManual,
  reduceMotion,
}: {
  copy: ReturnType<typeof getBucketListUiCopy>;
  disabled?: boolean;
  onAi: () => void;
  onManual: () => void;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      {...bucketEntrance(reduceMotion, 0.02, 8)}
      className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-2 sm:flex sm:w-auto"
    >
      {disabled ? (
        <Button
          variant="outline"
          size="sm"
          aria-label={copy.settingsAction}
          className={cn(bucketGlassControl, bucketIconControlSize)}
          disabled
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      ) : (
        <BucketSettingsPopover
          trigger={
            <Button
              variant="outline"
              size="sm"
              aria-label={copy.settingsAction}
              className={cn(bucketGlassControl, bucketIconControlSize)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          }
        />
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onManual}
        className={cn(bucketGlassControl, bucketControlSize, "min-w-0")}
        disabled={disabled}
      >
        <Plus className="h-4 w-4" />
        <span className="truncate">{copy.addManually}</span>
      </Button>
      <Button
        size="sm"
        onClick={onAi}
        aria-label={copy.aiNewDreamAria}
        className={cn(bucketPrimaryControl, bucketControlSize, "min-w-0")}
        disabled={disabled}
      >
        <Sparkles className="h-4 w-4" />
        <span className="truncate">{copy.aiNewDream}</span>
      </Button>
    </motion.div>
  );
}

function BucketListLoadingState() {
  const shimmer =
    "motion-safe:animate-pulse rounded-full bg-white/70 dark:bg-white/[0.09]";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-5">
        <div className={`${bucketGlassPanel} ${bucketSheen} p-5`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
                Loading dreams
              </p>
              <div className="mt-3 h-8 w-36 rounded-lg bg-white/12 motion-safe:animate-pulse" />
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-lime-300/20 bg-lime-300/10 text-lime-200">
              <Compass className="h-5 w-5" aria-hidden />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="h-6 w-8 rounded-md bg-white/14 motion-safe:animate-pulse" />
                <div className="h-2 w-14 rounded-full bg-white/10 motion-safe:animate-pulse" />
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-white/8 bg-white/[0.035] p-3"
              >
                <div className="h-2.5 w-32 rounded-full bg-white/12 motion-safe:animate-pulse" />
                <div className="mt-3 h-4 w-44 max-w-full rounded-full bg-white/10 motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex max-w-full gap-2 overflow-hidden rounded-[1.35rem] border border-slate-300/55 bg-white/72 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl dark:border-white/12 dark:bg-white/[0.055]">
          <div className="h-8 w-14 rounded-full bg-lime-300/70" />
          <div className={`h-8 w-24 ${shimmer}`} />
          <div className={`h-8 w-32 ${shimmer}`} />
          <div className={`h-8 w-28 ${shimmer}`} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`${bucketGlassPanel} min-h-32 p-4`}
            >
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-white/12 motion-safe:animate-pulse" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 rounded-full bg-white/12 motion-safe:animate-pulse" />
                  <div className="h-3 w-1/2 rounded-full bg-white/10 motion-safe:animate-pulse" />
                </div>
              </div>
              <div className="mt-5 h-2.5 w-2/3 rounded-full bg-white/10 motion-safe:animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <div className={`${bucketGlassPanel} ${bucketSheen} p-6 text-center lg:sticky lg:top-20 lg:self-start`}>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-lime-300/20 bg-lime-300/10 text-lime-200">
          <Compass className="h-7 w-7" aria-hidden />
        </div>
        <div className="mx-auto h-5 w-36 rounded-full bg-white/14 motion-safe:animate-pulse" />
        <div className="mx-auto mt-3 h-3 w-56 max-w-full rounded-full bg-white/10 motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

function BucketListErrorState({
  isRetrying,
  onRetry,
}: {
  isRetrying: boolean;
  onRetry: () => void;
}) {
  return (
    <div className={`${bucketGlassPanel} ${bucketSheen} px-5 py-12 text-center`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.12),transparent_34%)]" />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-200">
          <AlertTriangle className="h-7 w-7" aria-hidden />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-white">
          Could not load dreams
        </h3>
        <p className="mt-2 text-sm leading-6 text-white/62">
          The page is available, but the bucket data request did not finish.
        </p>
        <Button
          type="button"
          onClick={onRetry}
          className={`mt-6 ${bucketPrimaryControl}`}
          disabled={isRetrying}
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
          Retry
        </Button>
      </div>
    </div>
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
    <div className={`${bucketGlassPanel} ${bucketSheen} px-4 py-14 text-center`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(190,242,100,0.11),transparent_34%),radial-gradient(circle_at_15%_70%,rgba(148,163,184,0.10),transparent_34%)]" />
      <div className="relative mx-auto flex max-w-xl flex-col items-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-lime-300/20 bg-lime-300/10 text-lime-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
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
            className={bucketPrimaryControl}
          >
            <Sparkles className="h-4 w-4" />
            {copy.aiNewDream}
          </Button>
          <Button type="button" variant="outline" onClick={onUpload} className={bucketGlassControl}>
            <ImagePlus className="h-4 w-4" />
            {copy.uploadInspiration}
          </Button>
          <Button type="button" variant="outline" onClick={onManual} className={bucketGlassControl}>
            <Plus className="h-4 w-4" />
            {copy.addManually}
          </Button>
        </div>
      </div>
    </div>
  );
}
