"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Filter as FilterIcon, Minimize2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mapRowToCollection, mapRowToConnection, mapRowToItem } from "@/types/knowledge";
import type { KnowledgeConnection } from "@/types/knowledge";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { buildConstellationData } from "@/lib/knowledge/constellation/buildConstellationData";
import { filterConstellationData } from "@/lib/knowledge/constellation/filterConstellationData";
import { getLocalSubgraphByDepth } from "@/lib/knowledge/constellation/getLocalSubgraph";
import { applyReadableLocalOrbitLimits } from "@/lib/knowledge/constellation/readableLocalSubgraph";
import {
  computeLocalOrbitState,
  type LocalOrbitState,
} from "@/lib/knowledge/constellation/computeLocalOrbitState";
import { useKnowledgeFilteredItems } from "@/hooks/use-knowledge-filtered-items";
import type {
  ConstellationEdge,
  ConstellationGraphData,
  ConstellationNode,
} from "@/types/constellation";
import { Button } from "@/components/ui/button";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import { useIsConstellationLgUp } from "@/hooks/use-constellation-lg-up";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ConstellationCanvas,
  type ConstellationCanvasHandle,
} from "./ConstellationCanvas";
import { ConstellationToolbar } from "./ConstellationToolbar";
import { ConstellationFilters } from "./ConstellationFilters";
import { ConstellationDetailPanel } from "./ConstellationDetailPanel";
import { ConstellationLegend } from "./ConstellationLegend";
import { ConstellationEmptyState } from "./ConstellationEmptyState";
import ConstellationSphere3D, {
  type ConstellationSphere3DHandle,
} from "./ConstellationSphere3D";
import { GraphZoomControls } from "@/components/graph/GraphZoomControls";
import { cn } from "@/lib/utils";

function getBrowserFullscreenElement(): Element | null {
  if (typeof document === "undefined") return null;
  const d = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

async function exitBrowserFullscreen(): Promise<void> {
  const d = document as Document & { webkitExitFullscreen?: () => void };
  if (!getBrowserFullscreenElement()) return;
  if (typeof document.exitFullscreen === "function") {
    await document.exitFullscreen();
  } else {
    d.webkitExitFullscreen?.();
  }
}

async function requestElementFullscreen(el: HTMLElement): Promise<void> {
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => void | Promise<void>;
  };
  if (typeof el.requestFullscreen === "function") {
    await el.requestFullscreen();
  } else {
    await Promise.resolve(anyEl.webkitRequestFullscreen?.());
  }
}

interface ConstellationViewProps {
  userId: string;
}

const MAX_INITIAL_NODES_DESKTOP = 1500;
const MAX_INITIAL_NODES_MOBILE = 600;

function ConstellationNarrowInspectorDock({
  selectedNode,
  incidentEdges,
  nodeIndex,
  onFocusNode,
  onClose,
  onOpenKnowledge,
  onApplyFilter,
  localOrbitState,
  wrapClassName,
}: {
  selectedNode: ConstellationNode;
  incidentEdges: ConstellationEdge[];
  nodeIndex: Map<string, ConstellationNode>;
  onFocusNode: (id: string) => void;
  onClose: () => void;
  onOpenKnowledge: (id: string) => void;
  onApplyFilter: (filter: {
    tagIds?: string[];
    collectionIds?: string[];
    sourceTypes?: string[];
    projectIds?: string[];
  }) => void;
  localOrbitState: LocalOrbitState | null;
  wrapClassName: string;
}) {
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    setExpanded(true);
  }, [selectedNode.id]);

  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col border-t border-border/60 bg-background/92 shadow-[0_-10px_28px_rgba(0,0,0,0.28)] backdrop-blur-md lg:hidden",
        wrapClassName,
      )}
    >
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
          <ConstellationDetailPanel
            selectedNode={selectedNode}
            incidentEdges={incidentEdges}
            nodeIndex={nodeIndex}
            variant="bottomBar"
            hideHeaderClose
            onClose={onClose}
            onFocusNode={onFocusNode}
            onOpenKnowledge={onOpenKnowledge}
            onApplyFilter={onApplyFilter}
            localOrbitState={localOrbitState}
          />
        </div>
      </div>
    </div>
  );
}

