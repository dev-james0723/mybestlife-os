"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

import type {
  TravelMapMarker,
  TravelMapRoute,
} from "./travel-google-map-inner";

const TravelGoogleMapInner = dynamic(
  () =>
    import("./travel-google-map-inner").then((m) => m.TravelGoogleMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[560px] w-full items-center justify-center rounded-2xl bg-slate-950/80 text-sm text-white/50">
        Loading map…
      </div>
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
};

export function TravelGoogleMap({
  markers,
  routes,
  onMarkerClick,
  missingKeyMessage,
}: TravelGoogleMapProps) {
  const apiKey = resolveGoogleMapsApiKey();

  if (!apiKey) {
    return (
      <div className="flex h-[560px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-slate-950/60 px-6 text-center">
        <MapPin className="h-8 w-8 text-white/35" aria-hidden />
        <p className="max-w-md text-sm text-white/60">{missingKeyMessage}</p>
      </div>
    );
  }

  return (
    <TravelGoogleMapInner
      apiKey={apiKey}
      markers={markers}
      routes={routes}
      onMarkerClick={onMarkerClick}
    />
  );
}
