"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Compass, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { BucketItem, BucketStatus } from "@/types/bucket-list";
import { TravelGoogleMap } from "./travel-google-map";
import type {
  TravelMapMarker,
  TravelMapRoute,
} from "./travel-google-map-inner";

export function BucketTravelMap() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const { data: items } = useBucketItems();
  const setSelected = useBucketListStore((s) => s.setSelectedBucketId);
  const listHref = useLocalizedPath("/bucket-list");

  const [statusFilter, setStatusFilter] = useState<BucketStatus | "all">("all");

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

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={listHref} />}
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.mapBackToList}
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {copy.mapTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {markers.length} travel {markers.length === 1 ? "dream" : "dreams"}{" "}
              mapped
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          {statusOptions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                statusFilter === s
                  ? "bg-lime-400/20 text-lime-300"
                  : "text-white/55 hover:bg-white/5"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </header>

      <div className="relative z-0 isolate overflow-hidden rounded-2xl border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
        <TravelGoogleMap
          markers={markers}
          routes={routes}
          onMarkerClick={setSelected}
          missingKeyMessage="Add NEXT_PUBLIC_GOOGLE_MAPS_TILES_KEY to .env.local and enable Map Tiles API in Google Cloud."
        />
      </div>

      <section aria-labelledby="map-legend-heading" className="space-y-2">
        <h2
          id="map-legend-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
        >
          {copy.mapLegendTitle} · {copy.mapLegendStatus}
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TRAVEL_MAP_STATUS_COLOR).map(([status, color]) => (
            <Badge
              key={status}
              variant="outline"
              className={`gap-1 ${bucketStatusBadgeClass(status as BucketStatus)}`}
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

      {markers.length > 0 ? (
        <section aria-labelledby="map-list-heading" className="space-y-2">
          <h2
            id="map-list-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            Mapped dreams
          </h2>
          <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {markers.map((m) => {
              const item = items?.find((i) => i.id === m.id);
              if (!item) return null;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(m.id)}
                    className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {item.title}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {item.destination_city ?? item.destination_country}
                      </span>
                    </span>
                    <Compass className="h-3.5 w-3.5 text-white/40" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
