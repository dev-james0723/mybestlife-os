"use client";

/**
 * POI layer — live nearby discoveries (and saved places) anchored on the
 * globe at their real coordinates. Inside the <TilesRenderer> so each
 * <EastNorthUpFrame> resolves against the tiles ellipsoid.
 *
 * NOTE: getOrientedEastNorthUpFrame expects RADIANS, so lat/lon are
 * converted from degrees here. Card screen-size is constant for now
 * (no distanceFactor) — distance-reactive scaling is a visual-tuning pass.
 */

import { Html } from "@react-three/drei";
import { EastNorthUpFrame } from "3d-tiles-renderer/r3f";
import { Bookmark, Star } from "lucide-react";

import type { PlaceSummary } from "@/lib/travel-explorer/places/places-provider";
import { placePhotoUrl } from "@/lib/travel-explorer/places/client";

const DEG2RAD = Math.PI / 180;

type Props = {
  pois: PlaceSummary[];
  savedIds: Set<string>;
  onSelect: (placeId: string) => void;
};

export function PoiLayer({ pois, savedIds, onSelect }: Props) {
  return (
    <>
      {pois.map((p) => (
        <EastNorthUpFrame
          key={p.providerPlaceId}
          lat={p.lat * DEG2RAD}
          lon={p.lng * DEG2RAD}
          height={0}
        >
          <Html center style={{ pointerEvents: "auto" }}>
            <button
              type="button"
              onClick={() => onSelect(p.providerPlaceId)}
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-[rgba(16,24,38,0.72)] px-2 py-1.5 text-left text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-md transition hover:border-[#7FE3F0]/60 hover:shadow-[0_0_18px_rgba(91,214,232,0.35)]"
            >
              {p.primaryPhotoRef ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={placePhotoUrl(p.primaryPhotoRef, 96)}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-lg object-cover"
                />
              ) : null}
              <span className="min-w-0">
                <span className="block max-w-[8rem] truncate text-xs font-semibold">{p.name}</span>
                {p.rating != null && (
                  <span className="flex items-center gap-0.5 text-[10px] text-white/70">
                    <Star className="h-2.5 w-2.5 fill-current text-amber-300" />
                    {p.rating.toFixed(1)}
                  </span>
                )}
              </span>
              {savedIds.has(p.providerPlaceId) && (
                <Bookmark className="h-3 w-3 shrink-0 fill-current text-[#7FE3F0]" />
              )}
            </button>
          </Html>
        </EastNorthUpFrame>
      ))}
    </>
  );
}
