"use client";

/**
 * 3D Sphere Mode — inner WebGL renderer.
 *
 * This file is dynamically imported by `ConstellationSphere3D.tsx`
 * with `ssr: false` so `react-force-graph-3d` (which pulls in three.js
 * + WebGL) never runs on the server. Do NOT import this file directly
 * from a server component or Next.js will try to bundle three for SSR.
 *
 * Design notes:
 *   - Nodes are pre-positioned via `generateSpherePositions` and frozen
 *     with `fx/fy/fz`. We disable the d3 force engine (cooldownTicks=0)
 *     so the layout stays stable and cinematic — exactly the reference
 *     image's "globe of knowledge" feel.
 *   - Each node is a custom `THREE.Sprite` with a soft radial-gradient
 *     glow. Sprites always face the camera, so we get the cosmic
 *     "shining points of light" look without paying the cost of full
 *     spherical geometry per node.
 *   - The visible cluster regions are produced by `buildClusterColorMap`
 *     in the helper file: every node in the same cluster gets the same
 *     core/glow color, and `generateSpherePositions` keeps them in the
 *     same spherical patch.
 *   - Hover (desktop / lg+): temporary focus mode: center node, its
 *     direct neighbors, and incident edges brighten; the rest of the
 *     graph dims. Click locks selection and runs a smooth interior camera
 *     fly-in while keeping that relationship network readable.
 *   - Slow OrbitControls auto-rotation (paused while dragging, resumes
 *     after idle) reinforces the globe as a spatial object.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import {
  adjustRgbaAlpha,
  resolveEdgeColorRgba,
  resolveNodeVisuals,
  sphere3dLabelTextureOpts,
} from "@/lib/knowledge/constellation/graphThemeTokens";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import { useIsConstellationLgUp } from "@/hooks/use-constellation-lg-up";
import {
  buildClusterColorMap,
  generateSpherePositions,
  type SpherePositions,
} from "@/lib/knowledge/constellation/generateSpherePositions";
import type {
  ConstellationClusterBy,
  ConstellationEdge,
  ConstellationGraphData,
  ConstellationNode,
} from "@/types/constellation";

// react-force-graph-3d ships as ESM and pulls in three at import time.
// We *still* keep next/dynamic at this leaf — it removes any chance of
// the bundler tripping on `window` evaluation during a build worker pass.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph3D = dynamic(() => import("react-force-graph-3d") as any, {
  ssr: false,
  loading: () => null,
}) as unknown as React.ComponentType<Record<string, unknown>>;

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

type SphereNode = ConstellationNode & {
  // Pre-positioned coords supplied to the engine. `fx/fy/fz` lock the
  // node so the simulation can be disabled (cooldownTicks=0) and the
  // layout stays cinematic and stable.
  x: number;
  y: number;
  z: number;
  fx: number;
  fy: number;
  fz: number;
  __color: string;
  __glow: string;
  __ring: string;
  __clusterKey: string;
  __radius: number;
};

type SphereLink = {
  id: string;
  source: string | SphereNode;
  target: string | SphereNode;
  __originalEdge: ConstellationEdge;
};

type SphereGraphData = {
  nodes: SphereNode[];
  links: SphereLink[];
};

type Sphere3DInstance = {
  cameraPosition: (
    pos: Partial<{ x: number; y: number; z: number }>,
    lookAt?: { x: number; y: number; z: number },
    transitionMs?: number,
  ) => Sphere3DInstance;
  zoomToFit: (
    durationMs?: number,
    padding?: number,
    nodeFilter?: (n: unknown) => boolean,
  ) => Sphere3DInstance;
  scene: () => THREE.Scene;
  camera: () => THREE.Camera;
  renderer: () => THREE.WebGLRenderer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controls: () => any;
  pauseAnimation: () => Sphere3DInstance;
  resumeAnimation: () => Sphere3DInstance;
  d3Force: (name: string, fn?: unknown) => unknown;
  refresh: () => Sphere3DInstance;
};

export interface ConstellationSphere3DHandle {
  fitGraph: () => void;
  resetLayout: () => void;
  focusNode: (nodeId: string) => void;
}

interface ConstellationSphere3DInnerProps {
  data: ConstellationGraphData;
  selectedNodeId: string | null;
  spotlightDirect: Set<string> | null;
  spotlightDirectEdges: Set<string> | null;
  matchedNodeIds: Set<string>;
  showLabels: boolean;
  clusterBy: ConstellationClusterBy;
  onNodeClick: (node: ConstellationNode) => void;
  onNodeDoubleClick: (node: ConstellationNode) => void;
  onBackgroundClick: () => void;
}

// ─────────────────────────────────────────────────────────────────────
// Sprite cache — building canvas textures is expensive, so we memoize
// per (color, glow) pair. Disposed on unmount.
// ─────────────────────────────────────────────────────────────────────

type SpriteCache = Map<
  string,
  {
    glow: THREE.Texture;
    label: Map<string, THREE.Texture>;
  }
>;

function makeGlowTexture(
  core: string,
  glow: string,
  /** Outer transparency — matches 2D canvas glow fade for light/dark. */
  transparentOuter: string,
): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
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
  gradient.addColorStop(0.45, glow);
  gradient.addColorStop(1, transparentOuter);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  // Crisper compositing on small sprites.
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeLabelTexture(
  text: string,
  options: {
    color?: string;
    background?: string;
    border?: string;
    size?: number;
  } = {},
): THREE.Texture {
  const {
    color = "rgba(241, 245, 249, 0.96)",
    background = "rgba(7, 8, 15, 0.78)",
    border = "rgba(255, 255, 255, 0.10)",
    size = 18,
  } = options;
  const padding = 12;
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
  // 2x for crispness on retina + 3D sampling.
  const dpr = 2;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.scale(dpr, dpr);

  // Pill background.
  const r = 8;
  ctx.fillStyle = background;
  ctx.strokeStyle = border;
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

  // Text.
  ctx.fillStyle = color;
  ctx.font = `${size}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(truncated, w / 2, h / 2 + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  // Cache the canvas dimensions so the caller can size the sprite.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tex as any).__w = w;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tex as any).__h = h;
  return tex;
}

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

const SPHERE_RADIUS = 360;
const NODE_BASE_RADIUS = 4;
const NODE_MAX_RADIUS = 9;
const PERFORMANCE_WARNING_THRESHOLD = 1500;
const CAMERA_DISTANCE = SPHERE_RADIUS * 2.65;
/** Camera sits on the spoke at this fraction of the shell radius — “inside” the globe. */
const INTERIOR_CAMERA_R = SPHERE_RADIUS * 0.2;
/** Look-at sits between core and shell so the active node stays framed during fly-in. */
const INTERIOR_LOOK_R = SPHERE_RADIUS * 0.9;
const INTERIOR_FLY_MS = 1680;
const AUTO_ROTATE_RESUME_MS = 4500;
const AUTO_ROTATE_SPEED = 0.42;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Ignore sub-pixel jitter so materials are not updated every frame during dolly zoom. */
const OPACITY_UPDATE_EPS = 0.02;
const SCALE_UPDATE_EPS = 0.12;

function rgbaSlate(opacity: number): string {
  return `rgba(148, 163, 184, ${Math.max(0, Math.min(1, opacity)).toFixed(3)})`;
}

function rgbaEdgeMuted(opacity: number, isLight: boolean): string {
  const o = Math.max(0, Math.min(1, opacity));
  if (isLight) {
    return `rgba(71, 85, 105, ${Math.max(0.1, Math.min(1, o * 1.95)).toFixed(3)})`;
  }
  return rgbaSlate(Math.max(0.08, o));
}

function cameraDepthFactor(
  node: Pick<SphereNode, "x" | "y" | "z">,
  camera: THREE.Camera | null | undefined,
): number {
  const cam = camera?.position;
  const camLen = cam ? Math.hypot(cam.x, cam.y, cam.z) || 1 : 1;
  const nodeLen = Math.hypot(node.x, node.y, node.z) || 1;
  const camX = cam ? cam.x / camLen : 0;
  const camY = cam ? cam.y / camLen : 0;
  const camZ = cam ? cam.z / camLen : 1;
  const dot =
    (node.x / nodeLen) * camX +
    (node.y / nodeLen) * camY +
    (node.z / nodeLen) * camZ;
  // 0 = back side, 1 = front side.
  return clamp01((dot + 1) / 2);
}

function linkDepthFactor(
  link: SphereLink,
  camera: THREE.Camera | null | undefined,
): number {
  const source =
    typeof link.source === "object" ? (link.source as SphereNode) : null;
  const target =
    typeof link.target === "object" ? (link.target as SphereNode) : null;
  if (!source || !target) return 0.55;
  const raw =
    (cameraDepthFactor(source, camera) + cameraDepthFactor(target, camera)) / 2;
  // Quantize so linkColor() returns stable rgba strings across tiny camera
  // moves — fewer Three.js line material updates while dollying.
  return Math.round(raw * 32) / 32;
}

function tunePerspectiveCamera(camera: THREE.Camera | null | undefined) {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;
  // A moderate FOV keeps the globe dimensional without the fisheye
  // distortion that makes the sphere feel like a stretched blob.
  camera.fov = 44;
  camera.near = 1;
  camera.far = 6000;
  camera.updateProjectionMatrix();
}

function flyCameraToNodeInterior(
  fg: Sphere3DInstance,
  nodes: SphereNode[],
  nodeId: string,
) {
  tunePerspectiveCamera(fg.camera());
  const target = nodes.find((n) => n.id === nodeId);
  if (!target || target.x == null || target.y == null || target.z == null) {
    return;
  }
  const len = Math.hypot(target.x, target.y, target.z) || 1;
  const dx = target.x / len;
  const dy = target.y / len;
  const dz = target.z / len;
  const camPos = {
    x: dx * INTERIOR_CAMERA_R,
    y: dy * INTERIOR_CAMERA_R,
    z: dz * INTERIOR_CAMERA_R,
  };
  const lookAt = {
    x: dx * INTERIOR_LOOK_R,
    y: dy * INTERIOR_LOOK_R,
    z: dz * INTERIOR_LOOK_R,
  };
  fg.cameraPosition(camPos, lookAt, INTERIOR_FLY_MS);
}

type SphereFocusBundle = {
  centerId: string | null;
  neighborIds: Set<string>;
  edgeIds: Set<string>;
};

const ConstellationSphere3DInner = forwardRef<
  ConstellationSphere3DHandle,
  ConstellationSphere3DInnerProps
>(function ConstellationSphere3DInner(
  {
    data,
    selectedNodeId,
    spotlightDirect: _spotlightDirect,
    spotlightDirectEdges: _spotlightDirectEdges,
    matchedNodeIds,
    showLabels,
    clusterBy,
    onNodeClick,
    onNodeDoubleClick,
    onBackgroundClick,
  },
  ref,
) {
  const fgRef = useRef<Sphere3DInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  // Track click vs double-click without double-firing onClick.
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest props inside refs so heavy threeObject callbacks
  // (which the library captures by reference) read fresh state without
  // forcing the entire ForceGraph3D to re-mount.
  const selectedRef = useRef(selectedNodeId);
  const hoveredRef = useRef(hoveredNodeId);
  const matchedRef = useRef(matchedNodeIds);
  const showLabelsRef = useRef(showLabels);
  const focusBundleRef = useRef<SphereFocusBundle>({
    centerId: null,
    neighborIds: new Set(),
    edgeIds: new Set(),
  });
  const graphDataRef = useRef<SphereGraphData>({ nodes: [], links: [] });
  const autoSpinCleanupRef = useRef<(() => void) | null>(null);
  const orbitSpinSetupRef = useRef(false);
  const prevSelectedCameraRef = useRef<string | null>(null);
  /** Scene fill light — must not be torn down on canvas resize (caused visible flashes). */
  const hemisphereFillRef = useRef<THREE.HemisphereLight | null>(null);
  const rafResizeRef = useRef<number | null>(null);
  const pendingSizeRef = useRef<{ width: number; height: number } | null>(null);
  selectedRef.current = selectedNodeId;
  hoveredRef.current = hoveredNodeId;
  matchedRef.current = matchedNodeIds;
  showLabelsRef.current = showLabels;

  // Ensure sprite label visibility reacts immediately when the toolbar
  // toggle changes (some graph ticks can be sparse when the sim is off).
  useEffect(() => {
    try {
      fgRef.current?.refresh?.();
    } catch {
      /* noop */
    }
  }, [showLabels]);

  const { mode: graphSurfaceMode, t: graphThemeRow } = useGraphSurface();
  const graphShell = graphThemeRow.shell;
  const isGraphLight = graphSurfaceMode === "light";
  const isLgUp = useIsConstellationLgUp();

  // ── Build positions & cluster colors ────────────────────────────
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

  // ── Resolve node visuals: when clusterBy === "node_type", use the
  //    canonical NODE_COLORS palette (so 3D feels like 2D on type view).
  //    Otherwise, fall back to clusterColors so each cluster forms a
  //    cohesive region of color, like the reference image. ─────────
  const graphData: SphereGraphData = useMemo(() => {
    const nodes: SphereNode[] = data.nodes.map((n) => {
      const pos = positions.get(n.id);
      const clusterKey = pos?.clusterKey ?? "other";
      const useTypeColor = clusterBy === "node_type" || clusterBy === "none";
      const palette = useTypeColor
        ? resolveNodeVisuals(n.type, graphSurfaceMode)
        : (() => {
            const pc = clusterColors.get(clusterKey) ?? {
              core: "#94a3b8",
              glow: "rgba(148, 163, 184, 0.45)",
              ring: "rgba(203, 213, 225, 0.85)",
            };
            return graphSurfaceMode === "light"
              ? { ...pc, glow: adjustRgbaAlpha(pc.glow, 0.48) }
              : pc;
          })();

      const conn = n.connectionCount ?? 0;
      const radius = Math.min(
        NODE_MAX_RADIUS,
        NODE_BASE_RADIUS + Math.sqrt(conn + 1) * 0.9,
      );

      const x = pos?.x ?? 0;
      const y = pos?.y ?? 0;
      const z = pos?.z ?? 0;

      // The force engine is disabled below (cooldownTicks=0) so these
      // pre-positioned coords become the final coordinates.
      return {
        ...n,
        x,
        y,
        z,
        fx: x,
        fy: y,
        fz: z,
        __color: palette.core,
        __glow: palette.glow,
        __ring: palette.ring,
        __clusterKey: clusterKey,
        __radius: radius,
      };
    });

    // Filter out edges that point at nodes we don't have positions for
    // (defense in depth — buildConstellationData usually does this, but
    // the 3D mode should never crash on a stray dangling edge).
    const nodeIds = new Set(data.nodes.map((n) => n.id));
    const links = data.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        __originalEdge: e,
      }));

    return { nodes, links };
  }, [data.nodes, data.edges, positions, clusterColors, clusterBy, graphSurfaceMode]);

  const focusBundle = useMemo<SphereFocusBundle>(() => {
    const center =
      isLgUp && hoveredNodeId ? hoveredNodeId : (selectedNodeId ?? null);
    if (!center) {
      return { centerId: null, neighborIds: new Set(), edgeIds: new Set() };
    }
    const neighborIds = new Set<string>();
    const edgeIds = new Set<string>();
    for (const link of graphData.links) {
      const s =
        typeof link.source === "object"
          ? (link.source as SphereNode).id
          : String(link.source);
      const t =
        typeof link.target === "object"
          ? (link.target as SphereNode).id
          : String(link.target);
      if (s === center || t === center) {
        edgeIds.add(link.id);
        if (s === center && t !== center) neighborIds.add(t);
        if (t === center && s !== center) neighborIds.add(s);
      }
    }
    return { centerId: center, neighborIds, edgeIds };
  }, [isLgUp, hoveredNodeId, selectedNodeId, graphData.links]);

  focusBundleRef.current = focusBundle;
  graphDataRef.current = graphData;

  // Do NOT call fg.refresh() on hover/selection — it forces a heavy
  // internal redraw and reads as flicker during Orbit zoom/pan.
  // `nodePositionUpdate` already reads focusBundleRef + hover refs every frame.

  // ── Sprite cache, scoped to this component's lifetime ───────────
  const spriteCacheRef = useRef<SpriteCache>(new Map());
  // Keep a hard reference to every sprite material so we can dispose
  // them on unmount.
  const allMaterialsRef = useRef<THREE.Material[]>([]);
  const allTexturesRef = useRef<THREE.Texture[]>([]);

  const getGlowTexture = useCallback(
    (core: string, glow: string): THREE.Texture => {
      const glowEnd = graphShell.glowGradientEnd;
      const key = `${core}|${glow}|${glowEnd}`;
      const entry = spriteCacheRef.current.get(key);
      if (entry) return entry.glow;
      const tex = makeGlowTexture(core, glow, glowEnd);
      allTexturesRef.current.push(tex);
      spriteCacheRef.current.set(key, { glow: tex, label: new Map() });
      return tex;
    },
    [graphShell.glowGradientEnd],
  );

  const getLabelTexture = useCallback(
    (label: string, key: string): THREE.Texture => {
      const labelOpts = sphere3dLabelTextureOpts(graphSurfaceMode);
      const cacheKey = `__labels:${graphSurfaceMode}:${key}`;
      const entry =
        spriteCacheRef.current.get(cacheKey) ??
        (() => {
          const fresh = { glow: null as unknown as THREE.Texture, label: new Map() };
          spriteCacheRef.current.set(cacheKey, fresh);
          return fresh;
        })();
      const existing = entry.label.get(label);
      if (existing) return existing;
      const tex = makeLabelTexture(label, labelOpts);
      allTexturesRef.current.push(tex);
      entry.label.set(label, tex);
      return tex;
    },
    [graphSurfaceMode],
  );

  // Theme switch: sprite textures embed colors — rebuild cache so glows
  // and labels match the new surface mode immediately.
  useEffect(() => {
    const fg = fgRef.current;
    for (const [, v] of spriteCacheRef.current) {
      try {
        v.glow?.dispose();
      } catch {
        /* noop */
      }
      for (const lt of v.label.values()) {
        try {
          lt.dispose();
        } catch {
          /* noop */
        }
      }
    }
    spriteCacheRef.current.clear();
    try {
      fg?.refresh?.();
    } catch {
      /* noop */
    }
  }, [graphSurfaceMode]);
  // ── Dispose textures + sprite materials on unmount ──────────────
  // Snapshot refs into local consts at effect-setup time so the cleanup
  // function never sees a "this ref might have moved" warning. The refs
  // accumulate over the component's lifetime, so the snapshot captures
  // the same arrays that the cleanup will then walk.
  useEffect(() => {
    const textures = allTexturesRef.current;
    const materials = allMaterialsRef.current;
    const spriteCache = spriteCacheRef.current;
    const fgInstance = fgRef;
    return () => {
      try {
        autoSpinCleanupRef.current?.();
      } catch {
        /* noop */
      }
      autoSpinCleanupRef.current = null;
      for (const t of textures) t.dispose();
      for (const m of materials) m.dispose();
      spriteCache.clear();

      try {
        const fg = fgInstance.current;
        const fill = hemisphereFillRef.current;
        if (fg && fill) {
          const scene = fg.scene();
          scene.remove(fill);
          fill.dispose();
          hemisphereFillRef.current = null;
        }
      } catch {
        /* noop */
      }

      // Force the WebGL context loss when the renderer hasn't been
      // unmounted yet (Next.js fast refresh path).
      const fg = fgInstance.current;
      if (fg) {
        try {
          const renderer = fg.renderer();
          renderer?.forceContextLoss?.();
          renderer?.dispose?.();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  // ── Resize observer (the canvas needs explicit width/height) ─────
  // Batch to one setState per animation frame and ignore 1px jitter so
  // pinch-zoom / split-pane drags do not thrash React + WebGL resize.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const flushResize = () => {
      rafResizeRef.current = null;
      const pending = pendingSizeRef.current;
      pendingSizeRef.current = null;
      if (!pending || pending.width <= 0 || pending.height <= 0) return;
      setSize((prev) => {
        if (
          Math.abs(prev.width - pending.width) < 2 &&
          Math.abs(prev.height - pending.height) < 2
        ) {
          return prev;
        }
        return pending;
      });
    };

    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          pendingSizeRef.current = { width, height };
          if (rafResizeRef.current == null) {
            rafResizeRef.current = requestAnimationFrame(flushResize);
          }
        }
      }
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (rafResizeRef.current != null) {
        cancelAnimationFrame(rafResizeRef.current);
        rafResizeRef.current = null;
      }
    };
  }, []);

  // ── Pause animation when not visible (perf guard) ────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        const fg = fgRef.current;
        if (!fg) return;
        for (const e of entries) {
          if (e.isIntersecting) fg.resumeAnimation();
          else fg.pauseAnimation();
        }
      },
      { threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleEngineStop = useCallback(() => {
    const fg = fgRef.current;
    if (!fg || orbitSpinSetupRef.current) return;
    tunePerspectiveCamera(fg.camera());
    const ctrl = fg.controls() as unknown as {
      addEventListener: (type: string, listener: () => void) => void;
      removeEventListener: (type: string, listener: () => void) => void;
      autoRotate: boolean;
      autoRotateSpeed: number;
      enableDamping: boolean;
      dampingFactor: number;
      minDistance?: number;
      maxDistance?: number;
      zoomSpeed?: number;
    };
    if (typeof ctrl?.addEventListener !== "function") return;
    orbitSpinSetupRef.current = true;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const clearIdle = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    };
    const scheduleResume = () => {
      clearIdle();
      idleTimer = setTimeout(() => {
        ctrl.autoRotate = true;
        idleTimer = null;
      }, AUTO_ROTATE_RESUME_MS);
    };
    const onInteractStart = () => {
      ctrl.autoRotate = false;
      clearIdle();
    };
    const onInteractEnd = () => {
      scheduleResume();
    };
    ctrl.autoRotate = true;
    ctrl.autoRotateSpeed = AUTO_ROTATE_SPEED;
    ctrl.enableDamping = true;
    // Slightly higher damping smooths wheel / trackpad zoom in fewer frames.
    ctrl.dampingFactor = 0.085;
    // Cap dolly range + lower zoom speed so fast trackpad / pinch bursts
    // don't slam the camera through clipping bands or thrash materials.
    ctrl.minDistance = SPHERE_RADIUS * 0.52;
    ctrl.maxDistance = SPHERE_RADIUS * 14;
    ctrl.zoomSpeed = 0.62;
    const rend = fg.renderer();
    if (rend && typeof rend.setPixelRatio === "function") {
      rend.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 1.5));
    }
    ctrl.addEventListener("start", onInteractStart);
    ctrl.addEventListener("end", onInteractEnd);
    autoSpinCleanupRef.current = () => {
      ctrl.removeEventListener("start", onInteractStart);
      ctrl.removeEventListener("end", onInteractEnd);
      clearIdle();
      ctrl.autoRotate = false;
      orbitSpinSetupRef.current = false;
    };
  }, []);

  // ── Imperative handle ───────────────────────────────────────────
  useImperativeHandle(
    ref,
    () => ({
      fitGraph: () => {
        const fg = fgRef.current;
        if (!fg) return;
        tunePerspectiveCamera(fg.camera());
        fg.zoomToFit(700, 120);
      },
      resetLayout: () => {
        const fg = fgRef.current;
        if (!fg) return;
        tunePerspectiveCamera(fg.camera());
        // "Reset Sphere" = put the camera back at the canonical view and
        // re-fit. We don't rebuild positions because they're a pure
        // function of (data, clusterBy) — already deterministic.
        fg.cameraPosition(
          { x: 0, y: 0, z: CAMERA_DISTANCE },
          { x: 0, y: 0, z: 0 },
          900,
        );
        // Slight delay so the camera move can start before the fit
        // animation kicks in.
        window.setTimeout(() => {
          fg.zoomToFit(700, 120);
        }, 300);
      },
      focusNode: (nodeId: string) => {
        const fg = fgRef.current;
        if (!fg) return;
        tunePerspectiveCamera(fg.camera());
        const target = graphDataRef.current.nodes.find((n) => n.id === nodeId);
        if (!target || target.x == null || target.y == null || target.z == null) {
          return;
        }
        // Toolbar / search: orbit the shell from outside — not the click fly-in.
        const len = Math.hypot(target.x, target.y, target.z) || 1;
        const dist = SPHERE_RADIUS * 1.55;
        fg.cameraPosition(
          {
            x: (target.x / len) * (SPHERE_RADIUS + dist),
            y: (target.y / len) * (SPHERE_RADIUS + dist),
            z: (target.z / len) * (SPHERE_RADIUS + dist),
          },
          { x: 0, y: 0, z: 0 },
          900,
        );
      },
    }),
    [],
  );

  // ── Exit locked selection: glide back to the wide-field globe view ─
  useEffect(() => {
    const fg = fgRef.current;
    const prev = prevSelectedCameraRef.current;
    prevSelectedCameraRef.current = selectedNodeId;
    if (!fg) return;
    if (prev != null && selectedNodeId == null) {
      tunePerspectiveCamera(fg.camera());
      fg.cameraPosition(
        { x: 0, y: 0, z: CAMERA_DISTANCE },
        { x: 0, y: 0, z: 0 },
        1150,
      );
      window.setTimeout(() => {
        fg.zoomToFit(820, 120);
      }, 260);
    }
  }, [selectedNodeId]);

  // ── Hemisphere fill light (theme only — never tie to canvas size) ─
  // Previously this effect depended on `size`; ResizeObserver updates
  // during zoom/gestures removed and re-added the light every frame → flash.
  useEffect(() => {
    let cancelled = false;
    let raf = 0;

    const applyFill = () => {
      const fg = fgRef.current;
      if (!fg || cancelled) return;
      const scene = fg.scene();
      if (!scene) return;

      if (hemisphereFillRef.current) {
        scene.remove(hemisphereFillRef.current);
        hemisphereFillRef.current.dispose();
        hemisphereFillRef.current = null;
      }

      const top = isGraphLight ? 0xffffff : 0xb6c2ff;
      const bottom = isGraphLight ? 0xe4e9f2 : 0x10142a;
      const intensity = isGraphLight ? 0.42 : 0.55;
      const fill = new THREE.HemisphereLight(top, bottom, intensity);
      fill.position.set(0, 1, 0);
      scene.add(fill);
      hemisphereFillRef.current = fill;
    };

    const waitForScene = () => {
      if (cancelled) return;
      const fg = fgRef.current;
      if (!fg?.scene()) {
        raf = requestAnimationFrame(waitForScene);
        return;
      }
      applyFill();
    };

    raf = requestAnimationFrame(waitForScene);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      const fg = fgRef.current;
      const fill = hemisphereFillRef.current;
      if (fg && fill) {
        try {
          fg.scene().remove(fill);
          fill.dispose();
        } catch {
          /* noop */
        }
        hemisphereFillRef.current = null;
      }
    };
  }, [isGraphLight]);

  // ── Sprite builder: each call must produce a *new* material so the
  //    library doesn't accidentally share opacity across nodes. ─────
  const nodeThreeObject = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw: any) => {
      const node = raw as SphereGraphData["nodes"][number];

      // Group: glow sprite (always), label sprite (conditional, swapped
      // every frame inside `nodePositionUpdate` would be too expensive,
      // so we attach the label as a child sprite and toggle visibility
      // from the per-frame update hook).
      const group = new THREE.Group();
      group.name = "sphereNode";
      // Tag with the underlying node id so click handlers can find it.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (group as any).__nodeId = node.id;

      // Glow sprite.
      const tex = getGlowTexture(node.__color, node.__glow);
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: isGraphLight ? 0.78 : 0.92,
        depthWrite: false,
        // Stable draw order while dollying the camera — default depthTest
        // caused transparency sort “pops” on dense globe nodes.
        depthTest: false,
        blending: isGraphLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      });
      allMaterialsRef.current.push(mat);
      const sprite = new THREE.Sprite(mat);
      const baseScale = (node.__radius ?? NODE_BASE_RADIUS) * 4.2;
      sprite.scale.set(baseScale, baseScale, 1);
      sprite.name = "glow";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sprite as any).__baseScale = baseScale;
      group.add(sprite);

      // Label sprite — created lazily on first show. We always create it
      // here so toggling visibility is cheap; cost is one extra texture
      // slot per node, but textures are cached by label string.
      const labelTex = getLabelTexture(
        node.label || node.id,
        `${node.__color}::${node.label ?? node.id}`,
      );
      const labelMat = new THREE.SpriteMaterial({
        map: labelTex,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        depthTest: false,
      });
      allMaterialsRef.current.push(labelMat);
      const labelSprite = new THREE.Sprite(labelMat);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lw = (labelTex as any).__w as number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lh = (labelTex as any).__h as number;
      const labelScale = 0.85;
      labelSprite.scale.set(lw * labelScale, lh * labelScale, 1);
      labelSprite.position.set(0, baseScale * 0.85 + 6, 0);
      labelSprite.visible = false;
      labelSprite.name = "label";
      group.add(labelSprite);

      return group;
    },
    [getGlowTexture, getLabelTexture, isGraphLight],
  );

  // ── Per-frame visual state (selection / hover / dim / labels) ────
  // We use `nodePositionUpdate` because it runs after each engine tick
  // *and* on every render frame, but we early-return so we never touch
  // positions (those are fixed by fx/fy/fz). This is just a hook to
  // mutate sprite opacity / scale when the selection state changes —
  // far cheaper than swapping Object3Ds via React re-renders.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodePositionUpdate = useCallback((obj: any, _coords: unknown, raw: any) => {
    const node = raw as SphereGraphData["nodes"][number];
    const group = obj as THREE.Group;
    if (!group || !node) return false;

    const selectedId = selectedRef.current;
    const hoveredId = hoveredRef.current;
    const matched = matchedRef.current;
    const wantLabels = showLabelsRef.current;
    const fb = focusBundleRef.current;
    const focusCenter = fb.centerId;
    const hasFocus = focusCenter != null;
    const isFocusCenter = focusCenter === node.id;
    const isFocusNeighbor = fb.neighborIds.has(node.id);
    const inFocusCluster = isFocusCenter || isFocusNeighbor;

    const isSelected = selectedId != null && selectedId === node.id;
    const isHovered = hoveredId != null && hoveredId === node.id;
    const isMatched = !!matched && matched.size > 0 && matched.has(node.id);

    const depth = cameraDepthFactor(node, fgRef.current?.camera());
    const depthOpacity = 0.28 + depth * 0.72;
    const depthScale = 0.76 + depth * 0.32;

    const glow = group.getObjectByName("glow") as THREE.Sprite | null;
    if (glow && glow.material) {
      const mat = glow.material as THREE.SpriteMaterial;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseScale = ((glow as any).__baseScale as number) ?? 12;

      let opacity = 0.92 * depthOpacity;
      let scaleMul = depthScale;

      if (hasFocus) {
        if (isFocusCenter) {
          opacity = 1;
          scaleMul = 1.58 * Math.max(0.9, depthScale);
        } else if (isFocusNeighbor) {
          opacity = 0.84 + depth * 0.16;
          scaleMul = 1.22 * depthScale;
        } else {
          opacity = 0.07 + depth * 0.12;
          scaleMul = 0.8 * depthScale;
        }
      } else if (isHovered) {
        opacity = 1;
        scaleMul = 1.22 * Math.max(0.9, depthScale);
      } else if (isMatched) {
        opacity = 1;
        scaleMul = 1.1 * Math.max(0.9, depthScale);
      }

      if (Math.abs(mat.opacity - opacity) > OPACITY_UPDATE_EPS) {
        mat.opacity = opacity;
      }
      const target = baseScale * scaleMul;
      if (Math.abs(glow.scale.x - target) > SCALE_UPDATE_EPS) {
        glow.scale.set(target, target, 1);
      }
    }

    const label = group.getObjectByName("label") as THREE.Sprite | null;
    if (label) {
      // Hysteresis on depth-gated labels: avoids mount/unmount flicker when
      // the camera dolly oscillates around a single threshold.
      type LabelDepthUd = { labelDepthGateOn?: boolean };
      const lud = (label.userData ?? {}) as LabelDepthUd;
      if (lud.labelDepthGateOn === undefined) {
        lud.labelDepthGateOn = depth > 0.37;
      } else if (lud.labelDepthGateOn && depth < 0.30) {
        lud.labelDepthGateOn = false;
      } else if (!lud.labelDepthGateOn && depth > 0.48) {
        lud.labelDepthGateOn = true;
      }
      label.userData = lud;
      const inFront = !!lud.labelDepthGateOn;
      const showLabel =
        wantLabels &&
        (inFront ||
          isSelected ||
          isHovered ||
          (hasFocus && inFocusCluster) ||
          (isMatched && !hasFocus));
      if (label.visible !== showLabel) label.visible = showLabel;
      if (label.material) {
        const mat = label.material as THREE.SpriteMaterial;
        const targetOpacity =
          isFocusCenter || isSelected || isHovered ? 1 : 0.9;
        if (Math.abs(mat.opacity - targetOpacity) > OPACITY_UPDATE_EPS) {
          mat.opacity = targetOpacity;
        }
      }
    }

    // Returning false tells the library "I didn't move the node, keep
    // updating positions yourself". Since we have fx/fy/fz this is a
    // no-op anyway.
    return false;
  }, []);

  // ── Edge color & opacity accessors ──────────────────────────────
  const linkColor = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw: any) => {
      const link = raw as SphereGraphData["links"][number];
      const fb = focusBundleRef.current;
      const hasFocus = fb.centerId != null;
      const depth = linkDepthFactor(link, fgRef.current?.camera());
      if (hasFocus && fb.edgeIds.has(link.id)) {
        const o = Math.min(1, 0.52 + depth * 0.42);
        return resolveEdgeColorRgba(
          link.__originalEdge.type,
          isGraphLight ? Math.min(1, o * 1.05) : o,
          graphSurfaceMode,
        );
      }
      if (hasFocus) return rgbaEdgeMuted(0.04 + depth * 0.08, isGraphLight);
      return rgbaEdgeMuted(0.1 + depth * 0.24, isGraphLight);
    },
    [graphSurfaceMode, isGraphLight],
  );
  const linkWidth = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw: any) => {
      const link = raw as SphereGraphData["links"][number];
      const fb = focusBundleRef.current;
      if (fb.centerId != null && fb.edgeIds.has(link.id)) return 2.35;
      return 0.88;
    },
    [],
  );

  // ── Tooltip content (HTML-as-string is fine here) ────────────────
  const nodeLabel = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw: any): string => {
      const node = raw as SphereGraphData["nodes"][number];
      const shell = sphere3dLabelTextureOpts(graphSurfaceMode);
      const titleColor = shell.color;
      const metaColor = isGraphLight ? "#64748b" : "#94a3b8";
      const tagColor = isGraphLight ? "#475569" : "#cbd5e1";
      const lines: string[] = [];
      lines.push(
        `<div style="font: 500 13px InterVariable, Inter, system-ui; color:${titleColor};">${escapeHtml(
          node.label ?? "Untitled",
        )}</div>`,
      );
      const meta: string[] = [];
      meta.push(node.type);
      if (node.category) meta.push(node.category);
      if (node.collectionName) meta.push(node.collectionName);
      if (typeof node.connectionCount === "number") {
        meta.push(`${node.connectionCount} link${node.connectionCount === 1 ? "" : "s"}`);
      }
      if (meta.length) {
        lines.push(
          `<div style="font: 500 11px InterVariable, Inter, system-ui; color:${metaColor}; margin-top:2px;">${meta
            .map(escapeHtml)
            .join(" · ")}</div>`,
        );
      }
      if (node.tags && node.tags.length) {
        lines.push(
          `<div style="font: 400 11px InterVariable, Inter, system-ui; color:${tagColor}; margin-top:4px;">${node.tags
            .slice(0, 4)
            .map(escapeHtml)
            .join(" · ")}</div>`,
        );
      }
      const shadow = isGraphLight
        ? "0 12px 28px -12px rgba(15,23,42,0.12)"
        : "0 12px 30px -12px rgba(0,0,0,0.7)";
      return `<div style="padding:8px 10px; border-radius:8px; background:${shell.background}; border:1px solid ${shell.border}; box-shadow:${shadow};">${lines.join(
        "",
      )}</div>`;
    },
    [graphSurfaceMode, isGraphLight],
  );

  // ── Click (tap) vs double-click — react-force-graph-3d delivers
  //    onNodeClick on every click, so we debounce to detect a true
  //    double-click at 280ms. ─────────────────────────────────────
  const handleNodeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw: any) => {
      const node = raw as ConstellationNode;
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        onNodeDoubleClick(node);
        return;
      }
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        onNodeClick(node);
        const fg = fgRef.current;
        if (fg) {
          flyCameraToNodeInterior(fg, graphDataRef.current.nodes, node.id);
        }
      }, 240);
    },
    [onNodeClick, onNodeDoubleClick],
  );

  // ── Pointer hover updates local state ────────────────────────────
  const handleNodeHover = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw: any | null) => {
      setHoveredNodeId(raw ? (raw as ConstellationNode).id : null);
      if (containerRef.current) {
        containerRef.current.style.cursor = raw ? "pointer" : "default";
      }
    },
    [],
  );

  // ── First-render camera framing ──────────────────────────────────
  useEffect(() => {
    const id = window.setTimeout(() => {
      const fg = fgRef.current;
      if (!fg) return;
      tunePerspectiveCamera(fg.camera());
      fg.cameraPosition(
        { x: 0, y: 0, z: CAMERA_DISTANCE },
        { x: 0, y: 0, z: 0 },
        0,
      );
      fg.zoomToFit(700, 120);
    }, 60);
    return () => window.clearTimeout(id);
  }, [graphData.nodes.length]);

  const showPerfWarning =
    graphData.nodes.length >= PERFORMANCE_WARNING_THRESHOLD;

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        // Forward "background" clicks. The 3D library already calls
        // onBackgroundClick for us, but we also need to deselect when
        // the user taps the wrapping div (e.g. on tablets where the
        // library's hit testing can be flaky).
        if (e.target === containerRef.current) onBackgroundClick();
      }}
      className="relative h-full w-full"
      style={{
        background: graphShell.sphere3dBackdropCss,
        touchAction: "none",
        overscrollBehavior: "none",
      }}
    >
      {showPerfWarning && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-medium text-amber-200/95 shadow-[0_8px_24px_-12px_rgba(251,191,36,0.35)] backdrop-blur-sm">
          Large graph — try filtering for a smoother 3D experience.
        </div>
      )}
      {/* The library's `onBackgroundClick` fires on a true empty-space
          click (no node hit). We use that as the canonical "deselect" */}
      <ForceGraph3D
        ref={fgRef as unknown as React.RefObject<unknown>}
        width={size.width}
        height={size.height}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        showNavInfo={false}
        rendererConfig={{
          antialias: true,
          alpha: true,
          logarithmicDepthBuffer: true,
        }}
        // Engine: nodes are pre-positioned (fx/fy/fz). cooldownTicks=0
        // disables the simulation entirely so the layout never drifts.
        cooldownTicks={0}
        d3AlphaMin={1}
        warmupTicks={0}
        // Visuals
        nodeLabel={nodeLabel}
        nodeThreeObject={nodeThreeObject}
        nodePositionUpdate={nodePositionUpdate}
        nodeRelSize={1}
        nodeOpacity={1}
        // Edges
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={0.52}
        linkResolution={4}
        linkDirectionalParticles={0}
        controlType="orbit"
        onEngineStop={handleEngineStop}
        // Interaction
        enableNodeDrag={false}
        enableNavigationControls={true}
        showPointerCursor={true}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={onBackgroundClick}
      />
    </div>
  );
});

export default ConstellationSphere3DInner;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
