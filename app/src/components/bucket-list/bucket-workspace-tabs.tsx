"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Plane, Map as MapIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getTravelExplorerUiCopy } from "@/lib/i18n/travel-explorer-ui";

import { BucketListShell } from "./list-shell";
import { ExplorerConsole } from "./explorer/explorer-console";
import { BucketTravelMap } from "./travel-map";
import {
  bucketGlassControl,
  bucketSegmentedShell,
  bucketSheen,
} from "./bucket-glass";
import { bucketTabPanel, bucketWorkspaceTransition } from "./bucket-motion";

/**
 * In-page workspace tab switcher for Bucket List: Overview (the existing
 * shell, default) · Travel (the Explorer Console) · Map (the existing
 * offline SVG map, kept as a free sibling). URL-driven via `?tab=` so it's
 * shareable + back-button friendly, matching the relationship/resources
 * convention. Additive: with no `?tab=` the page behaves exactly as before.
 */

type TabKey = "overview" | "travel" | "map";
const TABS: readonly TabKey[] = ["overview", "travel", "map"] as const;
const ICONS = { overview: LayoutGrid, travel: Plane, map: MapIcon } as const;

export function BucketWorkspaceTabs() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getTravelExplorerUiCopy(language), [language]);
  const reduceMotion = useReducedMotion() ?? false;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get("tab");
  const active: TabKey = TABS.includes(raw as TabKey) ? (raw as TabKey) : "overview";

  const labels: Record<TabKey, string> = {
    overview: copy.tabOverview,
    travel: copy.tabTravel,
    map: copy.tabMap,
  };

  const setTab = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const qs = params.toString();
    bucketWorkspaceTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, reduceMotion);
  };

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Bucket List views"
        className={cn(
          "w-full sm:w-auto",
          bucketSegmentedShell,
          bucketGlassControl,
          bucketSheen,
        )}
      >
        {TABS.map((tab) => {
          const Icon = ICONS[tab];
          const selected = active === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(tab)}
              className={cn(
                "relative isolate inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-full px-3 text-sm font-semibold transition-colors sm:flex-none sm:px-3.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 active:translate-y-px",
                selected
                  ? "text-slate-950"
                  : "text-slate-500 hover:text-slate-950 dark:text-white/58 dark:hover:text-white",
              )}
            >
              {selected ? (
                <motion.span
                  layoutId={reduceMotion ? undefined : "bucket-workspace-active-pill"}
                  className="absolute inset-0 -z-10 rounded-full bg-lime-300 shadow-[0_8px_22px_rgba(190,242,100,0.18),inset_0_1px_0_rgba(255,255,255,0.45)]"
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                />
              ) : null}
              <Icon className="relative h-4 w-4" />
              <span className="relative">{labels[tab]}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={active} {...bucketTabPanel(reduceMotion)}>
          {active === "overview" && <BucketListShell />}
          {active === "travel" && <ExplorerConsole />}
          {active === "map" && <BucketTravelMap />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
