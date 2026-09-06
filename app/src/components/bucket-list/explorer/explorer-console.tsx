"use client";

import { useMemo, useState } from "react";
import {
  Crosshair,
  Search,
  Radar,
  Plane,
  Gauge,
  Navigation,
  Bookmark,
  CalendarRange,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getTravelExplorerUiCopy } from "@/lib/i18n/travel-explorer-ui";
import { useTravelExplorerStore } from "@/stores/travel-explorer-store";
import type { EnginePhase } from "@/lib/travel-explorer/engine/engine-adapter";
import {
  usePlacesNearby,
  useSavedPlaces,
  useTravelDestinations,
  useUpsertDestination,
} from "@/hooks/use-travel-explorer";
import { searchPlacesText } from "@/lib/travel-explorer/places/client";
import { ExplorerGlobe } from "./globe/explorer-globe";
import { PoiDetailPopup } from "./poi-detail-popup";

/**
 * Explorer Console — the Travel workspace shell.
 *
 * DEGRADE-FIRST: this renders beautifully with NO 3D engine, NO API keys
 * and NO data — the static "settled" fallback frame mandated by the build
 * rules. The R3F globe (Route D′) mounts into `#explorer-stage` in a later
 * Wave B step behind a capability + key check; until then the stage shows
 * the dark-tech gradient + glass HUD so the page is never broken.
 */

const GLASS =
  "border border-white/15 bg-[rgba(16,24,38,0.55)] backdrop-blur-xl " +
  "shadow-[0_8px_32px_rgba(0,0,0,0.35)]";
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";
const CYAN = "#7FE3F0";

