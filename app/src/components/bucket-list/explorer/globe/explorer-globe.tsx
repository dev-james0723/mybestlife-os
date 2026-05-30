"use client";

/**
 * Globe mount + fallback ladder. Renders the R3F scene ONLY when both a
 * Map Tiles key and WebGL are present; otherwise returns null so the
 * Explorer Console's static gradient + glass HUD shows through (the
 * mandated "page is never broken without 3D" path).
 *
 *   1. reduced-motion / first paint → null (settled fallback shows)
 *   2. no NEXT_PUBLIC_GOOGLE_MAPS_TILES_KEY → null (fallback shows)
 *   3. no WebGL → null (fallback shows)
 *   4. otherwise → the dynamically-imported, client-only globe.
 */

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

import { detectWebGL } from "@/lib/travel-explorer/engine/capability";
import type { PlaceSummary } from "@/lib/travel-explorer/places/places-provider";

const ExplorerGlobeInner = dynamic(() => import("./explorer-globe-inner"), {
  ssr: false,
});

// WebGL availability via useSyncExternalStore — null on the server / first
// paint, resolves on the client (matches the Brain sphere pattern).
const webGLStore = {
  subscribe: () => () => {},
  getSnapshot: () => detectWebGL(),
  getServerSnapshot: () => null as boolean | null,
};

type ExplorerGlobeProps = {
  target?: { lat: number; lng: number } | null;
  pois?: PlaceSummary[];
  savedIds?: Set<string>;
  onSelectPoi?: (placeId: string) => void;
};

export function ExplorerGlobe(props: ExplorerGlobeProps) {
  const apiToken = process.env.NEXT_PUBLIC_GOOGLE_MAPS_TILES_KEY;
  const webGLOk = useSyncExternalStore(
    webGLStore.subscribe,
    webGLStore.getSnapshot,
    webGLStore.getServerSnapshot,
  );

  if (!apiToken) return null;
  if (webGLOk === null) return null;
  if (!webGLOk) return null;

  return <ExplorerGlobeInner apiToken={apiToken} {...props} />;
}
