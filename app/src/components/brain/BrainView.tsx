/**
 * Life OS Brain — top-level view.
 *
 * Orchestrates:
 *  1. TanStack Query data fetching for all 18 modules (`useBrainQueries`).
 *  2. Live Realtime sync so the canvas updates without reloads
 *     (`useBrainRealtimeSync`).
 *  3. The Brain Engine (`buildBrainData`) that merges everything into a
 *     single `ConstellationGraphData`.
 *  4. Domain toggles, search, and orphan-hide via `useBrainStore` (UI only).
 *  5. Local-mode subgraph computation when a node is selected.
 *
 * Multi-user safety: the data layer relies entirely on Supabase RLS to
 * scope every query to `auth.uid()`. This component never threads
 * `user_id` through manual filtering — all sources of truth are already
 * server-scoped before reaching here.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useBrainStore } from "@/stores/brain-store";
import { useBrainQueries } from "@/hooks/use-brain-queries";
import { useBrainRealtimeSync } from "@/hooks/use-brain-realtime-sync";
import { useIsConstellationLgUp } from "@/hooks/use-constellation-lg-up";
import { buildBrainData, buildBrainDataRich } from "@/lib/brain/buildBrainData";
import { rejectedEvidenceHashes } from "@/lib/brain/adapters/brain-edges-bridge";
import { applyDensityMode } from "@/lib/brain/density";
import { filterConstellationData } from "@/lib/knowledge/constellation/filterConstellationData";
import { getLocalSubgraphByDepth } from "@/lib/knowledge/constellation/getLocalSubgraph";
import { applyReadableLocalOrbitLimits } from "@/lib/knowledge/constellation/readableLocalSubgraph";
import {
  computeLocalOrbitState,
  type LocalOrbitState,
} from "@/lib/knowledge/constellation/computeLocalOrbitState";
import { BRAIN_DOMAIN_NODE_MAP, NODE_TYPE_TO_DOMAIN } from "@/types/brain";
import type {
  ConstellationEdge,
  ConstellationGraphData,
  ConstellationGraphMode,
  ConstellationNode,
} from "@/types/constellation";

import { BrainCanvas, type BrainCanvasHandle } from "./BrainCanvas";
import BrainSphere3D, { type BrainSphere3DHandle } from "./BrainSphere3D";
import { BrainToolbar } from "./BrainToolbar";
import { BrainFilters } from "./BrainFilters";
import { BrainDetailPanel } from "./BrainDetailPanel";
import { BrainLegend } from "./BrainLegend";
import { BrainDiagnosticsOverlay } from "./BrainDiagnosticsOverlay";
import { BrainLocalOrbitView } from "./BrainLocalOrbitView";
import { BrainOrphanResolver } from "./BrainOrphanResolver";
import { GraphPageHeader } from "@/components/graph/GraphPageHeader";
import { GraphZoomControls } from "@/components/graph/GraphZoomControls";
import { SphereFocusZoomControls } from "./SphereFocusZoomControls";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import { cn } from "@/lib/utils";

function getDocumentFullscreenElement(): Element | null {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

async function exitDocumentFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => void;
  };
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else doc.webkitExitFullscreen?.();
  } catch {
    /* noop */
  }
}

interface BrainViewProps {
  userId: string;
}

const MAX_INITIAL_NODES_DESKTOP = 3500;
const MAX_INITIAL_NODES_MOBILE = 1200;

