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
  TRAVEL_BASEMAP_URL,
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
import { useAppStore } from "@/stores/app-store";
import { getUxJourneyCopy } from "@/lib/i18n/ux-journey-ui";
import { TravelMapFallback } from "./travel-map-fallback";

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
  onRetry?: () => void;
  apiKey?: string;
  markers: TravelMapMarker[];
  routes: TravelMapRoute[];
  onMarkerClick: (id: string) => void;
  className?: string;
};

const DEFAULT_CENTER: [number, number] = [20, 10];
const DEFAULT_ZOOM = 2;
const TILE_LOAD_TIMEOUT_MS = 10_000;

/**
 * Leaflet starts with the app's existing keyless basemap. Google detail is an
 * optional upgrade; a failed session or tile must never remove the working map.
 */
export function TravelGoogleMapInner({
  apiKey,
  markers,
  routes,
  onMarkerClick,
  className,
  onRetry,
}: TravelGoogleMapInnerProps) {
  const copy = getUxJourneyCopy(useAppStore((state) => state.language));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const markersRef = useRef<LeafletCircleMarker[]>([]);
  const flightRoutesRef = useRef<Map<string, FlightRouteRuntime>>(new Map());
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapReadyRef = useRef(false);
  const refreshPlaneHeadingsRef = useRef<(() => void) | null>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  const dataRef = useRef({ markers, routes });

  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapSource, setMapSource] = useState("loading");

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
    dataRef.current = { markers, routes };
  }, [onMarkerClick, markers, routes]);

  useEffect(() => {
    let cancelled = false;
    const flightRoutes = flightRoutesRef.current;
    const controller = new AbortController();
    let resizeObserver: ResizeObserver | undefined;
    let sessionTimer: ReturnType<typeof setTimeout> | undefined;
    let tileTimer: ReturnType<typeof setTimeout> | undefined;
    let googleTimer: ReturnType<typeof setTimeout> | undefined;
    let googleTiles: LeafletTileLayer | null = null;
    let standardTiles: LeafletTileLayer | null = null;
    let standardLoaded = false;
    let googleLoaded = false;
    let googlePending = Boolean(apiKey);

    void (async () => {
      setLoadError(null);
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
        // Leaflet 1.9 leaves its CSS zoom timer alive after map.remove().
        // Keep zoom/pinch immediate so tab changes cannot touch disposed panes.
        zoomAnimation: false,
      });
      mapRef.current = map;

      const currentData = dataRef.current;
      syncDestinationMarkers(
        L,
        map,
        currentData.markers,
        markersRef,
        onMarkerClickRef,
      );
      syncFlightRoutes(L, map, currentData.routes, flightRoutes);
      fitMapToData(L, map, currentData.markers, currentData.routes);
      mapReadyRef.current = true;

      const refreshHeadings = () => {
        if (!leafletRef.current || !mapRef.current) return;
        rebuildAllScreenArcCaches(mapRef.current, flightRoutes);
      };
      refreshPlaneHeadingsRef.current = refreshHeadings;
      map.on("zoom move", refreshHeadings);

      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(containerRef.current);

      const markUnavailable = () => {
        if (!cancelled && !standardLoaded && !googlePending && !googleLoaded) {
          setMapSource("offline");
          setLoadError("tiles_unavailable");
        }
      };
      const watchTiles = () => {
        clearTimeout(tileTimer);
        tileTimer = setTimeout(markUnavailable, TILE_LOAD_TIMEOUT_MS);
      };
      const showStandardMap = () => {
        if (cancelled) return;
        googlePending = false;
        googleLoaded = false;
        clearTimeout(googleTimer);
        googleTiles?.remove();
        googleTiles?.off();
        googleTiles = null;
        if (standardTiles && !map.hasLayer(standardTiles)) standardTiles.addTo(map);
        tileLayerRef.current = standardTiles;
        setMapSource(standardLoaded ? "standard" : "loading");
        watchTiles();
      };

      standardTiles = L.tileLayer(TRAVEL_BASEMAP_URL, {
        maxZoom: 18,
        attribution: 'Basemap <a href="https://www.rainviewer.com/">RainViewer</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      });
      standardTiles.on("tileload", () => {
        if (cancelled) return;
        standardLoaded = true;
        if (!googleLoaded) {
          setLoadError(null);
          setMapSource("standard");
        }
      });
      // `loading` also covers a new viewport after pan/zoom, not just mount.
      standardTiles.on("loading", () => {
        standardLoaded = false;
        watchTiles();
      });
      standardTiles.on("load", markUnavailable);
      standardTiles.addTo(map);
      tileLayerRef.current = standardTiles;
      watchTiles();

      if (!apiKey) return;
      sessionTimer = setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetch("/api/travel/map-tiles-session", {
          method: "POST",
          signal: controller.signal,
        });
        const session = (await response.json()) as GoogleMapTilesSession;
        if (!response.ok || typeof session?.session !== "string" || !session.session.trim()) {
          throw new Error("Map session unavailable");
        }
        if (cancelled) return;
        googleTiles = L.tileLayer(googleMapTilesLayerUrl(session.session, apiKey), {
          maxZoom: 22,
          opacity: 0,
          attribution: '&copy; <a href="https://www.google.com/maps">Google</a>',
        });
        let loadedTile = false;
        googleTiles.on("loading", () => {
          clearTimeout(googleTimer);
          googleTimer = setTimeout(showStandardMap, TILE_LOAD_TIMEOUT_MS);
        });
        googleTiles.on("tileload", () => { loadedTile = true; });
        googleTiles.on("tileerror", showStandardMap);
        googleTiles.on("remove", () => clearTimeout(googleTimer));
        googleTiles.on("load", () => {
          clearTimeout(googleTimer);
          if (cancelled || !googleTiles || !loadedTile) return;
          googlePending = false;
          googleLoaded = true;
          googleTiles.setOpacity(1);
          standardTiles?.remove();
          tileLayerRef.current = googleTiles;
          setLoadError(null);
          setMapSource("google");
        });
        googleTiles.addTo(map);
      } catch {
        showStandardMap();
      } finally {
        clearTimeout(sessionTimer);
      }
    })().catch(() => {
      if (!cancelled) {
        setMapSource("offline");
        setLoadError("map_unavailable");
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(sessionTimer);
      clearTimeout(tileTimer);
      clearTimeout(googleTimer);
      resizeObserver?.disconnect();
      googleTiles?.remove();
      googleTiles?.off();
      standardTiles?.remove();
      standardTiles?.off();
      mapReadyRef.current = false;
      if (mapRef.current && refreshPlaneHeadingsRef.current) {
        mapRef.current.off("zoom move", refreshPlaneHeadingsRef.current);
      }
      refreshPlaneHeadingsRef.current = null;
      clearDestinationMarkers(markersRef);
      clearFlightRoutes(mapRef.current, flightRoutes);
      tileLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
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

  return (
    <div
      className={cn("relative isolate h-[min(58dvh,560px)] min-h-[420px] w-full overflow-hidden", className)}
      data-map-source={mapSource}
    >
      <div
        ref={containerRef}
        className="travel-google-map h-full w-full"
        role="region"
        aria-label="Travel dreams map"
        aria-hidden={Boolean(loadError)}
        style={loadError ? { visibility: "hidden" } : undefined}
      />
      {loadError ? <TravelMapFallback
        markers={markers}
        routes={routes}
        onMarkerClick={onMarkerClick}
        title="Map layer paused"
        message={copy.mapUnavailable}
        onRetry={onRetry}
        className="absolute inset-0 h-full min-h-0"
      /> : null}
    </div>
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
