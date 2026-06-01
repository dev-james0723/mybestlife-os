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
      className="flex w-full min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="relative w-[calc(100vw-2rem)] min-w-0 max-w-[calc(100vw-2rem)] sm:w-auto sm:max-w-full">
        <div
          role="tablist"
          aria-label={copy.filterTravel}
          className="flex w-full snap-x gap-1 overflow-x-auto rounded-[1.35rem] border border-white/10 bg-slate-950/80 p-1 pr-8 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.18)] [-ms-overflow-style:none] [scrollbar-width:none] sm:w-auto sm:max-w-full sm:pr-1 [&::-webkit-scrollbar]:hidden"
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
                  "relative h-8 shrink-0 snap-start overflow-hidden rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors sm:px-3.5 sm:text-xs",
                  active
                    ? "text-lime-200"
                    : "text-white/55 hover:bg-white/5 hover:text-white/85",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId={reduceMotion ? undefined : "bucket-type-active-pill"}
                    className="absolute inset-0 rounded-full bg-lime-400/15 shadow-[inset_0_0_0_1px_rgba(200,229,58,0.35)]"
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
          className="pointer-events-none absolute inset-y-1 right-1 w-8 rounded-r-[1.1rem] bg-gradient-to-l from-slate-950/95 to-transparent sm:hidden"
        />
      </div>

      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/80 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
        <ViewModeButton
          mode="grid"
          active={viewMode === "grid"}
          onClick={() => setViewMode("grid")}
          icon={<LayoutGrid className="h-4 w-4" />}
          label="Grid"
        />
        <ViewModeButton
          mode="list"
          active={viewMode === "list"}
          onClick={() => setViewMode("list")}
          icon={<List className="h-4 w-4" />}
          label="List"
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
}: {
  mode: BucketViewMode;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label} view`}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-white/50 hover:bg-white/5 hover:text-white/80",
      )}
    >
      {icon}
    </button>
  );
}
