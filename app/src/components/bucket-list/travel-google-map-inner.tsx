"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CircleMarker as LeafletCircleMarker,
  Map as LeafletMap,
  TileLayer as LeafletTileLayer,
} from "leaflet";

import "leaflet/dist/leaflet.css";

import { cn } from "@/lib/utils";
import {
  googleMapTilesLayerUrl,
  type GoogleMapTilesSession,
} from "@/lib/bucket-list/google-map-tiles";
import type { BucketStatus } from "@/types/bucket-list";
import {
  clearFlightRoutes,
  rebuildAllScreenArcCaches,
  syncFlightRoutes,
  tickFlightRoutes,
  tickRouteDashAnimation,
  type FlightRouteRuntime,
} from "./travel-flight-route-layer";

export type TravelMapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  status: BucketStatus;
  color: string;
};

export type TravelMapRoute = {
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  completed: boolean;
};

type TravelGoogleMapInnerProps = {
  apiKey: string;
  markers: TravelMapMarker[];
  routes: TravelMapRoute[];
  onMarkerClick: (id: string) => void;
  className?: string;
};

const DEFAULT_CENTER: [number, number] = [20, 10];
const DEFAULT_ZOOM = 2;

/**
 * Google Map Tiles (2D) + Leaflet — uses Map Tiles API (same as the 3D globe),
 * not Maps JavaScript API (avoids ApiNotActivatedMapError when only Tiles is on).
 */
export function TravelGoogleMapInner({
  apiKey,
  markers,
  routes,
  onMarkerClick,
  className,
}: TravelGoogleMapInnerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const markersRef = useRef<LeafletCircleMarker[]>([]);
  const flightRoutesRef = useRef<Map<string, FlightRouteRuntime>>(new Map());
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapReadyRef = useRef(false);
  const refreshPlaneHeadingsRef = useRef<(() => void) | null>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoadError(null);

      const sessionRes = await fetch("/api/travel/map-tiles-session", {
        method: "POST",
      });
      const sessionJson = (await sessionRes.json().catch(() => ({}))) as
        | GoogleMapTilesSession
        | { error?: string };

      if (!sessionRes.ok || !("session" in sessionJson) || !sessionJson.session) {
        if (!cancelled) {
          setLoadError(
            "session" in sessionJson
              ? "Could not start Google map tiles."
              : ((sessionJson as { error?: string }).error ??
                  "Enable Map Tiles API in Google Cloud for this key."),
          );
        }
        return;
      }

      const mod = await import("leaflet");
      const L = (mod.default ?? mod) as typeof import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      const tiles = L.tileLayer(
        googleMapTilesLayerUrl(sessionJson.session, apiKey),
        {
          maxZoom: 22,
          attribution:
            '&copy; <a href="https://www.google.com/maps">Google</a>',
        },
      );
      tiles.addTo(map);
      tileLayerRef.current = tiles;

      syncDestinationMarkers(
        L,
        map,
        markers,
        markersRef,
        onMarkerClickRef,
      );
      syncFlightRoutes(L, map, routes, flightRoutesRef.current);
      fitMapToData(L, map, markers, routes);
      mapReadyRef.current = true;

      const refreshHeadings = () => {
        if (!leafletRef.current || !mapRef.current) return;
        rebuildAllScreenArcCaches(mapRef.current, flightRoutesRef.current);
      };
      refreshPlaneHeadingsRef.current = refreshHeadings;
      map.on("zoom move", refreshHeadings);

      setTimeout(() => map.invalidateSize(), 100);
    })();

    return () => {
      cancelled = true;
      mapReadyRef.current = false;
      if (mapRef.current && refreshPlaneHeadingsRef.current) {
        mapRef.current.off("zoom move", refreshPlaneHeadingsRef.current);
      }
      refreshPlaneHeadingsRef.current = null;
      clearDestinationMarkers(markersRef);
      clearFlightRoutes(mapRef.current, flightRoutesRef.current);
      tileLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per mount
  }, [apiKey]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    syncDestinationMarkers(L, map, markers, markersRef, onMarkerClickRef);
    syncFlightRoutes(L, map, routes, flightRoutesRef.current);
    fitMapToData(L, map, markers, routes);
  }, [markers, routes]);

  useEffect(() => {
    let rafId = 0;
    let lastFrame = performance.now();

    const frame = (now: number) => {
      const L = leafletRef.current;
      const map = mapRef.current;
      if (
        mapReadyRef.current &&
        map &&
        L &&
        flightRoutesRef.current.size > 0
      ) {
        const delta = Math.min(0.05, (now - lastFrame) / 1000);
        lastFrame = now;
        tickFlightRoutes(map, flightRoutesRef.current, delta);
        tickRouteDashAnimation(flightRoutesRef.current, delta);
      } else {
        lastFrame = now;
      }
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (loadError) {
    return (
      <div
        className={cn(
          "flex h-[560px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-400/30 bg-slate-950/80 px-6 text-center",
          className,
        )}
      >
        <p className="text-sm font-medium text-amber-200/90">Map could not load</p>
        <p className="max-w-md text-sm text-white/55">{loadError}</p>
        <p className="max-w-md text-xs text-white/40">
          In Google Cloud Console, enable{" "}
          <strong className="font-medium text-white/60">Map Tiles API</strong> for
          this project (same key as the Travel Explorer globe).
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("travel-google-map h-[560px] w-full", className)}
      role="application"
      aria-label="Travel dreams map"
    />
  );
}

function syncDestinationMarkers(
  L: typeof import("leaflet"),
  map: LeafletMap,
  markers: TravelMapMarker[],
  markersRef: React.MutableRefObject<LeafletCircleMarker[]>,
  onMarkerClickRef: React.MutableRefObject<(id: string) => void>,
) {
  clearDestinationMarkers(markersRef);

  for (const marker of markers) {
    const pin = L.circleMarker([marker.lat, marker.lng], {
      radius: 9,
      color: "#0f172a",
      weight: 1.5,
      fillColor: marker.color,
      fillOpacity: 0.95,
    })
      .bindTooltip(marker.title, { direction: "top", opacity: 0.95 })
      .addTo(map);
    pin.on("click", () => onMarkerClickRef.current(marker.id));
    markersRef.current.push(pin);
  }
}

function fitMapToData(
  L: typeof import("leaflet"),
  map: LeafletMap,
  markers: TravelMapMarker[],
  routes: TravelMapRoute[],
) {
  const bounds = L.latLngBounds([]);
  let hasPoint = false;

  for (const m of markers) {
    bounds.extend([m.lat, m.lng]);
    hasPoint = true;
  }
  for (const r of routes) {
    bounds.extend([r.from.lat, r.from.lng]);
    bounds.extend([r.to.lat, r.to.lng]);
    hasPoint = true;
  }

  if (!hasPoint) {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    return;
  }

  if (markers.length === 1 && routes.length === 0) {
    map.setView([markers[0]!.lat, markers[0]!.lng], 5);
    return;
  }

  map.fitBounds(bounds, { padding: [56, 56], maxZoom: 8 });
}

function clearDestinationMarkers(
  markersRef: React.MutableRefObject<LeafletCircleMarker[]>,
) {
  for (const m of markersRef.current) {
    m.remove();
  }
  markersRef.current = [];
}
