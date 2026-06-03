"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Compass, ListFilter, Plus, Route } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import { useBucketItems } from "@/hooks/use-bucket-list";
import { useBucketListStore } from "@/stores/bucket-list-store";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import {
  bucketStatusBadgeClass,
  getBucketStatusLabel,
} from "@/lib/bucket-list/presentation";
import { TRAVEL_MAP_STATUS_COLOR } from "@/lib/bucket-list/travel-map-styles";
import { airportCoords } from "@/lib/bucket-list/flight-watch";
import type { BucketStatus } from "@/types/bucket-list";
import { TravelGoogleMap } from "./travel-google-map";
import type {
  TravelMapMarker,
  TravelMapRoute,
} from "./travel-google-map-inner";
import {
  bucketControlSize,
  bucketGlassControl,
  bucketIconControlSize,
  bucketMapSurface,
  bucketPrimaryControl,
  bucketSegmentedShell,
  bucketSheen,
  bucketSolidPanel,
} from "./bucket-glass";

export function BucketTravelMap() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);
  const reduceMotion = useReducedMotion() ?? false;

  const { data: items } = useBucketItems();
  const setSelected = useBucketListStore((s) => s.setSelectedBucketId);
  const openAddSheet = useBucketListStore((s) => s.openAddSheet);
  const listHref = useLocalizedPath("/bucket-list");

  const [statusFilter, setStatusFilter] = useState<BucketStatus | "all">("all");
  const travelItems = useMemo(
    () => (items ?? []).filter((item) => item.type === "travel"),
    [items],
  );

  const markers: TravelMapMarker[] = useMemo(() => {
    const list = items ?? [];
    const result: TravelMapMarker[] = [];
    for (const item of list) {
      if (item.type !== "travel") continue;
      let lat = item.destination_lat;
      let lng = item.destination_lng;
      if ((lat == null || lng == null) && item.destination_airport) {
        const c = airportCoords(item.destination_airport);
        if (c) {
          lat = c.lat;
          lng = c.lng;
        }
      }
      if (lat == null || lng == null) continue;
      if (statusFilter !== "all" && item.status !== statusFilter) continue;
      result.push({
        id: item.id,
        lat,
        lng,
        title: item.title,
        status: item.status,
        color: TRAVEL_MAP_STATUS_COLOR[item.status],
      });
    }
    return result;
  }, [items, statusFilter]);

  const routes: TravelMapRoute[] = useMemo(() => {
    if (!items) return [];
    const lines: TravelMapRoute[] = [];
    for (const item of items) {
      if (item.type !== "travel") continue;
      if (statusFilter !== "all" && item.status !== statusFilter) continue;
      if (!item.origin_airport || !item.destination_airport) continue;
      const origin = airportCoords(item.origin_airport);
      const dest =
        item.destination_lat != null && item.destination_lng != null
          ? { lat: item.destination_lat, lng: item.destination_lng }
          : airportCoords(item.destination_airport);
      if (!origin || !dest) continue;
      lines.push({
        id: item.id,
        from: { lat: origin.lat, lng: origin.lng },
        to: { lat: dest.lat, lng: dest.lng },
        completed: item.status === "completed",
      });
    }
    return lines;
  }, [items, statusFilter]);

  const statusOptions: (BucketStatus | "all")[] = [
    "all",
    "dreaming",
    "planning",
    "active",
    "booked",
    "completed",
  ];

  const statusLabel =
    statusFilter === "all"
      ? "All statuses"
      : getBucketStatusLabel(statusFilter, copy);
  const mapSummary =
    statusFilter === "all"
      ? `${markers.length} of ${travelItems.length} travel ${travelItems.length === 1 ? "dream" : "dreams"} mapped`
      : `${markers.length} ${statusLabel.toLowerCase()} ${markers.length === 1 ? "dream" : "dreams"} mapped`;

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col gap-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-0">
      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={listHref} />}
            aria-label={copy.mapBackToList}
            className={cn(bucketGlassControl, bucketIconControlSize, "shrink-0")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Route className="h-3.5 w-3.5" aria-hidden />
              Travel layer
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {copy.mapTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mapSummary}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => openAddSheet({ type: "travel" })}
            className={cn(bucketPrimaryControl, bucketControlSize, "hidden sm:inline-flex")}
          >
            <Plus className="h-4 w-4" />
            Add travel
          </Button>
        </div>

        <StatusFilterRail
          options={statusOptions}
          selected={statusFilter}
          onSelect={setStatusFilter}
          copy={copy}
          reduceMotion={reduceMotion}
        />
      </header>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className={cn(bucketMapSurface, bucketSheen, "p-1")}>
          <TravelGoogleMap
            markers={markers}
            routes={routes}
            onMarkerClick={setSelected}
            missingKeyMessage="The live map layer is offline. Your mapped travel dreams are still shown here."
            className="rounded-[1.1rem]"
          />
        </section>

        <aside className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <section className={cn(bucketSolidPanel, "p-4")}>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-lime-300/20 bg-lime-300/10 text-lime-200">
                <ListFilter className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Map focus</h2>
                <p className="text-xs text-muted-foreground">{statusLabel}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniStat label="Travel" value={travelItems.length} />
              <MiniStat label="Mapped" value={markers.length} />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => openAddSheet({ type: "travel" })}
              className={cn(bucketPrimaryControl, bucketControlSize, "mt-4 w-full")}
            >
              <Plus className="h-4 w-4" />
              Add travel dream
            </Button>
          </section>

          <section aria-labelledby="map-list-heading" className={cn(bucketSolidPanel, "p-4")}>
            <div className="flex items-center justify-between gap-3">
              <h2
                id="map-list-heading"
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Mapped dreams
              </h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {markers.length}
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {markers.length > 0 ? (
                <motion.ul
                  key={statusFilter}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-3 grid gap-2"
                >
                  {markers.map((m) => {
                    const item = items?.find((i) => i.id === m.id);
                    if (!item) return null;
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(m.id)}
                          className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-left transition-[background,border-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-white/20 hover:bg-white/[0.06] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70"
                        >
                          <span
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.055]"
                            aria-hidden
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: m.color }}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {item.title}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {item.destination_city ?? item.destination_country ?? "Location saved"}
                            </span>
                          </span>
                          <Compass className="h-3.5 w-3.5 text-white/40" />
                        </button>
                      </li>
                    );
                  })}
                </motion.ul>
              ) : (
                <motion.div
                  key="empty"
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-3 rounded-xl border border-white/8 bg-white/[0.035] p-3 text-sm text-muted-foreground"
                >
                  No mapped dreams match this status.
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </aside>
      </div>

      <section aria-labelledby="map-legend-heading" className="space-y-2">
        <h2
          id="map-legend-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
        >
          {copy.mapLegendTitle} · {copy.mapLegendStatus}
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Object.entries(TRAVEL_MAP_STATUS_COLOR).map(([status, color]) => (
            <Badge
              key={status}
              variant="outline"
              className={`h-8 shrink-0 gap-1 ${bucketStatusBadgeClass(status as BucketStatus)}`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              {getBucketStatusLabel(status as BucketStatus, copy)}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusFilterRail({
  options,
  selected,
  onSelect,
  copy,
  reduceMotion,
}: {
  options: (BucketStatus | "all")[];
  selected: BucketStatus | "all";
  onSelect: (status: BucketStatus | "all") => void;
  copy: ReturnType<typeof getBucketListUiCopy>;
  reduceMotion: boolean;
}) {
  return (
    <div className="relative min-w-0">
      <div
        role="tablist"
        aria-label="Map status filter"
        className={cn(
          "flex w-full snap-x overflow-x-auto pr-8 [-ms-overflow-style:none] [scrollbar-width:none] sm:w-auto sm:pr-1 [&::-webkit-scrollbar]:hidden",
          bucketSegmentedShell,
          bucketGlassControl,
          bucketSheen,
        )}
      >
        {options.map((status) => {
          const active = selected === status;
          const label =
            status === "all" ? "All" : getBucketStatusLabel(status, copy);
          return (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(status)}
              className={cn(
                "relative isolate flex min-h-11 shrink-0 snap-start items-center overflow-hidden rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-[color,transform] active:translate-y-px",
                active
                  ? "text-lime-950 dark:text-lime-100"
                  : "text-slate-500 hover:text-slate-950 dark:text-white/55 dark:hover:text-white/85",
              )}
            >
              {active ? (
                <motion.span
                  layoutId={reduceMotion ? undefined : "bucket-map-status-pill"}
                  className="absolute inset-0 -z-10 rounded-full bg-lime-300/18 shadow-[inset_0_0_0_1px_rgba(200,229,58,0.34),inset_0_1px_0_rgba(255,255,255,0.16)]"
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                />
              ) : null}
              {label}
            </button>
          );
        })}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-1 right-1 w-8 rounded-r-[1.1rem] bg-gradient-to-l from-white/95 to-transparent sm:hidden dark:from-slate-950/95"
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2">
      <p className="text-lg font-semibold tabular-nums text-white">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
        {label}
      </p>
    </div>
  );
}
