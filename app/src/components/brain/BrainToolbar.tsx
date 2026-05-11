/**
 * Brain Toolbar — search, mode switch, depth, view toggles, and panel
 * triggers for the global Life OS graph.
 *
 * Mirrors `ConstellationToolbar` but reads/writes the Brain-specific
 * `useBrainStore` (UI state only; server data lives in TanStack Query).
 *
 * Responsive philosophy:
 *   • Toolbar uses `flex flex-wrap` so groups wrap into multiple rows
 *     before any control is clipped or pushed off-screen.
 *   • Search placeholder shrinks to a single word on small viewports.
 *   • Density / Mode chips always stay visible (primary controls).
 *   • Camera-fit and zoom-percentage live on the floating
 *     `GraphZoomControls` widget — not duplicated here.
 *   • Refresh, Reset Layout, Filters, Legend, Inspector toggle are
 *     primary toolbar buttons that group cleanly on every breakpoint.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Filter,
  Globe,
  Globe2,
  Info,
  Link2,
  Link2Off,
  Maximize2,
  Minimize2,
  PanelRight,
  PanelRightClose,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import type {
  ConstellationClusterBy,
} from "@/types/constellation";
import type { SphereRotationSpeed } from "@/types/brain-sphere";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useBrainStore } from "@/stores/brain-store";
import type {
  ConstellationDepth,
  ConstellationNode,
} from "@/types/constellation";
import { NODE_COLORS, NODE_TYPE_LABEL } from "@/lib/knowledge/constellation/constants";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import {
  DENSITY_MODE_LABEL,
  DENSITY_MODE_ORDER,
} from "@/lib/brain/density";

interface BrainToolbarProps {
  nodes: ConstellationNode[];
  nodeCount: number;
  edgeCount: number;
  onRefreshData: () => void | Promise<void>;
  onResetLayout: () => void;
  onFitGraph: () => void;
  onFocusNode: (nodeId: string) => void;
  /** When set, shows a fullscreen toggle for 3D Sphere mode only. */
  sphereFullscreenActive?: boolean;
  onToggleSphereFullscreen?: () => void | Promise<void>;
}

const DEPTHS: ConstellationDepth[] = [1, 2, 3];

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

