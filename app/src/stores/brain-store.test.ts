import { beforeEach, describe, expect, it } from "vitest";
import { useBrainStore } from "./brain-store";
import { DEFAULT_DOMAIN_TOGGLES } from "@/types/brain";

describe("Brain workspace recovery", () => {
  beforeEach(() => useBrainStore.setState(useBrainStore.getInitialState(), true));

  it("clears every visibility constraint without losing the selected graph mode", () => {
    const s = useBrainStore.getState();
    s.setSearch("hidden notebook");
    s.setFilters({ hideOrphanNodes: true, minConnectionCount: 12, showManualLinksOnly: true });
    s.setDensityMode("orphans_only");
    for (const domain of Object.keys(DEFAULT_DOMAIN_TOGGLES) as (keyof typeof DEFAULT_DOMAIN_TOGGLES)[]) s.setDomainVisible(domain, false);
    s.setMode("local");
    s.clearFilters();
    const next = useBrainStore.getState();
    expect(next.search).toBe("");
    expect(next.filters).toEqual(useBrainStore.getInitialState().filters);
    expect(next.domainToggles).toEqual(DEFAULT_DOMAIN_TOGGLES);
    expect(next.densityMode).toBe("all");
    expect(next.mode).toBe("local");
  });

  it("keeps search and its filter representation in sync", () => {
    useBrainStore.getState().setSearch("Music");
    expect(useBrainStore.getState().filters.search).toBe("Music");
  });

  it("dismisses details without clearing the user's selection", () => {
    const s = useBrainStore.getState();
    s.setSelectedNodeId("project::music");
    s.setInspectorOpen(true);
    s.setInspectorOpen(false);
    expect(useBrainStore.getState().inspectorOpen).toBe(false);
    expect(useBrainStore.getState().selectedNodeId).toBe("project::music");
  });

  it("starts 3D without ambient motion and clears stale sphere focus on exit", () => {
    const s = useBrainStore.getState();
    expect(s.sphereRotationSpeed).toBe("off");
    s.setMode("sphere_3d");
    s.setHoveredNodeId("project::music");
    s.setMode("global");
    expect(useBrainStore.getState().is3DSphereMode).toBe(false);
    expect(useBrainStore.getState().hoveredNodeId).toBeNull();
    expect(useBrainStore.getState().focusState).toEqual({ phase: "idle" });
  });
});
