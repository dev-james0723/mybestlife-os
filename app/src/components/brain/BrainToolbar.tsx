/**
 * Brain Toolbar — compact primary controls for the Brain graph.
 *
 * Primary controls stay visible: search, mode, fit/reset/fullscreen,
 * and details. Secondary view controls live in the View popover so the
 * canvas can read as the page's main surface.
 */

"use client";

import { useMemo, useRef, useState } from "react";
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
  SlidersHorizontal,
  Sparkles,
  Target,
} from "lucide-react";
import type { ConstellationClusterBy } from "@/types/constellation";
import type { SphereRotationSpeed } from "@/types/brain-sphere";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useBrainStore } from "@/stores/brain-store";
import type {
  ConstellationDepth,
  ConstellationNode,
} from "@/types/constellation";
import {
  NODE_COLORS,
  NODE_TYPE_LABEL,
} from "@/lib/knowledge/constellation/constants";
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
  fullscreenActive?: boolean;
  onToggleFullscreen?: () => void | Promise<void>;
}

const DEPTHS: ConstellationDepth[] = [1, 2, 3];

export function BrainToolbar({
  nodes,
  nodeCount,
  edgeCount,
  onRefreshData,
  onResetLayout,
  onFitGraph,
  onFocusNode,
  fullscreenActive = false,
  onToggleFullscreen,
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { t: graphT } = useGraphSurface();

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

  const primaryButtonClass =
    "!h-10 min-w-10 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground sm:!h-8 sm:min-w-0";
  const iconButtonClass =
    "!size-10 text-muted-foreground hover:bg-muted/50 hover:text-foreground sm:!size-8";
  const chipClass =
    "min-h-9 rounded-lg border px-2.5 text-[11px] font-medium transition-colors sm:min-h-0";
  const sectionClass = cn(
    "space-y-2 rounded-lg border p-2.5",
    graphT.tone.borderSoft,
    graphT.tone.inset,
  );

  return (
    <div
      className={cn(
        graphT.toolbar.wrap,
        "mx-3 my-2 rounded-2xl border py-1.5 shadow-[0_12px_36px_-24px_rgba(0,0,0,0.55)]",
        graphT.tone.borderSoft,
      )}
    >
      <div className="relative min-w-[180px] flex-1 sm:min-w-[240px] sm:max-w-md">
        <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${graphT.toolbar.meta}`} />
        <Input
          value={localSearch}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 120)}
          placeholder="Search..."
          aria-label="Search the Brain graph"
          className={cn(graphT.toolbar.input, "!h-10 sm:!h-8")}
        />
        {dropdownOpen && matches.length > 0 && (
          <ul role="listbox" className={graphT.toolbar.dropdown}>
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
            primaryButtonClass,
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
            primaryButtonClass,
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
          title="3D Sphere"
          className={cn(
            primaryButtonClass,
            isSphere &&
              "bg-fuchsia-400/15 text-fuchsia-200 shadow-[inset_0_0_0_1px_rgba(232,121,249,0.35)]",
          )}
          onClick={() => setMode("sphere_3d")}
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sphere</span>
        </Button>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={iconButtonClass}
          aria-label="Fit graph to view"
          title="Fit graph to view"
          onClick={onFitGraph}
        >
          <Target className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={iconButtonClass}
          aria-label="Reset layout"
          title="Reset layout"
          onClick={onResetLayout}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        {onToggleFullscreen && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-pressed={fullscreenActive}
            title={
              fullscreenActive
                ? "Exit immersive view (Esc)"
                : "Immersive view"
            }
            className={cn(
              iconButtonClass,
              fullscreenActive &&
                "bg-cyan-400/15 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.32)]",
            )}
            onClick={() => void onToggleFullscreen()}
            aria-label={fullscreenActive ? "Exit immersive view" : "Enter immersive view"}
          >
            {fullscreenActive ? (
              <Minimize2 className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
            )}
          </Button>
        )}
      </div>

      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(primaryButtonClass, "px-3")}
              aria-label="Open graph settings"
            />
          }
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">View</span>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="max-h-[min(78dvh,620px)] w-[min(22rem,calc(100vw-1rem))] overflow-y-auto p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={cn("text-sm font-medium", graphT.tone.title)}>
                Graph settings
              </p>
              <p className={cn("text-xs tabular-nums", graphT.tone.muted)}>
                {nodeCount} nodes / {edgeCount} edges
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={graphT.tone.ghostBtn}
              aria-label="Refresh data"
              title="Refresh data"
              onClick={() => void onRefreshData()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className={sectionClass}>
            <p className={cn("text-[11px] font-medium uppercase", graphT.tone.heading)}>
              Density
            </p>
            <div className="grid grid-cols-2 gap-1.5">
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
                      chipClass,
                      active
                        ? "border-amber-300/40 bg-amber-500/10 text-amber-100 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.25)]"
                        : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    {DENSITY_MODE_LABEL[m]}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-pressed={orphanResolverOpen}
              onClick={() => setOrphanResolverOpen(!orphanResolverOpen)}
              className={cn(
                "flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors",
                orphanResolverOpen
                  ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
                  : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Orphan resolver
            </button>
          </div>

          <div className={sectionClass}>
            <p className={cn("text-[11px] font-medium uppercase", graphT.tone.heading)}>
              Display
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                aria-pressed={labelsOn}
                onClick={() => setLabelsOn(!labelsOn)}
                className={cn(
                  chipClass,
                  labelsOn
                    ? "border-cyan-300/40 bg-cyan-500/10 text-cyan-100"
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70",
                )}
              >
                {labelsOn ? (
                  <Eye className="mr-1 inline h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="mr-1 inline h-3.5 w-3.5" />
                )}
                Labels
              </button>
              <button
                type="button"
                aria-pressed={hideOrphans}
                onClick={() => setFilters({ hideOrphanNodes: !hideOrphans })}
                className={cn(
                  chipClass,
                  hideOrphans
                    ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70",
                )}
              >
                <Sparkles className="mr-1 inline h-3.5 w-3.5" />
                Orphans
              </button>
              {isSphere && (
                <button
                  type="button"
                  aria-pressed={sphereShowConnections}
                  onClick={() => setSphereShowConnections(!sphereShowConnections)}
                  className={cn(
                    chipClass,
                    sphereShowConnections
                      ? "border-fuchsia-300/40 bg-fuchsia-500/10 text-fuchsia-100"
                      : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {sphereShowConnections ? (
                    <Link2 className="mr-1 inline h-3.5 w-3.5" />
                  ) : (
                    <Link2Off className="mr-1 inline h-3.5 w-3.5" />
                  )}
                  Sphere links
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                aria-pressed={filtersOpen}
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={cn(
                  chipClass,
                  filtersOpen
                    ? "border-cyan-300/40 bg-cyan-500/10 text-cyan-100"
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70",
                )}
              >
                <Filter className="mr-1 inline h-3.5 w-3.5" />
                Filters
              </button>
              <button
                type="button"
                aria-pressed={legendOpen}
                onClick={() => setLegendOpen(!legendOpen)}
                className={cn(
                  chipClass,
                  legendOpen
                    ? "border-cyan-300/40 bg-cyan-500/10 text-cyan-100"
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70",
                )}
              >
                <Info className="mr-1 inline h-3.5 w-3.5" />
                Legend
              </button>
            </div>
          </div>

          {mode === "local" && (
            <div className={sectionClass}>
              <p className={cn("text-[11px] font-medium uppercase", graphT.tone.heading)}>
                Local depth
              </p>
              <div className="flex items-center gap-1.5">
                {DEPTHS.map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={depth === d}
                    className={cn(
                      "h-8 flex-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground",
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

          {isSphere && (
            <div className={sectionClass}>
              <p className={cn("text-[11px] font-medium uppercase", graphT.tone.heading)}>
                Sphere
              </p>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Cluster
                <select
                  aria-label="Cluster by"
                  value={sphereClusterBy}
                  onChange={(e) =>
                    setSphereClusterBy(e.target.value as ConstellationClusterBy)
                  }
                  className="h-9 appearance-none rounded-lg border border-border/60 bg-muted/40 px-2.5 text-xs text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-fuchsia-300/40"
                >
                  <option value="category">Category</option>
                  <option value="node_type">Type</option>
                  <option value="collection">Collection</option>
                  <option value="project">Project</option>
                  <option value="source_type">Source</option>
                  <option value="none">None</option>
                </select>
              </label>
              <div
                role="group"
                aria-label="Auto rotate speed"
                className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-0.5"
              >
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
                          "h-8 flex-1 text-[11px] capitalize text-muted-foreground hover:bg-muted/50 hover:text-foreground",
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
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={inspectorOpen}
        className={cn(
          "hidden !h-10 gap-1.5 px-3 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground sm:!h-8 sm:px-2 lg:inline-flex",
          inspectorOpen && "text-foreground",
        )}
        onClick={() => setInspectorOpen(!inspectorOpen)}
        title={inspectorOpen ? "Hide details" : "Show details"}
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
  );
}
