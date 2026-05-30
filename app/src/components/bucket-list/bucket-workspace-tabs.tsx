"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Plane, Map as MapIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getTravelExplorerUiCopy } from "@/lib/i18n/travel-explorer-ui";

import { BucketListShell } from "./list-shell";
import { ExplorerConsole } from "./explorer/explorer-console";
import { BucketTravelMap } from "./travel-map";

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
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Bucket List views"
        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1"
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
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                selected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {active === "overview" && <BucketListShell />}
      {active === "travel" && <ExplorerConsole />}
      {active === "map" && <BucketTravelMap />}
    </div>
  );
}
