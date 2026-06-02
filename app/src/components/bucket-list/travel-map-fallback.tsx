"use client";

import { Compass, MapPin, Route } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  TravelMapMarker,
  TravelMapRoute,
} from "./travel-google-map-inner";

type TravelMapFallbackProps = {
  markers: TravelMapMarker[];
  routes: TravelMapRoute[];
  onMarkerClick?: (id: string) => void;
  title?: string;
  message?: string;
  className?: string;
  loading?: boolean;
};

const clampPercent = (value: number) => Math.max(8, Math.min(92, value));

function projectPoint(point: { lat: number; lng: number }) {
  return {
    x: clampPercent(((point.lng + 180) / 360) * 100),
    y: clampPercent(((90 - point.lat) / 180) * 100),
  };
}

function routePath(route: TravelMapRoute) {
  const from = projectPoint(route.from);
  const to = projectPoint(route.to);
  const lift = Math.max(12, Math.abs(from.x - to.x) * 0.18);
  const controlX = (from.x + to.x) / 2;
  const controlY = Math.min(from.y, to.y) - lift;
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}

export function TravelMapFallback({
  markers,
  routes,
  onMarkerClick,
  title = "Map layer paused",
  message = "Your mapped travel dreams are still available while the live map layer reconnects.",
  className,
  loading = false,
}: TravelMapFallbackProps) {
  const visibleMarkers = markers.slice(0, 10);
  const hasMarkers = visibleMarkers.length > 0;

  return (
    <div
      className={cn(
        "relative h-[min(58dvh,560px)] min-h-[420px] w-full overflow-hidden rounded-[1.35rem] bg-slate-950 text-white",
        className,
      )}
      role="region"
      aria-busy={loading}
      aria-label={
        hasMarkers
          ? `Travel map fallback with ${markers.length} mapped dreams`
          : "Travel map fallback with no mapped dreams"
      }
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(190,242,100,0.15),transparent_30%),radial-gradient(circle_at_78%_28%,rgba(56,189,248,0.12),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))]"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:44px_44px]"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:22px_22px]"
      />

      {routes.length > 0 ? (
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {routes.slice(0, 8).map((route) => (
            <path
              key={route.id}
              d={routePath(route)}
              fill="none"
              stroke={route.completed ? "rgba(190,242,100,0.5)" : "rgba(148,163,184,0.42)"}
              strokeDasharray={route.completed ? "0" : "4 4"}
              strokeLinecap="round"
              strokeWidth="0.55"
            />
          ))}
        </svg>
      ) : null}

      {loading ? (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white/68 backdrop-blur-xl">
            Loading travel map
          </div>
        </div>
      ) : null}

      {visibleMarkers.map((marker) => {
        const point = projectPoint(marker);
        return (
          <button
            key={marker.id}
            type="button"
            disabled={!onMarkerClick}
            onClick={() => onMarkerClick?.(marker.id)}
            className="absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-slate-950/70 bg-slate-950/80 shadow-[0_10px_24px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.14)] transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70 disabled:pointer-events-none"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
            }}
            aria-label={marker.title}
          >
            <span
              className="h-3.5 w-3.5 rounded-full ring-4 ring-white/12"
              style={{ backgroundColor: marker.color }}
              aria-hidden
            />
          </button>
        );
      })}

      <div className="absolute bottom-3 left-3 right-[4.75rem] rounded-2xl border border-white/12 bg-slate-950/76 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:right-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-lime-300/18 bg-lime-300/10 text-lime-200">
            {hasMarkers ? (
              <Route className="h-4.5 w-4.5" aria-hidden />
            ) : (
              <Compass className="h-4.5 w-4.5" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight text-white">
              {hasMarkers
                ? `${markers.length} mapped ${markers.length === 1 ? "dream" : "dreams"}`
                : title}
            </p>
            <p className="mt-1 text-xs leading-5 text-white/58">{message}</p>
          </div>
        </div>

        {hasMarkers ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleMarkers.slice(0, 4).map((marker) => (
              <button
                key={marker.id}
                type="button"
                disabled={!onMarkerClick}
                onClick={() => onMarkerClick?.(marker.id)}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-2.5 text-xs font-medium text-white/76 transition-colors hover:border-white/18 hover:bg-white/[0.085] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70 disabled:pointer-events-none"
              >
                <MapPin className="h-3.5 w-3.5 text-white/45" aria-hidden />
                <span className="max-w-36 truncate">{marker.title}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
