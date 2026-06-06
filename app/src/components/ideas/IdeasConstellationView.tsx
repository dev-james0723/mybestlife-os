"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  Eye,
  EyeOff,
  Globe2,
  Info,
  Link2,
  Maximize2,
  Minimize2,
  PanelRight,
  PanelRightClose,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraphZoomControls } from "@/components/graph/GraphZoomControls";
import {
  ConstellationCanvas,
  type ConstellationCanvasHandle,
} from "@/components/knowledge/constellation/ConstellationCanvas";
import {
  EDGE_STYLE,
  EDGE_TYPE_LABEL,
  NODE_COLORS,
} from "@/lib/knowledge/constellation/constants";
import {
  graphDetailShellClass,
  type GraphSurfaceMode,
} from "@/lib/knowledge/constellation/graphThemeTokens";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import { filterConstellationData } from "@/lib/knowledge/constellation/filterConstellationData";
import { getLocalSubgraphByDepth } from "@/lib/knowledge/constellation/getLocalSubgraph";
import { buildIdeasConstellationData } from "@/lib/ideas/build-ideas-constellation-data";
import { useAppStore } from "@/stores/app-store";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { cn } from "@/lib/utils";
import type {
  ConstellationDepth,
  ConstellationEdge,
  ConstellationGraphData,
  ConstellationNode,
} from "@/types/constellation";
import type { Idea } from "@/types/database";

type IdeasGraphMode = "global" | "local";

const DEPTHS: ConstellationDepth[] = [1, 2, 3];
const LEGEND_EDGE_TYPES = [
  "manual_link",
  "ai_suggested_link",
  "shared_tag",
  "idea_project",
  "idea_knowledge",
  "domain_tag",
] as const;

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

