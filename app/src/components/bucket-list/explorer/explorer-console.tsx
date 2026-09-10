"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Search, ArrowUpRight, ArrowRight, Loader2, RotateCcw, SkipForward, Pause, Play, Globe2, MapPin } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getTravelExplorerUiCopy, type TravelExplorerUiCopy } from "@/lib/i18n/travel-explorer-ui";
import { useTravelExplorerStore } from "@/stores/travel-explorer-store";
import { usePlacesNearby, useSavedPlaces, useTravelDestinations, useUpsertDestination } from "@/hooks/use-travel-explorer";
import { searchPlacesText } from "@/lib/travel-explorer/places/client";
import { ExplorerGlobe, type GlobeStatus } from "./globe/explorer-globe";
import { PoiDetailPopup } from "./poi-detail-popup";
import styles from "./explorer-console.module.css";

const GLASS = "border border-white/15 bg-[#101b2de8] shadow-lg sm:bg-[#101b2dbd] sm:backdrop-blur-md";
type Destination = { name: string; lat: number; lng: number };
const FEATURED: Destination[] = [
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "New York", lat: 40.7128, lng: -74.006 },
];

export function ExplorerConsole() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getTravelExplorerUiCopy(language), [language]);
  const reducedMotion = useReducedMotion() ?? false;
  const activeId = useTravelExplorerStore((s) => s.activeDestinationId);
  const openDetail = useTravelExplorerStore((s) => s.openDetail);
  const { data: destinations } = useTravelDestinations();
  const upsert = useUpsertDestination();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [status, setStatus] = useState<GlobeStatus>("loading");
  const [globeKey, setGlobeKey] = useState(0);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Destination[]>([]);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"saving" | "saved" | "failed" | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const selection = useRef(0);
  const { data: nearby, isError: nearbyFailed } = usePlacesNearby(destination?.lat, destination?.lng);
  const { data: savedPlaces } = useSavedPlaces(activeId);
  const savedIds = useMemo(() => new Set((savedPlaces ?? []).map((p) => p.place_id)), [savedPlaces]);
  const target = useMemo(() => destination ? { lat: destination.lat, lng: destination.lng } : null, [destination]);

  useEffect(() => {
    useTravelExplorerStore.setState({ activeDestinationId: null, phase: "space", viewState: "idle", cruisePaused: false, detailPlaceId: null });
    return () => { request.current?.abort(); selection.current += 1; };
  }, []);

  const saveDestination = async (place: Destination, version: number) => {
    setSaveState("saving");
    try {
      const row = await upsert.mutateAsync({
        slug: `${place.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${place.lat.toFixed(4)}_${place.lng.toFixed(4)}`.slice(0, 80),
        name: place.name, center_lat: place.lat, center_lng: place.lng, provider: "google",
      });
      if (selection.current !== version) return;
      useTravelExplorerStore.getState().setActiveDestinationId(row.id);
      setSaveState("saved");
    } catch {
      if (selection.current === version) setSaveState("failed");
    }
  };

  const choose = (place: Destination, savedId?: string) => {
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng) || Math.abs(place.lat) > 90 || Math.abs(place.lng) > 180) { setError(copy.searchFailed); return; }
    request.current?.abort();
    const version = ++selection.current;
    setSearching(false); setResults([]); setError(""); setQuery(place.name); setDestination(place);
    input.current?.blur();
    useTravelExplorerStore.setState({ activeDestinationId: savedId ?? null, cruisePaused: false, detailPlaceId: null });
    useTravelExplorerStore.getState().requestReplay();
    if (savedId) setSaveState("saved");
    else void saveDestination(place, version);
  };

  const runSearch = async () => {
    const text = query.trim();
    if (!text) { input.current?.focus(); return; }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setSearching(true); setResults([]); setError("");
    // These geographic shortcuts work even when Places is temporarily offline.
    const featured = FEATURED.find((p) => p.name.toLowerCase() === text.toLowerCase());
    if (featured) { choose(featured); return; }
    try {
      const response = await searchPlacesText(text, undefined, controller.signal);
      if (controller.signal.aborted) return;
      const places = response.items.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)).slice(0, 5).map((p) => ({ name: p.name, lat: p.lat, lng: p.lng }));
      if (!places.length) setError(copy.searchFailed);
      else setResults(places);
    } catch {
      if (!controller.signal.aborted) setError(copy.searchUnavailable);
    } finally {
      if (request.current === controller) setSearching(false);
    }
  };

  const returnToOrbit = () => {
    request.current?.abort(); selection.current += 1;
    setDestination(null); setQuery(""); setResults([]); setSearching(false); setError(""); setSaveState(null);
    useTravelExplorerStore.setState({ activeDestinationId: null, cruisePaused: false, detailPlaceId: null });
  };
  const is3D = status !== "unavailable" && status !== "loading";

  return (
    <section className={cn(styles.console, "relative isolate w-full overflow-hidden rounded-2xl text-white")} data-testid="travel-console" data-globe-status={status} aria-label={copy.consoleTitle}>
      <div id="explorer-stage" className="absolute inset-0">
        <div className={styles.earthFallback} aria-hidden="true" />
        <ExplorerGlobe key={globeKey} target={target} pois={nearby?.items} savedIds={savedIds} onSelectPoi={openDetail} onStatus={setStatus} />
      </div>
      <div className={styles.shade} aria-hidden="true" />

      <header className="absolute inset-x-0 top-0 z-30 p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-[0.16em] text-cyan-100/80">
          <span className="flex items-center gap-2"><Crosshair className="h-4 w-4" />{copy.consoleTitle}</span>
          <span className="flex items-center gap-1.5 tracking-normal" role="status"><span className={cn("h-1.5 w-1.5 rounded-full", is3D ? "bg-cyan-300" : "bg-amber-200")} />{status === "loading" ? copy.loadingGlobe : status === "detailed" ? copy.cityDetail : status === "unavailable" ? copy.mapView : copy.worldView}</span>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void runSearch(); }} className={cn("flex min-h-12 items-center gap-2 rounded-2xl p-1 pl-3", GLASS)} aria-busy={searching}>
          <Search className="h-4 w-4 shrink-0 text-white/60" />
          <input data-slot="travel-search" ref={input} type="search" enterKeyHint="search" autoComplete="off" value={query} onChange={(e) => { setQuery(e.target.value); setResults([]); setError(""); request.current?.abort(); setSearching(false); }} placeholder={copy.searchPlaceholder} aria-label={copy.searchPlaceholder} aria-describedby={error ? "travel-search-error" : undefined} className={styles.searchInput} />
          <button type="submit" disabled={searching} aria-label={copy.searchAction} className={styles.searchButton}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
        {error && <p id="travel-search-error" role="alert" className="mt-2 rounded-xl border border-amber-200/20 bg-[#182030] p-3 text-sm text-amber-100">{error}</p>}
        {results.length > 0 && <div className={cn("mt-2 overflow-hidden rounded-2xl p-1", GLASS)} aria-label={copy.chooseResult}>
          <p className="px-3 py-2 text-xs text-white/60">{copy.chooseResult}</p>
          {results.map((place, i) => <button type="button" key={`${place.lat}-${place.lng}-${i}`} onClick={() => choose(place)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-200"><MapPin className="h-4 w-4 shrink-0 text-cyan-200" /><span className="min-w-0 flex-1 truncate text-sm">{place.name}</span><span className="text-[10px] text-white/50">{place.lat.toFixed(2)}, {place.lng.toFixed(2)}</span><ArrowRight className="h-4 w-4" /></button>)}
        </div>}
      </header>

      {destination && <div className="pointer-events-none absolute inset-x-3 top-32 z-10 flex items-start justify-between gap-2 sm:inset-x-5">
        <div className={cn("max-w-[70%] rounded-xl px-3 py-2", GLASS)}><p className="text-[10px] uppercase tracking-widest text-cyan-100/60">{copy.currentDestination}</p><h2 className="truncate text-lg font-semibold">{destination.name}</h2></div>
        <button type="button" onClick={returnToOrbit} className={cn("pointer-events-auto flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs", GLASS)}><Globe2 className="h-4 w-4" />{copy.returnOrbit}</button>
      </div>}

      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pt-16 sm:px-6", status === "detailed" ? "pb-20" : "pb-5 sm:pb-6")}>
        {!destination ? <div className="mx-auto max-w-xl text-center">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200">{copy.readyToExplore}</p>
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{copy.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/65">{copy.emptyBody}</p>
          <div className="pointer-events-auto mt-4 flex flex-wrap justify-center gap-2">
            {FEATURED.map((place) => <button key={place.name} type="button" onClick={() => choose(place)} className={cn("flex min-h-11 items-center gap-2 rounded-full px-4 text-sm transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-cyan-200", GLASS)}>{place.name}<ArrowUpRight className="h-3.5 w-3.5 text-cyan-200" /></button>)}
          </div>
          <button type="button" onClick={() => { input.current?.focus(); if (query.trim()) void runSearch(); }} className="pointer-events-auto mt-3 min-h-11 px-4 text-sm font-medium text-cyan-200 underline underline-offset-4">{copy.chooseAnother}</button>
          {Boolean(destinations?.length) && <div className="pointer-events-auto mt-3 flex flex-wrap justify-center gap-2" aria-label={copy.recentDestinations}>
            {destinations?.slice(0, 3).map((d) => <button key={d.id} type="button" onClick={() => choose({ name: d.name, lat: d.center_lat, lng: d.center_lng }, d.id)} className="min-h-11 rounded-xl bg-white/10 px-3 text-xs">{d.name}</button>)}
          </div>}
        </div> : <div className="pointer-events-auto mx-auto max-w-xl">
          <FlightHud copy={copy} enabled={is3D} reducedMotion={reducedMotion} />
          {saveState === "saving" && <p role="status" className="mt-2 text-center text-xs text-white/60">{copy.savingPlace}</p>}
          {saveState === "saved" && <p role="status" className="mt-2 text-center text-xs text-cyan-100/70">{copy.destinationSaved}</p>}
          {saveState === "failed" && <div role="status" className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-[#192334] px-3 py-2 text-xs text-amber-100"><span>{copy.saveFailed}</span><button type="button" onClick={() => void saveDestination(destination, selection.current)} className="min-h-11 shrink-0 px-2 underline">{copy.retrySave}</button></div>}
          {nearby?.items?.length ? <details className={cn("mt-2 rounded-xl px-3", GLASS)}><summary className="cursor-pointer py-3 text-xs">{copy.nearbyPlaces} · {nearby.items.length}</summary><div className="max-h-32 overflow-y-auto pb-2">{nearby.items.map((p) => <button key={p.providerPlaceId} onClick={() => openDetail(p.providerPlaceId)} className="block min-h-11 w-full truncate text-left text-sm">{p.name}{savedIds.has(p.providerPlaceId) ? " ✓" : ""}</button>)}</div></details> : nearbyFailed ? <p className="mt-2 text-center text-xs text-white/55">{copy.nearbyUnavailable}</p> : null}
        </div>}
        <p className="mx-auto mt-3 max-w-xl text-center text-[10px] leading-relaxed text-white/55">
          {status === "unavailable" ? copy.webglUnavailable : status === "tiles-error" ? copy.tilesUnavailable : status === "detailed" ? copy.gestureHint : copy.worldNotice}
          {(status === "unavailable" || status === "tiles-error") && <button type="button" onClick={() => { setStatus("loading"); setGlobeKey((n) => n + 1); }} className="pointer-events-auto ml-2 min-h-11 underline">{copy.retryGlobe}</button>}
        </p>
      </div>
      <PoiDetailPopup destinationId={activeId} />
    </section>
  );
}

function FlightHud({ copy, enabled, reducedMotion }: { copy: TravelExplorerUiCopy; enabled: boolean; reducedMotion: boolean }) {
  const telemetry = useTravelExplorerStore((s) => s.telemetry);
  const phase = useTravelExplorerStore((s) => s.phase);
  const paused = useTravelExplorerStore((s) => s.cruisePaused);
  const store = useTravelExplorerStore;
  const flying = phase === "entering_atmosphere" || phase === "approaching";
  const label = !enabled ? copy.mapView : phase === "manual" ? copy.manualControl : paused && flying ? copy.flightPaused : flying ? (phase === "approaching" ? copy.phaseApproaching : copy.phaseLeavingOrbit) : copy.arrived;
  return <div className={cn("rounded-2xl p-3 sm:p-4", GLASS)} data-testid="travel-flight-hud" data-phase={phase}>
    <div className="flex items-center justify-between gap-2 text-xs"><span className="font-medium text-cyan-100" role="status">{label}</span><span className="font-mono text-white/60">{enabled ? `${Math.round(telemetry.altitudeMeters / 1000).toLocaleString()} km` : "—"}</span></div>
    {enabled && <div role="progressbar" aria-label={copy.flightProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(telemetry.progress01 * 100)} className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full origin-left bg-cyan-200" style={{ transform: `scaleX(${telemetry.progress01})`, transition: reducedMotion ? "none" : "transform 200ms linear" }} /></div>}
    <div className="mt-2 flex items-center justify-center gap-2">
      {flying && enabled ? <><button type="button" onClick={() => store.getState().setCruisePaused(!paused)} className="flex min-h-11 items-center gap-2 rounded-full px-4 text-xs hover:bg-white/10">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{paused ? copy.resumeFlight : copy.pauseFlight}</button><button type="button" onClick={() => store.getState().requestSkip()} className="flex min-h-11 items-center gap-2 rounded-full px-4 text-xs hover:bg-white/10"><SkipForward className="h-4 w-4" />{copy.skipFlight}</button></> : <button type="button" disabled={!enabled} onClick={() => { store.getState().setCruisePaused(false); store.getState().requestReplay(); }} className="flex min-h-11 items-center gap-2 rounded-full px-4 text-xs hover:bg-white/10 disabled:opacity-40"><RotateCcw className="h-4 w-4" />{copy.replayFlight}</button>}
    </div>
  </div>;
}
