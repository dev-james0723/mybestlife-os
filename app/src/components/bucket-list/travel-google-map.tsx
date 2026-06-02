"use client";

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

function resolveGoogleMapsApiKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_TILES_KEY
  );
}

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
  missingKeyMessage,
  className,
}: TravelGoogleMapProps) {
  const apiKey = resolveGoogleMapsApiKey();

  if (!apiKey) {
    return (
      <TravelMapFallback
        markers={markers}
        routes={routes}
        onMarkerClick={onMarkerClick}
        message={missingKeyMessage}
        className={className}
      />
    );
  }

  return (
    <TravelGoogleMapInner
      apiKey={apiKey}
      markers={markers}
      routes={routes}
      onMarkerClick={onMarkerClick}
      className={className}
    />
  );
}