function formatIdeaDate(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function edgeOtherNode(
  selectedNodeId: string,
  edge: ConstellationEdge,
  nodeIndex: Map<string, ConstellationNode>,
): ConstellationNode | null {
  const otherId = edge.source === selectedNodeId ? edge.target : edge.source;
  return nodeIndex.get(otherId) ?? null;
}

function IdeasConstellationToolbar({
  nodes,
  nodeCount,
  edgeCount,
  mode,
  depth,
  search,
  showLabels,
  hideOrphans,
  inspectorOpen,
  legendOpen,
  graphFullscreenSupported,
  graphFullscreenActive,
  onSearchChange,
  onFocusNode,
  onModeChange,
  onDepthChange,
  onShowLabelsChange,
  onHideOrphansChange,
  onResetLayout,
  onToggleInspector,
  onToggleLegend,
  onToggleGraphFullscreen,
}: {
  nodes: ConstellationNode[];
  nodeCount: number;
  edgeCount: number;
  mode: IdeasGraphMode;
  depth: ConstellationDepth;
  search: string;
  showLabels: boolean;
  hideOrphans: boolean;
  inspectorOpen: boolean;
  legendOpen: boolean;
  graphFullscreenSupported: boolean;
  graphFullscreenActive: boolean;
  onSearchChange: (value: string) => void;
  onFocusNode: (nodeId: string) => void;
  onModeChange: (mode: IdeasGraphMode) => void;
  onDepthChange: (depth: ConstellationDepth) => void;
  onShowLabelsChange: (show: boolean) => void;
  onHideOrphansChange: (hide: boolean) => void;
  onResetLayout: () => void;
  onToggleInspector: () => void;
  onToggleLegend: () => void;
  onToggleGraphFullscreen: () => void;
}) {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const { t: graphT } = useGraphSurface();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .filter((node) => node.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [nodes, search]);

  return (
    <div className={graphT.toolbar.wrap}>
      <div className="relative min-w-[180px] flex-1 sm:min-w-[240px] sm:max-w-md">
        <Search
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
            graphT.toolbar.meta,
          )}
          aria-hidden
        />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 120)}
          placeholder={ui.constellation.searchPlaceholder}
          aria-label={ui.constellation.searchPlaceholder}
          className={graphT.toolbar.input}
        />
        {dropdownOpen && matches.length > 0 ? (
          <ul role="listbox" className={graphT.toolbar.dropdown}>
            {matches.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  className={graphT.toolbar.dropdownItem}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onFocusNode(node.id);
                    setDropdownOpen(false);
                  }}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: NODE_COLORS.idea.core,
                      boxShadow: `0 0 6px ${NODE_COLORS.idea.glow}`,
                    }}
                    aria-hidden
                  />
                  <span className="truncate">{node.label}</span>
                  <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {ui.constellation.ideaNode}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div
        role="group"
        aria-label={ui.constellation.mode}
        className="flex shrink-0 items-center rounded-lg border border-border/60 bg-muted/40 p-0.5"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={mode === "global"}
          className={cn(
            "h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            mode === "global" &&
              "bg-cyan-400/15 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.3)]",
          )}
          onClick={() => onModeChange("global")}
        >
          <Globe2 className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">{ui.constellation.globalMode}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={mode === "local"}
          className={cn(
            "h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            mode === "local" &&
              "bg-violet-400/15 text-violet-200 shadow-[inset_0_0_0_1px_rgba(196,181,253,0.3)]",
          )}
          onClick={() => onModeChange("local")}
        >
          <Target className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">{ui.constellation.localMode}</span>
        </Button>
      </div>

      {mode === "local" ? (
        <div
          role="group"
          aria-label={ui.constellation.depth}
          className="flex shrink-0 items-center gap-1"
        >
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {ui.constellation.depth}
          </span>
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
            {DEPTHS.map((d) => (
              <Button
                key={d}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={depth === d}
                className={cn(
                  "h-7 w-7 p-0 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  depth === d &&
                    "bg-violet-400/20 text-violet-100 shadow-[inset_0_0_0_1px_rgba(196,181,253,0.3)]",
                )}
                onClick={() => onDepthChange(d)}
              >
                {d}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={showLabels}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            showLabels && "text-foreground",
          )}
          onClick={() => onShowLabelsChange(!showLabels)}
          aria-label={ui.constellation.showLabels}
        >
          {showLabels ? (
            <Eye className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <EyeOff className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className="hidden sm:inline">{ui.constellation.showLabels}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={hideOrphans}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            hideOrphans && "text-foreground",
          )}
          onClick={() => onHideOrphansChange(!hideOrphans)}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden md:inline">{ui.constellation.hideUnconnected}</span>
        </Button>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          aria-label={ui.constellation.resetLayout}
          title={ui.constellation.resetLayout}
          onClick={onResetLayout}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        </Button>
        {graphFullscreenSupported ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            aria-pressed={graphFullscreenActive}
            aria-label={
              graphFullscreenActive
                ? ui.constellation.exitFullscreen
                : ui.constellation.enterFullscreen
            }
            title={
              graphFullscreenActive
                ? ui.constellation.exitFullscreen
                : ui.constellation.enterFullscreen
            }
            onClick={onToggleGraphFullscreen}
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={legendOpen}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            legendOpen && "text-foreground",
          )}
          onClick={onToggleLegend}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden md:inline">{ui.constellation.legend}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={inspectorOpen}
          className={cn(
            "hidden h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground lg:inline-flex",
            inspectorOpen && "text-foreground",
          )}
          onClick={onToggleInspector}
        >
          {inspectorOpen ? (
            <PanelRightClose className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <PanelRight className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className="hidden xl:inline">
            {inspectorOpen
              ? ui.constellation.hideDetails
              : ui.constellation.details}
          </span>
        </Button>
      </div>

      <div className="ml-auto hidden shrink-0 items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground lg:flex">
        <span>
          <span className="font-mono text-foreground/90">{nodeCount}</span>{" "}
          {ui.constellation.nodes}
        </span>
        <span>
          <span className="font-mono text-foreground/90">{edgeCount}</span>{" "}
          {ui.constellation.edges}
        </span>
      </div>
    </div>
  );
}

function IdeasConstellationLegend({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const { t: graphT } = useGraphSurface();

  if (!open) return null;

  return (
    <div role="dialog" aria-label={ui.constellation.legend} className={graphT.legend.wrap}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium tracking-tight text-foreground">
          {ui.constellation.legend}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", graphT.tone.ghostBtn)}
          onClick={onClose}
          aria-label={ui.detailClose}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {ui.constellation.nodes}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: NODE_COLORS.idea.core,
                boxShadow: `0 0 8px ${NODE_COLORS.idea.glow}`,
              }}
              aria-hidden
            />
            <span className="text-foreground/90">{ui.constellation.ideaNode}</span>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {ui.constellation.edges}
          </p>
          <ul className="space-y-1 text-xs">
            {LEGEND_EDGE_TYPES.map((type) => (
              <li key={type} className="flex items-center gap-2">
                <span
                  className="inline-block w-6"
                  style={{
                    height: Math.max(1, EDGE_STYLE[type].width),
                    backgroundColor: EDGE_STYLE[type].dashed
                      ? "transparent"
                      : EDGE_STYLE[type].color,
                    borderTop: EDGE_STYLE[type].dashed
                      ? `1px dashed ${EDGE_STYLE[type].color}`
                      : undefined,
                  }}
                  aria-hidden
                />
                <span className="text-foreground/90">
                  {ui.constellation.edgeLabels[type] ?? EDGE_TYPE_LABEL[type]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function IdeasConstellationInspector({
  selectedNode,
  incidentEdges,
  nodeIndex,
  variant,
  graphMode,
  onClose,
  onFocusNode,
  onExploreLocal,
}: {
  selectedNode: ConstellationNode | null;
  incidentEdges: ConstellationEdge[];
  nodeIndex: Map<string, ConstellationNode>;
  variant: "panel" | "bottomBar";
  graphMode: GraphSurfaceMode;
  onClose: () => void;
  onFocusNode: (id: string) => void;
  onExploreLocal: (id: string) => void;
}) {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const { t: graphT } = useGraphSurface();
  const tone = graphT.tone;

  if (variant === "bottomBar" && !selectedNode) return null;

  const containerClass = cn(
    "flex flex-col gap-0 overflow-hidden text-sm",
    graphDetailShellClass(graphMode, variant),
  );

  if (!selectedNode) {
    return (
      <aside className={containerClass} aria-label={ui.constellation.details}>
        <div className={cn("flex shrink-0 items-center justify-between border-b px-3 py-2", tone.border)}>
          <h3 className={cn("text-xs font-medium uppercase tracking-wider", tone.heading)}>
            {ui.constellation.noSelection}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", tone.ghostBtn)}
            onClick={onClose}
            aria-label={ui.detailClose}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
        <div className={cn("flex flex-1 items-center justify-center p-6 text-center text-sm", tone.muted)}>
          {ui.constellation.noSelectionHint}
        </div>
      </aside>
    );
  }

  const createdAt = formatIdeaDate(selectedNode.createdAt);
  const related = incidentEdges
    .map((edge) => ({
      edge,
      node: edgeOtherNode(selectedNode.id, edge, nodeIndex),
    }))
    .filter((item): item is { edge: ConstellationEdge; node: ConstellationNode } =>
      Boolean(item.node),
    );

  return (
    <aside className={containerClass} aria-label={selectedNode.label}>
      <div className={cn("flex shrink-0 items-center justify-between border-b px-3 py-2", tone.border)}>
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              backgroundColor: NODE_COLORS.idea.core,
              boxShadow: `0 0 10px ${NODE_COLORS.idea.glow}`,
            }}
            aria-hidden
          />
          <h3 className={cn("truncate text-sm font-medium", tone.title)}>
            {selectedNode.label}
          </h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("ml-2 h-7 w-7 shrink-0", tone.ghostBtn)}
          onClick={onClose}
          aria-label={ui.detailClose}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", tone.badge)}>
            {ui.constellation.ideaNode}
          </span>
          {typeof selectedNode.metadata?.status === "string" ? (
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", tone.badge)}>
              {ui.statusLabels[selectedNode.metadata.status as Idea["status"]]}
            </span>
          ) : null}
          {createdAt ? (
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", tone.badge)}>
              {createdAt}
            </span>
          ) : null}
        </div>

        {selectedNode.description ? (
          <p className={cn("text-sm leading-6", tone.body)}>
            {selectedNode.description}
          </p>
        ) : null}

        {selectedNode.tags && selectedNode.tags.length > 0 ? (
          <div>
            <p className={cn("mb-2 text-[10px] uppercase tracking-wider", tone.heading)}>
              {ui.tags}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedNode.tags.slice(0, 10).map((tag) => (
                <span
                  key={tag}
                  className={cn("rounded-full border px-2 py-0.5 text-[11px]", tone.badge)}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("h-8 gap-1.5 text-xs", tone.inset, tone.body)}
            onClick={() => onExploreLocal(selectedNode.id)}
          >
            <Compass className="h-3.5 w-3.5" aria-hidden />
            {ui.constellation.exploreLocal}
          </Button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className={cn("text-[10px] uppercase tracking-wider", tone.heading)}>
              {ui.constellation.connections}
            </p>
            <span className={cn("font-mono text-[11px]", tone.muted)}>
              {related.length}
            </span>
          </div>
          {related.length > 0 ? (
            <ul className="space-y-1.5">
              {related.slice(0, 16).map(({ edge, node }) => (
                <li key={edge.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                      tone.inset,
                      tone.rowHover,
                    )}
                    onClick={() => onFocusNode(node.id)}
                  >
                    <Link2 className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", tone.muted)} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-xs font-medium", tone.title)}>
                        {node.label}
                      </span>
                      <span className={cn("mt-0.5 block line-clamp-2 text-[11px]", tone.muted)}>
                        {edge.reason ||
                          ui.constellation.edgeLabels[edge.type] ||
                          EDGE_TYPE_LABEL[edge.type]}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className={cn("rounded-lg border p-3 text-xs", tone.inset, tone.muted)}>
              {ui.constellation.noConnections}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export function IdeasConstellationView({ items }: { items: Idea[] }) {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const { mode: graphMode, t: graphT } = useGraphSurface();
  const canvasRef = useRef<ConstellationCanvasHandle | null>(null);
  const graphFullscreenRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<IdeasGraphMode>("global");
  const [depth, setDepth] = useState<ConstellationDepth>(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showLabels, setShowLabels] = useState(false);
  const [hideOrphans, setHideOrphans] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [isExplodedFocusLayout, setIsExplodedFocusLayout] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [graphFullscreenSupported] = useState(() => {
    if (typeof document === "undefined") return false;
    const probe = document.createElement("div");
    return (
      typeof probe.requestFullscreen === "function" ||
      typeof (probe as HTMLElement & { webkitRequestFullscreen?: unknown })
        .webkitRequestFullscreen === "function"
    );
  });
  const [graphFullscreenActive, setGraphFullscreenActive] = useState(false);

  const builtGraph = useMemo(
    () =>
      buildIdeasConstellationData(items, {
        maxNodes:
          typeof window !== "undefined" &&
          window.matchMedia("(max-width: 640px)").matches
            ? 300
            : 700,
      }),
    [items],
  );

  const filtered = useMemo(
    () =>
      filterConstellationData({
        nodes: builtGraph.nodes,
        edges: builtGraph.edges,
        filters: {
          search,
          hideOrphanNodes: hideOrphans,
        },
      }),
    [builtGraph, hideOrphans, search],
  );

  const localPack = useMemo(() => {
    if (mode !== "local" || !selectedNodeId) return null;
    return getLocalSubgraphByDepth({
      nodes: filtered.nodes,
      edges: filtered.edges,
      centerNodeId: selectedNodeId,
      depth,
    });
  }, [depth, filtered.edges, filtered.nodes, mode, selectedNodeId]);

  const visibleGraph: ConstellationGraphData = useMemo(() => {
    if (mode === "local" && selectedNodeId && localPack) {
      return { nodes: localPack.nodes, edges: localPack.edges };
    }
    return { nodes: filtered.nodes, edges: filtered.edges };
  }, [filtered.edges, filtered.nodes, localPack, mode, selectedNodeId]);

  const localSubgraphMeta = useMemo(() => {
    if (!localPack) return null;
    return {
      nodeDepthMap: localPack.nodeDepthMap,
      edgeDepthMap: localPack.edgeDepthMap,
      parentIdMap: localPack.parentIdMap,
      viewDepth: depth,
    };
  }, [depth, localPack]);

  const nodeIndex = useMemo(() => {
    const map = new Map<string, ConstellationNode>();
    for (const node of visibleGraph.nodes) map.set(node.id, node);
    return map;
  }, [visibleGraph.nodes]);

  const selectedNode = selectedNodeId ? (nodeIndex.get(selectedNodeId) ?? null) : null;

  const incidentEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return visibleGraph.edges.filter(
      (edge) => edge.source === selectedNodeId || edge.target === selectedNodeId,
    );
  }, [selectedNodeId, visibleGraph.edges]);

  const spotlight = useMemo(() => {
    if (!selectedNodeId) return null;
    const adjacent = new Map<string, Set<string>>();
    const directEdges = new Set<string>();
    for (const edge of visibleGraph.edges) {
      if (!adjacent.has(edge.source)) adjacent.set(edge.source, new Set());
      if (!adjacent.has(edge.target)) adjacent.set(edge.target, new Set());
      adjacent.get(edge.source)!.add(edge.target);
      adjacent.get(edge.target)!.add(edge.source);
      if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
        directEdges.add(edge.id);
      }
    }
    const direct = adjacent.get(selectedNodeId) ?? new Set<string>();
    const secondary = new Set<string>();
    for (const id of direct) {
      const neighbors = adjacent.get(id);
      if (!neighbors) continue;
      for (const otherId of neighbors) {
        if (otherId !== selectedNodeId && !direct.has(otherId)) {
          secondary.add(otherId);
        }
      }
    }
    return { direct, secondary, directEdges };
  }, [selectedNodeId, visibleGraph.edges]);

  const handleFocusNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsExplodedFocusLayout(false);
    requestAnimationFrame(() => canvasRef.current?.focusNode(nodeId));
  }, []);

  const handleNodeClick = useCallback(
    (node: ConstellationNode) => {
      if (selectedNodeId === node.id) {
        setIsExplodedFocusLayout(true);
        return;
      }
      setSelectedNodeId(node.id);
      setIsExplodedFocusLayout(false);
    },
    [selectedNodeId],
  );

  const handleExploreLocal = useCallback((nodeId: string) => {
    setMode("local");
    setSelectedNodeId(nodeId);
    setIsExplodedFocusLayout(false);
    requestAnimationFrame(() => canvasRef.current?.focusNode(nodeId));
  }, []);

  const handleResetLayout = useCallback(() => {
    canvasRef.current?.resetLayout();
    setSelectedNodeId(null);
    setIsExplodedFocusLayout(false);
  }, []);

  const handleFitGraph = useCallback(() => {
    canvasRef.current?.fitGraph();
  }, []);

  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoomBy(1.25);
  }, []);

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomBy(1 / 1.25);
  }, []);

  const handleResetZoom = useCallback(() => {
    canvasRef.current?.zoomTo100();
  }, []);

  useEffect(() => {
    if (selectedNodeId && !nodeIndex.has(selectedNodeId)) {
      requestAnimationFrame(() => setSelectedNodeId(null));
    }
  }, [nodeIndex, selectedNodeId]);

  useEffect(() => {
    if (selectedNodeId && !inspectorOpen) {
      requestAnimationFrame(() => setInspectorOpen(true));
    }
  }, [inspectorOpen, selectedNodeId]);

  useEffect(() => {
    const q = search.trim();
    if (!q || filtered.matchedNodeIds.size === 0) return;
    const first = filtered.matchedNodeIds.values().next().value;
    if (first) requestAnimationFrame(() => canvasRef.current?.focusNode(first));
  }, [filtered.matchedNodeIds, search]);

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
      /* Fullscreen can be denied by browser policy. */
    }
  }, []);

  const hasNodes = builtGraph.nodes.length > 0;
  const hasVisibleNodes = visibleGraph.nodes.length > 0;
  const localNeedsSelection = mode === "local" && !selectedNodeId;

  return (
    <div
      className={cn(
        "relative flex h-full min-h-[560px] w-full overflow-hidden",
        graphT.shell.pageTextClass,
      )}
      style={{ background: graphT.shell.pageBg }}
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <IdeasConstellationToolbar
          nodes={visibleGraph.nodes}
          nodeCount={visibleGraph.nodes.length}
          edgeCount={visibleGraph.edges.length}
          mode={mode}
          depth={depth}
          search={search}
          showLabels={showLabels}
          hideOrphans={hideOrphans}
          inspectorOpen={inspectorOpen}
          legendOpen={legendOpen}
          graphFullscreenSupported={graphFullscreenSupported && hasVisibleNodes}
          graphFullscreenActive={graphFullscreenActive}
          onSearchChange={setSearch}
          onFocusNode={handleFocusNode}
          onModeChange={setMode}
          onDepthChange={setDepth}
          onShowLabelsChange={setShowLabels}
          onHideOrphansChange={setHideOrphans}
          onResetLayout={handleResetLayout}
          onToggleInspector={() => setInspectorOpen((open) => !open)}
          onToggleLegend={() => setLegendOpen((open) => !open)}
          onToggleGraphFullscreen={() => void toggleGraphFullscreen()}
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            ref={graphFullscreenRef}
            className="relative min-h-0 flex-1 overflow-hidden"
          >
            {graphFullscreenActive ? (
              <div className="pointer-events-none absolute inset-0 z-[100] flex justify-end p-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="pointer-events-auto gap-1.5 shadow-md"
                  onClick={() => void exitBrowserFullscreen()}
                >
                  <Minimize2 className="h-4 w-4 shrink-0" aria-hidden />
                  {ui.constellation.exitFullscreen}
                </Button>
              </div>
            ) : null}

            {!hasNodes ? (
              <div className="relative flex h-full items-center justify-center p-8 text-center">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-70"
                  style={{
                    background:
                      "radial-gradient(circle at center, rgba(251, 146, 60, 0.12) 0%, transparent 55%)",
                  }}
                />
                <div className="relative z-10 max-w-sm space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-inner backdrop-blur">
                    <Sparkles className="h-5 w-5 text-orange-300" aria-hidden />
                  </div>
                  <h3 className="text-base font-medium text-foreground">
                    {ui.emptyNoIdeasTitle}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {ui.emptyNoIdeasDescription}
                  </p>
                </div>
              </div>
            ) : !hasVisibleNodes ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <p className={cn("text-sm font-medium", graphT.tone.title)}>
                  {ui.constellation.noVisibleNodesTitle}
                </p>
                <p className={cn("max-w-sm text-xs", graphT.tone.muted)}>
                  {ui.constellation.noVisibleNodesDescription}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(graphT.tone.inset, graphT.tone.body)}
                  onClick={() => {
                    setHideOrphans(false);
                    setSearch("");
                  }}
                >
                  {ui.clearAllFilters}
                </Button>
              </div>
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
                onNodeDoubleClick={(node) => handleExploreLocal(node.id)}
                onBackgroundClick={() => {
                  setSelectedNodeId(null);
                  setIsExplodedFocusLayout(false);
                }}
                onZoomChange={(nextZoom) => setZoom(nextZoom)}
              />
            )}

            {hasVisibleNodes ? (
              <GraphZoomControls
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetZoom={handleResetZoom}
                onFit={handleFitGraph}
              />
            ) : null}

            {hasVisibleNodes && !selectedNodeId && !inspectorOpen ? (
              <div className={cn(
                "pointer-events-none absolute right-3 top-3 z-20 hidden rounded-full px-3 py-1 text-[11px] backdrop-blur-md sm:inline-flex",
                graphT.banner.wrap,
              )}>
                <span className={graphT.banner.subText}>
                  {ui.constellation.selectHint}
                </span>
              </div>
            ) : null}

            {hasVisibleNodes && localNeedsSelection ? (
              <div
                className={cn(
                  "pointer-events-none absolute left-1/2 bottom-4 z-20 flex -translate-x-1/2 items-center gap-2 px-3.5 py-1.5 text-xs backdrop-blur-md",
                  graphT.banner.wrap,
                )}
              >
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.45)] dark:bg-violet-300 dark:shadow-[0_0_8px_rgba(196,181,253,0.85)]"
                />
                <span className={graphT.banner.text}>
                  {ui.constellation.localNeedsSelection}
                </span>
              </div>
            ) : null}

            <IdeasConstellationLegend
              open={legendOpen}
              onClose={() => setLegendOpen(false)}
            />
          </div>

          {selectedNode ? (
            <div className={cn("lg:hidden", graphT.bottomInspector.wrap)}>
              <IdeasConstellationInspector
                selectedNode={selectedNode}
                incidentEdges={incidentEdges}
                nodeIndex={nodeIndex}
                variant="bottomBar"
                graphMode={graphMode}
                onClose={() => setSelectedNodeId(null)}
                onFocusNode={handleFocusNode}
                onExploreLocal={handleExploreLocal}
              />
            </div>
          ) : null}
        </div>
      </div>

      {inspectorOpen ? (
        <div className="hidden lg:block">
          <IdeasConstellationInspector
            selectedNode={selectedNode}
            incidentEdges={incidentEdges}
            nodeIndex={nodeIndex}
            variant="panel"
            graphMode={graphMode}
            onClose={() => {
              setSelectedNodeId(null);
              setInspectorOpen(false);
            }}
            onFocusNode={handleFocusNode}
            onExploreLocal={handleExploreLocal}
          />
        </div>
      ) : null}
    </div>
  );
}