export function ExplorerConsole() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getTravelExplorerUiCopy(language), [language]);

  const telemetry = useTravelExplorerStore((s) => s.telemetry);
  const phase = useTravelExplorerStore((s) => s.phase);
  const activeDestinationId = useTravelExplorerStore((s) => s.activeDestinationId);
  const setActiveDestinationId = useTravelExplorerStore((s) => s.setActiveDestinationId);
  const openDetail = useTravelExplorerStore((s) => s.openDetail);

  const { data: destinations } = useTravelDestinations();
  const activeDestination = useMemo(
    () => (destinations ?? []).find((d) => d.id === activeDestinationId) ?? null,
    [destinations, activeDestinationId],
  );
  const { data: nearby } = usePlacesNearby(
    activeDestination?.center_lat,
    activeDestination?.center_lng,
  );
  const pois = useMemo(() => nearby?.items ?? [], [nearby]);
  const { data: savedPlaces } = useSavedPlaces(activeDestinationId);
  const savedIds = useMemo(
    () => new Set((savedPlaces ?? []).map((s) => s.place_id)),
    [savedPlaces],
  );

  const upsertDestination = useUpsertDestination();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const runSearch = async () => {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    try {
      const res = await searchPlacesText(q);
      const first = res.items[0];
      if (!first) {
        toast.error(copy.searchFailed);
        return;
      }
      const dest = await upsertDestination.mutateAsync({
        slug: slugify(first.name || q, first.lat, first.lng),
        name: first.name || q,
        center_lat: first.lat,
        center_lng: first.lng,
        provider: "google",
      });
      setActiveDestinationId(dest.id);
    } catch {
      toast.error(copy.searchFailed);
    } finally {
      setSearching(false);
    }
  };

  const phaseLabel = phaseToLabel(phase, copy);

  return (
    <div
      className={cn(
        "relative isolate min-h-[78vh] w-full overflow-hidden rounded-2xl",
        "bg-[linear-gradient(180deg,#0E1A2B_0%,#16304C_55%,#1B3A5C_100%)]",
        "text-white",
      )}
    >
      {/* Stage — Route D′ globe mounts here (covers the wash when it renders;
          falls back to the static gradient + radar when no key / no WebGL). */}
      <div id="explorer-stage" className="absolute inset-0">
        <div aria-hidden>
          {/* Static aerial-fallback wash + faint horizon haze. */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(120%_80%_at_50%_120%,rgba(175,198,218,0.28),transparent_70%)]" />
          <RadarReticle />
        </div>
        <ExplorerGlobe
          target={
            activeDestination
              ? { lat: activeDestination.center_lat, lng: activeDestination.center_lng }
              : null
          }
          pois={pois}
          savedIds={savedIds}
          onSelectPoi={openDetail}
        />
      </div>

      {/* ── Top bar ───────────────────────────────────────────── */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span
            className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/5"
            style={{ color: CYAN }}
          >
            <Crosshair className="h-4 w-4" />
          </span>
          <span className="hidden text-sm font-semibold tracking-[0.14em] sm:inline">
            {copy.consoleTitle}
          </span>
        </div>

        {/* Destination search — type a city, Enter to fly there. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch();
          }}
          className={cn("flex flex-1 items-center gap-2 rounded-full px-3 py-1.5", GLASS)}
        >
          <Search className="h-4 w-4 shrink-0 text-white/50" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
            aria-label={copy.searchPlaceholder}
          />
        </form>

        <div className="hidden items-center gap-2 md:flex">
          <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", GLASS)}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#46D17F" }} />
            {copy.online}
          </span>
        </div>
      </header>

      {/* Phase stepper */}
      <div className="absolute left-1/2 top-16 z-20 -translate-x-1/2">
        <div className={cn("rounded-full px-3 py-1 text-[11px] font-medium tracking-[0.1em]", GLASS)}>
          <span style={{ color: CYAN }}>{phaseLabel}</span>
        </div>
      </div>

      {/* ── Left telemetry console ────────────────────────────── */}
      <aside className="absolute left-4 top-28 z-20 hidden w-[300px] flex-col gap-3 lg:flex">
        <section className={cn("rounded-2xl p-4", GLASS)}>
          <p className={LABEL}>{copy.currentDestination}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {activeDestination?.name ?? copy.noDestination}
          </p>
        </section>

        <section className={cn("rounded-2xl p-4", GLASS)}>
          <p className={LABEL}>{copy.cityCurvation}</p>
          <div className="mt-2 flex items-center gap-3">
            <CurvationRing value={telemetry.progress01} />
            <span className="font-mono text-3xl font-semibold tabular-nums">
              {Math.round(telemetry.progress01 * 100)}
              <span className="text-base text-white/50">%</span>
            </span>
          </div>
        </section>

        <section className={cn("rounded-2xl p-4", GLASS)}>
          <p className={LABEL}>{copy.flightInformation}</p>
          <dl className="mt-2 space-y-1.5 text-sm">
            <TelemetryRow icon={Plane} label={copy.altitude} value={`${formatInt(telemetry.altitudeMeters)} m`} />
            <TelemetryRow icon={Gauge} label={copy.speed} value={`${formatInt(telemetry.speedKmh)} km/h`} />
            <TelemetryRow
              icon={Navigation}
              label={copy.coordinates}
              value={`${telemetry.lookAt.lat.toFixed(3)}, ${telemetry.lookAt.lng.toFixed(3)}`}
            />
          </dl>
        </section>
      </aside>

      {/* ── Center: empty / fallback state ────────────────────── */}
      {!activeDestinationId && (
        <div className="absolute inset-0 z-10 grid place-items-center px-6">
          <div className="max-w-md text-center">
            <span
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-white/5"
              style={{ color: CYAN }}
            >
              <Radar className="h-7 w-7" />
            </span>
            <h2 className="text-balance text-xl font-semibold sm:text-2xl">{copy.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-white/60">{copy.emptyBody}</p>
            <button data-control-variant="default"
              type="button"
              onClick={() => void runSearch()}
              disabled={searching}
              className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[#06121f] transition hover:brightness-110 disabled:opacity-60"
            >
              {copy.beginDescent}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Right trip panel (Wanderlog scaffold) ─────────────── */}
      <aside className="absolute right-4 top-28 z-20 hidden w-[300px] flex-col gap-3 xl:flex">
        <TripBlock icon={Bookmark} title={copy.savedPlaces} empty={copy.noSavedPlaces} />
        <TripBlock icon={CalendarRange} title={copy.itinerary} />
        <TripBlock icon={Sparkles} title={copy.smartRecs} />
      </aside>

      {/* Fallback notice */}
      <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 px-4">
        <p className={cn("rounded-full px-3 py-1 text-center text-[11px] text-white/55", GLASS)}>
          {copy.fallbackNotice}
        </p>
      </div>

      {/* Attribution — always visible when tiles render (ToS). */}
      <p className="absolute bottom-2 right-3 z-20 text-[10px] text-white/40">{copy.attribution}</p>

      <PoiDetailPopup destinationId={activeDestinationId} />
    </div>
  );
}

function phaseToLabel(phase: EnginePhase, copy: ReturnType<typeof getTravelExplorerUiCopy>): string {
  switch (phase) {
    case "entering_atmosphere":
      return copy.phaseEnteringAtmosphere;
    case "approaching":
      return copy.phaseApproaching;
    case "cruising":
      return copy.phaseCruising;
    default:
      return copy.phaseLeavingOrbit;
  }
}

function formatInt(n: number): string {
  return Math.round(n).toLocaleString();
}

function slugify(name: string, lat: number, lng: number): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const geo = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  return (base ? `${base}-${geo}` : geo).slice(0, 80);
}

function TelemetryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Plane;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-white/55">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="font-mono tabular-nums text-white/90">{value}</span>
    </div>
  );
}

function CurvationRing({ value }: { value: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, value)));
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0 -rotate-90" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke={CYAN}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function TripBlock({
  icon: Icon,
  title,
  empty,
}: {
  icon: typeof Bookmark;
  title: string;
  empty?: string;
}) {
  return (
    <section className={cn("rounded-2xl p-4", GLASS)}>
      <p className={cn(LABEL, "flex items-center gap-2")}>
        <Icon className="h-3.5 w-3.5" style={{ color: CYAN }} />
        {title}
      </p>
      {empty && <p className="mt-2 text-sm text-white/45">{empty}</p>}
    </section>
  );
}

function RadarReticle() {
  return (
    <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 opacity-40">
      <div className="absolute inset-0 rounded-full border border-[rgba(91,214,232,0.35)]" />
      <div className="absolute inset-6 rounded-full border border-[rgba(91,214,232,0.25)]" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: CYAN }} />
    </div>
  );
}
