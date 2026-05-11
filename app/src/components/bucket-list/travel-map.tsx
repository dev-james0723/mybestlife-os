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
import { airportCoords } from "@/lib/bucket-list/flight-watch";
import type { BucketItem, BucketStatus } from "@/types/bucket-list";

/**
 * Self-contained SVG world map. We draw a simplified graticule (ocean +
 * continents as a styled background) and project lat/lng into screen space
 * with Web-Mercator. This gives us a cinematic, always-offline map without
 * vendor keys.
 */

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 500;

// Web-Mercator projection, clipped to |lat| ≤ 85 (Mercator limit).
function project(lat: number, lng: number): { x: number; y: number } {
  const clampedLat = Math.max(Math.min(lat, 85), -85);
  const x = ((lng + 180) / 360) * MAP_WIDTH;
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  const y =
    (0.5 -
      Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) *
    MAP_HEIGHT;
  return { x, y };
}

const STATUS_COLOR: Record<BucketStatus, string> = {
  dreaming: "#7dd3fc", // sky
  exploring: "#fbbf24", // amber
  planning: "#fbbf24",
  active: "#a3e635", // lime
  funded: "#34d399",
  scheduled: "#34d399",
  booked: "#22d3ee",
  completed: "#f472b6",
  paused: "#cbd5e1",
  archived: "#64748b",
};

type Marker = {
  item: BucketItem;
  x: number;
  y: number;
};

export function BucketTravelMap() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const { data: items } = useBucketItems();
  const setSelected = useBucketListStore((s) => s.setSelectedBucketId);
  const listHref = useLocalizedPath("/bucket-list");

  const [statusFilter, setStatusFilter] = useState<BucketStatus | "all">("all");

  const markers: Marker[] = useMemo(() => {
    const list = items ?? [];
    const result: Marker[] = [];
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
      const { x, y } = project(lat, lng);
      result.push({ item, x, y });
    }
    return result;
  }, [items, statusFilter]);

  const routes = useMemo(() => {
    if (!items) return [] as Array<{
      from: { x: number; y: number };
      to: { x: number; y: number };
      completed: boolean;
      id: string;
    }>;
    const lines: Array<{
      from: { x: number; y: number };
      to: { x: number; y: number };
      completed: boolean;
      id: string;
    }> = [];
    for (const item of items) {
      if (item.type !== "travel") continue;
      if (!item.origin_airport || !item.destination_airport) continue;
      const origin = airportCoords(item.origin_airport);
      const dest =
        item.destination_lat != null && item.destination_lng != null
          ? { lat: item.destination_lat, lng: item.destination_lng }
          : airportCoords(item.destination_airport);
      if (!origin || !dest) continue;
      lines.push({
        from: project(origin.lat, origin.lng),
        to: project(dest.lat, dest.lng),
        completed: item.status === "completed",
        id: item.id,
      });
    }
    return lines;
  }, [items]);

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
              {markers.length} travel {markers.length === 1 ? "dream" : "dreams"} mapped
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

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/80 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="block h-[560px] w-full"
          role="img"
          aria-label={copy.mapTitle}
        >
          <defs>
            <pattern
              id="graticule"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.5"
              />
            </pattern>
            <radialGradient id="glowFilter" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(200,229,58,0.7)" />
              <stop offset="100%" stopColor="rgba(200,229,58,0)" />
            </radialGradient>
          </defs>

          {/* Ocean */}
          <rect
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            fill="url(#graticule)"
          />

          {/* Stylised continents — simple silhouette outlines for ambience. */}
          <g fill="rgba(148, 163, 184, 0.11)" stroke="rgba(148, 163, 184, 0.22)" strokeWidth="0.6">
            <CONTINENTS />
          </g>

          {/* Route lines */}
          {routes.map((route) => (
            <path
              key={route.id}
              d={arcPath(route.from, route.to)}
              fill="none"
              stroke={route.completed ? "#f472b6" : "rgba(200,229,58,0.55)"}
              strokeWidth={route.completed ? 1.8 : 1.2}
              strokeDasharray={route.completed ? undefined : "4 4"}
              opacity="0.75"
            />
          ))}

          {/* Markers */}
          {markers.map((m) => {
            const color = STATUS_COLOR[m.item.status];
            return (
              <g
                key={m.item.id}
                transform={`translate(${m.x}, ${m.y})`}
                className="cursor-pointer"
                onClick={() => setSelected(m.item.id)}
              >
                <circle r="10" fill={color} opacity="0.2" />
                <circle r="6" fill={color} opacity="0.5" />
                <circle r="3.5" fill={color} stroke="#0f172a" strokeWidth="1" />
                <title>{m.item.title}</title>
              </g>
            );
          })}
        </svg>
      </div>

      <section aria-labelledby="map-legend-heading" className="space-y-2">
        <h2
          id="map-legend-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
        >
          {copy.mapLegendTitle} · {copy.mapLegendStatus}
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_COLOR).map(([status, color]) => (
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
            {markers.map((m) => (
              <li key={m.item.id}>
                <button
                  type="button"
                  onClick={() => setSelected(m.item.id)}
                  className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {m.item.title}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {m.item.destination_city ?? m.item.destination_country}
                    </span>
                  </span>
                  <Compass className="h-3.5 w-3.5 text-white/40" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Simple great-circle-ish arc between two projected points. */
function arcPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cx = from.x + dx / 2 - dy * 0.15;
  const cy = from.y + dy / 2 + dx * 0.15;
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

/**
 * Highly simplified world silhouette in "equirectangular-ish → projected to
 * Mercator" coordinates. Hand-tuned polygons for ambient background only;
 * not geographically accurate. Real latitude/longitude pins overlay on top.
 */
function CONTINENTS() {
  return (
    <>
      {/* North America */}
      <path d="M150 110 L260 100 L320 140 L320 220 L260 260 L220 280 L180 240 L150 180 Z" />
      {/* South America */}
      <path d="M260 280 L310 280 L330 360 L300 420 L270 440 L250 390 L245 320 Z" />
      {/* Europe */}
      <path d="M470 130 L540 125 L555 170 L520 200 L480 200 L460 170 Z" />
      {/* Africa */}
      <path d="M480 210 L560 205 L580 280 L560 360 L520 400 L490 380 L475 310 Z" />
      {/* Asia */}
      <path d="M560 120 L740 120 L820 180 L800 240 L700 260 L620 230 L570 190 Z" />
      {/* India */}
      <path d="M640 240 L680 240 L690 290 L660 310 L640 280 Z" />
      {/* Australia */}
      <path d="M780 330 L860 330 L880 380 L820 395 L780 375 Z" />
      {/* Antarctica hint */}
      <path d="M100 470 L900 470 L900 495 L100 495 Z" opacity="0.35" />
    </>
  );
}