export function ConstellationView({ userId }: ConstellationViewProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const c = ui.constellation;

  // Native KB filter pipeline — same source of truth as Gallery / Board /
  // Table. Switching views must never feel like a different dataset.
  const { items, filteredItems, summary } = useKnowledgeFilteredItems();
  const collections = useKnowledgeStore((s) => s.smartCollections);
  const selectKnowledgeItem = useKnowledgeStore((s) => s.selectItem);
  const clearAllListFilters = useKnowledgeStore((s) => s.clearAllListFilters);

  const mode = useKnowledgeStore((s) => s.constellationMode);
  const depth = useKnowledgeStore((s) => s.constellationDepth);
  const showLabels = useKnowledgeStore((s) => s.constellationShowLabels);
  const filters = useKnowledgeStore((s) => s.constellationFilters);
  const setFilters = useKnowledgeStore((s) => s.setConstellationFilters);
  const clusterBy = useKnowledgeStore((s) => s.constellationClusterBy);
  const selectedNodeId = useKnowledgeStore(
    (s) => s.constellationSelectedNodeId,
  );
  const setSelectedNodeId = useKnowledgeStore(
    (s) => s.setConstellationSelectedNodeId,
  );
  const filtersOpen = useKnowledgeStore((s) => s.constellationFiltersOpen);
  const setFiltersOpen = useKnowledgeStore(
    (s) => s.setConstellationFiltersOpen,
  );
  const legendOpen = useKnowledgeStore((s) => s.constellationLegendOpen);
  const setLegendOpen = useKnowledgeStore(
    (s) => s.setConstellationLegendOpen,
  );
  const inspectorOpen = useKnowledgeStore(
    (s) => s.constellationInspectorOpen,
  );
  const setInspectorOpen = useKnowledgeStore(
    (s) => s.setConstellationInspectorOpen,
  );

  const canvasRef = useRef<ConstellationCanvasHandle | null>(null);
  const sphereRef = useRef<ConstellationSphere3DHandle | null>(null);
  const graphFullscreenRef = useRef<HTMLDivElement | null>(null);
  const [graphFullscreenActive, setGraphFullscreenActive] = useState(false);
  const [graphFullscreenSupported, setGraphFullscreenSupported] =
    useState(false);
  const [isExplodedFocusLayout, setIsExplodedFocusLayout] = useState(false);
  const [zoom, setZoom] = useState<number>(1);

  // 3D Sphere always operates on the full filtered graph — local depth
  // doesn't make sense in that mode. Tracked separately so we don't
  // mutate `mode` and break the depth control state when switching back.
  const isSphere = mode === "sphere_3d";

  // ── Connections fetch ────────────────────────────────────────────
  // Pull `knowledge_connections` lazily on first mount of this view to
  // keep the initial KB page payload small. Strict userId scoping is
  // enforced by Supabase RLS plus a defense-in-depth client-side filter
  // that drops any row touching an item not in the live items map.
  const [connections, setConnections] = useState<KnowledgeConnection[]>([]);
  const [connectionsState, setConnectionsState] =
    useState<"idle" | "loading" | "ready" | "failed">("idle");

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;
    if (items.length === 0) return;
    const knownIds = new Set(items.map((i) => i.id));
    const ids = [...knownIds];
    const chunkSize = 120;
    (async () => {
      if (!cancelled) setConnectionsState("loading");
      const supabase = createClient();
      try {
        const byId = new Map<string, KnowledgeConnection>();
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          const [{ data: aRows }, { data: bRows }] = await Promise.all([
            supabase
              .from("knowledge_connections")
              .select("*")
              .in("source_item_id", chunk),
            supabase
              .from("knowledge_connections")
              .select("*")
              .in("target_item_id", chunk),
          ]);
          for (const row of [...(aRows ?? []), ...(bRows ?? [])]) {
            const conn = mapRowToConnection(row as Record<string, unknown>);
            if (
              knownIds.has(conn.sourceItemId) &&
              knownIds.has(conn.targetItemId)
            ) {
              byId.set(conn.id, conn);
            }
          }
        }
        if (!cancelled) {
          setConnections([...byId.values()]);
          setConnectionsState("ready");
        }
      } catch {
        if (!cancelled) {
          setConnections([]);
          setConnectionsState("failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, items.length]);

  // ── Build graph ──────────────────────────────────────────────────
  // Build from the *filtered* item list — KB filters are now first-class
  // graph filters by construction.
  const builtGraph: ConstellationGraphData = useMemo(() => {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches;
    return buildConstellationData({
      userId,
      knowledgeItems: filteredItems,
      collections,
      connections,
      options: {
        maxNodes: isMobile
          ? MAX_INITIAL_NODES_MOBILE
          : MAX_INITIAL_NODES_DESKTOP,
        includeSourceNodes: false,
        includeTagNodes: !isMobile || filteredItems.length < 200,
        hideGenericTags: true,
        // Tighter on mobile to keep things readable.
        minTagPopularity: isMobile ? 3 : 2,
      },
    });
  }, [userId, filteredItems, collections, connections]);

  // ── Apply graph-only filters ─────────────────────────────────────
  const filtered = useMemo(
    () =>
      filterConstellationData({
        nodes: builtGraph.nodes,
        edges: builtGraph.edges,
        filters: { ...filters, search: filters.search },
      }),
    [builtGraph, filters],
  );

  // ── Local mode subgraph (depth-aware; same source as canvas meta) ─
  // 3D Sphere always shows the full filtered graph — selecting a node
  // in 3D triggers focus highlighting, not a subgraph cut.
  const scoringNodes = useMemo(
    () => new Map(filtered.nodes.map((n) => [n.id, n])),
    [filtered.nodes],
  );

  const orbitAvailabilityPack = useMemo(() => {
    if (mode !== "local" || !selectedNodeId) return null;
    return getLocalSubgraphByDepth({
      nodes: filtered.nodes,
      edges: filtered.edges,
      centerNodeId: selectedNodeId,
      depth: 3,
    });
  }, [mode, selectedNodeId, filtered]);

  const orbitViewRawPack = useMemo(() => {
    if (mode !== "local" || !selectedNodeId) return null;
    return getLocalSubgraphByDepth({
      nodes: filtered.nodes,
      edges: filtered.edges,
      centerNodeId: selectedNodeId,
      depth,
    });
  }, [mode, selectedNodeId, depth, filtered]);

  const orbitDisplayPack = useMemo(() => {
    if (!orbitViewRawPack || !selectedNodeId) return null;
    return applyReadableLocalOrbitLimits(
      orbitViewRawPack,
      selectedNodeId,
      depth,
      scoringNodes,
    );
  }, [orbitViewRawPack, selectedNodeId, depth, scoringNodes]);

  const localPack = orbitDisplayPack;

  const visibleGraph: ConstellationGraphData = useMemo(() => {
    if (mode !== "local" || !selectedNodeId) {
      return { nodes: filtered.nodes, edges: filtered.edges };
    }
    if (!localPack) return { nodes: filtered.nodes, edges: filtered.edges };
    return { nodes: localPack.nodes, edges: localPack.edges };
  }, [mode, selectedNodeId, filtered, localPack]);

  const localSubgraphMeta = useMemo(() => {
    if (!localPack) return null;
    return {
      nodeDepthMap: localPack.nodeDepthMap,
      edgeDepthMap: localPack.edgeDepthMap,
      parentIdMap: localPack.parentIdMap,
      viewDepth: depth,
    };
  }, [localPack, depth]);

  const constellationLocalOrbit = useMemo(() => {
    if (mode !== "local" || !selectedNodeId || !orbitAvailabilityPack) return null;
    return computeLocalOrbitState({
      centerNodeId: selectedNodeId,
      nodes: orbitAvailabilityPack.nodes,
      edges: orbitAvailabilityPack.edges,
      nodeDepthMap: orbitAvailabilityPack.nodeDepthMap,
      parentIdMap: orbitAvailabilityPack.parentIdMap,
      maxDepth: depth,
      canvasSubset:
        localPack !== null
          ? {
              nodeCount: localPack.stats.canvasNodes,
              edgeCount: localPack.stats.canvasEdges,
            }
          : undefined,
    });
  }, [mode, selectedNodeId, orbitAvailabilityPack, depth, localPack]);

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

  // ── Focus Isolation sets ─────────────────────────────────────────
  // Pre-compute exactly the foreground mini-network:
  // selected node + direct neighbours + direct edges. The canvas uses
  // this to render a strict two-layer view:
  // foreground = selected/direct only; background = everything else.
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

  // ── Handlers ─────────────────────────────────────────────────────
  const handleFocusNode = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setIsExplodedFocusLayout(false);
    },
    [setSelectedNodeId],
  );

  const handleNodeClick = useCallback(
    (node: ConstellationNode) => {
      // First click selects/focuses. A second single-click on the same
      // selected node opens the relationship network like a firework.
      if (selectedNodeId === node.id) {
        setIsExplodedFocusLayout(true);
        return;
      }
      setSelectedNodeId(node.id);
      setIsExplodedFocusLayout(false);
    },
    [selectedNodeId, setSelectedNodeId],
  );

  const toggleCategoryFilter = useKnowledgeStore((s) => s.toggleCategoryFilter);

  const handleNodeDoubleClick = useCallback(
    (node: ConstellationNode) => {
      switch (node.type) {
        case "knowledge":
          if (node.knowledgeId) selectKnowledgeItem(node.knowledgeId);
          return;
        case "category":
          // Apply filter to the *native* KB store, not the constellation-
          // only one. This keeps Gallery / Board / Table / Constellation
          // looking at the same dataset after the user drills in.
          if (node.categoryId) {
            const cat = node.categoryId as Parameters<typeof toggleCategoryFilter>[0];
            // If it's not already on, turn it on. We don't toggle off here
            // because the user explicitly drilled into the category.
            if (
              !useKnowledgeStore.getState().activeCategoryFilters.includes(cat)
            ) {
              toggleCategoryFilter(cat);
            }
          }
          return;
        case "tag":
          if (node.tagId) setFilters({ tagIds: [node.tagId] });
          return;
        case "collection":
          if (node.collectionId)
            setFilters({ collectionIds: [node.collectionId] });
          return;
        case "source":
          if (node.sourceType) setFilters({ sourceTypes: [node.sourceType] });
          return;
        case "project":
          if (node.projectId) setFilters({ projectIds: [node.projectId] });
          return;
        default:
          handleFocusNode(node.id);
      }
    },
    [handleFocusNode, selectKnowledgeItem, setFilters, toggleCategoryFilter],
  );

  const handleBackgroundClick = useCallback(() => {
    // Background click exits Spotlight Mode and restores the global feel.
    setSelectedNodeId(null);
    setIsExplodedFocusLayout(false);
  }, [setSelectedNodeId]);

  const handleResetLayout = useCallback(() => {
    if (isSphere) {
      // 3D Sphere: re-frame the camera but DO NOT clear selection — the
      // user's "Reset Sphere" intent is "give me a clean view", not
      // "deselect what I was inspecting".
      sphereRef.current?.resetLayout();
      return;
    }
    canvasRef.current?.resetLayout();
    setSelectedNodeId(null);
    setIsExplodedFocusLayout(false);
  }, [isSphere, setSelectedNodeId]);

  const handleFitGraph = useCallback(() => {
    if (isSphere) {
      sphereRef.current?.fitGraph();
      return;
    }
    canvasRef.current?.fitGraph();
  }, [isSphere]);

  const handleRefreshData = useCallback(async () => {
    const supabase = createClient();
    const [itemsResult, collectionsResult] = await Promise.all([
      supabase
        .from("knowledge_items")
        .select("*")
        .eq("user_id", userId)
        .order("date_added", { ascending: false }),
      supabase
        .from("knowledge_smart_collections")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (itemsResult.data) {
      useKnowledgeStore
        .getState()
        .setItems(itemsResult.data.map((r) => mapRowToItem(r as Record<string, unknown>)));
    }
    if (collectionsResult.data) {
      useKnowledgeStore
        .getState()
        .setCollections(
          collectionsResult.data.map((r) => mapRowToCollection(r as Record<string, unknown>)),
        );
    }
  }, [userId]);

  const handleApplyFilter = useCallback(
    (f: {
      tagIds?: string[];
      collectionIds?: string[];
      sourceTypes?: string[];
      projectIds?: string[];
    }) => {
      setFilters(f);
    },
    [setFilters],
  );

  // Reset selected node when it disappears from the graph.
  useEffect(() => {
    if (selectedNodeId && !nodeIndex.has(selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodeIndex, selectedNodeId, setSelectedNodeId]);

  // Auto-open the desktop inspector once a node is selected. We never
  // force it open on first load (intentional: the graph starts wide,
  // the panel only appears after an explicit interaction).
  useEffect(() => {
    if (selectedNodeId && !inspectorOpen) {
      setInspectorOpen(true);
    }
  }, [selectedNodeId, inspectorOpen, setInspectorOpen]);

  const handleZoomIn = useCallback(() => {
    if (isSphere) return;
    canvasRef.current?.zoomBy(1.25);
  }, [isSphere]);
  const handleZoomOut = useCallback(() => {
    if (isSphere) return;
    canvasRef.current?.zoomBy(1 / 1.25);
  }, [isSphere]);
  const handleResetZoom = useCallback(() => {
    if (isSphere) {
      sphereRef.current?.fitGraph();
      return;
    }
    canvasRef.current?.zoomTo100();
  }, [isSphere]);

  // Sync `filters.search` with the toolbar's debounced search field.
  const search = useKnowledgeStore((s) => s.constellationSearch);
  useEffect(() => {
    setFilters({ search });
  }, [search, setFilters]);

  useEffect(() => {
    const probe = document.createElement("div");
    const supported =
      typeof probe.requestFullscreen === "function" ||
      typeof (probe as HTMLElement & { webkitRequestFullscreen?: unknown })
        .webkitRequestFullscreen === "function";
    setGraphFullscreenSupported(supported);
  }, []);

  const syncGraphFullscreenState = useCallback(() => {
    const el = graphFullscreenRef.current;
    setGraphFullscreenActive(!!el && getBrowserFullscreenElement() === el);
  }, []);

  useEffect(() => {
    const onChange = () => syncGraphFullscreenState();
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [syncGraphFullscreenState]);

  const toggleGraphFullscreen = useCallback(async () => {
    const el = graphFullscreenRef.current;
    if (!el) return;
    try {
      if (getBrowserFullscreenElement() === el) {
        await exitBrowserFullscreen();
      } else {
        await requestElementFullscreen(el);
      }
    } catch {
      /* user gesture / policy — ignore */
    }
  }, []);

  // Auto-focus first match when search has matches — without filtering
  // the rest away, so the user keeps their bearing.
  const matchedIds = filtered.matchedNodeIds;
  useEffect(() => {
    if (search.trim() && matchedIds.size > 0) {
      const first = matchedIds.values().next().value;
      if (first) {
        requestAnimationFrame(() => {
          if (isSphere) {
            sphereRef.current?.focusNode(first);
          } else {
            canvasRef.current?.focusNode(first);
          }
        });
      }
    }
  }, [search, matchedIds, isSphere]);

  useEffect(() => {
    if (!graphFullscreenActive) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        if (isSphere) sphereRef.current?.fitGraph();
        else handleFitGraph();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [graphFullscreenActive, isSphere, handleFitGraph]);

  // ── Render ───────────────────────────────────────────────────────
  const hasAnyKnowledge = items.length > 0;
  const isEmpty = !hasAnyKnowledge;
  const hasFilteredResults = visibleGraph.nodes.length > 0;
  const localNeedsSelection = mode === "local" && !selectedNodeId;
  const filtersFilteredEverythingOut =
    hasAnyKnowledge && filteredItems.length === 0 && summary.hasAnyFilter;

  const isLgUp = useIsConstellationLgUp();
  const showNarrowInspector =
    !isLgUp && !!selectedNode && hasFilteredResults && !isEmpty;

  const { t: graphT } = useGraphSurface();
  const graphShell = graphT.shell;

  return (
    <div
      className={`relative flex h-full min-h-[520px] w-full overflow-hidden ${graphShell.pageTextClass}`}
      style={{ background: graphShell.pageBg }}
    >
      {/* Left: Filters (desktop) */}
      <div
        className="hidden lg:block"
        aria-hidden={!filtersOpen}
        style={{ display: filtersOpen ? "block" : "none" }}
      >
        <ConstellationFilters
          nodes={builtGraph.nodes}
          variant="panel"
          onClose={() => setFiltersOpen(false)}
        />
      </div>

      {/* Center: Toolbar + graph column (+ in-flow bottom inspector on narrow) */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <ConstellationToolbar
          nodes={visibleGraph.nodes}
          nodeCount={visibleGraph.nodes.length}
          edgeCount={visibleGraph.edges.length}
          onRefreshData={handleRefreshData}
          onResetLayout={handleResetLayout}
          onFitGraph={handleFitGraph}
          onFocusNode={(id) => {
            handleFocusNode(id);
            // In 3D, also rotate the camera toward the picked node so
            // the user sees what they searched for.
            if (isSphere) {
              requestAnimationFrame(() => sphereRef.current?.focusNode(id));
            }
          }}
          graphFullscreenSupported={
            graphFullscreenSupported && hasFilteredResults && !isEmpty
          }
          graphFullscreenActive={graphFullscreenActive}
          onToggleGraphFullscreen={() => void toggleGraphFullscreen()}
        />

        {/* Native-filter banner — shown whenever the KB filter narrowed
            the graph. Reinforces "this graph respects your KB filters". */}
        {!isEmpty && summary.hasAnyFilter && hasFilteredResults && (
          <div
            className={`pointer-events-auto absolute left-1/2 top-12 z-20 flex -translate-x-1/2 items-center gap-2 px-3.5 py-1.5 text-xs backdrop-blur-md ${graphT.banner.wrap}`}
          >
            <FilterIcon className="h-3 w-3 text-cyan-500 dark:text-cyan-300" aria-hidden />
            <span className={graphT.banner.text}>
              {filteredItems.length} / {items.length}
            </span>
            <button
              type="button"
              onClick={() => clearAllListFilters()}
              className={`ml-1 ${graphT.banner.btn}`}
            >
              {ui.emptyFilteredClearButton}
            </button>
          </div>
        )}

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            ref={graphFullscreenRef}
            className="relative min-h-0 flex-1 overflow-hidden"
          >
            {graphFullscreenActive && (
              <div className="pointer-events-none absolute inset-0 z-[100] flex justify-end p-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="pointer-events-auto gap-1.5 shadow-md"
                  onClick={() => void exitBrowserFullscreen()}
                >
                  <Minimize2 className="h-4 w-4 shrink-0" aria-hidden />
                  {c.graphFullscreenExit}
                </Button>
              </div>
            )}
            {isEmpty ? (
              <ConstellationEmptyState variant="empty" />
            ) : filtersFilteredEverythingOut ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <p className={`text-sm font-medium ${graphT.tone.title}`}>
                  {ui.emptyStateNoMatchesTitle}
                </p>
                <p className={`max-w-sm text-xs ${graphT.tone.muted}`}>
                  {ui.emptyStateNoMatchesDescription}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className={`${graphT.tone.inset} ${graphT.tone.body}`}
                  onClick={() => clearAllListFilters()}
                >
                  {ui.emptyFilteredClearButton}
                </Button>
              </div>
            ) : connectionsState === "loading" && connections.length === 0 ? (
              <div className={`flex h-full items-center justify-center text-sm ${graphT.tone.muted}`}>
                {c.loadingGraphData}
              </div>
            ) : !hasFilteredResults ? (
              <ConstellationEmptyState variant="no-results" />
            ) : isSphere ? (
              <ConstellationSphere3D
                ref={sphereRef}
                data={visibleGraph}
                selectedNodeId={selectedNodeId}
                spotlightDirect={spotlight?.direct ?? null}
                spotlightDirectEdges={spotlight?.directEdges ?? null}
                matchedNodeIds={filtered.matchedNodeIds}
                showLabels={showLabels}
                clusterBy={clusterBy}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onBackgroundClick={handleBackgroundClick}
              />
            ) : (
              <ConstellationCanvas
                ref={canvasRef}
                data={visibleGraph}
                selectedNodeId={selectedNodeId}
                spotlightDirect={spotlight?.direct ?? null}
                spotlightSecondary={spotlight?.secondary ?? null}
                spotlightDirectEdges={spotlight?.directEdges ?? null}
                localSubgraphMeta={mode === "local" ? localSubgraphMeta : null}
                isExplodedFocusLayout={isExplodedFocusLayout}
                matchedNodeIds={filtered.matchedNodeIds}
                showLabels={showLabels}
                onNodeHover={() => {
                  /* canvas owns hover state internally */
                }}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onBackgroundClick={handleBackgroundClick}
                onZoomChange={(z) => setZoom(z)}
              />
            )}

            {/* Floating zoom controls (2D only — 3D Sphere has its own
                native rotate/zoom controls). Lives in the same
                bottom-left position on both pages for muscle memory. */}
            {!isEmpty && hasFilteredResults && !isSphere && (
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
                estate. */}
            {!isEmpty && hasFilteredResults && !selectedNodeId && !inspectorOpen && (
              <div
                className={`pointer-events-none absolute right-3 top-3 z-20 hidden rounded-full px-3 py-1 text-[11px] backdrop-blur-md sm:inline-flex ${graphT.banner.wrap}`}
              >
                <span className={graphT.banner.subText}>
                  Click a node to inspect details
                </span>
              </div>
            )}

            {!isEmpty && hasFilteredResults && localNeedsSelection && (
              <div
                className={`pointer-events-none absolute left-1/2 bottom-4 z-20 flex -translate-x-1/2 items-center gap-2 px-3.5 py-1.5 text-xs backdrop-blur-md ${graphT.banner.wrap}`}
              >
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.45)] dark:bg-violet-300 dark:shadow-[0_0_8px_rgba(196,181,253,0.85)]"
                />
                <span className={graphT.banner.text}>{c.localNoSelectionTitle}</span>
                <span className={graphT.banner.subText}>{c.localNoSelectionDescription}</span>
              </div>
            )}

            <ConstellationLegend
              open={legendOpen}
              onClose={() => setLegendOpen(false)}
            />
          </div>

          {showNarrowInspector && (
            <ConstellationNarrowInspectorDock
              selectedNode={selectedNode}
              incidentEdges={incidentEdges}
              nodeIndex={nodeIndex}
              onFocusNode={handleFocusNode}
              onClose={() => setSelectedNodeId(null)}
              onOpenKnowledge={(id) => selectKnowledgeItem(id)}
              onApplyFilter={handleApplyFilter}
              localOrbitState={constellationLocalOrbit}
              wrapClassName={graphT.bottomInspector.wrap}
            />
          )}
        </div>
      </div>

      {/* Right: Detail (desktop) — Closed by default. Opens
          automatically once a node is selected (see effect above)
          or the user clicks the "Details" toggle on the toolbar.
          Closing the panel via its X also clears the selection so
          the graph fully reclaims the space. */}
      {inspectorOpen && (
        <div className="hidden lg:block">
          <ConstellationDetailPanel
            selectedNode={selectedNode}
            incidentEdges={incidentEdges}
            nodeIndex={nodeIndex}
            onClose={() => {
              setSelectedNodeId(null);
              setInspectorOpen(false);
            }}
            onFocusNode={handleFocusNode}
            onOpenKnowledge={(id) => selectKnowledgeItem(id)}
            onApplyFilter={handleApplyFilter}
            localOrbitState={constellationLocalOrbit}
          />
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
          <SheetTitle className="sr-only">{c.filtersTitle}</SheetTitle>
          <ConstellationFilters
            nodes={builtGraph.nodes}
            variant="drawer"
            onClose={() => setFiltersOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
