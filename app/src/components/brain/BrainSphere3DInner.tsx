"use client";

/**
 * Brain Page — 3D Sphere Mode (inner Three.js renderer).
 *
 * MENTAL MODEL — read carefully before changing anything in here:
 *
 *   - The sphere is a `THREE.Group` (`groupRef`) containing every
 *     node sprite + every edge line. The whole group rotates around
 *     its own Y axis (and a tiny secondary axis for organic feel).
 *   - The camera is the user's viewpoint. It does NOT rotate with
 *     the group. In default state it sits on an orbit OUTSIDE the
 *     sphere; when a node is focused it moves onto a mini-orbit around
 *     that node’s neighborhood centroid so tentacles stay in frame.
 *     Wheel / pinch adjust orbit radius (0% = farthest, 100% = closest).
 *   - DO NOT rotate the camera around the scene to fake a spinning
 *     sphere. That collapses the metaphor into a generic look-around.
 *   - Rotation continues during fly-in. Only an active long press
 *     pauses it.
 *
 * STATE PIPELINE (Phase 1 — visuals are intentionally minimal):
 *
 *   useBrainStore  ──►  setHoveredNodeId / setFocusState / setRotationState
 *      ▲                              │
 *      │                              ▼
 *   useNodeGesture ──── click / longpress / drag / hover events
 *
 * Phase 2 layers highlight materials on top; Phase 3 layers the
 * camera fly-in. The structure below is built so those phases can
 * graft onto refs without restructuring.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

import { useNodeGesture } from "@/hooks/use-node-gesture";
import {
  buildClusterColorMap,
  generateSpherePositions,
  type SpherePositions,
} from "@/lib/knowledge/constellation/generateSpherePositions";
import {
  resolveNodeVisuals,
  sphere3dEdgePalette,
  sphere3dLabelTextureOpts,
} from "@/lib/knowledge/constellation/graphThemeTokens";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import { useBrainStore } from "@/stores/brain-store";
import {
  SPHERE_AMBIENT_DRIFT_BY_SPEED,
  SPHERE_AMBIENT_YAW_BY_SPEED,
  SPHERE_DRAG_RESUME_DELAY_MS,
  SPHERE_FLY_IN_MS,
  SPHERE_FLY_OUT_MS,
  SPHERE_REDUCED_MOTION_FADE_MS,
  SPHERE_REDUCED_MOTION_FACTOR,
  type SphereGestureEvent,
  type SphereNodeId,
} from "@/types/brain-sphere";
import type {
  ConstellationClusterBy,
  ConstellationGraphData,
  ConstellationNode,
} from "@/types/constellation";
import {
  radiusToZoomPercent,
  zoomPercentToRadius,
} from "@/lib/brain/sphereFocusZoom";

// ─────────────────────────────────────────────────────────────────────
// Easing — cubic in-out, the spec's default for both fly-in and fly-out.
// Symmetric around t=0.5; lands clean on both ends; cheap.
// ─────────────────────────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Max |deltaY| after DOM_DELTA_* normalization — kills trackpad spikes per event. */
const WHEEL_DELTA_PX_CAP = 120;
/** exp(clamped) per wheel event — scroll down → factor > 1 → zoom out (larger radius). */
const WHEEL_ZOOM_EXP_SENS = 0.0035;
const WHEEL_ZOOM_EXP_ARG_CAP = 0.42;
/** Hard cap on multiplicative step per wheel event (mouse vs trackpad share this). */
const WHEEL_ZOOM_STEP_MAX = 1.16;
const WHEEL_ZOOM_STEP_MIN = 1 / WHEEL_ZOOM_STEP_MAX;
/** Exponential smoothing for camera radius toward wheel/pinch targets (per second). */
const ZOOM_RADIUS_DAMP_LAMBDA = 15;
/** Min interval (ms) for pushing zoom % to React from the render loop. */
const ZOOM_UI_SYNC_MS = 100;

/**
 * Multiplicative factor applied to *target* orbit radius (not the live radius).
 * Handles DOM_DELTA_PIXEL / LINE / PAGE; clamps delta; caps per-event zoom jump.
 */
function wheelRadiusTargetMultiplier(e: WheelEvent): number {
  let dy = e.deltaY;
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    dy *= 28;
  } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    dy *= 640;
  }
  dy = Math.sign(dy) * Math.min(Math.abs(dy), WHEEL_DELTA_PX_CAP);
  const expArg = THREE.MathUtils.clamp(
    dy * WHEEL_ZOOM_EXP_SENS,
    -WHEEL_ZOOM_EXP_ARG_CAP,
    WHEEL_ZOOM_EXP_ARG_CAP,
  );
  let factor = Math.exp(expArg);
  factor = THREE.MathUtils.clamp(factor, WHEEL_ZOOM_STEP_MIN, WHEEL_ZOOM_STEP_MAX);
  return factor;
}

/**
 * Compute the camera distance that frames the full sphere with a
 * consistent margin on both axes for a given canvas aspect ratio.
 *
 * Why: a fixed `DEFAULT_CAMERA_DISTANCE` looks great on a 16:9 laptop
 * but clips horizontally on portrait phones and leaves a tiny dot in
 * the middle of an ultrawide. Solving for distance from FOV makes the
 * framing aspect-invariant — the sphere always fills ~`fillRatio` of
 * the smaller viewport dimension, with the other dimension getting
 * proportionally more breathing room.
 *
 *   fillRatio = 0.7  →  ~30 % uniform margin around the sphere
 *
 * Used at mount (initial framing) and on `resetView` (Fit-to-frame).
 * Mid-session window resizes do NOT auto-rebase camera position,
 * because that would yank the user's manual zoom out from under them.
 */
function computeFramingDistance(aspect: number, fillRatio = 0.7): number {
  const fovV = (CAMERA_FOV_DEG * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * Math.max(aspect, 0.0001));
  const sphereDiameter = SPHERE_RADIUS * 2;
  const requiredVisibleHeight = sphereDiameter / fillRatio;
  const requiredVisibleWidth = sphereDiameter / fillRatio;
  const distanceForHeight = requiredVisibleHeight / (2 * Math.tan(fovV / 2));
  const distanceForWidth = requiredVisibleWidth / (2 * Math.tan(fovH / 2));
  return Math.max(distanceForHeight, distanceForWidth);
}

// ─────────────────────────────────────────────────────────────────────
// Geometry constants
// ─────────────────────────────────────────────────────────────────────

const SPHERE_RADIUS = 360;
/** Visual base radius before connection-count weighting. */
const NODE_BASE_RADIUS = 4;
const NODE_MAX_RADIUS = 9;

type NodeGroupVisual = { group: THREE.Group };

/**
 * Centroid of selected + 1-hop neighbors in world space, and max
 * squared distance from that centroid to any of those nodes.
 */
function accumulateNeighborhoodCentroidAndMaxDistSq(
  nodeId: string,
  nodeVisuals: Map<string, NodeGroupVisual>,
  adjacency: Map<string, Set<string>>,
  outCentroid: THREE.Vector3,
  maxDistSqOut: { current: number },
): boolean {
  maxDistSqOut.current = 0;
  outCentroid.set(0, 0, 0);
  const tmp = new THREE.Vector3();
  let count = 0;
  const focal = nodeVisuals.get(nodeId);
  if (!focal) return false;
  focal.group.getWorldPosition(tmp);
  outCentroid.add(tmp);
  count += 1;
  const neigh = adjacency.get(nodeId);
  if (neigh) {
    for (const nid of neigh) {
      const nv = nodeVisuals.get(nid);
      if (!nv) continue;
      nv.group.getWorldPosition(tmp);
      outCentroid.add(tmp);
      count += 1;
    }
  }
  outCentroid.multiplyScalar(1 / count);
  focal.group.getWorldPosition(tmp);
  maxDistSqOut.current = Math.max(
    maxDistSqOut.current,
    tmp.distanceToSquared(outCentroid),
  );
  if (neigh) {
    for (const nid of neigh) {
      const nv = nodeVisuals.get(nid);
      if (!nv) continue;
      nv.group.getWorldPosition(tmp);
      maxDistSqOut.current = Math.max(
        maxDistSqOut.current,
        tmp.distanceToSquared(outCentroid),
      );
    }
  }
  return true;
}

/**
 * Default camera distance from sphere center along +Z. Tuned with the
 * camera FOV so the sphere always reads with comfortable padding —
 * never edge-clipped, never lost-in-space. With FOV=42° and this
 * distance, the sphere occupies ~70 % of the vertical viewport on a
 * standard 16:9 canvas, leaving a uniform breathing room around it.
 */
const DEFAULT_CAMERA_DISTANCE = SPHERE_RADIUS * 3.5;
/** Camera vertical FOV. Slightly tighter than the prior 44° so the
 *  sphere reads a touch larger at the same distance and the framing
 *  feels intentional rather than wide-angle. */
const CAMERA_FOV_DEG = 42;
/** Polar clamp so the camera never flips upside-down. */
const PHI_MIN = 0.05;
const PHI_MAX = Math.PI - 0.05;
/** Outer/inner orbit zoom limits. */
const RADIUS_MIN = SPHERE_RADIUS * 1.18;
const RADIUS_MAX = SPHERE_RADIUS * 5.5;
/**
 * Screen-space hit-test threshold (CSS pixels). Sprites are small
 * dots and the visible glow doesn't all match the sprite bounding
 * box, so we hit-test by projecting node world positions and finding
 * the front-most one within this radius of the pointer. Generous
 * enough that the user never has to "aim" at the bright pixel.
 */
