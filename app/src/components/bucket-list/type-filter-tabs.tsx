"use client";

import { useMemo } from "react";
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

export function BucketTypeFilterTabs() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

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
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div
        role="tablist"
        aria-label={copy.filterTravel}
        className="flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.02] p-1 text-sm"
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
                "rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition-colors",
                active
                  ? "bg-lime-400/15 text-lime-300 shadow-[inset_0_0_0_1px_rgba(200,229,58,0.35)]"
                  : "text-white/55 hover:bg-white/5 hover:text-white/85",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] p-1">
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
    </div>
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
