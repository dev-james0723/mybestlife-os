/**
 * Life OS Brain — UI store.
 *
 * Holds *only* transient UI state for the `/brain` page. Server data lives
 * exclusively in TanStack Query caches (see `use-brain-queries.ts`); this
 * file follows the same separation pattern as `habits-store.ts`.
 *
 * Multi-user safety: nothing in this store is user-scoped. The only
 * user-specific data flowing through the UI is the rendered graph itself,
 * which is sourced from RLS-scoped queries.
 */

import { create } from "zustand";

import {
  DEFAULT_DOMAIN_TOGGLES,
  type BrainDomain,
} from "@/types/brain";
import type {
  ConstellationClusterBy,
  ConstellationDepth,
  ConstellationFilters,
  ConstellationGraphMode,
} from "@/types/constellation";
import type {
  SphereFocusState,
  SphereNodeId,
  SphereRotationSpeed,
  SphereRotationState,
} from "@/types/brain-sphere";

/**
 * Density modes the user can pick from to control how many edges show.
 * The visual reference (target image) shows chips like "All Connections",
 * "Strong Only", "Suggested", "Orphans" — these map directly to these
 * mode slugs.
 */
export type BrainDensityMode =
  | "all"
  | "strong_only"
  | "explicit_only"
  | "suggested_only"
  | "orphans_only"
  | "knowledge_to_projects"
  | "projects_to_tasks"
  | "journal_to_people"
  | "quotes_to_values"
  | "finance_to_goals"
  | "documents_to_knowledge"
  | "ai_to_projects";

interface BrainUiState {
  // ── Canvas focus / mode ─────────────────────────────────────────
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  /** Currently-hovered/clicked edge for tooltips / detail panel. */
  selectedEdgeId: string | null;
  setSelectedEdgeId: (id: string | null) => void;

  /** Density mode (toolbar chips). */
  densityMode: BrainDensityMode;
  setDensityMode: (mode: BrainDensityMode) => void;

  mode: ConstellationGraphMode;
  setMode: (mode: ConstellationGraphMode) => void;

  depth: ConstellationDepth;
  setDepth: (depth: ConstellationDepth) => void;

  showLabels: boolean;
  setShowLabels: (show: boolean) => void;

  // ── Search ──────────────────────────────────────────────────────
  search: string;
  setSearch: (q: string) => void;

  // ── Domain toggles (Legend) ─────────────────────────────────────
  /**
   * Per-domain show/hide. When a domain is `false`, every node whose type
   * belongs to that domain is hidden in the graph.
   */
  domainToggles: Record<BrainDomain, boolean>;
  toggleDomain: (domain: BrainDomain) => void;
  setDomainVisible: (domain: BrainDomain, visible: boolean) => void;
  resetDomainToggles: () => void;

  // ── Filters (re-uses the existing ConstellationFilters shape) ──
  filters: ConstellationFilters;
  setFilters: (patch: Partial<ConstellationFilters>) => void;
  clearFilters: () => void;

  // ── Panels ──────────────────────────────────────────────────────
  legendOpen: boolean;
  setLegendOpen: (open: boolean) => void;

  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;

  /**
   * Right-side details / inspection panel visibility.
   * Closed by default so the graph viewport gets maximum space on
   * first paint. Opens automatically when the user clicks a node;
   * the user can also dismiss it manually.
   */
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;

  /** Orphan resolver panel visibility. */
  orphanResolverOpen: boolean;
  setOrphanResolverOpen: (open: boolean) => void;

  // ── 3D Sphere Mode ───────────────────────────────────────────────
  // The sphere is a separate visualization with its own focus, rotation,
  // labels, and clustering state. Keeping these as discriminated unions
  // (rather than 4+ booleans) makes invalid combinations impossible —
  // e.g. you cannot be `focused` and `transitioning-in` at the same
  // time. The render loop reads these directly, never via derived
  // booleans like `isFocused`.
  /** Convenience derived from `mode === "sphere_3d"`, but exported as a
   *  setter pair so callers don't have to know the encoding. */
  is3DSphereMode: boolean;
  setIs3DSphereMode: (on: boolean) => void;

  /**
   * Currently hovered node (desktop only). Independent of
   * `selectedNodeId`; hover is the preview-focus highlight, click
   * promotes to a locked focus.
   */
  hoveredNodeId: SphereNodeId | null;
  setHoveredNodeId: (id: SphereNodeId | null) => void;

  /** Camera/selection state machine — see `SphereFocusState` docs. */
  focusState: SphereFocusState;
  setFocusState: (state: SphereFocusState) => void;

  /** Rotation state machine — see `SphereRotationState` docs. */
  rotationState: SphereRotationState;
  setRotationState: (state: SphereRotationState) => void;

  /**
   * User-facing speed preset for ambient self-rotation. Persisted
   * alongside the auto-rotate enable flag so toggling Auto Rotate off
   * and on returns to the user's preferred speed.
   */
  sphereRotationSpeed: SphereRotationSpeed;
  setSphereRotationSpeed: (speed: SphereRotationSpeed) => void;

