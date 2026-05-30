import { create } from "zustand";

import type {
  EngineKind,
  EnginePhase,
  Telemetry,
} from "@/lib/travel-explorer/engine/engine-adapter";

/**
 * Ephemeral UI + live-telemetry state for the Explorer Console. Persistent
 * domain data (destinations, saved places, itinerary) lives in Supabase via
 * React Query hooks — this store is only for in-session view state and the
 * camera telemetry the HUD reads each frame. FROZEN CONTRACT (Wave A): the
 * HUD (Agent 8), camera (Agent 5) and engine (Agents 3/4) share this shape.
 */

export type ExplorerViewState =
  | "idle"
  | "flying"
  | "cruising"
  | "manual"
  | "fallback";

const ZERO_TELEMETRY: Telemetry = {
  phase: "space",
  altitudeMeters: 0,
  speedKmh: 0,
  lookAt: { lat: 0, lng: 0 },
  headingDeg: 0,
  progress01: 0,
};

type TravelExplorerStore = {
  // Engine
  engineKind: EngineKind;
  setEngineKind: (kind: EngineKind) => void;

  viewState: ExplorerViewState;
  setViewState: (s: ExplorerViewState) => void;

  // Live telemetry — written from the engine frame loop, read by the HUD.
  telemetry: Telemetry;
  setTelemetry: (t: Telemetry) => void;
  phase: EnginePhase;
  setPhase: (p: EnginePhase) => void;

  // Current destination (a saved travel_destinations row id)
  activeDestinationId: string | null;
  setActiveDestinationId: (id: string | null) => void;

  // POI focus + detail popup
  focusedPlaceId: string | null;
  setFocusedPlaceId: (id: string | null) => void;
  detailPlaceId: string | null;
  openDetail: (placeId: string) => void;
  closeDetail: () => void;

  // Flight controls
  cruisePaused: boolean;
  setCruisePaused: (paused: boolean) => void;
  /** Bump to trigger a replay of the flythrough. */
  replayNonce: number;
  requestReplay: () => void;

  // Trip planning panel
  tripPanelOpen: boolean;
  setTripPanelOpen: (open: boolean) => void;
};

export const useTravelExplorerStore = create<TravelExplorerStore>((set) => ({
  engineKind: "r3f_google_tiles",
  setEngineKind: (kind) => set({ engineKind: kind }),

  viewState: "idle",
  setViewState: (s) => set({ viewState: s }),

  telemetry: ZERO_TELEMETRY,
  setTelemetry: (t) => set({ telemetry: t }),
  phase: "space",
  setPhase: (p) => set({ phase: p }),

  activeDestinationId: null,
  setActiveDestinationId: (id) => set({ activeDestinationId: id }),

  focusedPlaceId: null,
  setFocusedPlaceId: (id) => set({ focusedPlaceId: id }),
  detailPlaceId: null,
  openDetail: (placeId) => set({ detailPlaceId: placeId }),
  closeDetail: () => set({ detailPlaceId: null }),

  cruisePaused: false,
  setCruisePaused: (paused) => set({ cruisePaused: paused }),
  replayNonce: 0,
  requestReplay: () => set((s) => ({ replayNonce: s.replayNonce + 1 })),

  tripPanelOpen: true,
  setTripPanelOpen: (open) => set({ tripPanelOpen: open }),
}));
