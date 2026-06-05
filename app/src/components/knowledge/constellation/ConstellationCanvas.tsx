"use client";

import dynamic from "next/dynamic";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { forceCollide, forceManyBody } from "d3-force";
import {
  EDGE_STYLE,
  NODE_BASE_SIZE,
  NODE_SIZE_SCALE,
} from "@/lib/knowledge/constellation/constants";
import {
  resolveEdgeColorRgba,
  resolveNodeVisuals,
} from "@/lib/knowledge/constellation/graphThemeTokens";
import {
  isStrongNeuralEdgeType,
  linkEndpointIds,
  linkEndpointNodes,
  selectNeuralAnimatedEdgeIds,
  type NeuralAnimationLink,
} from "@/lib/knowledge/constellation/neuralAnimation";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import { computeLocalSubgraphRingLayout } from "@/lib/knowledge/constellation/computeLocalSubgraphRingLayout";
import { isLocalOrbitMajorHub } from "@/lib/knowledge/constellation/readableLocalSubgraph";
import { truncateLabelForLocalOrbitCanvas } from "@/lib/knowledge/constellation/computeLocalOrbitState";
import type {
  ConstellationDepth,
  ConstellationEdge,
  ConstellationEdgeType,
  ConstellationGraphData,
  ConstellationNode,
  ConstellationNodeType,
} from "@/types/constellation";

/**
 * Constellation 2D canvas — Obsidian-inspired second-brain renderer.
 *
 * Three things make this canvas different from a vanilla force-graph:
 *
 *   1. Per-node-type force tuning (charge / link distance / collide).
 *      Categories and projects act as "anchor" gravity wells; tags get
 *      shorter links so they cluster near their host knowledge nodes.
 *      A collide force prevents the "everything bunched in the centre"
 *      problem from the previous build.
 *
 *   2. Two-pass canvas rendering. The first pass paints nodes (glow +
 *      core + ring). A separate label pass runs *after* the simulation
 *      tick so we have authoritative screen coordinates and can perform
 *      screen-space label collision detection with a priority queue.
 *
 *   3. Spotlight Mode (Obsidian local-graph feel). When a node is
 *      selected, direct neighbours stay vivid, secondary neighbours get
 *      a softer presence, and the rest of the graph fades into the
 *      background — without an expensive CSS blur.
 */

type ForceFn = {
  strength?: (s: number | ((d: unknown) => number)) => unknown;
  distance?: (n: number | ((d: unknown) => number)) => unknown;
};

export type ForceGraphInstance = {
  centerAt: (x?: number, y?: number, ms?: number) => void;
  zoom: (k?: number, ms?: number) => void;
  zoomToFit: (ms?: number, padding?: number) => void;
  graph2ScreenCoords?: (x: number, y: number) => { x: number; y: number };
  d3Force: (name: string, force?: unknown) => ForceFn | undefined;
  d3ReheatSimulation: () => void;
  pauseAnimation?: () => void;
  resumeAnimation?: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic(() => import("react-force-graph-2d") as any, {
  ssr: false,
}) as unknown as React.ComponentType<Record<string, unknown>>;

type SimNode = ConstellationNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};
type SimLink = Omit<ConstellationEdge, "source" | "target"> & {
  source: SimNode | string;
  target: SimNode | string;
};

type WorldBox = { x1: number; y1: number; x2: number; y2: number };
export type ConstellationRenderQuality = "full" | "interaction";

const NEW_NODE_SPARK_MS = 1800;
const SEARCH_MATCH_GLOW_MS = 1500;
const INTERACTION_QUALITY_MS = 260;
const DENSE_GRAPH_NODE_COUNT = 320;
const DENSE_GRAPH_EDGE_COUNT = 850;
const VERY_DENSE_GRAPH_NODE_COUNT = 460;
const VERY_DENSE_GRAPH_EDGE_COUNT = 1200;
const DENSE_GRAPH_ANIMATED_EDGE_BUDGET = 140;
const VERY_DENSE_GRAPH_ANIMATED_EDGE_BUDGET = 120;

function hashStringUnit(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function quadraticPoint(
  sx: number,
  sy: number,
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  t: number,
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * sx + 2 * mt * t * cx + t * t * tx,
    y: mt * mt * sy + 2 * mt * t * cy + t * t * ty,
  };
}

function strokeQuadraticSegment(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  from: number,
  to: number,
): void {
  const steps = 9;
  const start = quadraticPoint(sx, sy, cx, cy, tx, ty, from);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i <= steps; i++) {
    const t = from + ((to - from) * i) / steps;
    const p = quadraticPoint(sx, sy, cx, cy, tx, ty, t);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}

/** When set, node/edge styling, labels, camera, and layout follow BFS depth (local graph). */
export type LocalSubgraphCanvasMeta = {
  nodeDepthMap: ReadonlyMap<string, number>;
  edgeDepthMap: ReadonlyMap<string, number>;
  parentIdMap: ReadonlyMap<string, string | null>;
  /** Matches the orbit depth control — label policy and ring radii depend on this. */
  viewDepth: ConstellationDepth;
};

export interface ConstellationCanvasHandle {
  fitGraph: () => void;
  resetLayout: () => void;
  focusNode: (nodeId: string) => void;
  /** Current camera zoom factor (k). 1.0 = "100%". */
  getCurrentZoom: () => number;
  /** Multiply current zoom by `factor` (e.g. 1.2 to zoom in 20%). */
  zoomBy: (factor: number, durationMs?: number) => void;
  /** Jump back to 100% zoom. */
  zoomTo100: (durationMs?: number) => void;
}

interface ConstellationCanvasProps {
  data: ConstellationGraphData;
  selectedNodeId: string | null;
  spotlightDirect: Set<string> | null;
  spotlightSecondary: Set<string> | null;
  spotlightDirectEdges: Set<string> | null;
  isExplodedFocusLayout: boolean;
  matchedNodeIds: Set<string>;
  showLabels: boolean;
  onNodeHover: (node: ConstellationNode | null) => void;
  onNodeClick: (node: ConstellationNode) => void;
  onNodeDoubleClick: (node: ConstellationNode) => void;
  onBackgroundClick: () => void;
  /**
   * Depth-aware local subgraph (center = 0, neighbors = 1, …).
   * Must stay in sync with `data` — same nodes/edges the parent computed for local mode.
   */
  localSubgraphMeta?: LocalSubgraphCanvasMeta | null;
  /** Optional pre-render hook — drawn before nodes. Used by BrainCanvas for brain silhouette. */
  onRenderFramePre?: (
    ctx: CanvasRenderingContext2D,
    globalScale: number,
    quality: ConstellationRenderQuality,
  ) => void;
  /**
   * Optional callback to install extra D3 forces after the force-graph instance
   * is ready. Called every time graphData changes. Used by BrainCanvas to
   * install the brain-attractor force that holds the neural shape.
   */
  extraForcesSetup?: (fg: ForceGraphInstance) => void;
  /** Override default warmupTicks (default: 30). Set 0 to preserve pre-positioned layout. */
  warmupTicks?: number;
  /** Override default cooldownTicks (default: 140). Set lower for pre-positioned layout. */
  cooldownTicks?: number;
  /** Override D3 alpha decay (default: 0.022). Higher = faster simulation cooldown. */
  d3AlphaDecay?: number;
  /** Override D3 velocity decay (default: 0.32). */
  d3VelocityDecay?: number;
  /**
   * Fired whenever the camera zoom changes (mouse wheel, programmatic
   * zoom, fit-to-view). The shared zoom controls subscribe to this so
   * the percentage display stays in sync with the canvas.
   */
  onZoomChange?: (zoom: number) => void;
}

function nodeRadius(node: ConstellationNode): number {
  const base = NODE_BASE_SIZE[node.type] ?? 5;
  const conn = node.connectionCount ?? 0;
  return base + Math.sqrt(conn + 1) * NODE_SIZE_SCALE;
}

function visualLabel(label: string): string {
  return label.length > 34 ? `${label.slice(0, 33)}…` : label;
}

function estimatedLabelSize(node: ConstellationNode): { width: number; height: number } {
  const text = visualLabel(node.label);
  return {
    width: Math.min(280, Math.max(92, text.length * 7.4 + 28)),
    height: node.type === "knowledge" ? 30 : 26,
  };
}

function nodeLabelBounds(node: SimNode, x: number, y: number): WorldBox {
  const { width, height } = estimatedLabelSize(node);
  const top = y + nodeRadius(node) + 8;
  return {
    x1: x - width / 2 - 12,
    x2: x + width / 2 + 12,
    y1: top - 6,
    y2: top + height + 6,
  };
}

