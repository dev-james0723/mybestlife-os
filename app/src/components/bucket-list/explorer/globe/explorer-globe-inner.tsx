"use client";

/**
 * Route D′ — the live globe. R3F <Canvas> rendering Google Photorealistic
 * 3D Tiles via `3d-tiles-renderer/r3f`. Client-only (mounted via
 * `next/dynamic` ssr:false).
 *
 * STABLE BASE: tiles + GlobeControls + POIs + starfield, nothing else.
 * Camera choreography (idle spin / space→city descent) is intentionally
 * OFF — every camera-takeover / extra tile plugin attempt destabilised tile
 * loading. Re-introduce motion ONLY one increment at a time, each verified
 * to keep the globe rendering. The parked `globe-choreographer.tsx` is not
 * imported here.
 */

import { Canvas } from "@react-three/fiber";
import {
  TilesRenderer,
  TilesPlugin,
  TilesAttributionOverlay,
  GlobeControls,
} from "3d-tiles-renderer/r3f";
import { GoogleCloudAuthPlugin } from "3d-tiles-renderer/plugins";

import { PoiLayer } from "./poi-layer";
import { Starfield } from "./starfield";
import { suppressTileRendererLogs } from "@/lib/travel-explorer/suppress-tile-log";
import type { PlaceSummary } from "@/lib/travel-explorer/places/places-provider";

// Client-only module: quiet the renderer's noisy per-tile abort logs.
suppressTileRendererLogs();

type Props = {
  apiToken: string;
  target?: { lat: number; lng: number } | null;
  pois?: PlaceSummary[];
  savedIds?: Set<string>;
  onSelectPoi?: (placeId: string) => void;
};

export default function ExplorerGlobeInner({
  apiToken,
  pois,
  savedIds,
  onSelectPoi,
}: Props) {
  return (
    <Canvas
      className="absolute inset-0"
      // Huge scene scale (ECEF metres). Log depth avoids z-fighting from
      // orbital distance down to street level.
      gl={{ logarithmicDepthBuffer: true, antialias: true }}
      camera={{ position: [0, 0, 2.4e7], near: 1, far: 1e9, fov: 45 }}
      dpr={[1, 2]}
    >
      {/* Matte space backdrop + starfield so the globe reads as "from orbit". */}
      <color attach="background" args={["#05070d"]} />
      <Starfield />
      <ambientLight intensity={1.1} />
      <directionalLight position={[1, 1, 1]} intensity={1.6} />

      {/* Absolute Google root URL so child tile URIs resolve against
          tile.googleapis.com; `key` forces a clean remount on token change. */}
      <TilesRenderer
        key={apiToken}
        url="https://tile.googleapis.com/v1/3dtiles/root.json"
      >
        <TilesPlugin
          plugin={GoogleCloudAuthPlugin}
          args={[{ apiToken, autoRefreshToken: true }]}
        />
        {/* MANDATORY — Google ToS requires visible attribution. */}
        <TilesAttributionOverlay />
        <GlobeControls />

        {pois && onSelectPoi ? (
          <PoiLayer
            pois={pois}
            savedIds={savedIds ?? new Set<string>()}
            onSelect={onSelectPoi}
          />
        ) : null}
      </TilesRenderer>
    </Canvas>
  );
}
