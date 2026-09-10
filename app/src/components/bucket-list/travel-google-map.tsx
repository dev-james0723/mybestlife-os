"use client";

import { useState } from "react";
import { resolveGoogleMapTilesKey } from "@/lib/bucket-list/google-map-tiles";
import dynamic from "next/dynamic";

import type {
  TravelMapMarker,
  TravelMapRoute,
} from "./travel-google-map-inner";
import { TravelMapFallback } from "./travel-map-fallback";

const TravelGoogleMapInner = dynamic(
  () =>
    import("./travel-google-map-inner").then((m) => m.TravelGoogleMapInner),
  {
    ssr: false,
    loading: () => (
      <TravelMapFallback
        markers={[]}
        routes={[]}
        title="Loading travel map"
        message="Preparing your travel layer."
        loading
      />
    ),
  },
);

type TravelGoogleMapProps = {
  markers: TravelMapMarker[];
  routes: TravelMapRoute[];
  onMarkerClick: (id: string) => void;
  missingKeyMessage: string;
  className?: string;
};

export function TravelGoogleMap({
  markers,
  routes,
  onMarkerClick,
  className,
}: TravelGoogleMapProps) {
  const [attempt, setAttempt] = useState(0);
  const apiKey = resolveGoogleMapTilesKey();

  return (
    <TravelGoogleMapInner
      key={attempt}
      onRetry={() => setAttempt((current) => current + 1)}
      apiKey={apiKey}
      markers={markers}
      routes={routes}
      onMarkerClick={onMarkerClick}
      className={className}
    />
  );
}
