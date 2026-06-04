"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LayoutGrid, List } from "lucide-react";

import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import { BUCKET_TYPES, type BucketType } from "@/types/bucket-list";
import {
  useBucketListStore,
  type BucketViewMode,
} from "@/stores/bucket-list-store";
import { getBucketTypeLabel } from "@/lib/bucket-list/presentation";
import { bucketEntrance } from "./bucket-motion";
import {
  bucketGlassControl,
  bucketSegmentedShell,
  bucketSheen,
} from "./bucket-glass";

export function BucketTypeFilterTabs() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);
  const reduceMotion = useReducedMotion() ?? false;

  const filters = useBucketListStore((s) => s.filters);
  const setTypes = useBucketListStore((s) => s.setTypes);
  const toggleType = useBucketListStore((s) => s.toggleType);
  const viewMode = useBucketListStore((s) => s.viewMode);
  const setViewMode = useBucketListStore((s) => s.setViewMode);

  const activeType: BucketType | "all" =
    filters.types.length === 1 ? filters.types[0] : "all";

  const tabs: { id: BucketType | "all"; label: string }[] = [
    { id: "all", label: copy.allTypes },
    ...BUCKET_TYPES.map((type) => ({
      id: type,
      label: getBucketTypeLabel(type, copy),
    })),
  ];

  return (
    <motion.div
      {...bucketEntrance(reduceMotion, 0.08, 8)}
      className="flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden pr-16 sm:pr-0"
    >
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div
          role="tablist"
          aria-label={copy.filterTravel}
          className={cn(
            "flex min-w-0 max-w-full snap-x overflow-x-auto pr-8 text-sm [-ms-overflow-style:none] [scrollbar-width:none] sm:pr-1 [&::-webkit-scrollbar]:hidden",
            bucketSegmentedShell,
            bucketGlassControl,
            bucketSheen,
          )}
        >
          {tabs.map((tab) => {
            const active = tab.id === activeType;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => {
                  if (tab.id === "all") {
                    setTypes([]);
                  } else if (active) {
                    // Clicking the active tab clears it back to "all".
                    setTypes([]);
                  } else {
                    setTypes([tab.id]);
                    // single-select semantics — but we also support multi-select
                    // via toggleType callers elsewhere.
                    void toggleType;
                  }
                }}
                className={cn(
                  "relative h-11 shrink-0 snap-start overflow-hidden rounded-full px-4 text-xs font-semibold uppercase tracking-[0.06em] transition-[color,transform] sm:h-9 sm:px-3.5 active:translate-y-px",
                  active
                    ? "text-lime-950 dark:text-lime-100"
                    : "text-slate-500 hover:text-slate-950 dark:text-white/55 dark:hover:text-white/85",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId={reduceMotion ? undefined : "bucket-type-active-pill"}
                    className="absolute inset-0 rounded-full bg-lime-300/16 shadow-[inset_0_0_0_1px_rgba(200,229,58,0.32),inset_0_1px_0_rgba(255,255,255,0.13)]"
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  />
                ) : null}
                <span className="relative whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-1 right-1 w-8 rounded-r-[1.1rem] bg-gradient-to-l from-white/95 to-transparent sm:hidden dark:from-slate-950/95"
        />
      </div>

      <div className={cn("relative flex shrink-0 items-center gap-1 rounded-[1.2rem] p-1", bucketGlassControl, bucketSheen)}>
        <ViewModeButton
          mode="grid"
          active={viewMode === "grid"}
          onClick={() => setViewMode("grid")}
          icon={<LayoutGrid className="h-4 w-4" />}
          label="Grid"
          reduceMotion={reduceMotion}
        />
        <ViewModeButton
          mode="list"
          active={viewMode === "list"}
          onClick={() => setViewMode("list")}
          icon={<List className="h-4 w-4" />}
          label="List"
          reduceMotion={reduceMotion}
        />
      </div>
    </motion.div>
  );
}

function ViewModeButton({
  active,
  onClick,
  icon,
  label,
  reduceMotion,
}: {
  mode: BucketViewMode;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  reduceMotion: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label} view`}
      className={cn(
        "relative isolate inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full transition-[color,transform] sm:h-9 sm:w-9 active:translate-y-px",
        active
          ? "text-slate-950"
          : "text-slate-500 hover:text-slate-950 dark:text-white/50 dark:hover:text-white/80",
      )}
    >
      {active ? (
        <motion.span
          layoutId={reduceMotion ? undefined : "bucket-view-mode-active-pill"}
          className="absolute inset-0 -z-10 rounded-full bg-lime-300"
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      ) : null}
      <span className="relative">{icon}</span>
    </button>
  );
}