function nodeBounds(node: SimNode, x: number, y: number): WorldBox {
  const pad = nodeRadius(node) + 40;
  return {
    x1: x - pad,
    x2: x + pad,
    y1: y - pad,
    y2: y + pad,
  };
}

function mergeBoxes(boxes: WorldBox[]): WorldBox | null {
  if (boxes.length === 0) return null;
  return {
    x1: Math.min(...boxes.map((b) => b.x1)),
    y1: Math.min(...boxes.map((b) => b.y1)),
    x2: Math.max(...boxes.map((b) => b.x2)),
    y2: Math.max(...boxes.map((b) => b.y2)),
  };
}

/** Per-type charge — categories/projects pull their cluster outward. */
function chargeStrength(node: SimNode): number {
  const conn = node.connectionCount ?? 0;
  switch (node.type) {
    case "category":
      return -560;
    case "project":
      return -480;
    case "library" as never:
    case "collection":
      return -360;
    case "tag":
      return conn > 6 ? -200 : -120;
    case "person":
    case "organization":
    case "concept":
      return -200;
    default:
      // Knowledge nodes scale modestly by degree so hubs spread their
      // children but don't pull the entire graph into one ball.
      if (conn > 20) return -340;
      if (conn > 10) return -260;
      return -180;
  }
}

/** Per-type collide radius — adds breathing room beyond the visual disc. */
function collideRadius(node: SimNode): number {
  const r = nodeRadius(node);
  switch (node.type) {
    case "category":
      return r + 24;
    case "project":
    case "collection":
      return r + 18;
    case "tag":
      return r + 10;
    default:
      return r + 12;
  }
}

/** Per-edge-type link distance — categories ride further out than tags. */
function linkDistance(link: SimLink): number {
  switch (link.type) {
    case "category_reference":
      return 190;
    case "project_reference":
      return 170;
    case "same_collection":
      return 150;
    case "shared_tag":
      return 95;
    case "manual_link":
    case "explicit_link":
      return 85;
    case "ai_suggested_link":
      return 110;
    case "semantic_similarity":
      return 130;
    case "same_source":
      return 130;
    default:
      return 120;
  }
}

function linkStrength(link: SimLink): number {
  // Manual / explicit links bind tightly; ambient relations stay soft so
  // they don't tug the layout into a hairball.
  switch (link.type) {
    case "manual_link":
    case "explicit_link":
      return 0.6;
    case "category_reference":
      return 0.35;
    case "project_reference":
      return 0.3;
    case "same_collection":
      return 0.22;
    case "shared_tag":
      return 0.12;
    case "ai_suggested_link":
      return 0.18;
    case "semantic_similarity":
      return 0.1;
    default:
      return 0.18;
  }
}

/** Label priority used for the screen-space collision pass. Higher wins. */
function labelPriority(args: {
  node: SimNode;
  isSelected: boolean;
  isHovered: boolean;
  isMatched: boolean;
  isDirect: boolean;
  isSecondary: boolean;
  /** BFS depth in local orbit mode — boosts readable ordering */
  graphDepth?: number;
}): number {
  const { node, isSelected, isHovered, isMatched, isDirect, isSecondary, graphDepth } =
    args;
  if (isSelected) return 10000;
  if (isHovered) return 9000;
  if (isMatched) return 8500;
  if (isDirect) return 8000;
  if (graphDepth === 1) return 7800;
  if (graphDepth === 2) return 6200;
  if (graphDepth === 3) return 4500;
  // Anchor types are always more important than knowledge for Global view
  // so the user can read cluster structure even when zoomed out.
  if (node.type === "category") return 7000 + (node.connectionCount ?? 0);
  if (node.type === "project") return 6800 + (node.connectionCount ?? 0);
  if (node.type === "collection") return 6500 + (node.connectionCount ?? 0);
  if (isSecondary) return 5800;
  if (node.type === "tag") return 4000 + (node.connectionCount ?? 0);
  return 1000 + (node.connectionCount ?? 0);
}

function localOrbitLabelShouldShow(
  node: SimNode,
  nodeDepth: number | undefined,
  orbitViewDepth: ConstellationDepth,
  isSelected: boolean,
  isHovered: boolean,
): boolean {
  if (nodeDepth === undefined) return isSelected || isHovered;
  if (nodeDepth === 0 || nodeDepth === 1) return true;
  if (orbitViewDepth === 1) return isSelected || isHovered;
  if (orbitViewDepth === 2) {
    return (
      isSelected ||
      isHovered ||
      (nodeDepth === 2 && isLocalOrbitMajorHub(node))
    );
  }
  return (
    isSelected ||
    isHovered ||
    (nodeDepth >= 2 && isLocalOrbitMajorHub(node))
  );
}

export const ConstellationCanvas = forwardRef<
  ConstellationCanvasHandle,
  ConstellationCanvasProps