  /**
   * Sphere-mode label visibility. Default OFF per spec — node labels
   * are hidden in the default sphere view, except the selected node
   * in focus mode (which is always shown). Distinct from the 2D
   * `showLabels` setting so toggling one mode doesn't mutate the
   * other.
   */
  sphereShowLabels: boolean;
  setSphereShowLabels: (show: boolean) => void;

  /**
   * Global base edge lines in 3D sphere (the dim “web”). Default OFF so
   * the sphere reads cleanly; accent / tentacle edges still show on
   * hover/focus regardless.
   */
  sphereShowConnections: boolean;
  setSphereShowConnections: (show: boolean) => void;

  /**
   * Cluster-by dimension for sphere coloring. Mirrors the existing
   * Knowledge Constellation ClusterBy behavior so the same regional-
   * color metaphor reads across both pages.
   */
  sphereClusterBy: ConstellationClusterBy;
  setSphereClusterBy: (clusterBy: ConstellationClusterBy) => void;
}

const DEFAULT_FILTERS: ConstellationFilters = {
  search: "",
  hideOrphanNodes: false,
  showSemanticLinks: false,
  showAISuggestedLinks: true,
  showManualLinksOnly: false,
  minSemanticConfidence: 0.78,
  minConnectionCount: 0,
};

export const useBrainStore = create<BrainUiState>((set, get) => ({
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  selectedEdgeId: null,
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),

  densityMode: "all",
  setDensityMode: (mode) => set({ densityMode: mode }),

  mode: "global",
  setMode: (mode) =>
    set({
      mode,
      // Keep the convenience flag in sync — the toolbar uses
      // `is3DSphereMode` as the source of truth for sphere-only
      // controls (cluster-by, auto-rotate, etc).
      is3DSphereMode: mode === "sphere_3d",
      // Leaving sphere mode while focused would leave a stale
      // animation in flight; reset transient state.
      ...(mode !== "sphere_3d"
        ? {
            focusState: { phase: "idle" } satisfies SphereFocusState,
            hoveredNodeId: null,
          }
        : {}),
    }),

  depth: 1,
  setDepth: (depth) => set({ depth }),

  showLabels: true,
  setShowLabels: (show) => set({ showLabels: show }),

  search: "",
  setSearch: (q) => set({ search: q }),

  domainToggles: { ...DEFAULT_DOMAIN_TOGGLES },
  toggleDomain: (domain) =>
    set({
      domainToggles: {
        ...get().domainToggles,
        [domain]: !get().domainToggles[domain],
      },
    }),
  setDomainVisible: (domain, visible) =>
    set({
      domainToggles: {
        ...get().domainToggles,
        [domain]: visible,
      },
    }),
  resetDomainToggles: () =>
    set({ domainToggles: { ...DEFAULT_DOMAIN_TOGGLES } }),

  filters: { ...DEFAULT_FILTERS },
  setFilters: (patch) =>
    set({ filters: { ...get().filters, ...patch } }),
  clearFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  legendOpen: false,
  setLegendOpen: (open) => set({ legendOpen: open }),

  filtersOpen: false,
  setFiltersOpen: (open) => set({ filtersOpen: open }),

  inspectorOpen: false,
  setInspectorOpen: (open) => set({ inspectorOpen: open }),

  orphanResolverOpen: false,
  setOrphanResolverOpen: (open) => set({ orphanResolverOpen: open }),

  // ── 3D Sphere Mode ───────────────────────────────────────────────
  is3DSphereMode: false,
  setIs3DSphereMode: (on) =>
    set({
      is3DSphereMode: on,
      // Switching the toggle drives the canonical `mode`. Preserve
      // existing global/local choice when turning sphere off.
      mode: on ? "sphere_3d" : get().mode === "sphere_3d" ? "global" : get().mode,
      // Reset transient interaction state when entering or leaving
      // sphere mode so we never carry a stale focus animation.
      focusState: { phase: "idle" },
      hoveredNodeId: null,
      rotationState: on
        ? get().sphereRotationSpeed === "off"
          ? { kind: "disabled" }
          : { kind: "rotating" }
        : { kind: "rotating" },
    }),

  hoveredNodeId: null,
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),

  focusState: { phase: "idle" },
  setFocusState: (state) => set({ focusState: state }),

  rotationState: { kind: "rotating" },
  setRotationState: (state) => set({ rotationState: state }),

  sphereRotationSpeed: "slow",
  setSphereRotationSpeed: (speed) =>
    set({
      sphereRotationSpeed: speed,
      rotationState: speed === "off" ? { kind: "disabled" } : { kind: "rotating" },
    }),

  sphereShowLabels: false,
  setSphereShowLabels: (show) => set({ sphereShowLabels: show }),

  sphereShowConnections: false,
  setSphereShowConnections: (show) => set({ sphereShowConnections: show }),

  sphereClusterBy: "category",
  setSphereClusterBy: (clusterBy) => set({ sphereClusterBy: clusterBy }),
}));