function BrainMobileInspectorDock({
  selectedNode,
  selectedNodeId,
  mode,
  localOrbitState,
  incidentEdges,
  nodeIndex,
  onFocusNode,
  onClearSelection,
}: {
  selectedNode: ConstellationNode;
  selectedNodeId: string | null;
  mode: ConstellationGraphMode;
  localOrbitState: LocalOrbitState | null;
  incidentEdges: ConstellationEdge[];
  nodeIndex: Map<string, ConstellationNode>;
  onFocusNode: (id: string) => void;
  onClearSelection: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="flex shrink-0 flex-col border-t border-border/60 bg-background/92 shadow-[0_-10px_28px_rgba(0,0,0,0.28)] backdrop-blur-md">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/35"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={
          expanded ? "Collapse node details" : "Expand node details"
        }
      >
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Details
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {selectedNode.label}
        </span>
        {expanded ? (
          <ChevronDown
            className="h-5 w-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        ) : (
          <ChevronUp
            className="h-5 w-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-[max-height] duration-300 ease-in-out motion-reduce:transition-none",
          expanded
            ? "max-h-[min(78dvh,calc(100dvh-200px))]"
            : "max-h-0",
        )}
      >
        <div className="max-h-[min(78dvh,calc(100dvh-200px))] overflow-y-auto overscroll-contain pb-3">
          {mode === "local" && selectedNodeId ? (
            <BrainLocalOrbitView
              localOrbit={localOrbitState}
              onFocusNode={onFocusNode}
            />
          ) : (
            <BrainDetailPanel
              selectedNode={selectedNode}
              incidentEdges={incidentEdges}
              nodeIndex={nodeIndex}
              variant="panel"
              hideHeaderClose
              onClose={onClearSelection}
              onFocusNode={onFocusNode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function BrainView({ userId }: BrainViewProps) {
  // ── Data fetching ──────────────────────────────────────────────────
  const { queries, isInitialLoading, failedCount, errors } = useBrainQueries();
  useBrainRealtimeSync();
  const queryClient = useQueryClient();
  const [errorBannerDismissed, setErrorBannerDismissed] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────
  const mode = useBrainStore((s) => s.mode);
  const depth = useBrainStore((s) => s.depth);
  const showLabels = useBrainStore((s) => s.showLabels);
  const search = useBrainStore((s) => s.search);
  const filters = useBrainStore((s) => s.filters);
  const setFilters = useBrainStore((s) => s.setFilters);
  const selectedNodeId = useBrainStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useBrainStore((s) => s.setSelectedNodeId);
  const filtersOpen = useBrainStore((s) => s.filtersOpen);
  const setFiltersOpen = useBrainStore((s) => s.setFiltersOpen);
  const legendOpen = useBrainStore((s) => s.legendOpen);
  const setLegendOpen = useBrainStore((s) => s.setLegendOpen);
  const inspectorOpen = useBrainStore((s) => s.inspectorOpen);
  const setInspectorOpen = useBrainStore((s) => s.setInspectorOpen);
  const domainToggles = useBrainStore((s) => s.domainToggles);
  const densityMode = useBrainStore((s) => s.densityMode);
  const orphanResolverOpen = useBrainStore((s) => s.orphanResolverOpen);

  const canvasRef = useRef<BrainCanvasHandle | null>(null);
  const sphereRef = useRef<BrainSphere3DHandle | null>(null);
  const graphFullscreenRef = useRef<HTMLDivElement | null>(null);
  const [explodedFocus, setExplodedFocus] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  /** iOS / embedded WebViews: fullscreen API missing — fixed overlay fallback. */
  const [pseudoGraphFullscreen, setPseudoGraphFullscreen] = useState(false);
  const isLgUp = useIsConstellationLgUp();
  const isSphere = mode === "sphere_3d";
  const sphereClusterBy = useBrainStore((s) => s.sphereClusterBy);
  const setFocusState = useBrainStore((s) => s.setFocusState);
  const setHoveredNodeId = useBrainStore((s) => s.setHoveredNodeId);
  const [sphereFocusZoomPct, setSphereFocusZoomPct] = useState(0);

  // ── Sync search → filters.search ───────────────────────────────────
  useEffect(() => {
    setFilters({ search });
  }, [search, setFilters]);

  // ── Native fullscreen for the Brain graph column (Sphere gets max space) ─
  useEffect(() => {
    const sync = () => {
      const el = graphFullscreenRef.current;
      setIsGraphFullscreen(!!el && getDocumentFullscreenElement() === el);
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  useEffect(() => {
    if (isSphere) return;
    const fsEl = getDocumentFullscreenElement();
    const host = graphFullscreenRef.current;
    if (fsEl && host && fsEl === host) {
      void exitDocumentFullscreen();
    }
    setPseudoGraphFullscreen(false);
  }, [isSphere]);

  useEffect(() => {
    if (!isSphere) {
      setSphereFocusZoomPct(0);
    }
  }, [isSphere]);

  // ── Diagnostics: log per-query failures ─────────────────────────────
  // Brain reads from 22 tables. A single failure (e.g. a not-yet-migrated
  // table or a Supabase hiccup) used to blank the entire canvas; now we
  // log the cause and continue rendering whatever loaded.
  useEffect(() => {
    if (errors.length === 0) return;
    const messages = errors.map((e, i) => `${i + 1}. ${e.message || String(e)}`);
    console.warn(
      `[Brain] ${errors.length} of 22 data slices failed to load:\n` +
        messages.join("\n"),
    );
  }, [errors]);

  // ── Build the merged graph ─────────────────────────────────────────
  const builtGraph: ConstellationGraphData = useMemo(() => {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches;
    const knowledge = queries.knowledge.data;
    return buildBrainData({
      userId,
      knowledgeItems: knowledge?.items,
      knowledgeCollections: knowledge?.collections,
      knowledgeConnections: knowledge?.connections,
      goals: queries.goals.data,
      habits: queries.habits.data,
      habitLinks: queries.habitLinks.data,
      quotes: queries.quotes.data,
      roleModels: queries.roleModels.data,
      projects: queries.projects.data,
      tasks: queries.tasks.data,
      ideas: queries.ideas.data,
      journalEntries: queries.journalEntries.data,
      careerEvents: queries.careerEvents.data,
      healthGoals: queries.healthGoals.data,
      financeGoals: queries.financeGoals.data,
      bucketItems: queries.bucketItems.data,
      relationships: queries.relationships.data,
      aboutMe: queries.aboutMe.data ?? null,
      gratefulThings: queries.gratefulThings.data,
      assets: queries.assets.data,
      aiPrompts: queries.aiPrompts.data,
      software: queries.software.data,
      dailyPlans: queries.dailyPlans.data,
      brainRelations: queries.brainRelations.data,
      brainEdges: queries.brainEdges.data,
      // Phase 2 additions:
      documents: queries.documents.data,
      notes: queries.notes.data,
      careerDecisions: queries.careerDecisions.data,
      careerNetworkNodes: queries.careerNetworkNodes.data,
      financeAccounts: queries.financeAccounts.data,
      financeCategories: queries.financeCategories.data,
      options: {
        maxNodes: isMobile
          ? MAX_INITIAL_NODES_MOBILE
          : MAX_INITIAL_NODES_DESKTOP,
        hideOrphanNodes: false,
      },
    });
    // queries are object refs that change every render — only rebuild when
    // any underlying `data` reference flips.
  }, [
    userId,
    queries.knowledge.data,
    queries.goals.data,
    queries.habits.data,
    queries.habitLinks.data,
    queries.quotes.data,
    queries.roleModels.data,
    queries.projects.data,
    queries.tasks.data,
    queries.ideas.data,
    queries.journalEntries.data,
    queries.careerEvents.data,
    queries.healthGoals.data,
    queries.financeGoals.data,
    queries.bucketItems.data,
    queries.relationships.data,
    queries.aboutMe.data,
    queries.gratefulThings.data,
    queries.assets.data,
    queries.aiPrompts.data,
    queries.software.data,
    queries.dailyPlans.data,
    queries.brainRelations.data,
    queries.brainEdges.data,
    queries.documents.data,
    queries.notes.data,
    queries.careerDecisions.data,
    queries.careerNetworkNodes.data,
    queries.financeAccounts.data,
    queries.financeCategories.data,
  ]);

  // ── Apply domain toggles + search/filter ───────────────────────────
  const visibleNodes = useMemo(() => {
    const enabledTypes = new Set<string>();
    for (const [domain, types] of Object.entries(BRAIN_DOMAIN_NODE_MAP)) {
      if (domainToggles[domain as keyof typeof domainToggles]) {
        for (const t of types) enabledTypes.add(t);
      }
    }
    return builtGraph.nodes.filter((n) => enabledTypes.has(n.type));
  }, [builtGraph.nodes, domainToggles]);

  const filtered = useMemo(() => {
    return filterConstellationData({
      nodes: visibleNodes,
      edges: builtGraph.edges,
      filters,
    });
  }, [visibleNodes, builtGraph.edges, filters]);

  const densityGraph = useMemo(
    () =>
      applyDensityMode({
        nodes: filtered.nodes,
        edges: filtered.edges,
        mode: densityMode,
      }),
    [filtered, densityMode],
  );

  const orbitAvailabilityPack = useMemo(() => {
    if (mode === "global" || !selectedNodeId) return null;
    return getLocalSubgraphByDepth({
      nodes: densityGraph.nodes,
      edges: densityGraph.edges,
      centerNodeId: selectedNodeId,
      depth: 3,
    });
  }, [mode, selectedNodeId, densityGraph]);

  const orbitViewRawPack = useMemo(() => {
    if (mode === "global" || !selectedNodeId) return null;
    return getLocalSubgraphByDepth({
      nodes: densityGraph.nodes,
      edges: densityGraph.edges,
      centerNodeId: selectedNodeId,
      depth,
    });
  }, [mode, selectedNodeId, densityGraph, depth]);

  const localGraphRefined = useMemo(() => {
    if (!orbitViewRawPack || !selectedNodeId) return null;
    const nodeById = new Map(densityGraph.nodes.map((n) => [n.id, n]));
    return applyReadableLocalOrbitLimits(
      orbitViewRawPack,
      selectedNodeId,
      depth,
      nodeById,
    );
  }, [orbitViewRawPack, selectedNodeId, depth, densityGraph]);

  const visibleGraph: ConstellationGraphData = useMemo(() => {
    // 3D Sphere always shows the full filtered graph — selecting a
    // node triggers focus highlights, not a subgraph cut.
    if (mode === "global" || mode === "sphere_3d") return densityGraph;
    if (!selectedNodeId) return densityGraph;
    if (!localGraphRefined) return { nodes: [], edges: [] };
    return {
      nodes: localGraphRefined.nodes,
      edges: localGraphRefined.edges,
    };
  }, [mode, selectedNodeId, densityGraph, localGraphRefined]);

  const localSubgraphMeta = useMemo(() => {
    if (mode !== "local" || !selectedNodeId || !localGraphRefined) return null;
    return {
      nodeDepthMap: localGraphRefined.nodeDepthMap,
      edgeDepthMap: localGraphRefined.edgeDepthMap,
      parentIdMap: localGraphRefined.parentIdMap,
      viewDepth: depth,
    };
  }, [mode, selectedNodeId, localGraphRefined, depth]);

  /** Orbit panel lists the full depth-3 neighborhood; canvas uses a readable subset. */
  const localOrbitState = useMemo(() => {
    if (mode !== "local" || !selectedNodeId || !orbitAvailabilityPack) return null;
    return computeLocalOrbitState({
      centerNodeId: selectedNodeId,
      nodes: orbitAvailabilityPack.nodes,
      edges: orbitAvailabilityPack.edges,
      nodeDepthMap: orbitAvailabilityPack.nodeDepthMap,
      parentIdMap: orbitAvailabilityPack.parentIdMap,
      maxDepth: depth,
      canvasSubset:
        localGraphRefined !== null
          ? {
              nodeCount: localGraphRefined.stats.canvasNodes,
              edgeCount: localGraphRefined.stats.canvasEdges,
            }
          : undefined,
    });
  }, [
    mode,
    selectedNodeId,
    orbitAvailabilityPack,
    depth,
    localGraphRefined,
  ]);

  const nodeIndex = useMemo(() => {
    const m = new Map<string, ConstellationNode>();
    for (const n of visibleGraph.nodes) m.set(n.id, n);
    return m;
  }, [visibleGraph.nodes]);

  const selectedNode = selectedNodeId
    ? (nodeIndex.get(selectedNodeId) ?? null)
    : null;

  const incidentEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return visibleGraph.edges.filter(
      (e) => e.source === selectedNodeId || e.target === selectedNodeId,
    );
  }, [selectedNodeId, visibleGraph.edges]);

  // ── Spotlight Mode (selected → direct → secondary) ─────────────────
  const spotlight = useMemo(() => {
    if (!selectedNodeId) return null;
    const adj = new Map<string, Set<string>>();
    const directEdges = new Set<string>();
    for (const e of visibleGraph.edges) {
      if (!adj.has(e.source)) adj.set(e.source, new Set());
      if (!adj.has(e.target)) adj.set(e.target, new Set());
      adj.get(e.source)!.add(e.target);
      adj.get(e.target)!.add(e.source);
      if (e.source === selectedNodeId || e.target === selectedNodeId) {
        directEdges.add(e.id);
      }
    }
    const direct = adj.get(selectedNodeId) ?? new Set<string>();
    const secondary = new Set<string>();
    for (const id of direct) {
      const n = adj.get(id);
      if (!n) continue;
      for (const m of n) {
        if (m !== selectedNodeId && !direct.has(m)) secondary.add(m);
      }
    }
    return { direct, secondary, directEdges };
  }, [selectedNodeId, visibleGraph.edges]);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleFocusNode = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setExplodedFocus(false);
      requestAnimationFrame(() => {
        if (isSphere) {
          sphereRef.current?.focusNode(nodeId);
        } else {
          canvasRef.current?.focusNode(nodeId);
        }
      });
    },
    [isSphere, setSelectedNodeId],
  );

  const handleNodeClick = useCallback(
    (node: ConstellationNode) => {
      if (isSphere) {
        // Sphere mode follows the discriminated focus state machine
        // and treats a same-node click as an explicit exit (one of
        // the three exit paths in the spec). Different node = swap
        // focus and let the renderer drive the cinematic camera.
        if (selectedNodeId === node.id) {
          setSelectedNodeId(null);
          // Hand off to fly-out — the renderer reads
          // `transitioning-out` and animates the camera back to its
          // saved orbit, then promotes itself to `idle`.
          setFocusState({
            phase: "transitioning-out",
            previousNodeId: node.id,
            startedAt: performance.now(),
          });
          setHoveredNodeId(null);
          setExplodedFocus(false);
          return;
        }
        setSelectedNodeId(node.id);
        // Hand off to fly-in. Renderer reads `transitioning-in` and
        // animates from current orbit → core, promoting itself to
        // `focused` on completion.
        setFocusState({
          phase: "transitioning-in",
          nodeId: node.id,
          startedAt: performance.now(),
        });
        setExplodedFocus(false);
        return;
      }

      // 2D modes — same behavior as before.
      if (selectedNodeId === node.id) {
        setExplodedFocus(true);
        return;
      }
      setSelectedNodeId(node.id);
      setExplodedFocus(false);
    },
    [
      isSphere,
      selectedNodeId,
      setFocusState,
      setHoveredNodeId,
      setSelectedNodeId,
    ],
  );

  const handleNodeDoubleClick = useCallback(
    (node: ConstellationNode) => {
      setSelectedNodeId(node.id);
      setExplodedFocus(false);
    },
    [setSelectedNodeId],
  );

  const handleBackgroundClick = useCallback(() => {
    if (isSphere) {
      const prev = selectedNodeId;
      setSelectedNodeId(null);
      setHoveredNodeId(null);
      setExplodedFocus(false);
      // Only animate out if we were actually focused — otherwise
      // background clicks during normal browsing are a no-op for
      // the camera.
      if (prev) {
        setFocusState({
          phase: "transitioning-out",
          previousNodeId: prev,
          startedAt: performance.now(),
        });
      } else {
        setFocusState({ phase: "idle" });
      }
      return;
    }
    setSelectedNodeId(null);
    setExplodedFocus(false);
  }, [
    isSphere,
    selectedNodeId,
    setFocusState,
    setHoveredNodeId,
    setSelectedNodeId,
  ]);

  // Esc key — third sphere-mode exit path. Mounted globally because
  // the canvas has `tabindex` semantics rather than focus.
  useEffect(() => {
    if (!isSphere) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedNodeId !== null) {
        const prev = selectedNodeId;
        setSelectedNodeId(null);
        setHoveredNodeId(null);
        setExplodedFocus(false);
        setFocusState({
          phase: "transitioning-out",
          previousNodeId: prev,
          startedAt: performance.now(),
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    isSphere,
    selectedNodeId,
    setFocusState,
    setHoveredNodeId,
    setSelectedNodeId,
  ]);

  const handleResetLayout = useCallback(() => {
    if (isSphere) {
      // "Reset" in sphere mode = re-frame the camera to the canonical
      // outside-orbit view. Don't clear selection — the user's
      // intent is "give me a clean view", not "deselect".
      sphereRef.current?.resetView();
      return;
    }
    canvasRef.current?.resetLayout();
    setSelectedNodeId(null);
    setExplodedFocus(false);
  }, [isSphere, setSelectedNodeId]);

  const handleFitGraph = useCallback(() => {
    if (isSphere) {
      sphereRef.current?.fitGraph();
      return;
    }
    canvasRef.current?.fitGraph();
  }, [isSphere]);

  const SPHERE_FOCUS_ZOOM_STEP = 5;

  const handleSphereFocusZoomIn = useCallback(() => {
    sphereRef.current?.adjustFocusZoomByPercent(SPHERE_FOCUS_ZOOM_STEP);
  }, []);

  const handleSphereFocusZoomOut = useCallback(() => {
    sphereRef.current?.adjustFocusZoomByPercent(-SPHERE_FOCUS_ZOOM_STEP);
  }, []);

  const handleSphereFocusZoomResetFraming = useCallback(() => {
    const h = sphereRef.current;
    if (!h) return;
    const cur = h.getFocusZoomPercent?.() ?? 0;
    h.adjustFocusZoomByPercent(-cur);
  }, []);

  const handleSphereFitFullSphere = useCallback(() => {
    sphereRef.current?.resetView();
  }, []);

  const handleToggleGraphFullscreen = useCallback(async () => {
    const el = graphFullscreenRef.current;
    if (!el) return;
    const nativeActive = getDocumentFullscreenElement() === el;
    if (nativeActive || pseudoGraphFullscreen) {
      if (nativeActive) await exitDocumentFullscreen();
      setPseudoGraphFullscreen(false);
      return;
    }
    const req =
      el.requestFullscreen?.bind(el) ??
      (
        el as unknown as {
          webkitRequestFullscreen?: () => void;
        }
      ).webkitRequestFullscreen?.bind(el);
    let usedNative = false;
    if (typeof req === "function") {
      try {
        await Promise.resolve(req());
        usedNative = true;
      } catch {
        /* denied or unsupported */
      }
    }
    if (usedNative) {
      window.setTimeout(() => sphereRef.current?.fitGraph(), 120);
    } else {
      setPseudoGraphFullscreen(true);
      window.setTimeout(() => sphereRef.current?.fitGraph(), 120);
    }
  }, [pseudoGraphFullscreen]);

  const handleRefreshData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["brain"] });
  }, [queryClient]);

  // Reset selection when it leaves the graph (e.g. the row was
  // deleted, the user filtered it out, or the realtime sync removed
  // it). In sphere mode we also reset the focus state machine so
  // the camera doesn't keep tracking a phantom world position.
  useEffect(() => {
    if (selectedNodeId && !nodeIndex.has(selectedNodeId)) {
      setSelectedNodeId(null);
      if (isSphere) {
        setFocusState({ phase: "idle" });
        setHoveredNodeId(null);
      }
    }
  }, [
    nodeIndex,
    selectedNodeId,
    setSelectedNodeId,
    isSphere,
    setFocusState,
    setHoveredNodeId,
  ]);

  // Auto-open the inspector once a node is selected on desktop. We never
  // force-open it on first load (intentional: the graph starts edge-to-
  // edge; the panel only appears after an explicit interaction).
  useEffect(() => {
    if (selectedNodeId && !inspectorOpen) {
      setInspectorOpen(true);
    }
  }, [selectedNodeId, inspectorOpen, setInspectorOpen]);

  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoomBy(1.25);
  }, []);
  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomBy(1 / 1.25);
  }, []);
  const handleResetZoom = useCallback(() => {
    canvasRef.current?.zoomTo100();
  }, []);

  // Auto-focus first match when search has a hit.
  const matchedIds = filtered.matchedNodeIds;
  useEffect(() => {
    if (search.trim() && matchedIds.size > 0) {
      const first = matchedIds.values().next().value;
      if (first) {
        requestAnimationFrame(() => {
          if (isSphere) {
            setSelectedNodeId(first);
            sphereRef.current?.focusNode(first);
          } else {
            canvasRef.current?.focusNode(first);
          }
        });
      }
    }
  }, [search, matchedIds, isSphere, setSelectedNodeId]);

  // ── Counts per domain (for the Legend) ─────────────────────────────
  const domainCounts = useMemo(() => {
    const counts: Partial<Record<string, number>> = {};
    for (const n of builtGraph.nodes) {
      const domain = NODE_TYPE_TO_DOMAIN[n.type];
      if (!domain) continue;
      counts[domain] = (counts[domain] ?? 0) + 1;
    }
    return counts;
  }, [builtGraph.nodes]);

  // ── Rich graph (only built when the orphan resolver is open or
  // dev diagnostics are enabled) ───────────────────────────────────────
  // The resolver and diagnostics overlay need the full BrainGraphData
  // (with Brain types, life areas, evidence, etc.) — so we recompute on
  // demand to avoid paying the cost when neither is visible.
  const knowledge = queries.knowledge.data;
  // `?brainDebug=1` opt-in for the diagnostics overlay. Read once on
  // first render; never re-checks (avoids setState-in-effect cascading
  // renders).
  const [debugFlag] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      new URLSearchParams(window.location.search).get("brainDebug") === "1"
    );
  });
  const richGraph = useMemo(() => {
    if (!orphanResolverOpen && !debugFlag) return null;
    return buildBrainDataRich({
      userId,
      knowledgeItems: knowledge?.items,
      knowledgeCollections: knowledge?.collections,
      knowledgeConnections: knowledge?.connections,
      goals: queries.goals.data,
      habits: queries.habits.data,
      habitLinks: queries.habitLinks.data,
      quotes: queries.quotes.data,
      roleModels: queries.roleModels.data,
      projects: queries.projects.data,
      tasks: queries.tasks.data,
      ideas: queries.ideas.data,
      journalEntries: queries.journalEntries.data,
      careerEvents: queries.careerEvents.data,
      healthGoals: queries.healthGoals.data,
      financeGoals: queries.financeGoals.data,
      bucketItems: queries.bucketItems.data,
      relationships: queries.relationships.data,
      aboutMe: queries.aboutMe.data ?? null,
      gratefulThings: queries.gratefulThings.data,
      assets: queries.assets.data,
      aiPrompts: queries.aiPrompts.data,
      software: queries.software.data,
      dailyPlans: queries.dailyPlans.data,
      brainRelations: queries.brainRelations.data,
      brainEdges: queries.brainEdges.data,
      documents: queries.documents.data,
      notes: queries.notes.data,
      careerDecisions: queries.careerDecisions.data,
      careerNetworkNodes: queries.careerNetworkNodes.data,
      financeAccounts: queries.financeAccounts.data,
      financeCategories: queries.financeCategories.data,
    });
  }, [
    orphanResolverOpen,
    debugFlag,
    userId,
    knowledge,
    queries.goals.data,
    queries.habits.data,
    queries.habitLinks.data,
    queries.quotes.data,
    queries.roleModels.data,
    queries.projects.data,
    queries.tasks.data,
    queries.ideas.data,
    queries.journalEntries.data,
    queries.careerEvents.data,
    queries.healthGoals.data,
    queries.financeGoals.data,
    queries.bucketItems.data,
    queries.relationships.data,
    queries.aboutMe.data,
    queries.gratefulThings.data,
    queries.assets.data,
    queries.aiPrompts.data,
    queries.software.data,
    queries.dailyPlans.data,
    queries.brainRelations.data,
    queries.brainEdges.data,
    queries.documents.data,
    queries.notes.data,
    queries.careerDecisions.data,
    queries.careerNetworkNodes.data,
    queries.financeAccounts.data,
    queries.financeCategories.data,
  ]);

  const rejectedHashes = useMemo(
    () => rejectedEvidenceHashes(queries.brainEdges.data),
    [queries.brainEdges.data],
  );

  // ── Render ─────────────────────────────────────────────────────────
  // Only block the canvas during the very first paint when literally
  // nothing has loaded yet. After that, render what's available — partial
  // failures surface as a soft banner, never as a full-page error.
  const showSpinner = isInitialLoading && builtGraph.nodes.length === 0;
  const isEmpty =
    !isInitialLoading && builtGraph.nodes.length === 0 && failedCount === 0;
  const localNeedsSelection = mode === "local" && !selectedNodeId;
  const hasResults = visibleGraph.nodes.length > 0;
  const showErrorBanner =
    failedCount > 0 && !errorBannerDismissed && builtGraph.nodes.length > 0;

  const { t: graphT } = useGraphSurface();
  const graphShell = graphT.shell;
  const isGraphFullscreenActive = isGraphFullscreen || pseudoGraphFullscreen;

  useEffect(() => {
    if (!pseudoGraphFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pseudoGraphFullscreen]);

  return (
    <div
      ref={graphFullscreenRef}
      className={cn(
        `relative flex h-full min-h-[520px] w-full overflow-hidden ${graphShell.pageTextClass}`,
        pseudoGraphFullscreen &&
          "fixed inset-0 z-[500] h-[100dvh] min-h-[100dvh] w-screen max-w-none",
      )}
      style={{ background: graphShell.pageBg }}
    >
      {/* Left: Filters (desktop) */}
      <div
        className="hidden lg:block"
        aria-hidden={!filtersOpen}
        style={{ display: filtersOpen ? "block" : "none" }}
      >
        <BrainFilters
          nodes={builtGraph.nodes}
          variant="panel"
          onClose={() => setFiltersOpen(false)}
        />
      </div>

      {/* Center: Header + Toolbar + graph column */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {!(isSphere && isGraphFullscreenActive) && (
          <GraphPageHeader
            title="Brain"
            subtitle="A living map of your knowledge, projects, tasks, relationships, journals, goals, and personal systems — connected like a second brain."
          />
        )}

        <BrainToolbar
          nodes={visibleGraph.nodes}
          nodeCount={visibleGraph.nodes.length}
          edgeCount={visibleGraph.edges.length}
          onRefreshData={handleRefreshData}
          onResetLayout={handleResetLayout}
          onFitGraph={handleFitGraph}
          onFocusNode={handleFocusNode}
          sphereFullscreenActive={isGraphFullscreenActive}
          onToggleSphereFullscreen={
            isSphere ? handleToggleGraphFullscreen : undefined
          }
        />

        {showErrorBanner && (
          <div className="pointer-events-auto flex items-center gap-2 border-b border-amber-300/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100">
            <span className="font-medium">Partial sync</span>
            <span className="text-amber-100/80">
              {failedCount} data source{failedCount === 1 ? "" : "s"} failed to
              load — the graph is showing what it has. Check the console for
              details.
            </span>
            <button
              type="button"
              onClick={() => void handleRefreshData()}
              className="ml-auto rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider hover:bg-amber-500/20"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setErrorBannerDismissed(true)}
              className="rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-100"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {showSpinner ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Loading your Life OS Brain...
              </div>
            ) : isEmpty ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <p className="text-base font-medium text-foreground">
                  Your Brain is empty.
                </p>
                <p className="max-w-sm text-sm">
                  Start adding goals, habits, projects, or any other life data —
                  your graph will fill in automatically.
                </p>
              </div>
            ) : !hasResults ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <p className="text-sm font-medium text-foreground">
                  No nodes match the current filters.
                </p>
                <button
                  type="button"
                  onClick={() => useBrainStore.getState().clearFilters()}
                  className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs uppercase tracking-wider text-foreground hover:bg-muted/60"
                >
                  Clear filters
                </button>
              </div>
            ) : isSphere ? (
              <BrainSphere3D
                ref={sphereRef}
                data={visibleGraph}
                clusterBy={sphereClusterBy}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
                onFocusZoomPercentChange={setSphereFocusZoomPct}
              />
            ) : (
              <BrainCanvas
                ref={canvasRef}
                data={visibleGraph}
                // Enable the brain-shaped layout in global mode.
                // In local mode (node selected + local subgraph), disable it
                // so the firework/orbit layout works without constraint.
                brainLayoutEnabled={mode === "global"}
                selectedNodeId={selectedNodeId}
                spotlightDirect={spotlight?.direct ?? null}
                spotlightSecondary={spotlight?.secondary ?? null}
                spotlightDirectEdges={spotlight?.directEdges ?? null}
                localSubgraphMeta={mode === "local" ? localSubgraphMeta : null}
                isExplodedFocusLayout={explodedFocus}
                matchedNodeIds={filtered.matchedNodeIds}
                showLabels={showLabels}
                onNodeHover={() => {
                  /* canvas owns hover */
                }}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onBackgroundClick={handleBackgroundClick}
                onZoomChange={(z) => setZoom(z)}
              />
            )}

            {!isEmpty && hasResults && isSphere && (
              <SphereFocusZoomControls
                percent={sphereFocusZoomPct}
                onZoomIn={handleSphereFocusZoomIn}
                onZoomOut={handleSphereFocusZoomOut}
                onPercentClick={handleSphereFocusZoomResetFraming}
                onFit={handleSphereFitFullSphere}
                step={SPHERE_FOCUS_ZOOM_STEP}
              />
            )}

            {/* Floating zoom — 2D canvas uses GraphZoomControls; sphere
                uses SphereFocusZoomControls whenever the graph renders. */}
            {!isEmpty && hasResults && !isSphere && (
              <GraphZoomControls
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetZoom={handleResetZoom}
                onFit={handleFitGraph}
              />
            )}

            {/* Subtle hint when nothing is selected — replaces the
                previously-large empty Details panel that wasted real
                estate. Pointer-events disabled so the canvas behind
                still handles clicks/drags. */}
            {!isEmpty && hasResults && !selectedNodeId && !inspectorOpen && (
              <div
                className={`pointer-events-none absolute right-3 top-3 z-20 hidden rounded-full px-3 py-1 text-[11px] backdrop-blur-md sm:inline-flex ${graphT.banner.wrap}`}
              >
                <span className={graphT.banner.subText}>
                  Click a node to inspect details
                </span>
              </div>
            )}

            {!isEmpty && hasResults && localNeedsSelection && (
              <div
                className={`pointer-events-none absolute left-1/2 bottom-4 z-20 flex -translate-x-1/2 items-center gap-2 px-3.5 py-1.5 text-xs backdrop-blur-md ${graphT.banner.wrap}`}
              >
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.45)] dark:bg-violet-300 dark:shadow-[0_0_8px_rgba(196,181,253,0.85)]"
                />
                <span className={graphT.banner.text}>Local mode</span>
                <span className={graphT.banner.subText}>
                  Click any node to set a center.
                </span>
              </div>
            )}

            <BrainLegend
              open={legendOpen}
              onClose={() => setLegendOpen(false)}
              domainCounts={domainCounts}
            />
            {/* Dev-only: ?brainDebug=1 shows live diagnostics. */}
            <BrainDiagnosticsOverlay graph={richGraph} />
          </div>

          {/* Mobile / tablet (below lg breakpoint): docked inspector under graph */}
          {!isLgUp &&
            selectedNode &&
            hasResults &&
            !showSpinner &&
            !isEmpty &&
            !(orphanResolverOpen && richGraph) && (
              <BrainMobileInspectorDock
                key={selectedNode.id}
                selectedNode={selectedNode}
                selectedNodeId={selectedNodeId}
                mode={mode}
                localOrbitState={localOrbitState}
                incidentEdges={incidentEdges}
                nodeIndex={nodeIndex}
                onFocusNode={handleFocusNode}
                onClearSelection={() => {
                  // Sphere mode coordinates the camera fly-out with
                  // any selection clear so the user never lands in a
                  // "panel closed but camera stuck at core" state.
                  if (isSphere) {
                    handleBackgroundClick();
                  } else {
                    setSelectedNodeId(null);
                  }
                }}
              />
            )}
        </div>
      </div>

      {/* Right: Detail / Orphan Resolver / Local Orbit (desktop)
          — Closed by default. Opens automatically once a node is
          selected (see effect above) or the user clicks the
          "Details" toggle on the toolbar. The Orphan Resolver
          ignores `inspectorOpen` because it is its own first-class
          mode; if the user enabled it via the chip, we always show it. */}
      {(inspectorOpen || (orphanResolverOpen && richGraph)) && (
        <div className="hidden w-80 shrink-0 lg:block">
          {orphanResolverOpen && richGraph ? (
            <BrainOrphanResolver
              graph={richGraph}
              rejectedHashes={rejectedHashes}
              onFocusNode={handleFocusNode}
            />
          ) : mode === "local" && selectedNodeId ? (
            <BrainLocalOrbitView
              localOrbit={localOrbitState}
              onFocusNode={handleFocusNode}
            />
          ) : (
            <BrainDetailPanel
              selectedNode={selectedNode}
              incidentEdges={incidentEdges}
              nodeIndex={nodeIndex}
              onClose={() => {
                // In sphere mode, closing the panel should also fly
                // the camera back out — the panel and the sphere are
                // a coordinated pair (Spec F).
                if (isSphere) {
                  handleBackgroundClick();
                } else {
                  setSelectedNodeId(null);
                }
                setInspectorOpen(false);
              }}
              onFocusNode={handleFocusNode}
            />
          )}
        </div>
      )}

      {/* Mobile: Filters drawer */}
      <Sheet
        open={filtersOpen}
        onOpenChange={(open) => setFiltersOpen(open)}
      >
        <SheetContent
          side="left"
          showCloseButton={false}
          className="flex w-[300px] max-w-[88vw] flex-col gap-0 overflow-hidden p-0 lg:hidden"
        >
          <SheetTitle className="sr-only">Brain filters</SheetTitle>
          <BrainFilters
            nodes={builtGraph.nodes}
            variant="drawer"
            onClose={() => setFiltersOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