>(function ConstellationCanvas(
  {
    data,
    selectedNodeId,
    spotlightDirect,
    spotlightSecondary,
    spotlightDirectEdges,
    isExplodedFocusLayout,
    matchedNodeIds,
    showLabels,
    onNodeHover,
    onNodeClick,
    onNodeDoubleClick,
    onBackgroundClick,
    localSubgraphMeta = null,
    onRenderFramePre,
    extraForcesSetup,
    warmupTicks: warmupTicksProp,
    cooldownTicks: cooldownTicksProp,
    d3AlphaDecay: d3AlphaDecayProp,
    d3VelocityDecay: d3VelocityDecayProp,
    onZoomChange,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraphInstance | null>(null);
  const didInitialFitRef = useRef(false);
  const manualNodePositionsRef = useRef<
    Map<string, { x: number; y: number; fx?: number | null; fy?: number | null }>
  >(new Map());
  const explodedPositionIdsRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number | null>(null);
  const frameNowRef = useRef(0);
  const interactionUntilRef = useRef(0);
  const interactionQualityRef = useRef(false);
  const denseGraphRef = useRef(false);
  const veryDenseGraphRef = useRef(false);
  const zoomNotifyRafRef = useRef<number | null>(null);
  const pendingZoomNotifyRef = useRef<number | null>(null);
  const forceZoomNotifyRef = useRef(false);
  const lastNotifiedZoomRef = useRef(1);
  const previousNodeIdsRef = useRef<Set<string>>(new Set());
  const newNodeSparkRef = useRef<Map<string, number>>(new Map());
  const matchGlowRef = useRef<Map<string, number>>(new Map());
  const [size, setSize] = useState<{ w: number; h: number }>({
    w: 600,
    h: 400,
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const localDepthPinnedIdsRef = useRef<Set<string>>(new Set());

  const { mode: graphSurfaceMode, t: graphThemeRow } = useGraphSurface();
  const graphShell = graphThemeRow.shell;
  const isGraphLight = graphSurfaceMode === "light";

  const fitWorldBoxToViewport = useCallback(
    (
      bounds: WorldBox,
      opts?: { padding?: number; maxZoom?: number; minZoom?: number; duration?: number },
    ) => {
      const fg = graphRef.current;
      if (!fg || size.w <= 0 || size.h <= 0) return;

      const responsivePadding =
        opts?.padding ??
        (size.w < 640 || size.h < 520 ? 44 : size.w < 980 ? 80 : 120);
      const width = Math.max(1, bounds.x2 - bounds.x1);
      const height = Math.max(1, bounds.y2 - bounds.y1);
      const availableW = Math.max(120, size.w - responsivePadding * 2);
      const availableH = Math.max(120, size.h - responsivePadding * 2);
      const zoom = Math.min(
        opts?.maxZoom ?? 1.45,
        Math.max(opts?.minZoom ?? 0.24, Math.min(availableW / width, availableH / height)),
      );
      const cx = (bounds.x1 + bounds.x2) / 2;
      const cy = (bounds.y1 + bounds.y2) / 2;

      try {
        fg.centerAt(cx, cy, opts?.duration ?? 520);
        fg.zoom(zoom, opts?.duration ?? 520);
      } catch {
        /* best-effort camera fitting */
      }
    },
    [size.h, size.w],
  );

  // Resize observer.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({
        w: Math.max(320, Math.floor(rect.width)),
        h: Math.max(280, Math.floor(rect.height)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isSpotlight = selectedNodeId !== null;
  const useDepthVisual =
    localSubgraphMeta !== null && localSubgraphMeta.nodeDepthMap.size > 0;
  const orbitViewDepth: ConstellationDepth = localSubgraphMeta?.viewDepth ?? 1;
  const matchActive = matchedNodeIds.size > 0;

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  // Force-graph mutates the arrays it gets — pass fresh copies whenever
  // the underlying data changes.
  const graphData = useMemo(
    () => ({
      // Sort so background renders first and focused foreground renders
      // last. This gives the selected mini-network a true foreground
      // layer without needing a second canvas.
      nodes: data.nodes
        .map((n) => {
          const stored = manualNodePositionsRef.current.get(n.id);
          return stored ? { ...n, ...stored } : { ...n };
        })
        .sort((a, b) => {
          const rank = (n: ConstellationNode) => {
            if (useDepthVisual) {
              const d = localSubgraphMeta!.nodeDepthMap.get(n.id) ?? 9;
              return 10 - Math.min(9, d);
            }
            if (n.id === selectedNodeId) return 3;
            if (spotlightDirect?.has(n.id)) return 2;
            if (spotlightSecondary?.has(n.id)) return 1;
            return 0;
          };
          return rank(a) - rank(b);
        }),
      links: data.edges
        .map((e) => ({ ...e }))
        .sort((a, b) => {
          const rank = (e: ConstellationEdge) => {
            if (useDepthVisual) {
              const ed = localSubgraphMeta!.edgeDepthMap.get(e.id) ?? 3;
              return 4 - ed;
            }
            return spotlightDirectEdges?.has(e.id) ||
              e.source === selectedNodeId ||
              e.target === selectedNodeId
              ? 1
              : 0;
          };
          return rank(a) - rank(b);
        }),
    }),
    [
      data,
      selectedNodeId,
      spotlightDirect,
      spotlightSecondary,
      spotlightDirectEdges,
      useDepthVisual,
      localSubgraphMeta,
    ],
  );

  useEffect(() => {
    denseGraphRef.current =
      graphData.nodes.length >= DENSE_GRAPH_NODE_COUNT ||
      graphData.links.length >= DENSE_GRAPH_EDGE_COUNT;
    veryDenseGraphRef.current =
      graphData.nodes.length >= VERY_DENSE_GRAPH_NODE_COUNT ||
      graphData.links.length >= VERY_DENSE_GRAPH_EDGE_COUNT;
  }, [graphData.links.length, graphData.nodes.length]);

  useEffect(() => {
    const now = performance.now();
    const previous = previousNodeIdsRef.current;
    const next = new Set(graphData.nodes.map((n) => n.id));
    if (previous.size > 0) {
      for (const id of next) {
        if (!previous.has(id)) newNodeSparkRef.current.set(id, now);
      }
    }
    for (const id of Array.from(newNodeSparkRef.current.keys())) {
      if (!next.has(id) || now - (newNodeSparkRef.current.get(id) ?? now) > NEW_NODE_SPARK_MS) {
        newNodeSparkRef.current.delete(id);
      }
    }
    previousNodeIdsRef.current = next;
  }, [graphData.nodes]);

  useEffect(() => {
    const now = performance.now();
    for (const id of matchedNodeIds) {
      if (!matchGlowRef.current.has(id)) matchGlowRef.current.set(id, now);
    }
    for (const id of Array.from(matchGlowRef.current.keys())) {
      if (!matchedNodeIds.has(id)) matchGlowRef.current.delete(id);
    }
  }, [matchedNodeIds]);

  // ── Force tuning ──────────────────────────────────────────────────
  // Bigger picture: replace the library defaults with per-type
  // strength/distance/collide so the graph breathes. We re-apply on
  // every data change so newly added nodes get the same treatment.
  useEffect(() => {
    const t = setTimeout(() => {
      const fg = graphRef.current;
      if (!fg) return;
      try {
        const charge = fg.d3Force("charge");
        if (charge && typeof charge.strength === "function") {
          charge.strength((d) => {
            const node = d as SimNode;
            if (useDepthVisual && localSubgraphMeta) {
              const dep = localSubgraphMeta.nodeDepthMap.get(node.id) ?? 9;
              const base = chargeStrength(node);
              if (dep === 0) return base * 0.14;
              if (dep === 1) return base * 0.22;
              if (dep === 2) return base * 0.28;
              return base * 0.32;
            }
            const isFocusNode =
              selectedNodeId !== null &&
              (useDepthVisual && localSubgraphMeta
                ? (localSubgraphMeta.nodeDepthMap.get(node.id) ?? 9) <= 1
                : node.id === selectedNodeId || spotlightDirect?.has(node.id));
            return isFocusNode ? chargeStrength(node) * 1.25 : chargeStrength(node);
          });
        } else {
          // Fallback: install our own charge force.
          fg.d3Force(
            "charge",
            forceManyBody().strength((d) => chargeStrength(d as SimNode)),
          );
        }

        const link = fg.d3Force("link");
        if (link) {
          if (typeof link.distance === "function") {
            link.distance((l) => {
              const simLink = l as SimLink;
              const sourceId =
                typeof simLink.source === "object"
                  ? (simLink.source as SimNode).id
                  : simLink.source;
              const targetId =
                typeof simLink.target === "object"
                  ? (simLink.target as SimNode).id
                  : simLink.target;
              const isDirect = useDepthVisual && localSubgraphMeta
                ? (localSubgraphMeta.edgeDepthMap.get(simLink.id) ?? 3) === 1
                : selectedNodeId !== null &&
                  (spotlightDirectEdges?.has(simLink.id) ||
                    sourceId === selectedNodeId ||
                    targetId === selectedNodeId);
              if (useDepthVisual && localSubgraphMeta) {
                const ed = localSubgraphMeta.edgeDepthMap.get(simLink.id) ?? 3;
                const base = Math.max(135, linkDistance(simLink) * 1.35);
                if (ed === 1) return base * 1.12;
                if (ed === 2) return base * 0.95;
                return base * 0.82;
              }
              return isDirect ? Math.max(135, linkDistance(simLink) * 1.35) : linkDistance(simLink);
            });
          }
          if (typeof link.strength === "function") {
            link.strength((l) => {
              if (useDepthVisual && localSubgraphMeta) {
                return 0.055;
              }
              return linkStrength(l as SimLink);
            });
          }
        }

        // Install a collide force — this is the critical missing piece
        // that prevents the "tight cluster" symptom.
        fg.d3Force(
          "collide",
          forceCollide()
            .radius((d) => {
              const node = d as SimNode;
              if (useDepthVisual && localSubgraphMeta) {
                const dep = localSubgraphMeta.nodeDepthMap.get(node.id) ?? 9;
                const base = collideRadius(node);
                if (dep === 0) return base + 58;
                if (dep === 1) return base + 38;
                if (dep === 2) return base + 30;
                return base + 24;
              }
              const isForeground =
                selectedNodeId !== null &&
                (useDepthVisual && localSubgraphMeta
                  ? (localSubgraphMeta.nodeDepthMap.get(node.id) ?? 9) <= 1
                  : node.id === selectedNodeId || spotlightDirect?.has(node.id));
              return collideRadius(node) + (isForeground ? 26 : 0);
            })
            .strength(useDepthVisual ? 0.92 : 0.85)
            .iterations(useDepthVisual ? 3 : 2),
        );

        // Soften the centre force so the graph occupies the whole canvas.
        const center = fg.d3Force("center");
        if (center && typeof center.strength === "function") {
          center.strength(useDepthVisual ? 0 : 0.04);
        }

        // Install any extra forces (e.g., brain-attractor from BrainCanvas).
        if (typeof extraForcesSetup === "function") {
          extraForcesSetup(fg);
        }

        if (typeof fg.d3ReheatSimulation === "function") {
          fg.d3ReheatSimulation();
        }
      } catch {
        // Best-effort. The instance may not be fully attached on first paint.
      }
    }, 60);
    return () => clearTimeout(t);
  }, [
    graphData,
    selectedNodeId,
    spotlightDirect,
    spotlightDirectEdges,
    extraForcesSetup,
    useDepthVisual,
    localSubgraphMeta,
  ]);

  const currentZoomRef = useRef<number>(1);

  const markGraphInteraction = useCallback((durationMs = INTERACTION_QUALITY_MS) => {
    const now = performance.now();
    interactionUntilRef.current = Math.max(
      interactionUntilRef.current,
      now + durationMs,
    );
  }, []);

  const notifyZoomChange = useCallback(
    (zoom: number, opts?: { immediate?: boolean }) => {
      if (!onZoomChange) return;
      pendingZoomNotifyRef.current = zoom;
      if (opts?.immediate) forceZoomNotifyRef.current = true;

      const flush = () => {
        zoomNotifyRafRef.current = null;
        const next = pendingZoomNotifyRef.current;
        pendingZoomNotifyRef.current = null;
        if (next === null) return;
        const forceNotify = forceZoomNotifyRef.current;
        forceZoomNotifyRef.current = false;
        if (!forceNotify && Math.abs(next - lastNotifiedZoomRef.current) < 0.003) {
          return;
        }
        lastNotifiedZoomRef.current = next;
        onZoomChange(next);
      };

      if (zoomNotifyRafRef.current !== null) return;
      zoomNotifyRafRef.current = requestAnimationFrame(flush);
    },
    [onZoomChange],
  );

  useEffect(() => {
    return () => {
      if (zoomNotifyRafRef.current !== null) {
        cancelAnimationFrame(zoomNotifyRafRef.current);
        zoomNotifyRafRef.current = null;
      }
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      fitGraph: () => {
        const fg = graphRef.current;
        markGraphInteraction(420);
        if (fg && typeof fg.zoomToFit === "function") {
          try {
            fg.zoomToFit(420, 80);
          } catch {
            /* ignore */
          }
        }
      },
      resetLayout: () => {
        const fg = graphRef.current;
        markGraphInteraction(560);
        manualNodePositionsRef.current.clear();
        explodedPositionIdsRef.current.clear();
        localDepthPinnedIdsRef.current.clear();
        for (const node of graphData.nodes as SimNode[]) {
          node.fx = null;
          node.fy = null;
        }
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        if (!fg) return;
        try {
          if (typeof fg.d3ReheatSimulation === "function") fg.d3ReheatSimulation();
          if (typeof fg.zoomToFit === "function") fg.zoomToFit(520, 90);
        } catch {
          /* ignore */
        }
      },
      focusNode: (nodeId: string) => {
        markGraphInteraction(520);
        const node = graphData.nodes.find((n) => n.id === nodeId) as
          | SimNode
          | undefined;
        if (!node || typeof node.x !== "number" || typeof node.y !== "number") return;
        const boxes = [nodeBounds(node, node.x, node.y), nodeLabelBounds(node, node.x, node.y)];
        const bounds = mergeBoxes(boxes);
        if (bounds) fitWorldBoxToViewport(bounds, { maxZoom: 1.25, duration: 480 });
      },
      getCurrentZoom: () => currentZoomRef.current || 1,
      zoomBy: (factor: number, durationMs: number = 220) => {
        const fg = graphRef.current;
        if (!fg || typeof fg.zoom !== "function") return;
        markGraphInteraction(durationMs + 180);
        const next = Math.max(0.1, Math.min(8, (currentZoomRef.current || 1) * factor));
        try {
          fg.zoom(next, durationMs);
        } catch {
          /* ignore */
        }
      },
      zoomTo100: (durationMs: number = 320) => {
        const fg = graphRef.current;
        if (!fg || typeof fg.zoom !== "function") return;
        markGraphInteraction(durationMs + 180);
        try {
          fg.zoom(1, durationMs);
        } catch {
          /* ignore */
        }
      },
    }),
    [fitWorldBoxToViewport, graphData.nodes, markGraphInteraction],
  );

  // Fit spotlight selection (global graph): only the selected node and its
  // direct neighbours — skipped when `localSubgraphMeta` drives depth layout.
  useEffect(() => {
    if (useDepthVisual) return;
    if (!selectedNodeId || isExplodedFocusLayout || !spotlightDirect) return;
    const selected = graphData.nodes.find((n) => n.id === selectedNodeId) as SimNode | undefined;
    if (!selected || typeof selected.x !== "number" || typeof selected.y !== "number") return;
    const focusNodes = [
      selected,
      ...graphData.nodes.filter((n) => spotlightDirect.has(n.id)).map((n) => n as SimNode),
    ].filter((n) => typeof n.x === "number" && typeof n.y === "number");
    const bounds = mergeBoxes(
      focusNodes.flatMap((node) => [
        nodeBounds(node, node.x!, node.y!),
        nodeLabelBounds(node, node.x!, node.y!),
      ]),
    );
    if (!bounds) return;

    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        fitWorldBoxToViewport(bounds, { maxZoom: 1.35, duration: 520 });
      });
      animationRef.current = raf2;
    });
    animationRef.current = raf1;
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [
    fitWorldBoxToViewport,
    graphData.nodes,
    isExplodedFocusLayout,
    selectedNodeId,
    size.h,
    size.w,
    spotlightDirect,
    useDepthVisual,
  ]);

  // Depth-aware local graph: deterministic rings + pins; camera fits the
  // full subgraph (all depths). `exploded` widens radii for the second tap.
  useEffect(() => {
    if (!selectedNodeId || !localSubgraphMeta) {
      for (const id of localDepthPinnedIdsRef.current) {
        const node = graphData.nodes.find((n) => n.id === id) as SimNode | undefined;
        if (!node) continue;
        if (!manualNodePositionsRef.current.has(id)) {
          node.fx = null;
          node.fy = null;
        }
      }
      localDepthPinnedIdsRef.current.clear();
      return;
    }

    const selected = graphData.nodes.find((n) => n.id === selectedNodeId) as
      | SimNode
      | undefined;
    if (!selected) return;

    const cx = typeof selected.x === "number" ? selected.x : 0;
    const cy = typeof selected.y === "number" ? selected.y : 0;

    const rel = computeLocalSubgraphRingLayout({
      centerNodeId: selectedNodeId,
      nodeDepthMap: localSubgraphMeta.nodeDepthMap,
      parentIdMap: localSubgraphMeta.parentIdMap,
      exploded: isExplodedFocusLayout,
      viewportMin: Math.min(size.w, size.h),
      nodes: graphData.nodes as ConstellationNode[],
      viewDepth: orbitViewDepth,
    });

    const pinned = new Set<string>();
    for (const id of localSubgraphMeta.nodeDepthMap.keys()) {
      const node = graphData.nodes.find((n) => n.id === id) as SimNode | undefined;
      if (!node) continue;
      const off = rel.get(id) ?? { x: 0, y: 0 };
      if (!manualNodePositionsRef.current.has(id)) {
        const x = cx + off.x;
        const y = cy + off.y;
        node.fx = x;
        node.fy = y;
        node.x = x;
        node.y = y;
      }
      pinned.add(id);
    }
    localDepthPinnedIdsRef.current = pinned;

    const fitNodes = graphData.nodes.filter((n) =>
      localSubgraphMeta.nodeDepthMap.has(n.id),
    ) as SimNode[];
    const bounds = mergeBoxes(
      fitNodes.flatMap((node) => {
        if (typeof node.x !== "number" || typeof node.y !== "number") return [];
        return [nodeBounds(node, node.x, node.y)];
      }),
    );

    const raf1 = requestAnimationFrame(() => {
      try {
        graphRef.current?.d3ReheatSimulation?.();
      } catch {
        /* ignore */
      }
      const raf2 = requestAnimationFrame(() => {
        if (bounds) {
          const depthPad =
            orbitViewDepth === 3 ? 96 : orbitViewDepth === 2 ? 72 : 52;
          const maxZ =
            orbitViewDepth === 1 ? 1.32 : orbitViewDepth === 2 ? 1.12 : 0.88;
          const minZ =
            orbitViewDepth === 1 ? 0.26 : orbitViewDepth === 2 ? 0.19 : 0.14;
          fitWorldBoxToViewport(bounds, {
            maxZoom: isExplodedFocusLayout ? maxZ * 0.92 : maxZ,
            minZoom: minZ,
            duration: 500,
            padding: depthPad,
          });
        }
      });
      animationRef.current = raf2;
    });
    animationRef.current = raf1;

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [
    fitWorldBoxToViewport,
    graphData.nodes,
    isExplodedFocusLayout,
    localSubgraphMeta,
    orbitViewDepth,
    selectedNodeId,
    size.h,
    size.w,
  ]);

  // Firework / exploded layout for global graph only (no depth meta).
  useEffect(() => {
    if (useDepthVisual) {
      const releaseTemporaryPins = () => {
        for (const id of explodedPositionIdsRef.current) {
          const node = graphData.nodes.find((n) => n.id === id) as SimNode | undefined;
          if (!node) continue;
          if (!manualNodePositionsRef.current.has(id)) {
            node.fx = null;
            node.fy = null;
          }
        }
        explodedPositionIdsRef.current.clear();
      };
      releaseTemporaryPins();
      return;
    }

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const releaseTemporaryPins = () => {
      for (const id of explodedPositionIdsRef.current) {
        const node = graphData.nodes.find((n) => n.id === id) as SimNode | undefined;
        if (!node) continue;
        if (!manualNodePositionsRef.current.has(id)) {
          node.fx = null;
          node.fy = null;
        }
      }
      explodedPositionIdsRef.current.clear();
    };

    if (!selectedNodeId || !isExplodedFocusLayout || !spotlightDirect?.size) {
      releaseTemporaryPins();
      return;
    }

    const selected = graphData.nodes.find((n) => n.id === selectedNodeId) as
      | SimNode
      | undefined;
    if (!selected) return;

    const centerX = typeof selected.x === "number" ? selected.x : 0;
    const centerY = typeof selected.y === "number" ? selected.y : 0;
    selected.fx = centerX;
    selected.fy = centerY;
    explodedPositionIdsRef.current.add(selected.id);

    const neighbors = graphData.nodes
      .filter((n) => spotlightDirect.has(n.id))
      .map((n) => n as SimNode)
      .sort((a, b) => {
        const typeRank = (n: SimNode) => (n.type === "knowledge" ? 0 : n.type === "category" ? 1 : 2);
        return typeRank(a) - typeRank(b) || (b.connectionCount ?? 0) - (a.connectionCount ?? 0);
      });

    const count = neighbors.length;
    if (count === 0) return;

    const boxesOverlap = (a: WorldBox, b: WorldBox) =>
      a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
    const labelSize = (node: SimNode) => {
      const text = visualLabel(node.label);
      const width = Math.min(280, Math.max(92, text.length * 7.4 + 28));
      const height = node.type === "knowledge" ? 30 : 26;
      return { width, height };
    };
    const labelBoxFor = (node: SimNode, x: number, y: number): WorldBox => {
      const { width, height } = labelSize(node);
      const top = y + nodeRadius(node) + 8;
      return {
        x1: x - width / 2 - 12,
        x2: x + width / 2 + 12,
        y1: top - 6,
        y2: top + height + 6,
      };
    };

    const targets = new Map<string, { x: number; y: number }>();
    const placedBoxes: WorldBox[] = [];
    placedBoxes.push(labelBoxFor(selected, centerX, centerY));

    const baseRadius = count <= 8 ? 230 : count <= 20 ? 300 : 360;
    const densityBoost = Math.min(180, Math.max(0, count - 8) * 10);
    const angleNudgePattern = [0, 0.055, -0.055, 0.11, -0.11, 0.18, -0.18, 0.26, -0.26];

    neighbors.forEach((node, i) => {
      const baseAngle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const { width } = labelSize(node);
      const typeRadius =
        node.type === "knowledge"
          ? 0
          : node.type === "category" || node.type === "project"
            ? 80
            : 45;
      const labelRadius = Math.min(210, width * 0.45);
      let chosen: { x: number; y: number; box: WorldBox } | null = null;

      for (let attempt = 0; attempt < 90 && !chosen; attempt++) {
        const ring = Math.floor(attempt / angleNudgePattern.length);
        const angleNudge = angleNudgePattern[attempt % angleNudgePattern.length];
        const radius =
          baseRadius +
          densityBoost +
          labelRadius +
          typeRadius +
          ring * 82 +
          (i % 2) * 34;
        const angle = baseAngle + angleNudge + ring * 0.035;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        const box = labelBoxFor(node, x, y);
        if (!placedBoxes.some((p) => boxesOverlap(p, box))) {
          chosen = { x, y, box };
        }
      }

      if (!chosen) {
        const radius = baseRadius + densityBoost + labelRadius + typeRadius + 680 + i * 16;
        const x = centerX + Math.cos(baseAngle) * radius;
        const y = centerY + Math.sin(baseAngle) * radius;
        chosen = { x, y, box: labelBoxFor(node, x, y) };
      }

      placedBoxes.push(chosen.box);
      targets.set(node.id, { x: chosen.x, y: chosen.y });
    });

    const fitBoxes = [...placedBoxes];
    const nodePad = 72;
    for (const { x, y } of targets.values()) {
      fitBoxes.push({ x1: x - nodePad, y1: y - nodePad, x2: x + nodePad, y2: y + nodePad });
    }
    fitBoxes.push({ x1: centerX - 120, y1: centerY - 120, x2: centerX + 120, y2: centerY + 120 });
    const fitBounds = mergeBoxes(fitBoxes);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (fitBounds) {
          fitWorldBoxToViewport(fitBounds, {
            maxZoom: 1.12,
            minZoom: 0.24,
            duration: 560,
          });
        }
      });
    });

    const starts = new Map<string, { x: number; y: number }>();
    for (const node of neighbors) {
      starts.set(node.id, {
        x: typeof node.x === "number" ? node.x : centerX,
        y: typeof node.y === "number" ? node.y : centerY,
      });
      explodedPositionIdsRef.current.add(node.id);
    }

    const duration = 620;
    const startMs = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const t = Math.min(1, (now - startMs) / duration);
      const eased = easeOutCubic(t);

      selected.x = centerX;
      selected.y = centerY;
      selected.fx = centerX;
      selected.fy = centerY;

      for (const node of neighbors) {
        const start = starts.get(node.id);
        const target = targets.get(node.id);
        if (!start || !target) continue;
        const x = start.x + (target.x - start.x) * eased;
        const y = start.y + (target.y - start.y) * eased;
        node.x = x;
        node.y = y;
        node.fx = x;
        node.fy = y;
      }

      if (t < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [
    fitWorldBoxToViewport,
    graphData.nodes,
    isExplodedFocusLayout,
    selectedNodeId,
    size.h,
    size.w,
    spotlightDirect,
    useDepthVisual,
  ]);

  // Auto-fit only once on first canvas population. Data refreshes must
  // not reset the user's camera or manually arranged node positions.
  useEffect(() => {
    if (didInitialFitRef.current || graphData.nodes.length === 0) return;
    const t = setTimeout(() => {
      const fg = graphRef.current;
      if (fg && typeof fg.zoomToFit === "function") {
        try {
          didInitialFitRef.current = true;
          fg.zoomToFit(700, 100);
        } catch {
          /* ignore */
        }
      }
    }, 320);
    return () => clearTimeout(t);
  }, [graphData]);

  // ── Per-node alpha logic for Spotlight Mode ──────────────────────
  const computeNodeAlpha = useCallback(
    (id: string, type: ConstellationNodeType): number => {
      if (useDepthVisual && localSubgraphMeta) {
        if (id === hoveredId) return 1;
        if (matchActive && !matchedNodeIds.has(id)) return isGraphLight ? 0.22 : 0.16;
        const depth = localSubgraphMeta.nodeDepthMap.get(id) ?? 3;
        if (depth === 0) return 1;
        if (depth === 1) return 0.94;
        if (depth === 2) return 0.62;
        return 0.38;
      }
      // Hovered always pops to full visibility outside Focus Isolation
      // so the user can explore. During Focus Isolation, direct-only
      // foreground stays strict: unrelated hover does not compete.
      if (isSpotlight && id !== selectedNodeId && !spotlightDirect?.has(id)) {
        if (type === "category" || type === "project") return 0.08;
        return 0.05;
      }
      if (id === hoveredId) return 1;
      if (matchActive && !matchedNodeIds.has(id)) return isGraphLight ? 0.24 : 0.18;

      if (isSpotlight) {
        if (id === selectedNodeId) return 1;
        if (spotlightDirect?.has(id)) return 0.95;
        return 0.05;
      }
      return 1;
    },
    [
      hoveredId,
      isGraphLight,
      isSpotlight,
      localSubgraphMeta,
      matchActive,
      matchedNodeIds,
      selectedNodeId,
      spotlightDirect,
      useDepthVisual,
    ],
  );

  const computeEdgeAlpha = useCallback(
    (link: SimLink, base: number): number => {
      const sourceId =
        typeof link.source === "object"
          ? (link.source as SimNode).id
          : link.source;
      const targetId =
        typeof link.target === "object"
          ? (link.target as SimNode).id
          : link.target;

      if (useDepthVisual && localSubgraphMeta) {
        const ed = localSubgraphMeta.edgeDepthMap.get(link.id) ?? 3;
        const factor = ed === 1 ? 1 : ed === 2 ? 0.42 : 0.16;
        const touchesHover =
          hoveredId !== null &&
          (sourceId === hoveredId || targetId === hoveredId);
        const boosted = Math.min(1, base * factor + (touchesHover ? 0.28 : 0));
        return Math.max(0.035, boosted);
      }

      const isDirectEdge =
        spotlightDirectEdges?.has(link.id) ||
        (selectedNodeId !== null &&
          (sourceId === selectedNodeId || targetId === selectedNodeId));

      const touchesHover =
        !isSpotlight &&
        hoveredId !== null &&
        (sourceId === hoveredId || targetId === hoveredId);

      if (isSpotlight) {
        if (isDirectEdge) return Math.min(1, base + 0.55);
        return Math.max(isGraphLight ? 0.06 : 0.012, base * (isGraphLight ? 0.14 : 0.08));
      }

      if (touchesHover) return Math.min(1, base + 0.3);
      return base;
    },
    [
      hoveredId,
      isGraphLight,
      isSpotlight,
      localSubgraphMeta,
      selectedNodeId,
      spotlightDirectEdges,
      useDepthVisual,
    ],
  );

  const animatedEdgeBudget = useMemo(() => {
    if (
      graphData.nodes.length >= VERY_DENSE_GRAPH_NODE_COUNT ||
      graphData.links.length >= VERY_DENSE_GRAPH_EDGE_COUNT
    ) {
      return VERY_DENSE_GRAPH_ANIMATED_EDGE_BUDGET;
    }
    if (
      graphData.nodes.length >= DENSE_GRAPH_NODE_COUNT ||
      graphData.links.length >= DENSE_GRAPH_EDGE_COUNT
    ) {
      return DENSE_GRAPH_ANIMATED_EDGE_BUDGET;
    }
    return undefined;
  }, [graphData.links.length, graphData.nodes.length]);

  const shouldAutoPauseRedraw =
    prefersReducedMotion ||
    graphData.nodes.length >= DENSE_GRAPH_NODE_COUNT ||
    graphData.links.length >= DENSE_GRAPH_EDGE_COUNT;

  const animatedEdgeIds = useMemo(() => {
    return selectNeuralAnimatedEdgeIds({
      links: graphData.links as NeuralAnimationLink<SimNode>[],
      selectedNodeId,
      hoveredNodeId: hoveredId,
      spotlightDirectEdgeIds: spotlightDirectEdges,
      reducedMotion: prefersReducedMotion,
      maxEdges: animatedEdgeBudget,
    });
  }, [
    animatedEdgeBudget,
    graphData.links,
    hoveredId,
    prefersReducedMotion,
    selectedNodeId,
    spotlightDirectEdges,
  ]);

  // ── Renderers ────────────────────────────────────────────────────
  const nodeCanvasObject = useCallback(
    (rawNode: SimNode | unknown, ctx: CanvasRenderingContext2D) => {
      const node = rawNode as SimNode;
      if (typeof node.x !== "number" || typeof node.y !== "number") return;
      const palette = resolveNodeVisuals(node.type, graphSurfaceMode);
      let r = nodeRadius(node);
      const alpha = computeNodeAlpha(node.id, node.type);
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredId;
      const isMatched = matchedNodeIds.has(node.id);
      const depth = useDepthVisual
        ? (localSubgraphMeta!.nodeDepthMap.get(node.id) ?? 3)
        : null;
      if (depth === 2) r *= 0.86;
      if (depth !== null && depth >= 3) r *= 0.72;
      const isDirect = spotlightDirect?.has(node.id) ?? false;
      const dominant = useDepthVisual ? depth !== null && depth <= 1 : isDirect || isSelected;
      const interactionQuality = interactionQualityRef.current;

      if (interactionQuality) {
        const fastR = Math.max(2.2, dominant || isSelected || isHovered ? r : r * 0.72);
        ctx.globalAlpha = alpha * (dominant || isSelected || isHovered ? 0.95 : 0.72);
        ctx.fillStyle = palette.core;
        ctx.beginPath();
        ctx.arc(node.x, node.y, fastR, 0, 2 * Math.PI);
        ctx.fill();

        if (isSelected || isMatched || isHovered) {
          ctx.globalAlpha = Math.min(1, alpha * 0.92);
          ctx.strokeStyle = isSelected
            ? palette.ring
            : isHovered
              ? palette.label
              : graphShell.matchedRingFallback;
          ctx.lineWidth = isSelected ? 1.5 : 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, fastR + (isSelected ? 3 : 2), 0, 2 * Math.PI);
          ctx.stroke();
        }

        ctx.globalAlpha = 1;
        return;
      }

      const now = frameNowRef.current || performance.now();
      const sparkStarted = newNodeSparkRef.current.get(node.id);
      const sparkT =
        sparkStarted === undefined
          ? 0
          : Math.max(0, 1 - (now - sparkStarted) / NEW_NODE_SPARK_MS);
      const matchStarted = matchGlowRef.current.get(node.id);
      const matchT =
        matchStarted === undefined
          ? 0
          : Math.max(0, 1 - (now - matchStarted) / SEARCH_MATCH_GLOW_MS);

      // Outer glow.
      const glowR =
        r *
        (isSelected
          ? 4.2
          : isHovered
            ? 3.4
            : dominant
              ? 3
              : depth === 2
                ? 2.45
                : 2.05);
      const grad = ctx.createRadialGradient(
        node.x,
        node.y,
        r * 0.4,
        node.x,
        node.y,
        glowR,
      );
      grad.addColorStop(0, palette.glow);
      grad.addColorStop(1, graphShell.glowGradientEnd);
      const glowTone = isGraphLight ? 0.68 : 1;
      ctx.globalAlpha =
        alpha *
        glowTone *
        (isSelected ? 0.95 : isHovered || dominant ? 0.78 : depth === 2 ? 0.55 : 0.48);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(node.x, node.y, glowR, 0, 2 * Math.PI);
      ctx.fill();

      // Core dot.
      ctx.globalAlpha = alpha;
      ctx.fillStyle = palette.core;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fill();

      // Selected / matched ring.
      if (isSelected || isMatched || isHovered) {
        ctx.strokeStyle = isSelected
          ? palette.ring
          : isHovered
            ? palette.label
            : graphShell.matchedRingFallback;
        ctx.lineWidth = isSelected ? 1.8 : 1.2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + (isSelected ? 3 : 2.2), 0, 2 * Math.PI);
        ctx.stroke();
      }

      if (sparkT > 0 || matchT > 0) {
        const pulse = Math.max(sparkT, matchT);
        ctx.globalAlpha = prefersReducedMotion ? alpha * 0.75 : alpha * pulse * 0.65;
        ctx.strokeStyle = sparkT > matchT ? palette.ring : graphShell.matchedRingFallback;
        ctx.lineWidth = (sparkT > matchT ? 1.4 : 1.1) / Math.max(0.85, ctx.getTransform().a);
        ctx.beginPath();
        ctx.arc(
          node.x,
          node.y,
          r + 4 + (prefersReducedMotion ? 2 : (1 - pulse) * 18),
          0,
          2 * Math.PI,
        );
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    },
    [
      computeNodeAlpha,
      graphShell.glowGradientEnd,
      graphShell.matchedRingFallback,
      graphSurfaceMode,
      hoveredId,
      isGraphLight,
      localSubgraphMeta,
      matchedNodeIds,
      prefersReducedMotion,
      selectedNodeId,
      spotlightDirect,
      useDepthVisual,
    ],
  );

  const nodePointerAreaPaint = useCallback(
    (rawNode: unknown, color: string, ctx: CanvasRenderingContext2D) => {
      const node = rawNode as SimNode;
      if (typeof node.x !== "number" || typeof node.y !== "number") return;
      const r = nodeRadius(node) + 4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fill();
    },
    [],
  );

  const linkColor = useCallback(
    (rawLink: SimLink | unknown) => {
      const link = rawLink as SimLink;
      const style =
        EDGE_STYLE[link.type] ?? EDGE_STYLE["explicit_link" as ConstellationEdgeType];
      const opacity = computeEdgeAlpha(link, style.opacity);
      return resolveEdgeColorRgba(link.type, opacity, graphSurfaceMode);
    },
    [computeEdgeAlpha, graphSurfaceMode],
  );

  const linkWidth = useCallback(
    (rawLink: SimLink | unknown) => {
      const link = rawLink as SimLink;
      const style =
        EDGE_STYLE[link.type] ?? EDGE_STYLE["explicit_link" as ConstellationEdgeType];
      const sourceId =
        typeof link.source === "object"
          ? (link.source as SimNode).id
          : link.source;
      const targetId =
        typeof link.target === "object"
          ? (link.target as SimNode).id
          : link.target;
      if (useDepthVisual && localSubgraphMeta) {
        const ed = localSubgraphMeta.edgeDepthMap.get(link.id) ?? 3;
        const w = style.width;
        if (ed === 1) return Math.max(w + 1.1, 2.05);
        if (ed === 2) return Math.max(w * 0.78, 1.05);
        return Math.max(w * 0.52, 0.42);
      }
      const onSelected =
        isSpotlight &&
        (spotlightDirectEdges?.has(link.id) ||
          sourceId === selectedNodeId ||
          targetId === selectedNodeId);
      const onHover =
        !isSpotlight &&
        hoveredId !== null &&
        (sourceId === hoveredId || targetId === hoveredId);
      if (onSelected) return Math.max(style.width + 1.35, 2.15);
      if (onHover) return style.width + 0.7;
      return isSpotlight ? Math.max(0.25, style.width * 0.45) : style.width;
    },
    [
      hoveredId,
      isSpotlight,
      localSubgraphMeta,
      selectedNodeId,
      spotlightDirectEdges,
      useDepthVisual,
    ],
  );

  const linkLineDash = useCallback(
    (rawLink: SimLink | unknown) => {
      const link = rawLink as SimLink;
      if (useDepthVisual && localSubgraphMeta) {
        const ed = localSubgraphMeta.edgeDepthMap.get(link.id) ?? 3;
        if (ed >= 3) return [2, 7] as number[];
        if (ed === 2) {
          const dashed = EDGE_STYLE[link.type]?.dashed;
          return dashed ? ([4, 4] as number[]) : ([6, 5] as number[]);
        }
      }
      return EDGE_STYLE[link.type]?.dashed ? [4, 4] : [];
    },
    [useDepthVisual, localSubgraphMeta],
  );

  const linkCanvasObject = useCallback(
    (rawLink: SimLink | unknown, ctx: CanvasRenderingContext2D, scale: number) => {
      const link = rawLink as SimLink;
      const { source, target } = linkEndpointNodes(link);
      if (
        !source ||
        !target ||
        typeof source.x !== "number" ||
        typeof source.y !== "number" ||
        typeof target.x !== "number" ||
        typeof target.y !== "number"
      ) {
        return;
      }

      const style =
        EDGE_STYLE[link.type] ?? EDGE_STYLE["explicit_link" as ConstellationEdgeType];
      const alpha = computeEdgeAlpha(link, style.opacity);
      const width = Number(linkWidth(link));
      const dash = linkLineDash(link);
      const { sourceId, targetId } = linkEndpointIds(link);
      const touchesHover =
        hoveredId !== null && (sourceId === hoveredId || targetId === hoveredId);
      const touchesSelection =
        selectedNodeId !== null &&
        (sourceId === selectedNodeId || targetId === selectedNodeId);
      const highlighted =
        touchesHover || touchesSelection || spotlightDirectEdges?.has(link.id) || false;
      const crossHemisphere =
        !useDepthVisual &&
        source.x * target.x < 0 &&
        Math.abs(source.x - target.x) > 180;
      const cx = crossHemisphere ? 0 : (source.x + target.x) / 2;
      const cy = crossHemisphere ? (source.y + target.y) * 0.16 : (source.y + target.y) / 2;
      const strong = isStrongNeuralEdgeType(link.type);

      if (interactionQualityRef.current) {
        const sampleThreshold = veryDenseGraphRef.current
          ? 0.28
          : denseGraphRef.current
            ? 0.46
            : 1;
        if (
          !highlighted &&
          !strong &&
          hashStringUnit(link.id) > sampleThreshold
        ) {
          return;
        }
        const fastAlpha = highlighted ? Math.min(1, alpha + 0.22) : Math.max(0.018, alpha * 0.54);
        if (fastAlpha <= 0.02 && !highlighted) return;
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
        ctx.lineCap = "round";
        ctx.strokeStyle = resolveEdgeColorRgba(link.type, fastAlpha, graphSurfaceMode);
        ctx.lineWidth = Math.max(highlighted ? 0.85 : 0.22, width * (highlighted ? 0.82 : 0.48));
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        return;
      }

      const lineColor = resolveEdgeColorRgba(link.type, alpha, graphSurfaceMode);
      const pulseEligible = animatedEdgeIds.has(link.id);
      const now = frameNowRef.current || performance.now();
      const pulsePhase = (now / (strong || highlighted ? 1450 : 2400) + hashStringUnit(link.id)) % 1;

      ctx.save();
      if (dash.length > 0) ctx.setLineDash(dash);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = Math.max(0.25, width);
      if (highlighted || strong) {
        ctx.shadowColor = resolveEdgeColorRgba(
          link.type,
          highlighted ? 0.45 : 0.18,
          graphSurfaceMode,
        );
        ctx.shadowBlur = (highlighted ? 8 : 4) / Math.max(0.75, scale);
      }

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      if (crossHemisphere) {
        ctx.quadraticCurveTo(cx, cy, target.x, target.y);
      } else {
        ctx.lineTo(target.x, target.y);
      }
      ctx.stroke();

      if (crossHemisphere && (highlighted || strong)) {
        ctx.setLineDash([]);
        ctx.strokeStyle = graphSurfaceMode === "light"
          ? "rgba(14, 116, 144, 0.18)"
          : "rgba(165, 243, 252, 0.16)";
        ctx.lineWidth = Math.max(0.55, width * 0.55);
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(0, 0, target.x, target.y);
        ctx.stroke();
      }

      if (pulseEligible && !prefersReducedMotion) {
        const pulseWidth = Math.max(1.1, width + (highlighted ? 1.6 : 0.45));
        const segment = highlighted ? 0.16 : 0.08;
        const from = Math.max(0, pulsePhase - segment);
        const to = Math.min(1, pulsePhase + segment * 0.35);
        const pulseColor =
          graphSurfaceMode === "light"
            ? `rgba(14, 116, 144, ${highlighted ? 0.62 : 0.24})`
            : `rgba(165, 243, 252, ${highlighted ? 0.78 : 0.24})`;

        ctx.setLineDash([]);
        ctx.shadowBlur = (highlighted ? 12 : 7) / Math.max(0.75, scale);
        ctx.shadowColor = pulseColor;
        ctx.strokeStyle = pulseColor;
        ctx.lineWidth = pulseWidth;
        if (crossHemisphere) {
          strokeQuadraticSegment(
            ctx,
            source.x,
            source.y,
            cx,
            cy,
            target.x,
            target.y,
            from,
            to,
          );
        } else {
          const sx = source.x + (target.x - source.x) * from;
          const sy = source.y + (target.y - source.y) * from;
          const tx = source.x + (target.x - source.x) * to;
          const ty = source.y + (target.y - source.y) * to;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }

        const particle = crossHemisphere
          ? quadraticPoint(source.x, source.y, cx, cy, target.x, target.y, pulsePhase)
          : {
              x: source.x + (target.x - source.x) * pulsePhase,
              y: source.y + (target.y - source.y) * pulsePhase,
            };
        ctx.fillStyle = pulseColor;
        ctx.beginPath();
        ctx.arc(
          particle.x,
          particle.y,
          (highlighted ? 2.7 : 1.7) / Math.max(0.8, scale * 0.65),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      if (prefersReducedMotion && highlighted) {
        ctx.setLineDash([]);
        ctx.strokeStyle =
          graphSurfaceMode === "light"
            ? "rgba(14, 116, 144, 0.30)"
            : "rgba(165, 243, 252, 0.34)";
        ctx.lineWidth = Math.max(0.8, width * 0.55);
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        if (crossHemisphere) ctx.quadraticCurveTo(cx, cy, target.x, target.y);
        else ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }

      ctx.restore();
    },
    [
      animatedEdgeIds,
      computeEdgeAlpha,
      graphSurfaceMode,
      hoveredId,
      linkLineDash,
      linkWidth,
      prefersReducedMotion,
      selectedNodeId,
      spotlightDirectEdges,
      useDepthVisual,
    ],
  );

  const handleRenderFramePre = useCallback(
    (ctx: CanvasRenderingContext2D, scale: number) => {
      const now = performance.now();
      frameNowRef.current = now;
      const quality: ConstellationRenderQuality =
        denseGraphRef.current && now < interactionUntilRef.current
          ? "interaction"
          : "full";
      interactionQualityRef.current = quality === "interaction";
      onRenderFramePre?.(ctx, scale, quality);
    },
    [onRenderFramePre],
  );

  // ── Label pass with screen-space collision detection ─────────────
  // Drawn on the foreground canvas via `onRenderFramePost` so it sits
  // on top of links and nodes. The library exposes the 2d context for
  // post-render hooks.
  const onRenderFramePost = useCallback(
    (ctx: CanvasRenderingContext2D, scale: number) => {
      if (!showLabels) return;
      const interactionQuality = interactionQualityRef.current;
      if (
        interactionQuality &&
        selectedNodeId === null &&
        hoveredId === null &&
        matchedNodeIds.size === 0
      ) {
        return;
      }

      // Tier thresholds: at low scale we only label the very high
      // priority items; at high scale we relax. Local orbit uses a high
      // floor so only center / inner ring / explicit forceShow pass unless
      // the user zooms in very far.
      let priorityFloor = 7000; // default: low zoom → only category/project/selected/etc.
      if (useDepthVisual) {
        priorityFloor = orbitViewDepth === 1 ? 4000 : 8200;
      } else {
        if (scale > 0.9) priorityFloor = 5500; // include collections / direct neighbours
        if (scale > 1.5) priorityFloor = 4000; // include tags / matched
        if (scale > 2.4) priorityFloor = 1200; // include knowledge nodes
      }
      if (interactionQuality) {
        priorityFloor = useDepthVisual ? 7600 : 8800;
      }
      // In Spotlight Mode, always show selected + direct.
      // In Hover, always show hovered.

      type Candidate = {
        node: SimNode;
        priority: number;
        text: string;
        fontSize: number;
        baselineY: number;
      };

      const candidates: Candidate[] = [];
      for (const raw of graphData.nodes) {
        const node = raw as SimNode;
        if (typeof node.x !== "number" || typeof node.y !== "number") continue;
        const isSelected = node.id === selectedNodeId;
        const isHovered = node.id === hoveredId;
        const isMatched = matchedNodeIds.has(node.id);
        const nodeDepth = useDepthVisual
          ? localSubgraphMeta!.nodeDepthMap.get(node.id)
          : undefined;
        const isDirect =
          useDepthVisual && nodeDepth !== undefined
            ? nodeDepth <= 1
            : (spotlightDirect?.has(node.id) ?? false);
        const isSecondary = useDepthVisual
          ? nodeDepth === 2
          : (spotlightSecondary?.has(node.id) ?? false);

        const priority = labelPriority({
          node,
          isSelected,
          isHovered,
          isMatched,
          isDirect,
          isSecondary,
          graphDepth: nodeDepth,
        });

        const forceShow = useDepthVisual
          ? localOrbitLabelShouldShow(
              node,
              nodeDepth,
              orbitViewDepth,
              isSelected,
              isHovered,
            )
          : isSelected ||
            isDirect ||
            (!isSpotlight && (isHovered || isMatched));
        if (!forceShow && priority < priorityFloor) continue;

        if (!useDepthVisual && isSpotlight && !isSelected && !isDirect) continue;

        const fontSize = Math.max(
          isSelected ? 12 : 10,
          (isSelected ? 13 : node.type === "category" ? 12 : 11) /
            Math.max(0.6, scale),
        );
        let r = nodeRadius(node);
        if (useDepthVisual && nodeDepth === 2) r *= 0.9;
        if (useDepthVisual && nodeDepth !== undefined && nodeDepth >= 3) {
          r *= 0.82;
        }
        const text = useDepthVisual
          ? truncateLabelForLocalOrbitCanvas(node, nodeDepth)
          : node.label.length > 32
            ? `${node.label.slice(0, 31)}…`
            : node.label;
        candidates.push({
          node,
          priority,
          text,
          fontSize,
          baselineY: node.y + r + 4,
        });
      }

      // Sort high-priority first so they "claim" their box.
      candidates.sort((a, b) => b.priority - a.priority);

      // Screen-space collision: convert each candidate to screen coords
      // via the simulation transform (graph→screen handled by the
      // library's matrix; we approximate using the supplied scale and
      // assume our coordinates are world-space — accurate at this stage).
      // Since we render on the world canvas, our "boxes" stay in graph
      // space but include a margin proportional to 1/scale to reflect
      // visual screen distance.
      const placed: { x1: number; y1: number; x2: number; y2: number }[] = [];
      const padX = 4 / scale;
      const padY = 3 / scale;

      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      for (const cand of candidates) {
        const { node, text, fontSize, baselineY } = cand;
        const isSelected = node.id === selectedNodeId;
        const isHovered = node.id === hoveredId;
        ctx.font = `${fontSize}px -apple-system, system-ui, sans-serif`;
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const halfW = textWidth / 2 + padX;
        const halfH = fontSize / 2 + padY;
        const cx = node.x!;
        const cy = baselineY + fontSize / 2;
        const box = {
          x1: cx - halfW,
          y1: cy - halfH,
          x2: cx + halfW,
          y2: cy + halfH,
        };

        const nodeDepth = useDepthVisual
          ? localSubgraphMeta!.nodeDepthMap.get(node.id)
          : undefined;
        const isDirectCollision =
          useDepthVisual && nodeDepth !== undefined
            ? nodeDepth <= 1
            : (spotlightDirect?.has(node.id) ?? false);
        const forceShow =
          useDepthVisual && nodeDepth !== undefined
            ? localOrbitLabelShouldShow(
                node,
                nodeDepth,
                orbitViewDepth,
                isSelected,
                isHovered,
              )
            : isSelected ||
              isHovered ||
              (isExplodedFocusLayout && isSpotlight && isDirectCollision);

        // Collision check.
        let overlaps = false;
        for (const p of placed) {
          if (
            box.x1 < p.x2 &&
            box.x2 > p.x1 &&
            box.y1 < p.y2 &&
            box.y2 > p.y1
          ) {
            overlaps = true;
            break;
          }
        }
        if (overlaps && !forceShow) continue;
        placed.push(box);

        const palette = resolveNodeVisuals(node.type, graphSurfaceMode);
        const alpha = computeNodeAlpha(node.id, node.type);

        // Glass background pill — keeps text readable on every backdrop.
        ctx.globalAlpha = Math.min(0.92, alpha * (isSelected ? 0.92 : 0.7));
        ctx.fillStyle = graphShell.labelPillFill;
        const radius = Math.min(halfH, 6 / scale);
        const x = box.x1;
        const y = box.y1;
        const w = box.x2 - box.x1;
        const h = box.y2 - box.y1;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = palette.ring;
          ctx.lineWidth = 0.8 / scale;
          ctx.stroke();
        }

        // Label text.
        ctx.globalAlpha = Math.min(
          1,
          alpha * (isSelected || isHovered ? 1 : 0.95),
        );
        ctx.fillStyle = palette.label;
        ctx.fillText(text, cx, baselineY);
      }

      ctx.globalAlpha = 1;
    },
    [
      computeNodeAlpha,
      graphData.nodes,
      graphShell.labelPillFill,
      graphSurfaceMode,
      hoveredId,
      isExplodedFocusLayout,
      isSpotlight,
      localSubgraphMeta,
      matchedNodeIds,
      orbitViewDepth,
      selectedNodeId,
      showLabels,
      spotlightDirect,
      spotlightSecondary,
      useDepthVisual,
    ],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onBackgroundClick();
      }}
    >
      {/* Cinematic backdrop — soft constellation atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: graphShell.canvasBackdropCss }}
      />

      <ForceGraph2D
        ref={(instance: ForceGraphInstance | null) => {
          graphRef.current = instance;
        }}
        width={size.w}
        height={size.h}
        graphData={graphData}
        backgroundColor="rgba(0, 0, 0, 0)"
        nodeId="id"
        nodeRelSize={1}
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkLineDash={linkLineDash}
        linkCanvasObject={linkCanvasObject}
        linkCanvasObjectMode={() => "replace"}
        linkDirectionalParticles={0}
        linkCurvature={0}
        autoPauseRedraw={shouldAutoPauseRedraw}
        cooldownTicks={cooldownTicksProp ?? 140}
        warmupTicks={warmupTicksProp ?? 30}
        d3VelocityDecay={d3VelocityDecayProp ?? 0.32}
        d3AlphaDecay={d3AlphaDecayProp ?? 0.022}
        enableNodeDrag
        enableZoomInteraction
        enablePanInteraction
        onRenderFramePre={handleRenderFramePre}
        onRenderFramePost={onRenderFramePost}
        onNodeHover={(rawNode: SimNode | null) => {
          const node = rawNode ?? null;
          const nextId = node ? node.id : null;
          setHoveredId((prev) => (prev === nextId ? prev : nextId));
          onNodeHover(node);
        }}
        onNodeClick={(rawNode: SimNode) => {
          onNodeClick(rawNode);
        }}
        onNodeDragEnd={(rawNode: SimNode) => {
          markGraphInteraction(180);
          if (typeof rawNode.x === "number" && typeof rawNode.y === "number") {
            rawNode.fx = rawNode.x;
            rawNode.fy = rawNode.y;
            manualNodePositionsRef.current.set(rawNode.id, {
              x: rawNode.x,
              y: rawNode.y,
              fx: rawNode.fx,
              fy: rawNode.fy,
            });
          }
        }}
        onNodeRightClick={(rawNode: SimNode) => {
          manualNodePositionsRef.current.delete(rawNode.id);
          rawNode.fx = null;
          rawNode.fy = null;
        }}
        onBackgroundClick={() => onBackgroundClick()}
        onNodeDblClick={(rawNode: SimNode) => onNodeDoubleClick(rawNode)}
        onZoom={(transform: { k: number; x: number; y: number }) => {
          if (!Number.isFinite(transform?.k)) return;
          markGraphInteraction();
          currentZoomRef.current = transform.k;
          notifyZoomChange(transform.k);
        }}
        onZoomEnd={(transform: { k: number; x: number; y: number }) => {
          if (!Number.isFinite(transform?.k)) return;
          markGraphInteraction(120);
          currentZoomRef.current = transform.k;
          notifyZoomChange(transform.k, { immediate: true });
        }}
        onNodeDrag={() => {
          markGraphInteraction();
        }}
      />
    </div>
  );
});
