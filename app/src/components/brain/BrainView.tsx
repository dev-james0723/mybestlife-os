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

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, HelpCircle, Network, X } from "lucide-react";

import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { BrainWorkspaceToolbar, type BrainWorkspacePanel } from "./BrainWorkspaceToolbar";
import { BrainWorkspacePanels } from "./BrainWorkspacePanels";
import { useBrainCopy } from "./useBrainCopy";
import styles from "./brain-workspace.module.css";
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

import { BrainFilters } from "./BrainFilters";
import { BrainDetailPanel } from "./BrainDetailPanel";
import { BrainLegend } from "./BrainLegend";
import { BrainDiagnosticsOverlay } from "./BrainDiagnosticsOverlay";
import { BrainLocalOrbitView } from "./BrainLocalOrbitView";
import { BrainOrphanResolver } from "./BrainOrphanResolver";

import { GraphZoomControls } from "@/components/graph/GraphZoomControls";
import { SphereFocusZoomControls } from "./SphereFocusZoomControls";

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
const setCanvasHoveredNode = () => {};

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
  const [expanded, setExpanded] = useState(false);
  const b = useBrainCopy();
  return (
    <div className={styles.dock} data-testid="brain-mobile-details">
      <div className="flex items-center">
      <button
        type="button"
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left hover:bg-muted/35"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={
          b(expanded ? "Collapse node details" : "Expand node details")
        }
      >
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {b("Details")}
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
      <button type="button" className="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-muted" onClick={onClearSelection} aria-label={b("Close details")}><X className="size-4" /></button>
      </div>
      <div hidden={!expanded}>
        <div className={styles.dockBody}>
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
  const b = useBrainCopy();
  const knowledgePath = useLocalizedPath("/knowledge-base");
  const [panel, setPanel] = useState<BrainWorkspacePanel>(null);
  const mode = useBrainStore((s) => s.mode);
  const depth = useBrainStore((s) => s.depth);
  const showLabels = useBrainStore((s) => s.showLabels);
  const search = useBrainStore((s) => s.search);
  const rawFilters = useBrainStore((s) => s.filters);
  const filters = useDeferredValue(rawFilters);
  const graphFilterKey = JSON.stringify({ ...filters, search: "" });
  const deferredSearch = useDeferredValue(search);
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
  /** Ensures a `?focus=` deep link is applied at most once per mount. */
  const focusParamHandledRef = useRef(false);
  const graphFullscreenRef = useRef<HTMLDivElement | null>(null);
  const [explodedFocus, setExplodedFocus] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  /** iOS / embedded WebViews: fullscreen API missing — fixed overlay fallback. */
  const [pseudoGraphFullscreen, setPseudoGraphFullscreen] = useState(false);
  const isGraphFullscreenActive = isGraphFullscreen || pseudoGraphFullscreen;
  const isLgUp = useIsConstellationLgUp();
  const isSphere = mode === "sphere_3d";
  const sphereClusterBy = useBrainStore((s) => s.sphereClusterBy);
  const setFocusState = useBrainStore((s) => s.setFocusState);
  const setHoveredNodeId = useBrainStore((s) => s.setHoveredNodeId);
  const [sphereFocusZoomPct, setSphereFocusZoomPct] = useState(0);



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
    if (isSphere || sphereFocusZoomPct === 0) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setSphereFocusZoomPct(0);
    });
    return () => {
      cancelled = true;
    };
  }, [isSphere, sphereFocusZoomPct]);

  // ── Diagnostics: log per-query failures ─────────────────────────────
  // Brain reads from 22 tables. A single failure (e.g. a not-yet-migrated
  // table or a Supabase hiccup) used to blank the entire canvas; now we
  // log the cause and continue rendering whatever loaded.
  const loadErrorSummary = errors.map((e, i) => `${i + 1}. ${e.message || String(e)}`).join("\n");
  useEffect(() => {
    if (loadErrorSummary && process.env.NODE_ENV !== "production") {
      console.warn(`[Brain] Data sources failed to load:\n${loadErrorSummary}`);
    }
  }, [loadErrorSummary]);

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
      filters: JSON.parse(graphFilterKey),
    });
  }, [visibleNodes, builtGraph.edges, graphFilterKey]);

  const densityGraph = useMemo(
    () =>
      applyDensityMode({
        nodes: filtered.nodes,
        edges: filtered.edges,
        mode: densityMode,
      }),
    [filtered, densityMode],
  );

  const matchedNodeIds = useMemo(() => filterConstellationData({
    nodes: densityGraph.nodes, edges: [], filters: { search: deferredSearch },
  }).matchedNodeIds, [densityGraph.nodes, deferredSearch]);

  const orbitAvailabilityPack = useMemo(() => {
    if (mode !== "local" || !selectedNodeId) return null;
    return getLocalSubgraphByDepth({
      nodes: densityGraph.nodes,
      edges: densityGraph.edges,
      centerNodeId: selectedNodeId,
      depth: 3,
    });
  }, [mode, selectedNodeId, densityGraph]);

  const orbitViewRawPack = useMemo(() => {
    if (mode !== "local" || !selectedNodeId) return null;
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

  const nodeIndex = useMemo(() => new Map(densityGraph.nodes.map(n => [n.id, n])), [densityGraph.nodes]);

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
      setInspectorOpen(true);
      setPanel(null);
      setExplodedFocus(false);
      requestAnimationFrame(() => {
        if (isSphere) {
          sphereRef.current?.focusNode(nodeId);
        } else {
          canvasRef.current?.focusNode(nodeId);
        }
      });
    },
    [isSphere, setSelectedNodeId, setInspectorOpen],
  );

  const handleNodeClick = useCallback(
    (node: ConstellationNode) => {
      setInspectorOpen(true);
      setPanel(null);
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

      // Repeated selection keeps the neighborhood stable. Arrangement is a drag action.
      if (selectedNodeId === node.id) return;
      setSelectedNodeId(node.id);
      setExplodedFocus(false);
    },
    [
      isSphere,
      selectedNodeId,
      setFocusState,
      setHoveredNodeId,
      setSelectedNodeId,
      setInspectorOpen,
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
    if (getDocumentFullscreenElement() === el) {
      await exitDocumentFullscreen();
      return;
    }
    // A top-layer popover keeps the same canvas mounted above transformed app shells.
    if (typeof el.showPopover === "function" && el.matches(":popover-open")) el.hidePopover();
    el.removeAttribute("popover");
    try {
      if (!el.requestFullscreen) throw new Error("Fullscreen is unavailable");
      await el.requestFullscreen();
    } catch {
      setPseudoGraphFullscreen(true);
      if (typeof el.showPopover === "function") el.setAttribute("popover", "manual");
      el.showPopover?.();
    }
  }, []);

  const handleToggleFocus = useCallback(() => {
    if (getDocumentFullscreenElement() === graphFullscreenRef.current) void exitDocumentFullscreen();
    setPseudoGraphFullscreen(v => !v);
  }, []);

  useEffect(() => {
    const el = graphFullscreenRef.current;
    if (!el) return;
    if (pseudoGraphFullscreen && !isGraphFullscreen) {
      if (typeof el.showPopover === "function") {
        el.setAttribute("popover", "manual");
        if (!el.matches(":popover-open")) el.showPopover();
      }
    } else {
      if (typeof el.showPopover === "function" && el.matches(":popover-open")) el.hidePopover();
      el.removeAttribute("popover");
    }
  }, [pseudoGraphFullscreen, isGraphFullscreen]);

  const closePanels = useCallback(() => {
    setPanel(null);
    setFiltersOpen(false);
    setLegendOpen(false);
    useBrainStore.getState().setOrphanResolverOpen(false);
  }, [setFiltersOpen, setLegendOpen]);

  const handlePanelChange = useCallback((next: BrainWorkspacePanel) => {
    closePanels();
    setPanel(next);
  }, [closePanels]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (panel || filtersOpen || legendOpen || orphanResolverOpen) { closePanels(); return; }
      if (isGraphFullscreen) { void exitDocumentFullscreen(); return; }
      if (pseudoGraphFullscreen) { setPseudoGraphFullscreen(false); return; }
      if (selectedNodeId) handleBackgroundClick();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, filtersOpen, legendOpen, orphanResolverOpen, closePanels, isGraphFullscreen, pseudoGraphFullscreen, selectedNodeId, handleBackgroundClick]);

  const handleRefreshData = useCallback(async () => {
    setErrorBannerDismissed(false);
    await queryClient.invalidateQueries({ queryKey: ["brain"] });
    const failures = queryClient.getQueryCache().findAll({ queryKey: ["brain"] }).filter(q => q.state.status === "error");
    if (failures.length) throw new Error("Brain refresh incomplete");
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

  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoomBy(1.25);
  }, []);
  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomBy(1 / 1.25);
  }, []);
  const handleResetZoom = useCallback(() => {
    canvasRef.current?.zoomTo100();
  }, []);

  // Focus a node from a `?focus=scope:id` deep link (e.g. the Idea detail
  // sheet's "Access My Brain" button uses `?focus=idea:<id>`). Runs once, only
  // after the target node exists in the graph. Node ids are `type::sourceId`,
  // so a single-colon `scope:id` is normalised to `scope::id`.
  useEffect(() => {
    if (focusParamHandledRef.current) return;
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("focus");
    if (!raw) return;
    const nodeId = raw.includes("::") ? raw : raw.replace(":", "::");
    if (!nodeIndex.has(nodeId)) return;
    focusParamHandledRef.current = true;
    setInspectorOpen(true);
    setSelectedNodeId(nodeId);
    requestAnimationFrame(() => {
      if (isSphere) {
        sphereRef.current?.focusNode(nodeId);
      } else {
        canvasRef.current?.focusNode(nodeId);
      }
    });
  }, [nodeIndex, isSphere, setSelectedNodeId, setInspectorOpen]);

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



  useEffect(() => {
    if (!pseudoGraphFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pseudoGraphFullscreen]);

  return (
    <div ref={graphFullscreenRef} className={styles.workspace} data-expanded={isGraphFullscreenActive} data-testid="brain-workspace">
      {!isGraphFullscreenActive && <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
        <div className="min-w-0"><h1 className="font-heading text-2xl font-semibold tracking-tight">{b("Brain")}</h1><p className="mt-1 hidden text-sm text-muted-foreground sm:block">{b("Explore how your ideas, goals and everyday life connect.")}</p></div>
        <button className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted" aria-label={b("Help")} title={b("Help")} onClick={() => handlePanelChange(panel === "help" ? null : "help")}><HelpCircle className="size-5" /></button>
      </header>}
      <BrainWorkspaceToolbar nodes={densityGraph.nodes} onFocusNode={handleFocusNode} focusMode={pseudoGraphFullscreen} fullscreen={isGraphFullscreen}
        onToggleFocus={handleToggleFocus} onToggleFullscreen={() => void handleToggleGraphFullscreen()} panel={panel} onPanelChange={handlePanelChange} />
      {showErrorBanner && <div role="status" className="flex shrink-0 items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-900 dark:text-amber-200">
        <span className="min-w-0 flex-1">{b("Partial sync")} · {failedCount} — {b("Some sources could not be loaded. Your available data is shown.")}</span>
        <button className="shrink-0 px-2 underline" onClick={() => void handleRefreshData().catch(() => {})}>{b("Retry")}</button>
        <button className="flex size-11 shrink-0 items-center justify-center" aria-label={b("Dismiss")} onClick={() => setErrorBannerDismissed(true)}><X className="size-4" /></button>
      </div>}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className={styles.graph} data-testid="brain-graph">
          {showSpinner ? <div className={styles.empty} role="status"><Network className="size-10 text-muted-foreground motion-safe:animate-pulse" /><p className="text-sm text-muted-foreground">{b("Loading your Brain…")}</p></div>
            : builtGraph.nodes.length === 0 && failedCount > 0 ? <div className={styles.empty} role="alert"><h2 className="text-lg font-semibold">{b("Could not load your Brain")}</h2><p className="text-sm text-muted-foreground">{b("Your data could not be loaded. Try again.")}</p><button className="rounded-xl border border-border px-4" onClick={() => void handleRefreshData().catch(() => {})}>{b("Retry")}</button></div>
            : isEmpty ? <div className={styles.empty}><Network className="size-10 text-muted-foreground" /><h2 className="text-lg font-semibold">{b("Your Brain starts here")}</h2><p className="max-w-sm text-sm text-muted-foreground">{b("Add a goal, project or note to start discovering connections.")}</p><Link className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm text-primary-foreground" href={knowledgePath}>{b("Open knowledge base")}</Link></div>
            : !hasResults ? <div className={styles.empty}><h2 className="font-semibold">{b("No nodes match these filters")}</h2><button className="rounded-xl border border-border px-4 text-sm" onClick={() => useBrainStore.getState().clearFilters()}>{b("Clear all filters")}</button></div>
            : isSphere ? <BrainSphere3D ref={sphereRef} data={visibleGraph} clusterBy={sphereClusterBy} onNodeClick={handleNodeClick} onBackgroundClick={handleBackgroundClick} onFocusZoomPercentChange={setSphereFocusZoomPct} />
            : <BrainCanvas ref={canvasRef} data={visibleGraph} brainLayoutEnabled={mode === "global"} selectedNodeId={selectedNodeId}
                spotlightDirect={spotlight?.direct ?? null} spotlightSecondary={spotlight?.secondary ?? null} spotlightDirectEdges={spotlight?.directEdges ?? null}
                localSubgraphMeta={mode === "local" ? localSubgraphMeta : null} isExplodedFocusLayout={explodedFocus} matchedNodeIds={matchedNodeIds} showLabels={showLabels}
                onNodeHover={setCanvasHoveredNode} onNodeClick={handleNodeClick} onNodeDoubleClick={handleNodeDoubleClick} onBackgroundClick={handleBackgroundClick} onZoomChange={setZoom} />}
          {hasResults && !showSpinner && (isSphere
            ? <SphereFocusZoomControls percent={sphereFocusZoomPct} onZoomIn={handleSphereFocusZoomIn} onZoomOut={handleSphereFocusZoomOut} onPercentClick={handleSphereFocusZoomResetFraming} onFit={handleSphereFitFullSphere} step={SPHERE_FOCUS_ZOOM_STEP} />
            : <GraphZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onResetZoom={handleResetZoom} onFit={handleFitGraph} className="[&>button]:!h-11 [&>button]:!min-w-11" />)}
          {panel && <BrainWorkspacePanels key={panel} panel={panel} nodes={densityGraph.nodes} selectedNodeId={selectedNodeId} onFocusNode={handleFocusNode} onClose={closePanels}
            onFilters={() => { closePanels(); setFiltersOpen(true); }} onLegend={() => { closePanels(); setLegendOpen(true); }}
            onResolver={() => { closePanels(); useBrainStore.getState().setOrphanResolverOpen(true); }}
            onReset={handleResetLayout} onRefresh={handleRefreshData} onDetails={() => { setInspectorOpen(!inspectorOpen); closePanels(); }} />}
          {filtersOpen && <div className={cn(styles.panel, styles.panelLeft)}><BrainFilters nodes={builtGraph.nodes} onClose={closePanels} variant="drawer" /></div>}
          <BrainLegend open={legendOpen} onClose={closePanels} domainCounts={domainCounts} />
          <BrainDiagnosticsOverlay graph={richGraph} />
          {isLgUp && selectedNode && inspectorOpen && !panel && !filtersOpen && !legendOpen && !orphanResolverOpen && <div className={styles.panel} data-testid="brain-desktop-details">
            <BrainDetailPanel selectedNode={selectedNode} incidentEdges={incidentEdges} nodeIndex={nodeIndex} onClose={() => setInspectorOpen(false)} onFocusNode={handleFocusNode} />
          </div>}
          {orphanResolverOpen && richGraph && <section className={styles.panel} aria-label={b("Find connections")}>
            <div className="flex shrink-0 items-center justify-between border-b border-border px-3"><h2 className="text-sm font-medium">{b("Find connections")}</h2><button className="flex size-11 items-center justify-center" onClick={closePanels} aria-label={b("Close connection suggestions")}><X className="size-4" /></button></div>
            <div className="min-h-0 flex-1 overflow-y-auto"><BrainOrphanResolver graph={richGraph} rejectedHashes={rejectedHashes} onFocusNode={handleFocusNode} /></div>
          </section>}
        </div>
        {!isLgUp && selectedNode && inspectorOpen && !orphanResolverOpen && <BrainMobileInspectorDock key={selectedNode.id} selectedNode={selectedNode} selectedNodeId={selectedNodeId} mode={mode} localOrbitState={localOrbitState} incidentEdges={incidentEdges} nodeIndex={nodeIndex} onFocusNode={handleFocusNode} onClearSelection={() => setInspectorOpen(false)} />}
      </div>
      <footer className={styles.status}>
        <span className="tabular-nums">{visibleGraph.nodes.length} {b("nodes")} · {visibleGraph.edges.length} {b("connections")}</span>
        {localNeedsSelection && <span className="hidden md:inline">{b("Select a node to explore its neighborhood.")}</span>}
        {!!search.trim() && <span role="status">{matchedNodeIds.size} {b("Search results").toLowerCase()}</span>}
        <button className="ml-auto flex items-center gap-1 rounded-lg px-2 hover:bg-muted" onClick={() => handlePanelChange("help")}><HelpCircle className="size-3.5" />{b("Help")}</button>
      </footer>
    </div>
  );
}