const HIT_TEST_THRESHOLD_PX = 24;

export interface BrainSphere3DHandle {
  /** Re-frame the camera onto the canonical outside-orbit view. */
  resetView: () => void;
  /** Fit the camera so the whole sphere is comfortably in frame. */
  fitGraph: () => void;
  /** Center on a node (Phase 3 wires the cinematic fly-in). */
  focusNode: (nodeId: SphereNodeId) => void;
  /** Live zoom % for HUD: 0 = farthest, 100 = closest (outer orbit or focus mini-orbit). */
  getFocusZoomPercent: () => number;
  /** Nudge zoom by percentage points on the active orbit (±5 etc.). */
  adjustFocusZoomByPercent: (deltaPercent: number) => void;
}

interface BrainSphere3DInnerProps {
  data: ConstellationGraphData;
  clusterBy: ConstellationClusterBy;
  onNodeClick: (node: ConstellationNode) => void;
  onBackgroundClick: () => void;
  /** Parent reads selection for inspection-panel sync etc. */
  onNodeHover?: (node: ConstellationNode | null) => void;
  /** Fired when zoom % changes (wheel, pinch, +/-, fly-in/out, reset). 0 = farthest. */
  onFocusZoomPercentChange?: (percent: number) => void;
}

// ─────────────────────────────────────────────────────────────────────
// Sprite cache — building canvas textures is expensive so we memoize
// per (core, glow, surfaceMode) tuple. Disposed on unmount.
// ─────────────────────────────────────────────────────────────────────

function makeGlowTexture(
  core: string,
  glow: string,
  outerTransparent: string,
): THREE.CanvasTexture {
  const size = 192;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, core);
  gradient.addColorStop(0.18, core);
  gradient.addColorStop(0.46, glow);
  gradient.addColorStop(1, outerTransparent);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Pill-shaped label sprite texture. Background + text colors come
 * from `sphere3dLabelTextureOpts(surfaceMode)` so the label adapts
 * to dark / light themes the same way as the Knowledge sphere.
 *
 * The returned texture stashes its pixel width / height on
 * `__w` / `__h` so callers can size the sprite plane without
 * re-measuring.
 */
