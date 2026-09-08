"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useBrainStore } from "@/stores/brain-store";
import { DENSITY_MODE_LABEL, DENSITY_MODE_ORDER, DENSITY_MODE_ADVANCED } from "@/lib/brain/density";
import { NODE_TYPE_LABEL } from "@/lib/knowledge/constellation/constants";
import type { ConstellationNode, ConstellationClusterBy } from "@/types/constellation";
import { useBrainCopy } from "./useBrainCopy";
import type { BrainWorkspacePanel } from "./BrainWorkspaceToolbar";
import styles from "./brain-workspace.module.css";

export function BrainWorkspacePanels({ panel, nodes, selectedNodeId, onFocusNode, onClose, onFilters, onLegend, onResolver, onReset, onRefresh, onDetails }: {
  panel: Exclude<BrainWorkspacePanel, null>;
  nodes: ConstellationNode[];
  selectedNodeId: string | null;
  onFocusNode: (id: string) => void;
  onClose: () => void;
  onFilters: () => void;
  onLegend: () => void;
  onResolver: () => void;
  onReset: () => void;
  onRefresh: () => Promise<void>;
  onDetails: () => void;
}) {
  const b = useBrainCopy();
  const s = useBrainStore();
  const [limit, setLimit] = useState(50);
  const [refreshState, setRefreshState] = useState<"idle" | "busy" | "success" | "error">("idle");
  const sorted = useMemo(() => {
    const q = s.search.trim().toLocaleLowerCase();
    return nodes.filter(n => !q || [n.label, n.description, n.category, ...(n.tags ?? [])].some(v => v?.toLocaleLowerCase().includes(q))).sort((a, c) => a.label.localeCompare(c.label));
  }, [nodes, s.search]);
  const title = panel === "list" ? "Node list" : panel === "help" ? "Explore your Brain" : "Graph settings";
  const button = "w-full rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50";
  const isSphere = s.mode === "sphere_3d";
  return <section className={styles.panel} aria-label={b(title)}>
    <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2"><h2 className="text-sm font-semibold">{b(title)}</h2><button className="flex size-11 items-center justify-center rounded-xl hover:bg-muted" onClick={onClose} aria-label={b(panel === "list" ? "Close node list" : panel === "help" ? "Close help" : "Close settings")}><X className="size-4" /></button></div>
    <div className={styles.panelBody}>
      {panel === "list" ? <>
        <p className="mb-3 text-xs text-muted-foreground" role="status">{sorted.length} {b("nodes")}</p>
        <ul className="space-y-1">{sorted.slice(0, limit).map(n => <li key={n.id}><button className={button} aria-pressed={n.id === selectedNodeId} onClick={() => onFocusNode(n.id)}><span className="block truncate font-medium">{n.label}</span><span className="text-xs text-muted-foreground">{b(NODE_TYPE_LABEL[n.type])} · {n.connectionCount ?? 0} {b("connections")}</span></button></li>)}</ul>
        {!sorted.length && <p className="text-sm text-muted-foreground">{b("No matching nodes")}<br />{b("Try another word or clear your filters.")}</p>}
        {sorted.length > limit && <button className={`${button} mt-3`} onClick={() => setLimit(v => v + 50)}>{b("Show more")}</button>}
      </> : panel === "help" ? <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        {["Drag the background to pan. Pinch or scroll to zoom. Drag a node to arrange it.", "Select a node to read its details. Neighborhood shows its closest connections.", "Search highlights nodes. Choose a result to explore it.", "Use + / − to zoom, arrow keys to pan, and 0 to fit while the graph is focused.", "Focus mode fills the window; fullscreen also hides browser chrome when supported."].map(t => <p key={t}>{b(t)}</p>)}
        <button className={button} onClick={onClose}>{b("Got it")}</button>
      </div> : <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2"><button className={button} onClick={onFilters}>{b("Filters")}</button><button className={button} onClick={onLegend}>{b("Legend")}</button></div>
        <label className="grid gap-1.5 text-xs font-medium">{b("Connection filter")}<select className="w-full rounded-xl border border-border bg-background px-3 text-sm" value={s.densityMode} onChange={e => s.setDensityMode(e.target.value as typeof s.densityMode)}>{[...DENSITY_MODE_ORDER, ...DENSITY_MODE_ADVANCED].map(m => <option value={m} key={m}>{b(DENSITY_MODE_LABEL[m])}</option>)}</select></label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={isSphere ? s.sphereShowLabels : s.showLabels} onChange={e => isSphere ? s.setSphereShowLabels(e.target.checked) : s.setShowLabels(e.target.checked)} />{b("Labels")}</label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={s.filters.hideOrphanNodes ?? false} onChange={e => s.setFilters({ hideOrphanNodes: e.target.checked })} />{b("Hide disconnected nodes")}</label>
        {s.mode === "local" && <fieldset><legend className="mb-2 text-xs font-medium">{b("Local depth")}</legend><div className="flex gap-2">{([1, 2, 3] as const).map(d => <button key={d} aria-pressed={s.depth === d} className={`${button} text-center aria-pressed:bg-muted`} onClick={() => s.setDepth(d)}>{d}</button>)}</div></fieldset>}
        {isSphere && <>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={s.sphereShowConnections} onChange={e => s.setSphereShowConnections(e.target.checked)} />{b("Sphere links")}</label>
          <label className="grid gap-2 text-xs font-medium">{b("Cluster by")}<select className="rounded-xl border border-border bg-background px-3 text-sm" value={s.sphereClusterBy} onChange={e => s.setSphereClusterBy(e.target.value as ConstellationClusterBy)}>{(["category", "node_type", "collection", "project", "source_type", "none"] as const).map((c, i) => <option key={c} value={c}>{b(["Category", "Type", "Collection", "Project", "Source", "None"][i])}</option>)}</select></label>
          <fieldset><legend className="mb-2 text-xs font-medium">{b("Auto rotate")}</legend><div className="flex gap-2">{(["off", "slow", "normal"] as const).map(v => <button key={v} className={`${button} text-center aria-pressed:bg-muted`} aria-pressed={s.sphereRotationSpeed === v} onClick={() => s.setSphereRotationSpeed(v)}>{b(v)}</button>)}</div></fieldset>
        </>}
        <button className={button} disabled={!selectedNodeId} onClick={onDetails}>{b(s.inspectorOpen ? "Hide details" : "Show details")}</button>
        <button className={button} onClick={onResolver}>{b("Find connections")}</button>
        <button className={button} onClick={() => s.clearFilters()}>{b("Clear all filters")}</button>
        <button className={button} onClick={onReset}>{b("Reset layout")}</button>
        <button className={button} disabled={refreshState === "busy"} onClick={async () => { setRefreshState("busy"); try { await onRefresh(); setRefreshState("success"); } catch { setRefreshState("error"); } }}>{b(refreshState === "busy" ? "Refreshing" : "Refresh data")}</button>
        {refreshState === "success" && <p role="status" className="text-xs text-muted-foreground">{b("Data refreshed")}</p>}
        {refreshState === "error" && <p role="alert" className="text-xs text-destructive">{b("Refresh incomplete. Try again.")}</p>}
      </div>}
    </div>
  </section>;
}
