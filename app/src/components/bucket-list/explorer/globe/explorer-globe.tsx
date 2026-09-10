"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { detectWebGL } from "@/lib/travel-explorer/engine/capability";
import type { PlaceSummary } from "@/lib/travel-explorer/places/places-provider";

const ExplorerGlobeInner = dynamic(() => import("./explorer-globe-inner"), { ssr: false });
const webGLStore = {
  subscribe: () => () => {},
  getSnapshot: () => detectWebGL(),
  getServerSnapshot: () => null as boolean | null,
};
export type GlobeStatus = "loading" | "world" | "detailed" | "tiles-error" | "unavailable";
export type ExplorerGlobeProps = {
  target?: { lat: number; lng: number } | null;
  pois?: PlaceSummary[];
  savedIds?: Set<string>;
  onSelectPoi?: (placeId: string) => void;
  onStatus: (status: GlobeStatus) => void;
};

class GlobeBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function ExplorerGlobe(props: ExplorerGlobeProps) {
  const webGL = useSyncExternalStore(webGLStore.subscribe, webGLStore.getSnapshot, webGLStore.getServerSnapshot);
  const reduceMotion = useReducedMotion() ?? true;
  const container = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const { onStatus } = props;
  useEffect(() => {
    if (webGL === false) onStatus("unavailable");
  }, [webGL, onStatus]);
  useEffect(() => {
    let intersecting = true;
    const update = () => setActive(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; update(); });
    if (container.current) observer.observe(container.current);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);

  return (
    <div ref={container} className="absolute inset-0">
      {webGL && <GlobeBoundary onError={() => onStatus("unavailable")}>
        <ExplorerGlobeInner {...props} apiToken={process.env.NEXT_PUBLIC_GOOGLE_MAPS_TILES_KEY} active={active} reducedMotion={reduceMotion} />
      </GlobeBoundary>}
    </div>
  );
}
