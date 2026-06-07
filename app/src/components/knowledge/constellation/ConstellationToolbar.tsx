"use client";

/**
 * Constellation Toolbar — Knowledge Base graph toolbar.
 *
 * Shares the same responsive philosophy as `BrainToolbar`:
 *   • flex-wrap, never overflow horizontally
 *   • search shrinks to a placeholder of "Search…" on small viewports
 *   • camera-fit lives on the floating GraphZoomControls widget
 *   • Refresh / Reset are distinct, never duplicated
 *   • Filters / Legend / Details panel toggle group together
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Columns3,
  Eye,
  EyeOff,
  Filter,
  Globe2,
  Globe,
  Info,
  LayoutGrid,
  Maximize2,
  PanelRight,
  PanelRightClose,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Table,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useKnowledgeStore, type KnowledgeView } from "@/stores/knowledge-store";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";
import type {
  ConstellationClusterBy,
  ConstellationDepth,
  ConstellationNode,
} from "@/types/constellation";
import { NODE_COLORS } from "@/lib/knowledge/constellation/constants";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";

interface ConstellationToolbarProps {
  /** All current (post-filter) nodes — drives the search drop-down. */
  nodes: ConstellationNode[];
  /** Total counts displayed on the right of the toolbar. */
  nodeCount: number;
  edgeCount: number;
  /** Programmatic actions exposed by the canvas wrapper. */
  onRefreshData: () => void | Promise<void>;
  onResetLayout: () => void;
  onFitGraph: () => void;
  /** Centers the camera on a specific node id and selects it. */
  onFocusNode: (nodeId: string) => void;
  /** Browser fullscreen for the graph region only (toolbar stays on page). */
  graphFullscreenSupported?: boolean;
  graphFullscreenActive?: boolean;
  onToggleGraphFullscreen?: () => void;
}

const DEPTHS: ConstellationDepth[] = [1, 2, 3];

const CLUSTER_BY_OPTIONS: ConstellationClusterBy[] = [
  "category",
  "node_type",
  "library",
  "collection",
  "project",
  "source_type",
  "none",
];

function useIsCompactViewport(): boolean {
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 640px)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsCompact(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isCompact;
}

