"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import type {
  Map as LeafletMap,
  TileLayer as LeafletTileLayer,
  CircleMarker as LeafletCircleMarker,
} from "leaflet";

import "leaflet/dist/leaflet.css";

import {
  radarTileUrl,
  type RadarFrame,
  type RadarFrames,
} from "@/lib/weather/rainviewer";

export interface RadarMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
  /** Swap the visible radar frame (used by the playback timeline). */
  showFrame: (index: number) => void;
}

interface WeatherRadarInnerProps {
  latitude: number;
  longitude: number;
  frames: RadarFrames | null;
  /** Current frame index controlled by the parent timeline. */
  frameIndex: number;
}

/**
 * Real radar surface: a dark Carto basemap centred on the user's
 * coordinates, a pulsing marker for "you are here", and a RainViewer
 * radar tile layer that swaps frames as the timeline plays.
 *
 * Built on raw Leaflet (not react-leaflet) to avoid React-19 peer-dep
 * friction and to keep tight control over frame swapping without
 * re-rendering the whole map.
 */
const WeatherRadarInner = forwardRef<RadarMapHandle, WeatherRadarInnerProps>(
  function WeatherRadarInner({ latitude, longitude, frames, frameIndex }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const radarLayerRef = useRef<LeafletTileLayer | null>(null);
    const markerRef = useRef<LeafletCircleMarker | null>(null);
    // Cache one tile layer per frame so scrubbing back and forth is instant
    // and we can cross-fade instead of flashing.
    const frameLayers = useRef<Map<number, LeafletTileLayer>>(new Map());
    const leafletRef = useRef<typeof import("leaflet") | null>(null);

    // Initialise the map once.
    useEffect(() => {
      let cancelled = false;
      const layers = frameLayers.current;
      void (async () => {
        const mod = await import("leaflet");
        const L = (mod.default ?? mod) as typeof import("leaflet");
        if (cancelled || !containerRef.current || mapRef.current) return;
        leafletRef.current = L;

        const map = L.map(containerRef.current, {
          center: [latitude, longitude],
          zoom: 8,
          zoomControl: false,
          attributionControl: true,
          dragging: true,
          scrollWheelZoom: false,
          doubleClickZoom: true,
        });
        mapRef.current = map;

        // Dark basemap — Carto "Dark Matter" (free, attribution required).
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            subdomains: "abcd",
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a> · Radar <a href="https://www.rainviewer.com/">RainViewer</a>',
          },
        ).addTo(map);

        // "You are here" — pulsing lime marker.
        const marker = L.circleMarker([latitude, longitude], {
          radius: 6,
          color: "#c8e53a",
          weight: 2,
          fillColor: "#c8e53a",
          fillOpacity: 0.9,
        }).addTo(map);
        markerRef.current = marker;

        // Force a resize pass — the container animates in from a parent.
        setTimeout(() => map.invalidateSize(), 100);
      })();

      return () => {
        cancelled = true;
        mapRef.current?.remove();
        mapRef.current = null;
        layers.clear();
        radarLayerRef.current = null;
        markerRef.current = null;
      };
      // Re-create only when coordinates change meaningfully.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Recenter when coordinates change without rebuilding the map.
    useEffect(() => {
      const map = mapRef.current;
      const marker = markerRef.current;
      if (!map || !marker) return;
      marker.setLatLng([latitude, longitude]);
      map.setView([latitude, longitude], map.getZoom(), { animate: true });
    }, [latitude, longitude]);

    // Swap the visible radar frame.
    useEffect(() => {
      const map = mapRef.current;
      const L = leafletRef.current;
      if (!map || !L || !frames) return;
      const frame = frames.frames[frameIndex];
      if (!frame) return;

      const layer = getOrCreateFrameLayer(L, map, frames.host, frame, frameIndex);
      if (radarLayerRef.current && radarLayerRef.current !== layer) {
        radarLayerRef.current.setOpacity(0);
      }
      layer.setOpacity(0.75);
      radarLayerRef.current = layer;
    }, [frames, frameIndex]);

    function getOrCreateFrameLayer(
      L: typeof import("leaflet"),
      map: LeafletMap,
      host: string,
      frame: RadarFrame,
      index: number,
    ): LeafletTileLayer {
      const existing = frameLayers.current.get(index);
      if (existing) return existing;
      const layer = L.tileLayer(radarTileUrl(host, frame), {
        opacity: 0,
        maxZoom: 19,
        // RainViewer tiles tolerate over-zoom by upscaling.
        maxNativeZoom: 12,
      }).addTo(map);
      frameLayers.current.set(index, layer);
      return layer;
    }

    useImperativeHandle(ref, () => ({
      zoomIn: () => mapRef.current?.zoomIn(),
      zoomOut: () => mapRef.current?.zoomOut(),
      recenter: () =>
        mapRef.current?.setView([latitude, longitude], 8, { animate: true }),
      showFrame: () => {
        /* Frame swap is driven by the `frameIndex` prop effect above. */
      },
    }));

    return (
      <div
        ref={containerRef}
        className="weather-radar-map absolute inset-0"
        aria-label="Precipitation radar map centred on your location"
        role="img"
      />
    );
  },
);

export default WeatherRadarInner;