export function BrainToolbar({
  nodes,
  nodeCount,
  edgeCount,
  onRefreshData,
  // onFitGraph is now exposed only via GraphZoomControls
  onResetLayout,
  onFocusNode,
  sphereFullscreenActive = false,
  onToggleSphereFullscreen,
}: BrainToolbarProps) {
  const mode = useBrainStore((s) => s.mode);
  const setMode = useBrainStore((s) => s.setMode);
  const depth = useBrainStore((s) => s.depth);
  const setDepth = useBrainStore((s) => s.setDepth);
  const showLabels = useBrainStore((s) => s.showLabels);
  const setShowLabels = useBrainStore((s) => s.setShowLabels);
  const sphereShowLabels = useBrainStore((s) => s.sphereShowLabels);
  const setSphereShowLabels = useBrainStore((s) => s.setSphereShowLabels);
  const sphereClusterBy = useBrainStore((s) => s.sphereClusterBy);
  const setSphereClusterBy = useBrainStore((s) => s.setSphereClusterBy);
  const sphereRotationSpeed = useBrainStore((s) => s.sphereRotationSpeed);
  const setSphereRotationSpeed = useBrainStore((s) => s.setSphereRotationSpeed);
  const sphereShowConnections = useBrainStore((s) => s.sphereShowConnections);
  const setSphereShowConnections = useBrainStore(
    (s) => s.setSphereShowConnections,
  );
  const isSphere = mode === "sphere_3d";
  // In sphere mode the labels button reads/writes the sphere-specific
  // toggle so the 2D mode keeps its independent default.
  const labelsOn = isSphere ? sphereShowLabels : showLabels;
  const setLabelsOn = isSphere ? setSphereShowLabels : setShowLabels;
  const search = useBrainStore((s) => s.search);
  const setSearch = useBrainStore((s) => s.setSearch);
  const filtersOpen = useBrainStore((s) => s.filtersOpen);
  const setFiltersOpen = useBrainStore((s) => s.setFiltersOpen);
  const legendOpen = useBrainStore((s) => s.legendOpen);
  const setLegendOpen = useBrainStore((s) => s.setLegendOpen);
  const filters = useBrainStore((s) => s.filters);
  const setFilters = useBrainStore((s) => s.setFilters);
  const hideOrphans = filters.hideOrphanNodes ?? false;
  const densityMode = useBrainStore((s) => s.densityMode);
  const setDensityMode = useBrainStore((s) => s.setDensityMode);
  const orphanResolverOpen = useBrainStore((s) => s.orphanResolverOpen);
  const setOrphanResolverOpen = useBrainStore((s) => s.setOrphanResolverOpen);
  const inspectorOpen = useBrainStore((s) => s.inspectorOpen);
  const setInspectorOpen = useBrainStore((s) => s.setInspectorOpen);

  const [localSearch, setLocalSearch] = useState(() => search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleChange = (v: string) => {
    setLocalSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(v), 200);
  };

  const matches = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .filter((n) => n.label.toLowerCase().includes(q))
      .slice(0, 10);
  }, [localSearch, nodes]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isCompact = useIsCompactViewport();
  const placeholder = isCompact ? "Search…" : "Search across your brain…";

  const { t: graphT } = useGraphSurface();

  return (
    <div className={graphT.toolbar.wrap}>
      {/* Search — owns the leading flex slot, shrinks to fit but enforces
          a sensible minimum width on desktop so the placeholder never gets
          clipped mid-word. */}
      <div className="relative min-w-[180px] flex-1 sm:min-w-[240px] sm:max-w-md">
        <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${graphT.toolbar.meta}`} />
        <Input
          value={localSearch}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 120)}
          placeholder={placeholder}
          aria-label="Search the Brain graph"
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
                    {NODE_TYPE_LABEL[n.type]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Density chips — primary connection-density controls */}
      <div
        role="group"
        aria-label="Connection density"
        className="flex shrink-0 items-center gap-1"
      >
        {DENSITY_MODE_ORDER.map((m) => {
          const active = densityMode === m;
          const isOrphan = m === "orphans_only";
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                setDensityMode(m);
                if (isOrphan) setOrphanResolverOpen(true);
              }}
              aria-pressed={active}
              className={cn(
                "h-7 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
                active
                  ? "border-amber-300/40 bg-amber-500/10 text-amber-100 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.25)]"
                  : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              {DENSITY_MODE_LABEL[m]}
            </button>
          );
        })}
        {/* Orphan resolver toggle (kept after the chips so users can
            reopen the resolver without changing density mode) */}
        <button
          type="button"
          aria-pressed={orphanResolverOpen}
          onClick={() => setOrphanResolverOpen(!orphanResolverOpen)}
          className={cn(
            "h-7 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
            orphanResolverOpen
              ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
              : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70",
          )}
          title="Orphan Resolver — find disconnected nodes and suggest connections"
        >
          <Sparkles className="mr-1 inline h-3 w-3" aria-hidden />
          Resolve
        </button>
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
          <span className="hidden sm:inline">Global</span>
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
          <span className="hidden sm:inline">Local</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={isSphere}
          title="3D Sphere — slowly rotating second-brain planet"
          className={cn(
            "h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            isSphere &&
              "bg-fuchsia-400/15 text-fuchsia-200 shadow-[inset_0_0_0_1px_rgba(232,121,249,0.35)]",
          )}
          onClick={() => setMode("sphere_3d")}
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sphere</span>
          <span
            aria-hidden
            className="ml-0.5 hidden rounded-sm border border-fuchsia-300/25 bg-fuchsia-300/10 px-1 text-[9px] font-medium uppercase leading-[14px] tracking-wider text-fuchsia-200/90 sm:inline"
          >
            3D
          </span>
        </Button>
      </div>

      {isSphere && onToggleSphereFullscreen && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={sphereFullscreenActive}
          title={
            sphereFullscreenActive
              ? "Exit fullscreen (Esc)"
              : "Fullscreen — maximum space for the 3D sphere"
          }
          className={cn(
            "h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            sphereFullscreenActive &&
              "bg-fuchsia-400/15 text-fuchsia-100 shadow-[inset_0_0_0_1px_rgba(232,121,249,0.35)]",
          )}
          onClick={() => void onToggleSphereFullscreen()}
        >
          {sphereFullscreenActive ? (
            <Minimize2 className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className="hidden sm:inline">
            {sphereFullscreenActive ? "Exit" : "Fullscreen"}
          </span>
        </Button>
      )}

      {/* Sphere-mode-only controls — Cluster By + Auto Rotate. Both
          map to sphere store keys; switching modes leaves them
          configured for the user's next visit. */}
      {isSphere && (
        <div className="flex shrink-0 items-center gap-1.5" title="Group sphere nodes by category, type, or library">
          <span className="hidden text-xs text-muted-foreground sm:inline">Cluster</span>
          <div className="relative">
            <select
              aria-label="Cluster by"
              value={sphereClusterBy}
              onChange={(e) =>
                setSphereClusterBy(e.target.value as ConstellationClusterBy)
              }
              className="h-7 appearance-none rounded-lg border border-border/60 bg-muted/40 pl-2.5 pr-7 text-xs text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-fuchsia-300/40"
            >
              <option value="category">Category</option>
              <option value="node_type">Type</option>
              <option value="collection">Collection</option>
              <option value="project">Project</option>
              <option value="source_type">Source</option>
              <option value="none">None</option>
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

      {isSphere && (
        <div
          role="group"
          aria-label="Auto rotate speed"
          className="flex shrink-0 items-center gap-1"
          title="Auto-rotation speed — pauses while you drag, resumes after a moment"
        >
          <span className="hidden text-xs text-muted-foreground sm:inline">Rotate</span>
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
            {(["off", "slow", "normal"] as const satisfies readonly SphereRotationSpeed[]).map(
              (s) => {
                const active = sphereRotationSpeed === s;
                return (
                  <Button
                    key={s}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={active}
                    className={cn(
                      "h-6 px-2 text-[11px] capitalize text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      active &&
                        "bg-fuchsia-400/15 text-fuchsia-100 shadow-[inset_0_0_0_1px_rgba(232,121,249,0.3)]",
                    )}
                    onClick={() => setSphereRotationSpeed(s)}
                  >
                    {s}
                  </Button>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* Depth control — only meaningful in 2D Local mode. Sphere
          shows the whole graph at once. */}
      {mode === "local" && (
        <div
          role="group"
          aria-label="Depth"
          className="flex shrink-0 items-center gap-1"
        >
          <span className="hidden text-xs text-muted-foreground sm:inline">Depth</span>
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

      {/* Display toggles */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={labelsOn}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            labelsOn && "text-foreground",
          )}
          onClick={() => setLabelsOn(!labelsOn)}
          aria-label="Toggle labels"
          title={
            isSphere
              ? "Show all node labels in the sphere (off by default)"
              : "Toggle node labels"
          }
        >
          {labelsOn ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Labels</span>
        </Button>
        {isSphere && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={sphereShowConnections}
            className={cn(
              "h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              sphereShowConnections && "text-foreground",
            )}
            onClick={() => setSphereShowConnections(!sphereShowConnections)}
            aria-label="Toggle connection lines in the sphere"
            title="Show or hide global connection lines between notes (focus tentacles stay visible when a node is selected)"
          >
            {sphereShowConnections ? (
              <Link2 className="h-3.5 w-3.5" />
            ) : (
              <Link2Off className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Links</span>
          </Button>
        )}
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
          <span className="hidden md:inline">Hide orphans</span>
        </Button>
      </div>

      {/* Data / camera — only the controls that don't live on the
          floating zoom widget. Refresh data + Reset node positions are
          distinct semantically (Refresh = data, Reset = layout). */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          aria-label="Refresh data"
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
          aria-label="Reset layout"
          title="Reset layout — clear manual node positions"
          onClick={onResetLayout}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Filters + Legend + Details panel toggle */}
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
          <span className="hidden md:inline">Filters</span>
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
          <span className="hidden md:inline">Legend</span>
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
          title={inspectorOpen ? "Hide details panel" : "Show details panel"}
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
          <span className="font-mono text-foreground/90">{nodeCount}</span> nodes
        </span>
        <span>
          <span className="font-mono text-foreground/90">{edgeCount}</span> edges
        </span>
      </div>
    </div>
  );
}