export function ConstellationToolbar({
  nodes,
  nodeCount,
  edgeCount,
  onRefreshData,
  onResetLayout,
  // onFitGraph is wired to GraphZoomControls in the parent view.
  onFocusNode,
  graphFullscreenSupported = false,
  graphFullscreenActive = false,
  onToggleGraphFullscreen,
}: ConstellationToolbarProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const common = getCommonUiCopy(language);
  const c = ui.constellation;

  const currentView = useKnowledgeStore((s) => s.currentView);
  const setView = useKnowledgeStore((s) => s.setView);
  const mode = useKnowledgeStore((s) => s.constellationMode);
  const depth = useKnowledgeStore((s) => s.constellationDepth);
  const showLabels = useKnowledgeStore((s) => s.constellationShowLabels);
  const search = useKnowledgeStore((s) => s.constellationSearch);
  const filtersOpen = useKnowledgeStore((s) => s.constellationFiltersOpen);
  const legendOpen = useKnowledgeStore((s) => s.constellationLegendOpen);
  const inspectorOpen = useKnowledgeStore(
    (s) => s.constellationInspectorOpen,
  );
  const clusterBy = useKnowledgeStore((s) => s.constellationClusterBy);
  const hideOrphans = useKnowledgeStore(
    (s) => s.constellationFilters.hideOrphanNodes ?? false,
  );

  const setMode = useKnowledgeStore((s) => s.setConstellationMode);
  const setDepth = useKnowledgeStore((s) => s.setConstellationDepth);
  const setShowLabels = useKnowledgeStore((s) => s.setConstellationShowLabels);
  const setSearch = useKnowledgeStore((s) => s.setConstellationSearch);
  const setFilters = useKnowledgeStore((s) => s.setConstellationFilters);
  const setFiltersOpen = useKnowledgeStore((s) => s.setConstellationFiltersOpen);
  const setLegendOpen = useKnowledgeStore((s) => s.setConstellationLegendOpen);
  const setInspectorOpen = useKnowledgeStore(
    (s) => s.setConstellationInspectorOpen,
  );
  const setClusterBy = useKnowledgeStore((s) => s.setConstellationClusterBy);

  const isSphere = mode === "sphere_3d";

  const viewOptions: Array<{
    id: KnowledgeView;
    label: string;
    icon: typeof LayoutGrid;
  }> = [
    { id: "gallery", label: ui.viewLabels.gallery, icon: LayoutGrid },
    { id: "board", label: ui.viewLabels.board, icon: Columns3 },
    { id: "table", label: ui.viewLabels.table, icon: Table },
    { id: "constellation", label: ui.viewLabels.constellation, icon: Sparkles },
  ];

  const clusterByLabel: Record<ConstellationClusterBy, string> = {
    category: c.clusterByCategory,
    node_type: c.clusterByNodeType,
    library: c.clusterByLibrary,
    collection: c.clusterByCollection,
    project: c.clusterByProject,
    source_type: c.clusterBySourceType,
    none: c.clusterByNone,
  };

  // Local debounced input — never spam the global store. The toolbar owns
  // search input; the store value is only read on first mount (no two-way
  // sync needed because the store is updated exclusively through
  // `handleChange` below).
  const [localSearch, setLocalSearch] = useState(() => search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (v: string) => {
    setLocalSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(v), 200);
  };

  // Search dropdown — top 8 matches by label.
  const matches = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .filter((n) => n.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [localSearch, nodes]);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isCompact = useIsCompactViewport();
  const compactPlaceholder = c.searchPlaceholderShort ?? "Search…";
  const placeholder = isCompact
    ? compactPlaceholder
    : (c.searchPlaceholderFull ?? c.searchPlaceholder);

  const { t: graphT } = useGraphSurface();

  return (
    <div className={graphT.toolbar.wrap}>
      {/* Search */}
      <div className="relative min-w-[180px] flex-1 sm:min-w-[240px] sm:max-w-md">
        <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${graphT.toolbar.meta}`} />
        <Input
          value={localSearch}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 120)}
          placeholder={placeholder}
          aria-label={c.searchPlaceholder}
          className={graphT.toolbar.input}
        />
        {dropdownOpen && matches.length > 0 && (
          <ul
            role="listbox"
            className={graphT.toolbar.dropdown}
          >
            {matches.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={graphT.toolbar.dropdownItem}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onFocusNode(n.id);
                    setDropdownOpen(false);
                  }}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: NODE_COLORS[n.type].core,
                      boxShadow: `0 0 6px ${NODE_COLORS[n.type].glow}`,
                    }}
                    aria-hidden
                  />
                  <span className="truncate">{n.label}</span>
                  <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {n.type}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Knowledge view switcher — parent toolbar is hidden in Constellation
          view, so this is the escape hatch back to Gallery / Board / Table. */}
      <div
        role="group"
        aria-label={ui.pageTitle}
        className="flex shrink-0 items-center rounded-lg border border-border/60 bg-muted/40 p-0.5"
      >
        {viewOptions.map(({ id, label, icon: Icon }) => {
          const active = currentView === id;
          return (
            <Button
              key={id}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={active}
              aria-label={common.switchToView(label)}
              title={common.switchToView(label)}
              className={cn(
                "h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                active &&
                  "bg-cyan-400/15 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.3)]",
              )}
              onClick={() => setView(id)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden 2xl:inline">{label}</span>
            </Button>
          );
        })}
      </div>

      {/* Mode toggle */}
      <div
        role="group"
        aria-label="Graph mode"
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
          onClick={() => setMode("global")}
        >
          <Globe2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{c.modeGlobal}</span>
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
          onClick={() => setMode("local")}
        >
          <Target className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{c.modeLocal}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={mode === "sphere_3d"}
          title={c.modeSphere3D}
          className={cn(
            "h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            mode === "sphere_3d" &&
              "bg-fuchsia-400/15 text-fuchsia-200 shadow-[inset_0_0_0_1px_rgba(232,121,249,0.35)]",
          )}
          onClick={() => setMode("sphere_3d")}
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{c.modeSphere3D}</span>
          <span
            aria-hidden
            className="ml-0.5 hidden rounded-sm border border-fuchsia-300/25 bg-fuchsia-300/10 px-1 text-[9px] font-medium uppercase leading-[14px] tracking-wider text-fuchsia-200/90 sm:inline"
          >
            {c.sphere3DBadge}
          </span>
        </Button>
      </div>

      {/* Depth control — only meaningful in local mode */}
      {mode === "local" && (
        <div
          role="group"
          aria-label={c.depth}
          className="flex shrink-0 items-center gap-1"
        >
          <span className="hidden text-xs text-muted-foreground sm:inline">{c.depth}</span>
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
                onClick={() => setDepth(d)}
              >
                {d}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Cluster By dropdown — only meaningful in 3D Sphere mode. We use a
          native <select> styled for the dark cosmic UI to avoid pulling in
          another popover dependency just for this beta surface. */}
      {isSphere && (
        <div
          className="flex shrink-0 items-center gap-1.5"
          title="Group nodes by category, type, or library"
        >
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {c.clusterBy}
          </span>
          <div className="relative">
            <select
              aria-label={c.clusterBy}
              value={clusterBy}
              onChange={(e) =>
                setClusterBy(e.target.value as ConstellationClusterBy)
              }
              className="h-7 appearance-none rounded-lg border border-border/60 bg-muted/40 pl-2.5 pr-7 text-xs text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-fuchsia-300/40"
            >
              {CLUSTER_BY_OPTIONS.map((k) => (
                <option key={k} value={k} className="bg-background text-foreground">
                  {clusterByLabel[k]}
                </option>
              ))}
            </select>
            <span
              aria-hidden
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground"
            >
              ▾
            </span>
          </div>
        </div>
      )}

      {/* Display toggles */}
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
          onClick={() => setShowLabels(!showLabels)}
          aria-label={c.showLabels}
        >
          {showLabels ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{c.showLabels}</span>
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
          onClick={() =>
            setFilters({ hideOrphanNodes: !hideOrphans })
          }
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{c.hideOrphans}</span>
        </Button>
      </div>

      {/* Data / layout — Refresh = fetch data, Reset Layout = clear node
          positions. Camera fit is on the floating zoom widget so users
          can keep the toolbar tidy. */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          aria-label="Refresh knowledge data"
          title="Refresh data — reload graph from the database"
          onClick={() => void onRefreshData()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          aria-label={isSphere ? c.resetSphere : "Reset layout"}
          title={
            isSphere
              ? "Reset sphere rotation and layout"
              : "Reset layout — clear manual node positions"
          }
          onClick={onResetLayout}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        {graphFullscreenSupported && onToggleGraphFullscreen && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            aria-pressed={graphFullscreenActive}
            aria-label={
              graphFullscreenActive
                ? c.graphFullscreenExit
                : c.graphFullscreenEnter
            }
            title={
              graphFullscreenActive
                ? c.graphFullscreenExit
                : c.graphFullscreenEnter
            }
            onClick={() => onToggleGraphFullscreen()}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Filters + Legend + Details */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={filtersOpen}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            filtersOpen && "text-foreground",
          )}
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{c.openFilters}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={legendOpen}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            legendOpen && "text-foreground",
          )}
          onClick={() => setLegendOpen(!legendOpen)}
        >
          <Info className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{c.openLegend}</span>
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
          onClick={() => setInspectorOpen(!inspectorOpen)}
          title={
            inspectorOpen ? "Hide details panel" : "Show details panel"
          }
        >
          {inspectorOpen ? (
            <PanelRightClose className="h-3.5 w-3.5" />
          ) : (
            <PanelRight className="h-3.5 w-3.5" />
          )}
          <span className="hidden xl:inline">
            {inspectorOpen ? "Hide details" : "Details"}
          </span>
        </Button>
      </div>

      {/* Counts */}
      <div className="ml-auto hidden shrink-0 items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground lg:flex">
        <span>
          <span className="font-mono text-foreground/90">{nodeCount}</span> {c.nodes}
        </span>
        <span>
          <span className="font-mono text-foreground/90">{edgeCount}</span> {c.edges}
        </span>
      </div>
    </div>
  );
}
