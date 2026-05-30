/**
 * Engine abstraction — the seam that lets the 2D HUD stay identical no
 * matter what renders the globe:
 *   - Route D′  R3F + 3d-tiles-renderer + Google Photorealistic 3D Tiles (primary)
 *   - Route G   Google `gmp-map-3d` + built-in flyTo (fallback / prototype)
 *   - image     static high-res aerial + Ken-Burns (no-WebGL / no-key / tiles-fail)
 *
 * FROZEN CONTRACT (Wave A). The HUD, camera choreography (Agent 5) and POI
 * layer (Agent 7) only ever talk to `EngineAdapter` — no engine-specific
 * type leaks past this file. Implementations live in `./routes/*`.
 */

export type EngineKind = "r3f_google_tiles" | "gmp_map_3d" | "image_fallback";

export type EnginePhase =
  | "space" // looking at the whole Earth
  | "entering_atmosphere"
  | "approaching"
  | "cruising" // slow forward drone glide over the city
  | "manual" // user grabbed the controls
  | "settled"; // reduced-motion / fallback resting frame

export type GeoPoint = { lat: number; lng: number; altitude?: number };

/** Oblique aerial pose. tilt ≈ 55–67°, range frames the skyline. */
export type CameraPose = {
  center: GeoPoint;
  tilt: number;
  range: number;
  heading: number;
};

export type FlyToOptions = {
  /** Total flight duration; default ~6000–8000ms (ease-in-out cubic). */
  durationMs?: number;
  /** Pull back toward space mid-arc for the Google-Earth re-fly feel. */
  pullback?: boolean;
  signal?: AbortSignal;
};

export type CruiseOptions = {
  /** Low = filmic. Slow forward dolly + subtle orbit/yaw drift. */
  speed?: number;
  orbitDrift?: boolean;
};

/** Live telemetry derived from REAL camera state every frame. */
export type Telemetry = {
  phase: EnginePhase;
  altitudeMeters: number; // orbital → city height
  speedKmh: number; // frame-to-frame delta
  lookAt: { lat: number; lng: number }; // updates continuously while cruising
  headingDeg: number;
  /** 0→1 flight progress; drives the City Curvation ring. */
  progress01: number;
};

export type EngineCapability = {
  webgl: boolean;
  /** Coarse GPU tier for tile-detail degradation / fallback decisions. */
  tier: "high" | "mid" | "low" | "none";
};

export type TelemetryListener = (t: Telemetry) => void;
export type PhaseListener = (phase: EnginePhase) => void;

export type EngineMountOptions = {
  container: HTMLElement;
  initialPose?: CameraPose;
  /** When true, skip all camera motion and render the settled frame. */
  reducedMotion?: boolean;
  onTelemetry?: TelemetryListener;
  onPhase?: PhaseListener;
};

export interface EngineAdapter {
  readonly kind: EngineKind;
  /** Mount into the container; resolves once the first frame is ready. */
  mount(opts: EngineMountOptions): Promise<void>;
  /** Space→atmosphere→city flythrough, ending at the oblique vantage. */
  flyTo(pose: CameraPose, opts?: FlyToOptions): Promise<void>;
  /** Begin the slow forward drone cruise after arrival. */
  startCruise(opts?: CruiseOptions): void;
  stopCruise(): void;
  /** Hand control to the user (GlobeControls / native gestures). */
  setManual(enabled: boolean): void;
  getTelemetry(): Telemetry;
  subscribe(listener: TelemetryListener): () => void;
  resize(): void;
  dispose(): void;
}

/** Lazily constructs an engine (heavy 3D modules are dynamically imported). */
export type EngineFactory = (kind: EngineKind) => Promise<EngineAdapter>;

/** Cheap pre-mount probe so we never hard-crash without WebGL / a key. */
export type DetectCapability = () => EngineCapability;