function makeLabelTexture(
  text: string,
  options: { color: string; background: string; border: string },
): THREE.Texture {
  const padding = 12;
  const size = 18;
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) return new THREE.CanvasTexture(measureCanvas);
  const fontFamily =
    '500 "InterVariable", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
  measureCtx.font = `${size}px ${fontFamily}`;
  const truncated = text.length > 36 ? `${text.slice(0, 35)}…` : text;
  const textWidth = Math.ceil(measureCtx.measureText(truncated).width);
  const w = Math.min(420, Math.max(80, textWidth + padding * 2));
  const h = size + padding;

  const canvas = document.createElement("canvas");
  const dpr = 3;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.scale(dpr, dpr);

  const r = 8;
  ctx.fillStyle = options.background;
  ctx.strokeStyle = options.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = options.color;
  ctx.font = `${size}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(truncated, w / 2, h / 2 + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  // Stash dims for the caller.
  (tex as THREE.Texture & { __w?: number; __h?: number }).__w = w;
  (tex as THREE.Texture & { __w?: number; __h?: number }).__h = h;
  return tex;
}

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

const BrainSphere3DInner = forwardRef<
  BrainSphere3DHandle,
  BrainSphere3DInnerProps
>(function BrainSphere3DInner(
  {
    data,
    clusterBy,
    onNodeClick,
    onBackgroundClick,
    onNodeHover,
    onFocusZoomPercentChange,
  },
  ref,
) {
  // ── Surface theme + reduced-motion preference ──────────────────
  const { mode: surfaceMode, isLight, t: graphT } = useGraphSurface();
  const graphShell = graphT.shell;
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    () => {
      if (typeof window === "undefined") return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setPrefersReducedMotion(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // ── Store wiring ────────────────────────────────────────────────
  // Only subscribe in render for slices that must re-run React effects
  // (focus fly-in). Hover / selection / label toggles sync into refs via
  // `useBrainStore.subscribe` so pointer motion does not re-render this
  // entire component on every hover change (which fought WebGL).
  const setRotationState = useBrainStore((s) => s.setRotationState);
  const setHoveredNodeId = useBrainStore((s) => s.setHoveredNodeId);
  const setFocusState = useBrainStore((s) => s.setFocusState);
  const focusState = useBrainStore((s) => s.focusState);

  // Stable ref to setFocusState so the rAF loop can push completion
  // events to the store without going through the React closure.
  // It's only invoked at the final frame of an animation (once), so
  // the "no setState inside useFrame" rule isn't violated by a cascade.
  const setFocusStateExternalRef = useRef(setFocusState);
  useEffect(() => {
    setFocusStateExternalRef.current = setFocusState;
  });
  const setFocusStateExternal = useCallback(
    (next: Parameters<typeof setFocusState>[0]) => {
      setFocusStateExternalRef.current(next);
    },
    [],
  );

  const rotationStateRef = useRef(useBrainStore.getState().rotationState);
  const speedRef = useRef(useBrainStore.getState().sphereRotationSpeed);
  const reducedMotionRef = useRef(prefersReducedMotion);
  const hoveredRef = useRef(useBrainStore.getState().hoveredNodeId);
  const selectedRef = useRef(useBrainStore.getState().selectedNodeId);
  const showLabelsRef = useRef(useBrainStore.getState().sphereShowLabels);
  const showConnectionsRef = useRef(useBrainStore.getState().sphereShowConnections);
  const focusStateRef = useRef(useBrainStore.getState().focusState);
  const lastVisualStoreSnapRef = useRef<string>("");

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion;
  }, [prefersReducedMotion]);

  // ── DOM / Three.js refs ────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  /** The rotating group containing every node + edge. */
  const groupRef = useRef<THREE.Group | null>(null);
  /**
   * Per-node visual record. The Group exists so we can attach a
   * lazy label sprite alongside the glow without re-creating the
   * scene tree. `userData.nodeId` is set on the Group AND the glow
   * sprite so raycasting works regardless of which one was hit.
   */
  type NodeVisual = {
    group: THREE.Group;
    glow: THREE.Sprite;
    glowMat: THREE.SpriteMaterial;
    labelSprite: THREE.Sprite | null;
    labelMat: THREE.SpriteMaterial | null;
    baseScale: number;
    coreColor: string;
  };
  const nodeVisualsRef = useRef<Map<string, NodeVisual>>(new Map());
  /** All disposable resources we created, retained for unmount cleanup. */
  const materialsRef = useRef<THREE.Material[]>([]);
  const texturesRef = useRef<THREE.Texture[]>([]);
  /** Base edges (always rendered, dim) and accent edges (focus-only). */
  const baseEdgesRef = useRef<THREE.LineSegments | null>(null);
  const accentEdgesRef = useRef<THREE.LineSegments | null>(null);
  /** Adjacency cache: nodeId → Set<neighborId>. Built once per data. */
  const adjacencyRef = useRef<Map<string, Set<string>>>(new Map());
  /**
   * Scratch vector reused by hit-testing and tooltip projection so
   * we don't allocate per pointer event. The earlier raycaster /
   * NDC refs were retired when we switched to screen-space nearest-
   * node hit testing — see `hitTest` for the new approach.
   */
  const projVecRef = useRef<THREE.Vector3>(new THREE.Vector3());
  /** Memoized label texture cache, keyed by label text + surface mode. */
  const labelTexCacheRef = useRef<Map<string, THREE.Texture>>(new Map());

  // ── Camera spherical orbit state (outside the sphere by default) ─
  // Stored in refs so dragging mutates them every frame without
  // touching React state.
  const cameraOrbitRef = useRef<{
    theta: number; // azimuth (around Y)
    phi: number; // polar (from +Y axis)
    radius: number; // distance from origin
  }>({
    theta: 0,
    phi: Math.PI / 2,
    radius: DEFAULT_CAMERA_DISTANCE,
  });
  /** Preserved outer-orbit snapshot for fly-out after core focus (survives anim ref reset). */
  const savedOuterOrbitRef = useRef<{
    theta: number;
    phi: number;
    radius: number;
  } | null>(null);
  /**
   * When focused: mini-orbit around the neighborhood centroid (world).
   * Same spherical convention as `cameraOrbitRef` but pivot is not origin.
   */
  const focusOrbitRef = useRef<{
    theta: number;
    phi: number;
    radius: number;
  }>({
    theta: 0,
    phi: Math.PI / 2,
    radius: 420,
  });
  /**
   * Wheel / pinch only update these targets. The render loop damps
   * `cameraOrbitRef` / `focusOrbitRef` radius toward them — avoids
   * camera spikes and high-frequency React updates on dense trackpad input.
   */
  const targetOuterRadiusRef = useRef(DEFAULT_CAMERA_DISTANCE);
  const targetFocusRadiusRef = useRef(420);
  /** Wall clock for throttling zoom % HUD sync from `tick`. */
  const lastZoomUiWallMsRef = useRef(0);
  /** Dev-only: counts WebGL canvas mounts (should stay 1). */
  const devCanvasMountCountRef = useRef(0);
  const devWheelEventCountRef = useRef(0);
  const devLastWheelRawDyRef = useRef(0);
  const devLastWheelFactorRef = useRef(1);
  const devTickCountRef = useRef(0);
  const devReactLayoutCountRef = useRef(0);
  const zoomDebugOverlayRef = useRef<HTMLDivElement | null>(null);
  /** Clamps for `focusOrbitRef.radius` — set when focus begins. */
  const focusRMinRef = useRef(120);
  const focusRMaxRef = useRef(1400);
  const onFocusZoomPercentChangeRef = useRef(onFocusZoomPercentChange);
  useEffect(() => {
    onFocusZoomPercentChangeRef.current = onFocusZoomPercentChange;
  });

  /** Coalesce wheel-driven HUD updates to one rAF; skip duplicate rounded %. */
  const lastEmittedZoomRoundedRef = useRef<number | null>(null);
  const zoomNotifyRafRef = useRef<number | null>(null);
  const resizeObsRafRef = useRef<number | null>(null);
  const pendingResizeRef = useRef<{ width: number; height: number } | null>(null);
  const lastAppliedResizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const notifySphereZoomPercent = useCallback((force = false) => {
    const flush = () => {
      zoomNotifyRafRef.current = null;
      const cam = cameraRef.current;
      if (!cam) return;
      let pct: number;
      if (
        focusStateRef.current.phase === "focused" &&
        cameraAnimRef.current.kind === "idle"
      ) {
        const fo = focusOrbitRef.current;
        pct = radiusToZoomPercent(
          fo.radius,
          focusRMinRef.current,
          focusRMaxRef.current,
        );
      } else {
        const o = cameraOrbitRef.current;
        pct = radiusToZoomPercent(o.radius, RADIUS_MIN, RADIUS_MAX);
      }
      const rounded = Math.round(pct);
      if (!force && lastEmittedZoomRoundedRef.current === rounded) return;
      lastEmittedZoomRoundedRef.current = rounded;
      onFocusZoomPercentChangeRef.current?.(pct);
    };

    if (force) {
      if (zoomNotifyRafRef.current != null) {
        cancelAnimationFrame(zoomNotifyRafRef.current);
        zoomNotifyRafRef.current = null;
      }
      flush();
      return;
    }
    if (zoomNotifyRafRef.current == null) {
      zoomNotifyRafRef.current = requestAnimationFrame(flush);
    }
  }, []);

  useLayoutEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    devReactLayoutCountRef.current += 1;
  });
  /**
   * Drag state — only set while the user is mid-orbit. Read by
   * the pointer-move handler to accumulate camera deltas without
   * fighting the gesture state machine.
   */
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });
  /** Idle timer that resumes auto-rotation after a drag. */
  const dragResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Cinematic camera animation state.
   *
   * `kind: "idle"`  → outer view: `cameraOrbitRef` around origin; core
   *                   focus: camera on a mini-orbit around the selected
   *                   node’s neighborhood centroid (`focusOrbitRef`).
   * `kind: "in"`    → animating from `from` (camera at click) to `to`
   *                   (world position framing the focal neighborhood).
   *                   LookAt tracks the live neighborhood centroid.
   * `kind: "out"`   → animating from the current camera position
   *                   back to the previously-stored orbit position
   *                   (`to` = the snapshot we took on entry).
   *                   LookAt eases from the previous selected node
   *                   back to the world origin.
   *
   * `nodeId` for "in" / "out" identifies the focal node so the lookAt
   * code can find its current world position.
   *
   * `startedAt` is in `performance.now()` ms; the loop derives `t∈[0,1]`
   * each frame.
   *
   * `from` and `to` are world-space camera positions. We keep a copy
   * of the *outer* orbit position the moment the user clicked, so the
   * fly-out is symmetric.
   */
  const cameraAnimRef = useRef<
    | { kind: "idle" }
    | {
        kind: "in";
        nodeId: string;
        startedAt: number;
        durationMs: number;
        from: THREE.Vector3;
        to: THREE.Vector3;
        savedOrbit: { theta: number; phi: number; radius: number };
      }
    | {
        kind: "out";
        previousNodeId: string;
        startedAt: number;
        durationMs: number;
        from: THREE.Vector3;
        to: THREE.Vector3;
      }
  >({ kind: "idle" });
  /** Reusable scratch vectors for the per-frame camera math. */
  const camPosScratch = useRef(new THREE.Vector3());
  const lookAtScratch = useRef(new THREE.Vector3());
  const lookAtCurrentRef = useRef(new THREE.Vector3());
  /** Scratch for neighborhood centroid sum (must not alias camPos during fly-in). */
  const neighborSumScratch = useRef(new THREE.Vector3());

  // ── Build positions + cluster colors (memoized on data + clusterBy) ─
  const positions: SpherePositions = useMemo(
    () =>
      generateSpherePositions(data.nodes, {
        radius: SPHERE_RADIUS,
        clusterBy,
      }),
    [data.nodes, clusterBy],
  );

  const clusterColors = useMemo(
    () => buildClusterColorMap(positions),
    [positions],
  );

  // Map nodeId → ConstellationNode. Used for click/hover callbacks
  // and label-sprite text. Declared early so `applyVisualState` (which
  // depends on it) doesn't reference a hoisted-undefined binding.
  const nodeIndex = useMemo(() => {
    const m = new Map<string, ConstellationNode>();
    for (const n of data.nodes) m.set(n.id, n);
    return m;
  }, [data.nodes]);

  // ── Initialize Three.js scene once on mount ─────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    // Pin the canvas to fill the container. Without these, three.js's
    // canvas keeps its 300x150 intrinsic CSS size and renders the
    // sphere into a tiny region in the upper-left of the container —
    // which is exactly the "sphere off in a corner" symptom we saw
    // before. Setting display:block also prevents the inline-baseline
    // gap browsers add to inline canvas elements.
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera — near=0.1 per spec to prevent clipping when at the core.
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, 1, 0.1, 8000);
    camera.position.set(0, 0, DEFAULT_CAMERA_DISTANCE);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Sphere group — every node + edge lives here so rotation is one
    // matrix multiply per frame.
    const group = new THREE.Group();
    group.name = "brainSphereGroup";
    scene.add(group);
    groupRef.current = group;

    // Soft ambient + hemisphere light, theme-aware. Re-applied on
    // theme change in a separate effect.
    const hemi = new THREE.HemisphereLight(0xffffff, 0x10142a, 0.55);
    scene.add(hemi);

    // Initial size — pass updateStyle=true (default) so the canvas's
    // CSS dimensions track the framebuffer dimensions. Combined with
    // the 100%/100% style above, the canvas now fills the container
    // on every resize.
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      renderer.setSize(rect.width, rect.height, true);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      // Frame the sphere for the actual viewport aspect at mount
      // time so the very first paint shows a centered sphere with
      // consistent margin (no more "off in a corner" first impression).
      cameraOrbitRef.current.radius = computeFramingDistance(camera.aspect);
      targetOuterRadiusRef.current = cameraOrbitRef.current.radius;
      devCanvasMountCountRef.current += 1;
      queueMicrotask(() => notifySphereZoomPercent(true));
    }

    return () => {
      if (zoomNotifyRafRef.current != null) {
        cancelAnimationFrame(zoomNotifyRafRef.current);
        zoomNotifyRafRef.current = null;
      }
      // Dispose everything we own on unmount.
      try {
        renderer.dispose();
        renderer.forceContextLoss?.();
      } catch {
        /* noop */
      }
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      groupRef.current = null;
    };
  }, [notifySphereZoomPercent]);

  // ── Resize observer ─────────────────────────────────────────────
  // Batch to one setSize per animation frame; ignore 1px jitter so
  // split panes / inspector toggles do not thrash the WebGL backbuffer.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const flush = () => {
      resizeObsRafRef.current = null;
      const pending = pendingResizeRef.current;
      pendingResizeRef.current = null;
      if (!pending || pending.width <= 0 || pending.height <= 0) return;
      const last = lastAppliedResizeRef.current;
      if (
        Math.abs(last.width - pending.width) < 2 &&
        Math.abs(last.height - pending.height) < 2
      ) {
        return;
      }
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (!renderer || !camera) return;
      lastAppliedResizeRef.current = { width: pending.width, height: pending.height };
      renderer.setSize(pending.width, pending.height, true);
      camera.aspect = pending.width / pending.height;
      camera.updateProjectionMatrix();
    };

    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      pendingResizeRef.current = { width, height };
      if (resizeObsRafRef.current == null) {
        resizeObsRafRef.current = requestAnimationFrame(flush);
      }
    });
    obs.observe(container);
    return () => {
      obs.disconnect();
      if (resizeObsRafRef.current != null) {
        cancelAnimationFrame(resizeObsRafRef.current);
        resizeObsRafRef.current = null;
      }
    };
  }, []);

  // Wheel zoom + two-finger pinch (focus + outer) — non-passive so the
  // page behind the sphere does not steal scroll / pinch-zoom.
  // Raw handlers only update *target* radii; `tick` damps actual orbits.
  useEffect(() => {
    let cancelled = false;
    let detach: (() => void) | undefined;
    let raf = 0;

    const mount = () => {
      if (cancelled || detach) return;
      const renderer = rendererRef.current;
      const container = containerRef.current;
      if (!renderer || !container) {
        raf = requestAnimationFrame(mount);
        return;
      }

      const canvas = renderer.domElement;
      let pinchDist0 = 0;
      let pinchRadius0 = 0;
      let pinchFocusActive = false;
      let pinchOuterActive = false;

      const pinchSpan = (e: TouchEvent) => {
        const a = e.touches[0];
        const b = e.touches[1];
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      };

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (process.env.NODE_ENV !== "production") {
          devWheelEventCountRef.current += 1;
          devLastWheelRawDyRef.current = e.deltaY;
        }
        if (cameraAnimRef.current.kind !== "idle") return;

        const factor = wheelRadiusTargetMultiplier(e);
        if (process.env.NODE_ENV !== "production") {
          devLastWheelFactorRef.current = factor;
        }

        if (focusStateRef.current.phase === "focused") {
          const next =
            targetFocusRadiusRef.current * factor;
          targetFocusRadiusRef.current = Math.min(
            focusRMaxRef.current,
            Math.max(focusRMinRef.current, next),
          );
          return;
        }
        const nextOuter = targetOuterRadiusRef.current * factor;
        targetOuterRadiusRef.current = Math.min(
          RADIUS_MAX,
          Math.max(RADIUS_MIN, nextOuter),
        );
      };

      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length !== 2) return;
        if (cameraAnimRef.current.kind !== "idle") return;
        pinchDist0 = pinchSpan(e);
        if (pinchDist0 < 8) return;
        if (focusStateRef.current.phase === "focused") {
          pinchFocusActive = true;
          pinchOuterActive = false;
          pinchRadius0 = targetFocusRadiusRef.current;
        } else {
          pinchOuterActive = true;
          pinchFocusActive = false;
          pinchRadius0 = targetOuterRadiusRef.current;
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        if (!pinchFocusActive && !pinchOuterActive) return;
        if (e.touches.length !== 2) return;
        if (cameraAnimRef.current.kind !== "idle") return;

        const d = pinchSpan(e);
        if (pinchDist0 < 8) return;
        const ratio = d / pinchDist0;
        e.preventDefault();

        if (pinchFocusActive) {
          if (focusStateRef.current.phase !== "focused") return;
          const next = pinchRadius0 * ratio;
          targetFocusRadiusRef.current = Math.min(
            focusRMaxRef.current,
            Math.max(focusRMinRef.current, next),
          );
          return;
        }
        const next = pinchRadius0 * ratio;
        targetOuterRadiusRef.current = Math.min(
          RADIUS_MAX,
          Math.max(RADIUS_MIN, next),
        );
      };

      const onTouchEnd = (e: TouchEvent) => {
        if (e.touches.length < 2) {
          pinchFocusActive = false;
          pinchOuterActive = false;
          pinchDist0 = 0;
        }
      };

      canvas.addEventListener("wheel", onWheel, { passive: false, capture: true });
      container.addEventListener("touchstart", onTouchStart, { passive: true });
      container.addEventListener("touchmove", onTouchMove, { passive: false });
      container.addEventListener("touchend", onTouchEnd, { passive: true });
      container.addEventListener("touchcancel", onTouchEnd, { passive: true });
      detach = () => {
        canvas.removeEventListener("wheel", onWheel, { capture: true });
        container.removeEventListener("touchstart", onTouchStart);
        container.removeEventListener("touchmove", onTouchMove);
        container.removeEventListener("touchend", onTouchEnd);
        container.removeEventListener("touchcancel", onTouchEnd);
      };
    };

    mount();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (zoomNotifyRafRef.current != null) {
        cancelAnimationFrame(zoomNotifyRafRef.current);
        zoomNotifyRafRef.current = null;
      }
      detach?.();
    };
  }, []);

  // ── (Re)build node visuals + base edges whenever data changes ──
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Tear down previous content & disposables.
    while (group.children.length > 0) group.remove(group.children[0]);
    for (const m of materialsRef.current) m.dispose();
    materialsRef.current = [];
    for (const t of texturesRef.current) t.dispose();
    texturesRef.current = [];
    nodeVisualsRef.current.clear();
    labelTexCacheRef.current.clear();
    baseEdgesRef.current = null;
    accentEdgesRef.current = null;

    const useTypeColor = clusterBy === "node_type" || clusterBy === "none";
    const outerTransparent = graphShell.glowGradientEnd;

    const glowTexCache = new Map<string, THREE.Texture>();
    const getGlow = (core: string, glow: string): THREE.Texture => {
      const key = `${core}|${glow}`;
      const cached = glowTexCache.get(key);
      if (cached) return cached;
      const tex = makeGlowTexture(core, glow, outerTransparent);
      glowTexCache.set(key, tex);
      texturesRef.current.push(tex);
      return tex;
    };

    // ── Per-node group: glow sprite (always) + label sprite (lazy) ──
    for (const n of data.nodes) {
      const pos = positions.get(n.id);
      if (!pos) continue;
      const clusterKey = pos.clusterKey;
      const palette = useTypeColor
        ? resolveNodeVisuals(n.type, surfaceMode)
        : (clusterColors.get(clusterKey) ?? {
            core: "#94a3b8",
            glow: "rgba(148, 163, 184, 0.45)",
            ring: "rgba(203, 213, 225, 0.85)",
          });

      const conn = n.connectionCount ?? 0;
      const radius = Math.min(
        NODE_MAX_RADIUS,
        NODE_BASE_RADIUS + Math.sqrt(conn + 1) * 0.9,
      );

      const tex = getGlow(palette.core, palette.glow);
      const glowMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: isLight ? 0.78 : 0.92,
        depthWrite: false,
        blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      });
      materialsRef.current.push(glowMat);

      const glow = new THREE.Sprite(glowMat);
      const baseScale = radius * 4.2;
      glow.scale.set(baseScale, baseScale, 1);
      glow.userData = { nodeId: n.id };

      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(pos.x, pos.y, pos.z);
      nodeGroup.userData = { nodeId: n.id, baseScale };
      nodeGroup.add(glow);
      group.add(nodeGroup);

      nodeVisualsRef.current.set(n.id, {
        group: nodeGroup,
        glow,
        glowMat,
        labelSprite: null,
        labelMat: null,
        baseScale,
        coreColor: palette.core,
      });
    }

    // ── Adjacency cache for hover/focus highlight computation ──
    const adj = new Map<string, Set<string>>();
    for (const e of data.edges) {
      if (!nodeVisualsRef.current.has(e.source)) continue;
      if (!nodeVisualsRef.current.has(e.target)) continue;
      let a = adj.get(e.source);
      if (!a) {
        a = new Set();
        adj.set(e.source, a);
      }
      a.add(e.target);
      let b = adj.get(e.target);
      if (!b) {
        b = new Set();
        adj.set(e.target, b);
      }
      b.add(e.source);
    }
    adjacencyRef.current = adj;

    // ── Base edges (always rendered, theme-aware low opacity) ──
    // Spec A: defaults are subtle but readable — bumped from the
    // original 0.35 baseline. Colors and opacities live in
    // `sphere3dEdgePalette` for consistency with the rest of the
    // graph chrome.
    if (data.edges.length > 0) {
      const palette = sphere3dEdgePalette(surfaceMode);
      const positionsArr: number[] = [];
      for (const e of data.edges) {
        const a = positions.get(e.source);
        const b = positions.get(e.target);
        if (!a || !b) continue;
        positionsArr.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positionsArr, 3),
      );
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(palette.baseColor),
        transparent: true,
        opacity: palette.baseOpacity,
        depthWrite: false,
      });
      materialsRef.current.push(lineMat);
      const lines = new THREE.LineSegments(geom, lineMat);
      lines.name = "brainSphereEdgesBase";
      baseEdgesRef.current = lines;
      group.add(lines);

      // Empty accent buffer. Geometry is rebuilt when focus changes.
      // Additive blending in dark mode reads as a true illumination;
      // light mode uses normal blending so the cyan stays legible
      // on a pale ground.
      const accentGeom = new THREE.BufferGeometry();
      accentGeom.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([], 3),
      );
      const accentMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(palette.accentColor),
        transparent: true,
        opacity: palette.accentOpacity,
        depthWrite: false,
        blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      });
      materialsRef.current.push(accentMat);
      const accent = new THREE.LineSegments(accentGeom, accentMat);
      accent.name = "brainSphereEdgesAccent";
      accent.frustumCulled = false; // small set, no culling needed
      accentEdgesRef.current = accent;
      group.add(accent);
    }
  }, [
    data,
    positions,
    clusterColors,
    clusterBy,
    surfaceMode,
    isLight,
    graphShell.glowGradientEnd,
  ]);

  // ── Lazy label sprite construction ─────────────────────────────
  // Building canvas textures for every node up-front is wasteful when
  // labels are off by default. Each node's label sprite is created
  // the first time it actually needs to be visible, and the texture
  // is cached by (label, surfaceMode) so duplicates share GPU memory.
  const ensureLabelSprite = useCallback(
    (visual: NodeVisual, label: string): THREE.Sprite => {
      if (visual.labelSprite) return visual.labelSprite;
      const opts = sphere3dLabelTextureOpts(surfaceMode);
      const cacheKey = `${surfaceMode}|${label}`;
      const cache = labelTexCacheRef.current;
      let tex = cache.get(cacheKey);
      if (!tex) {
        tex = makeLabelTexture(label, opts);
        cache.set(cacheKey, tex);
        texturesRef.current.push(tex);
      }
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      materialsRef.current.push(mat);
      const sprite = new THREE.Sprite(mat);
      const w = (tex as THREE.Texture & { __w?: number }).__w ?? 200;
      const h = (tex as THREE.Texture & { __h?: number }).__h ?? 28;
      const labelScale = 0.82;
      sprite.scale.set(w * labelScale, h * labelScale, 1);
      sprite.position.set(0, visual.baseScale * 0.85 + 6, 0);
      sprite.visible = false;
      sprite.userData = { nodeId: visual.group.userData.nodeId };
      visual.group.add(sprite);
      visual.labelSprite = sprite;
      visual.labelMat = mat;
      return sprite;
    },
    [surfaceMode],
  );

  // ── Accent-edge rebuilder ──────────────────────────────────────
  // Recomputes the accent LineSegments geometry from the current set
  // of "illuminated" edges. We only call this when the highlighted
  // edge set actually changes (selection or hover swap), not every
  // frame — keeps geometry uploads to the GPU cheap.
  const rebuildAccentEdges = useCallback(
    (highlightedNodeId: string | null) => {
      const accent = accentEdgesRef.current;
      if (!accent) return;
      const arr: number[] = [];
      if (highlightedNodeId) {
        const neighbors = adjacencyRef.current.get(highlightedNodeId);
        const center = positions.get(highlightedNodeId);
        if (neighbors && center) {
          for (const otherId of neighbors) {
            const other = positions.get(otherId);
            if (!other) continue;
            arr.push(center.x, center.y, center.z, other.x, other.y, other.z);
          }
        }
      }
      const geom = accent.geometry as THREE.BufferGeometry;
      const attr = geom.getAttribute("position") as
        | THREE.BufferAttribute
        | undefined;
      if (!attr || attr.array.length !== arr.length) {
        geom.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(arr, 3),
        );
      } else {
        // Reuse buffer when length is unchanged (rare but free).
        const a = attr.array as Float32Array;
        for (let i = 0; i < arr.length; i += 1) a[i] = arr[i];
        attr.needsUpdate = true;
      }
      geom.computeBoundingSphere();
    },
    [positions],
  );

  // ── Visual state application (cheap, per-frame, refs-only) ─────
  // No React state writes inside this function — it only mutates
  // material opacity and sprite scale. Selection, hover, focus
  // phase, and label toggle are read from refs synced in the
  // earlier effect.
  const applyVisualState = useCallback(() => {
    const visuals = nodeVisualsRef.current;
    if (visuals.size === 0) return;

    const selected = selectedRef.current;
    const hovered = hoveredRef.current;
    const focus = focusStateRef.current;
    const showLabels = showLabelsRef.current;

    const showConn = showConnectionsRef.current;

    // The "highlighted" id drives both fade pattern AND accent edges.
    // Selection (locked focus) wins over hover (preview focus); when
    // neither is present, no highlight is applied and edges read at
    // their default elegant baseline.
    const isFocused =
      focus.phase === "focused" ||
      focus.phase === "transitioning-in" ||
      focus.phase === "transitioning-out";
    const highlightId = selected ?? hovered ?? null;
    const isLockedFocus = isFocused && selected !== null;
    const neighbors = highlightId
      ? adjacencyRef.current.get(highlightId)
      : null;

    visuals.forEach((v, id) => {
      const isSelected = selected !== null && id === selected;
      const isHovered = !isSelected && hovered !== null && id === hovered;
      const isNeighbor = !isSelected && !isHovered && !!neighbors?.has(id);

      // Glow opacity & scale.
      let opacity: number;
      let scaleMul: number;
      if (isSelected) {
        opacity = 1;
        scaleMul = 1.45;
      } else if (isHovered) {
        opacity = 1;
        scaleMul = 1.28;
      } else if (isNeighbor) {
        opacity = 0.92;
        scaleMul = 1.1;
      } else if (highlightId) {
        // Dim everything that isn't the highlighted mini-network. Keep
        // 0.2 floor so spatial context is preserved (per spec).
        opacity = 0.2;
        scaleMul = 0.92;
      } else {
        // Default state — no highlight active.
        opacity = isLight ? 0.78 : 0.92;
        scaleMul = 1;
      }

      const mat = v.glowMat;
      if (mat.opacity !== opacity) mat.opacity = opacity;
      const targetScale = v.baseScale * scaleMul;
      if (Math.abs(v.glow.scale.x - targetScale) > 0.01) {
        v.glow.scale.set(targetScale, targetScale, 1);
      }

      // Label visibility — selected node label is forced visible
      // whenever focus is active; neighbors only when global Show
      // Labels is ON; everything else only when Show Labels is ON
      // and there's no highlight to dim away from.
      const wantLabel =
        (isSelected && isLockedFocus) ||
        (showLabels && (isSelected || isHovered || isNeighbor || !highlightId));

      if (wantLabel) {
        // Lazy-create on first show.
        const node = nodeIndex.get(id);
        if (node) {
          const sprite = ensureLabelSprite(v, node.label || node.id);
          if (!sprite.visible) sprite.visible = true;
          if (v.labelMat) {
            const lmOpacity = isSelected || isHovered ? 1 : 0.85;
            if (v.labelMat.opacity !== lmOpacity) v.labelMat.opacity = lmOpacity;
          }
        }
      } else if (v.labelSprite && v.labelSprite.visible) {
        v.labelSprite.visible = false;
      }
    });

    // Edges: dim base layer when something is highlighted; brighten
    // accent layer to "illuminated". Theme-token palette so light
    // mode and dark mode both feel right.
    const baseLines = baseEdgesRef.current;
    if (baseLines) {
      const mat = baseLines.material as THREE.LineBasicMaterial;
      const palette = sphere3dEdgePalette(surfaceMode);
      let target: number;
      if (!showConn) {
        target = 0;
      } else if (highlightId) {
        target = palette.dimOpacity;
      } else {
        target = palette.baseOpacity;
      }
      if (mat.opacity !== target) mat.opacity = target;
    }

    const accentLines = accentEdgesRef.current;
    if (accentLines) {
      const mat = accentLines.material as THREE.LineBasicMaterial;
      const palette = sphere3dEdgePalette(surfaceMode);
      const tentacleBoost = highlightId ? 2.35 : 1;
      const target = Math.min(1, palette.accentOpacity * tentacleBoost);
      if (mat.opacity !== target) mat.opacity = target;
    }
  }, [ensureLabelSprite, isLight, nodeIndex, surfaceMode]);

  // ── Tooltip placement (DOM, projected from world coords) ───────
  const refreshTooltipPosition = useCallback(() => {
    const tip = tooltipRef.current;
    const camera = cameraRef.current;
    const group = groupRef.current;
    const container = containerRef.current;
    if (!tip || !camera || !group || !container) return;
    // Tooltip is hover-only. Falling back to `selected` duplicated
    // the locked-focus sprite label (same title + category twice).
    const hovered = hoveredRef.current;
    const selected = selectedRef.current;
    const focus = focusStateRef.current;
    if (!hovered) {
      tip.style.opacity = "0";
      return;
    }
    // Inside core focus, the selected node's contextual copy lives on
    // the 3D sprite — suppress the DOM pill while the pointer is on it.
    if (focus.phase === "focused" && selected === hovered) {
      tip.style.opacity = "0";
      return;
    }
    const id = hovered;
    const v = nodeVisualsRef.current.get(id);
    if (!v) {
      tip.style.opacity = "0";
      return;
    }
    // World position = group.matrixWorld * local node position. We
    // recompute every frame because the group rotates.
    const worldPos = projVecRef.current.set(0, 0, 0);
    v.group.getWorldPosition(worldPos);
    worldPos.project(camera);
    const rect = container.getBoundingClientRect();
    const x = (worldPos.x * 0.5 + 0.5) * rect.width;
    const y = (-worldPos.y * 0.5 + 0.5) * rect.height;
    // Behind camera or far behind sphere: hide.
    if (worldPos.z > 1) {
      tip.style.opacity = "0";
      return;
    }
    tip.style.opacity = "1";
    tip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  // ── Store → refs + Three.js highlight (no render subscription for hover)
  useEffect(() => {
    const visualSnap = (s: ReturnType<typeof useBrainStore.getState>) => {
      const fs = s.focusState;
      let fk: string;
      switch (fs.phase) {
        case "idle":
          fk = "idle";
          break;
        case "transitioning-in":
          fk = `in:${fs.nodeId}`;
          break;
        case "focused":
          fk = `f:${fs.nodeId}`;
          break;
        case "transitioning-out":
          fk = `out:${fs.previousNodeId}`;
          break;
        default:
          fk = "";
      }
      return [
        s.hoveredNodeId ?? "",
        s.selectedNodeId ?? "",
        String(s.sphereShowLabels),
        String(s.sphereShowConnections),
        fk,
      ].join("|");
    };

    const prime = useBrainStore.getState();
    rotationStateRef.current = prime.rotationState;
    speedRef.current = prime.sphereRotationSpeed;
    hoveredRef.current = prime.hoveredNodeId;
    selectedRef.current = prime.selectedNodeId;
    showLabelsRef.current = prime.sphereShowLabels;
    showConnectionsRef.current = prime.sphereShowConnections;
    focusStateRef.current = prime.focusState;
    lastVisualStoreSnapRef.current = visualSnap(prime);

    return useBrainStore.subscribe((s) => {
      rotationStateRef.current = s.rotationState;
      speedRef.current = s.sphereRotationSpeed;
      hoveredRef.current = s.hoveredNodeId;
      selectedRef.current = s.selectedNodeId;
      showLabelsRef.current = s.sphereShowLabels;
      showConnectionsRef.current = s.sphereShowConnections;
      focusStateRef.current = s.focusState;

      const snap = visualSnap(s);
      if (snap === lastVisualStoreSnapRef.current) return;
      lastVisualStoreSnapRef.current = snap;
      queueMicrotask(() => {
        rebuildAccentEdges(s.selectedNodeId ?? s.hoveredNodeId ?? null);
        applyVisualState();
      });
    });
  }, [applyVisualState, rebuildAccentEdges]);

  // ── Re-apply visuals immediately after a graph rebuild ───────────
  // The build effect creates fresh sprites; replay highlight from refs.
  useEffect(() => {
    rebuildAccentEdges(selectedRef.current ?? hoveredRef.current ?? null);
    applyVisualState();
  }, [
    data,
    positions,
    clusterBy,
    surfaceMode,
    isLight,
    applyVisualState,
    rebuildAccentEdges,
  ]);

  // ── Drive the camera fly-in / fly-out from FocusState ──────────
  // The store sets `transitioning-in` / `transitioning-out` and we
  // turn that into a camera animation. The render loop promotes the
  // store back to `focused` / `idle` when the animation completes.
  //
  // Reduced motion: skip the animation entirely and just teleport
  // the camera (200ms crossfade window per spec). We achieve the
  // crossfade via the existing visual transition — there's nothing
  // to animate visually for the camera itself.
  useEffect(() => {
    const camera = cameraRef.current;
    const group = groupRef.current;
    if (!camera || !group) return;

    if (focusState.phase === "transitioning-in") {
      group.updateMatrixWorld(true);
      const pivot = new THREE.Vector3();
      const maxSq = { current: 0 };
      const ok = accumulateNeighborhoodCentroidAndMaxDistSq(
        focusState.nodeId,
        nodeVisualsRef.current,
        adjacencyRef.current,
        pivot,
        maxSq,
      );
      const o = cameraOrbitRef.current;
      let toVec: THREE.Vector3;
      if (!ok) {
        focusRMinRef.current = 200;
        focusRMaxRef.current = 1100;
        focusOrbitRef.current = {
          theta: o.theta,
          phi: o.phi,
          radius: Math.min(o.radius * 0.5, 800),
        };
        targetFocusRadiusRef.current = focusOrbitRef.current.radius;
        const fo = focusOrbitRef.current;
        const sinP0 = Math.sin(fo.phi);
        toVec = new THREE.Vector3(
          fo.radius * sinP0 * Math.sin(fo.theta),
          fo.radius * Math.cos(fo.phi),
          fo.radius * sinP0 * Math.cos(fo.theta),
        );
      } else {
        const maxDist = Math.sqrt(maxSq.current) + NODE_MAX_RADIUS * 3.5;
        focusRMinRef.current = Math.max(maxDist * 1.14, 85);
        focusRMaxRef.current = Math.min(
          Math.max(maxDist * 5.8, focusRMinRef.current * 2.35),
          SPHERE_RADIUS * 5.2,
        );
        const fovV = (CAMERA_FOV_DEG * Math.PI) / 180;
        const ideal = maxDist / Math.sin(fovV * 0.5) * 1.68;
        const initR = Math.min(
          Math.max(ideal, focusRMinRef.current * 1.02),
          focusRMaxRef.current * 0.96,
        );
        focusOrbitRef.current = {
          theta: o.theta,
          phi: o.phi,
          radius: initR,
        };
        targetFocusRadiusRef.current = focusOrbitRef.current.radius;
        const fo = focusOrbitRef.current;
        const sinP = Math.sin(fo.phi);
        toVec = pivot.clone().add(
          new THREE.Vector3(
            fo.radius * sinP * Math.sin(fo.theta),
            fo.radius * Math.cos(fo.phi),
            fo.radius * sinP * Math.cos(fo.theta),
          ),
        );
      }

      const fromVec = camera.position.clone();

      const cur = cameraAnimRef.current;
      const backup = savedOuterOrbitRef.current;
      const savedOrbit =
        cur.kind === "in"
          ? cur.savedOrbit
          : backup ?? { theta: o.theta, phi: o.phi, radius: o.radius };

      const reduced = reducedMotionRef.current;
      const duration = reduced ? SPHERE_REDUCED_MOTION_FADE_MS : SPHERE_FLY_IN_MS;

      cameraAnimRef.current = {
        kind: "in",
        nodeId: focusState.nodeId,
        startedAt: performance.now(),
        durationMs: duration,
        from: fromVec,
        to: toVec,
        savedOrbit,
      };
      queueMicrotask(() => notifySphereZoomPercent(true));
    } else if (focusState.phase === "transitioning-out") {
      // Fly back to the orbit position we saved on entry. If we
      // somehow don't have one (e.g. the user changed selection
      // mid-flight), fall back to the canonical reset orbit framed
      // for the current viewport.
      const saved =
        savedOuterOrbitRef.current ?? {
          theta: 0,
          phi: Math.PI / 2,
          radius: computeFramingDistance(camera.aspect),
        };
      cameraOrbitRef.current = { ...saved };
      targetOuterRadiusRef.current = cameraOrbitRef.current.radius;
      const sinPhi = Math.sin(saved.phi);
      const toVec = new THREE.Vector3(
        saved.radius * sinPhi * Math.sin(saved.theta),
        saved.radius * Math.cos(saved.phi),
        saved.radius * sinPhi * Math.cos(saved.theta),
      );
      const fromVec = camera.position.clone();
      const reduced = reducedMotionRef.current;
      const duration = reduced ? SPHERE_REDUCED_MOTION_FADE_MS : SPHERE_FLY_OUT_MS;

      cameraAnimRef.current = {
        kind: "out",
        previousNodeId: focusState.previousNodeId,
        startedAt: performance.now(),
        durationMs: duration,
        from: fromVec,
        to: toVec,
      };
      queueMicrotask(() => notifySphereZoomPercent(true));
    }
    // `focused` and `idle` don't trigger anything here — the render
    // loop reads them directly to decide whether to track the
    // selected node with `lookAt`.
  }, [focusState, notifySphereZoomPercent]);

  // ── Render loop ────────────────────────────────────────────────
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dtSec = Math.min(0.05, (now - last) / 1000);
      last = now;

      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      const group = groupRef.current;
      if (!renderer || !camera || !scene || !group) {
        raf = requestAnimationFrame(tick);
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        devTickCountRef.current += 1;
      }

      // 1) Sphere-group rotation. Slow, earth-like, never on the
      //    camera. Speed comes from the user's preset and is halved
      //    when prefers-reduced-motion is set. Rotation continues
      //    DURING the fly-in (per spec) — the rotating sphere is the
      //    spatial metaphor we want to preserve.
      const rs = rotationStateRef.current;
      const isSpinning = rs.kind === "rotating";
      if (isSpinning) {
        const speed = speedRef.current;
        const motionFactor = reducedMotionRef.current
          ? SPHERE_REDUCED_MOTION_FACTOR
          : 1;
        const yaw = SPHERE_AMBIENT_YAW_BY_SPEED[speed] * motionFactor;
        const drift = SPHERE_AMBIENT_DRIFT_BY_SPEED[speed] * motionFactor;
        group.rotation.y += yaw * dtSec;
        // Tiny secondary axis drift so the motion never feels like a
        // mechanical lathe. We modulate the X-axis drift by sin(y)
        // for an organic wobble.
        group.rotation.x += drift * dtSec * Math.sin(group.rotation.y * 0.5);
      }
      // Group's matrices need to be current before we read world
      // positions out of it for lookAt and tooltip projection.
      group.updateMatrixWorld(true);

      // 2) Camera position. Either the default outer orbit, or a
      //    blended fly-in/fly-out animation. The animation, when
      //    active, fully takes over both `position` and `lookAt`.
      const anim = cameraAnimRef.current;
      const camPos = camPosScratch.current;
      const lookAt = lookAtScratch.current;
      const lookAtCur = lookAtCurrentRef.current;

      if (anim.kind === "idle") {
        const focus = focusStateRef.current;
        if (focus.phase === "focused") {
          const pivot = neighborSumScratch.current;
          const maxSq = { current: 0 };
          const ok = accumulateNeighborhoodCentroidAndMaxDistSq(
            focus.nodeId,
            nodeVisualsRef.current,
            adjacencyRef.current,
            pivot,
            maxSq,
          );
          if (!ok) {
            lookAtCur.lerp(lookAt.set(0, 0, 0), Math.min(1, dtSec * 6));
            camPos.set(0, 0, 0);
          } else {
            const fo = focusOrbitRef.current;
            const tgtF = THREE.MathUtils.clamp(
              targetFocusRadiusRef.current,
              focusRMinRef.current,
              focusRMaxRef.current,
            );
            targetFocusRadiusRef.current = tgtF;
            fo.radius = THREE.MathUtils.damp(
              fo.radius,
              tgtF,
              ZOOM_RADIUS_DAMP_LAMBDA,
              dtSec,
            );
            fo.radius = Math.min(
              focusRMaxRef.current,
              Math.max(focusRMinRef.current, fo.radius),
            );
            const sinP = Math.sin(fo.phi);
            lookAt.set(
              fo.radius * sinP * Math.sin(fo.theta),
              fo.radius * Math.cos(fo.phi),
              fo.radius * sinP * Math.cos(fo.theta),
            );
            camPos.copy(pivot).add(lookAt);
            lookAtCur.lerp(pivot, Math.min(1, dtSec * 10));
          }
        } else {
          const o = cameraOrbitRef.current;
          const tgtO = THREE.MathUtils.clamp(
            targetOuterRadiusRef.current,
            RADIUS_MIN,
            RADIUS_MAX,
          );
          targetOuterRadiusRef.current = tgtO;
          o.radius = THREE.MathUtils.damp(
            o.radius,
            tgtO,
            ZOOM_RADIUS_DAMP_LAMBDA,
            dtSec,
          );
          o.radius = Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, o.radius));
          const sinPhi = Math.sin(o.phi);
          camPos.set(
            o.radius * sinPhi * Math.sin(o.theta),
            o.radius * Math.cos(o.phi),
            o.radius * sinPhi * Math.cos(o.theta),
          );
          lookAtCur.lerp(lookAt.set(0, 0, 0), Math.min(1, dtSec * 6));
        }
      } else if (anim.kind === "in") {
        const t = Math.min(1, (now - anim.startedAt) / anim.durationMs);
        const e = easeInOutCubic(t);
        camPos.copy(anim.from).lerp(anim.to, e);
        const pivot = neighborSumScratch.current;
        const maxSq = { current: 0 };
        accumulateNeighborhoodCentroidAndMaxDistSq(
          anim.nodeId,
          nodeVisualsRef.current,
          adjacencyRef.current,
          pivot,
          maxSq,
        );
        lookAtCur.copy(pivot);
        if (t >= 1) {
          const dist = camPos.distanceTo(pivot);
          focusOrbitRef.current.radius = Math.min(
            focusRMaxRef.current,
            Math.max(focusRMinRef.current, dist),
          );
          targetFocusRadiusRef.current = focusOrbitRef.current.radius;
          savedOuterOrbitRef.current = { ...anim.savedOrbit };
          cameraAnimRef.current = { kind: "idle" };
          if (focusStateRef.current.phase === "transitioning-in") {
            setFocusStateExternal({
              phase: "focused",
              nodeId: anim.nodeId,
            });
          }
          notifySphereZoomPercent(true);
        }
      } else {
        // out
        const t = Math.min(1, (now - anim.startedAt) / anim.durationMs);
        const e = easeInOutCubic(t);
        camPos.copy(anim.from).lerp(anim.to, e);
        // LookAt eases from the previous selected node's world pos
        // back to the origin so the camera doesn't whip around mid-
        // flight.
        const v = nodeVisualsRef.current.get(anim.previousNodeId);
        if (v) {
          v.group.getWorldPosition(lookAt);
        } else {
          lookAt.set(0, 0, 0);
        }
        lookAt.lerp(lookAtScratch.current.set(0, 0, 0), e);
        lookAtCur.copy(lookAt);
        if (t >= 1) {
          cameraAnimRef.current = { kind: "idle" };
          if (focusStateRef.current.phase === "transitioning-out") {
            setFocusStateExternal({ phase: "idle" });
          }
          notifySphereZoomPercent(true);
        }
      }

      camera.position.copy(camPos);
      camera.lookAt(lookAtCur);

      if (anim.kind === "idle") {
        const wall = performance.now();
        if (wall - lastZoomUiWallMsRef.current >= ZOOM_UI_SYNC_MS) {
          lastZoomUiWallMsRef.current = wall;
          notifySphereZoomPercent(false);
        }
      }

      if (
        process.env.NODE_ENV !== "production" &&
        zoomDebugOverlayRef.current
      ) {
        const r = renderer.getPixelRatio();
        const o = cameraOrbitRef.current;
        const fo = focusOrbitRef.current;
        zoomDebugOverlayRef.current.textContent = [
          `ticks ${devTickCountRef.current}`,
          `canvasMounts ${devCanvasMountCountRef.current}`,
          `reactLayouts ${devReactLayoutCountRef.current}`,
          `wheels ${devWheelEventCountRef.current}`,
          `rawDy ${devLastWheelRawDyRef.current.toFixed(1)} ×${devLastWheelFactorRef.current.toFixed(4)}`,
          `outer r=${o.radius.toFixed(0)} →tgt ${targetOuterRadiusRef.current.toFixed(0)}`,
          `focus r=${fo.radius.toFixed(0)} →tgtF ${targetFocusRadiusRef.current.toFixed(0)}`,
          `dpr ${r.toFixed(2)} anim=${anim.kind}`,
        ].join("\n");
      }

      // Visual state is applied via a state-change effect (cheap and
      // event-driven). Don't iterate every node every frame — the
      // graph can have 1000+ sprites and per-frame opacity/scale
      // mutations would dominate the budget for no benefit when
      // nothing changed.

      renderer.render(scene, camera);

      // Tooltip lives in the DOM but tracks a 3D point — refresh
      // after render so projection uses the camera we just used.
      refreshTooltipPosition();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [refreshTooltipPosition, setFocusStateExternal, notifySphereZoomPercent]);

  // ── Hit testing (screen-space nearest-node) ────────────────────
  // Sprite raycasting uses the sprite's bounding-box plane, which
  // matches the visible glow halo — but most of the halo's pixels
  // are transparent, so the user perceives the hit area as "only
  // the bright dot". That made dots feel impossible to click without
  // pixel-perfect aim.
  //
  // Instead we project every node's world position to screen pixels
  // and pick the closest node within HIT_TEST_THRESHOLD_PX of the
  // pointer, breaking ties by depth (front-most wins). With 1000+
  // nodes this is still well under a millisecond per pointermove.
  const hitTest = useCallback(
    (clientX: number, clientY: number): SphereNodeId | null => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      const group = groupRef.current;
      if (!container || !camera || !group) return null;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const w = rect.width;
      const h = rect.height;
      const proj = projVecRef.current;

      let bestId: SphereNodeId | null = null;
      let bestZ = Infinity;
      let bestDist = Infinity;

      nodeVisualsRef.current.forEach((v, id) => {
        v.group.getWorldPosition(proj);
        proj.project(camera);
        // Skip nodes behind the camera or beyond the far plane.
        if (proj.z > 1 || proj.z < -1) return;
        const sx = (proj.x * 0.5 + 0.5) * w;
        const sy = (-proj.y * 0.5 + 0.5) * h;
        const dx = sx - px;
        const dy = sy - py;
        const d = Math.hypot(dx, dy);
        if (d > HIT_TEST_THRESHOLD_PX) return;
        // Prefer the front-most node among hits within the threshold.
        // Tie-break by smaller screen-space distance.
        if (proj.z < bestZ - 0.001) {
          bestZ = proj.z;
          bestId = id;
          bestDist = d;
        } else if (Math.abs(proj.z - bestZ) <= 0.001 && d < bestDist) {
          bestId = id;
          bestDist = d;
        }
      });

      return bestId;
    },
    [],
  );

  // ── Drag → camera orbit; idle → resume rotation ─────────────────
  const clearDragResumeTimer = useCallback(() => {
    if (dragResumeTimerRef.current) {
      clearTimeout(dragResumeTimerRef.current);
      dragResumeTimerRef.current = null;
    }
  }, []);

  const scheduleDragResume = useCallback(() => {
    clearDragResumeTimer();
    // If user has the speed preset off entirely, don't auto-resume —
    // they explicitly disabled it.
    if (speedRef.current === "off") {
      setRotationState({ kind: "disabled" });
      return;
    }
    const resumeAt = performance.now() + SPHERE_DRAG_RESUME_DELAY_MS;
    setRotationState({ kind: "drag-paused", resumeAt });
    dragResumeTimerRef.current = setTimeout(() => {
      // Only resume if rotation is still drag-paused — don't override
      // a long-press pause that fired during the idle wait.
      const cur = rotationStateRef.current;
      if (cur.kind === "drag-paused") setRotationState({ kind: "rotating" });
    }, SPHERE_DRAG_RESUME_DELAY_MS);
  }, [clearDragResumeTimer, setRotationState]);

  // ── Gesture wiring ─────────────────────────────────────────────
  // (`nodeIndex` is defined above near `positions` so it's available
  // to the visual-state callback that runs each frame.)
  const [tooltipText, setTooltipText] = useState<{
    label: string;
    type: string;
    category?: string;
  } | null>(null);

  // Cursor is state-driven so React's render pass doesn't blow away
  // imperatively-written cursor styles (which it did before — `style`
  // prop reapplied "grab" on every render and the hover-pointer
  // assignment never survived a state change). Coalesces naturally
  // because the gesture hook only emits hover when the resolved id
  // changes.
  const [cursorStyle, setCursorStyle] = useState<
    "grab" | "grabbing" | "pointer"
  >("grab");

  const onGesture = useCallback(
    (event: SphereGestureEvent) => {
      switch (event.kind) {
        case "click": {
          if (event.nodeId) {
            const node = nodeIndex.get(event.nodeId);
            if (node) onNodeClick(node);
          } else {
            onBackgroundClick();
          }
          return;
        }
        case "longpress-start": {
          // Pause rotation while held. Suppresses the eventual click
          // automatically (the gesture hook never emits one after a
          // longpress).
          clearDragResumeTimer();
          setRotationState({ kind: "paused", reason: "longpress" });
          return;
        }
        case "longpress-end": {
          // Resume from the current angle — never snap.
          if (speedRef.current === "off") {
            setRotationState({ kind: "disabled" });
          } else {
            setRotationState({ kind: "rotating" });
          }
          return;
        }
        case "drag-start": {
          // Begin orbiting. Pause rotation transiently and switch
          // cursor to grabbing for the duration.
          dragRef.current.active = true;
          clearDragResumeTimer();
          setCursorStyle("grabbing");
          setRotationState({
            kind: "drag-paused",
            resumeAt: Number.POSITIVE_INFINITY, // resume only on drag-end
          });
          return;
        }
        case "drag-end": {
          dragRef.current.active = false;
          // Restore cursor based on whether we ended on a node.
          setCursorStyle(hoveredRef.current ? "pointer" : "grab");
          scheduleDragResume();
          return;
        }
        case "hover": {
          setHoveredNodeId(event.nodeId);
          // Tooltip text snapshot — only updated when hovered id
          // actually changes (the gesture hook coalesces).
          if (event.nodeId) {
            const node = nodeIndex.get(event.nodeId);
            setTooltipText(
              node
                ? {
                    label: node.label,
                    type: node.type,
                    category: node.category,
                  }
                : null,
            );
          } else {
            setTooltipText(null);
          }
          if (onNodeHover) {
            onNodeHover(event.nodeId ? (nodeIndex.get(event.nodeId) ?? null) : null);
          }
          // Cursor follows hover. The drag-start branch above takes
          // priority and locks to "grabbing" while a drag is active;
          // we only update here when we're not mid-drag.
          if (!dragRef.current.active) {
            setCursorStyle(event.nodeId ? "pointer" : "grab");
          }
          return;
        }
      }
    },
    [
      clearDragResumeTimer,
      nodeIndex,
      onBackgroundClick,
      onNodeClick,
      onNodeHover,
      scheduleDragResume,
      setHoveredNodeId,
      setRotationState,
    ],
  );

  const gestureHandlers = useNodeGesture({ hitTest, onGesture });

  // Drag-orbit pointer move accumulator. We add this on top of the
  // gesture hook's pointermove so the hook stays renderer-agnostic.
  const handlePointerMoveOrbit = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      gestureHandlers.onPointerMove(e);
      const drag = dragRef.current;
      if (!drag.active) {
        // Initialize the lastX/lastY at the moment drag starts —
        // gesture hook only emits drag-start after the 8px escape, so
        // we need to lazily prime the position.
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        return;
      }
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      // Degrees per pixel. Tuned to feel like a generous trackpad.
      const k = 0.005;
      if (
        focusStateRef.current.phase === "focused" &&
        cameraAnimRef.current.kind === "idle"
      ) {
        const fo = focusOrbitRef.current;
        fo.theta -= dx * k;
        fo.phi = Math.min(PHI_MAX, Math.max(PHI_MIN, fo.phi - dy * k));
        return;
      }
      const orbit = cameraOrbitRef.current;
      orbit.theta -= dx * k;
      orbit.phi = Math.min(PHI_MAX, Math.max(PHI_MIN, orbit.phi - dy * k));
    },
    [gestureHandlers],
  );

  // ── Imperative handle ──────────────────────────────────────────
  // The handle is stable across renders. Inside, we read latest
  // node data via refs so the consumer can call these without
  // worrying about React render timing.
  useImperativeHandle(
    ref,
    () => ({
      resetView: () => {
        const camera = cameraRef.current;
        const aspect = camera?.aspect ?? 16 / 9;
        focusOrbitRef.current = {
          theta: 0,
          phi: Math.PI / 2,
          radius: 420,
        };
        targetFocusRadiusRef.current = focusOrbitRef.current.radius;
        const next = {
          theta: 0,
          phi: Math.PI / 2,
          radius: computeFramingDistance(aspect),
        };
        cameraOrbitRef.current = next;
        targetOuterRadiusRef.current = next.radius;
        savedOuterOrbitRef.current = { ...next };
        cameraAnimRef.current = { kind: "idle" };
        setFocusStateExternal({ phase: "idle" });
        notifySphereZoomPercent(true);
      },
      fitGraph: () => {
        const camera = cameraRef.current;
        const aspect = camera?.aspect ?? 16 / 9;
        const framed = computeFramingDistance(aspect);
        if (focusStateRef.current.phase === "focused") {
          focusOrbitRef.current.radius = focusRMaxRef.current * 0.98;
          targetFocusRadiusRef.current = focusOrbitRef.current.radius;
          notifySphereZoomPercent(true);
          return;
        }
        cameraOrbitRef.current.radius = framed;
        targetOuterRadiusRef.current = framed;
        const s = savedOuterOrbitRef.current;
        if (s) s.radius = framed;
        notifySphereZoomPercent(true);
      },
      focusNode: (nodeId: SphereNodeId) => {
        // Toolbar's search hit calls this. Hand off to the same
        // FocusState pipeline a click would trigger so the camera
        // animates rather than snapping.
        if (!nodeIndex.has(nodeId)) return;
        setFocusStateExternalRef.current({
          phase: "transitioning-in",
          nodeId,
          startedAt: performance.now(),
        });
      },
      getFocusZoomPercent: () => {
        if (
          focusStateRef.current.phase === "focused" &&
          cameraAnimRef.current.kind === "idle"
        ) {
          return radiusToZoomPercent(
            focusOrbitRef.current.radius,
            focusRMinRef.current,
            focusRMaxRef.current,
          );
        }
        const o = cameraOrbitRef.current;
        return radiusToZoomPercent(o.radius, RADIUS_MIN, RADIUS_MAX);
      },
      adjustFocusZoomByPercent: (deltaPercent: number) => {
        if (cameraAnimRef.current.kind !== "idle") return;
        if (focusStateRef.current.phase === "focused") {
          const fo = focusOrbitRef.current;
          const cur = radiusToZoomPercent(
            fo.radius,
            focusRMinRef.current,
            focusRMaxRef.current,
          );
          const next = Math.max(0, Math.min(100, cur + deltaPercent));
          fo.radius = zoomPercentToRadius(
            next,
            focusRMinRef.current,
            focusRMaxRef.current,
          );
          targetFocusRadiusRef.current = fo.radius;
          notifySphereZoomPercent(true);
          return;
        }
        const o = cameraOrbitRef.current;
        const cur = radiusToZoomPercent(o.radius, RADIUS_MIN, RADIUS_MAX);
        const next = Math.max(0, Math.min(100, cur + deltaPercent));
        o.radius = zoomPercentToRadius(next, RADIUS_MIN, RADIUS_MAX);
        targetOuterRadiusRef.current = o.radius;
        notifySphereZoomPercent(true);
      },
    }),
    [nodeIndex, notifySphereZoomPercent, setFocusStateExternal],
  );

  // ── Cleanup any stray timers on unmount ────────────────────────
  useEffect(() => () => clearDragResumeTimer(), [clearDragResumeTimer]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none overscroll-contain"
      style={{
        background: graphShell.sphere3dBackdropCss,
        cursor: cursorStyle,
        touchAction: "none",
        overscrollBehavior: "none",
      }}
      // Spread gesture handlers; replace pointermove with the orbit-
      // aware variant that wraps the hook's emitter.
      onPointerDown={gestureHandlers.onPointerDown}
      onPointerMove={handlePointerMoveOrbit}
      onPointerUp={gestureHandlers.onPointerUp}
      onPointerCancel={gestureHandlers.onPointerCancel}
      onPointerLeave={gestureHandlers.onPointerLeave}
      // a11y: the canvas itself is decorative — toolbar provides the
      // controls. Phase 4 adds keyboard navigation.
      role="img"
      aria-label="Brain knowledge sphere — slowly rotating 3D graph"
    >
      {process.env.NODE_ENV !== "production" ? (
        <div
          ref={zoomDebugOverlayRef}
          className="pointer-events-none absolute bottom-2 left-2 z-[60] max-w-[min(100%,280px)] whitespace-pre-wrap rounded-md border border-white/15 bg-black/55 px-2 py-1.5 font-mono text-[9px] leading-snug text-emerald-200/95 shadow-lg backdrop-blur-sm"
          aria-hidden
        />
      ) : null}
      {/* Hover tooltip — pinned to the projected world position of
          the hovered node (refreshTooltipPosition writes transform
          every frame). Allowed even when global Show Labels is off
          (per spec). */}
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute left-0 top-0 z-30 -translate-x-1/2 -translate-y-[140%] whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] leading-tight shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md transition-opacity duration-150 ease-out"
        style={{
          opacity: 0,
          background: isLight ? "rgba(255,255,255,0.92)" : "rgba(7,8,15,0.85)",
          border: isLight
            ? "1px solid rgba(148,163,184,0.45)"
            : "1px solid rgba(255,255,255,0.10)",
          color: isLight ? "rgb(15,23,42)" : "rgb(241,245,249)",
        }}
        aria-hidden
      >
        {tooltipText ? (
          <>
            <div className="font-medium">{tooltipText.label}</div>
            <div
              className="text-[10px] uppercase tracking-wider"
              style={{
                color: isLight ? "rgb(100,116,139)" : "rgb(148,163,184)",
              }}
            >
              {tooltipText.category ?? tooltipText.type}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
});

export default BrainSphere3DInner;
