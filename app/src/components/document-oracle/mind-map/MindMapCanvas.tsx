"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { MindMapDbEdge, MindMapDbNode } from "@/lib/document-brain/mind-map/mindMapTypes";
import { MindMapNode, type MindMapFlowNode } from "@/components/document-oracle/mind-map/MindMapNode";
import { mindMapNodeAccent } from "@/components/document-oracle/mind-map/mindMapNodeStyles";
import { MindMapToolbar, type MindMapToolbarProps, type MindMapTypeFilterId } from "@/components/document-oracle/mind-map/MindMapToolbar";

const MAX_VISIBLE = 120;

function buildOutgoing(edges: MindMapDbEdge[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of edges) {
    if (!m.has(e.source_node_id)) m.set(e.source_node_id, []);
    m.get(e.source_node_id)!.push(e.target_node_id);
  }
  return m;
}

function descendantsFrom(out: Map<string, string[]>, start: string): Set<string> {
  const acc = new Set<string>();
  const stack = [...(out.get(start) ?? [])];
  while (stack.length) {
    const x = stack.pop()!;
    if (acc.has(x)) continue;
    acc.add(x);
    for (const y of out.get(x) ?? []) stack.push(y);
  }
  return acc;
}

function rootIdOf(nodes: MindMapDbNode[]): string | null {
  const r = nodes.find((n) => n.node_type === "document_root");
  return r?.id ?? null;
}

function computeVisibleIds(params: {
  nodes: MindMapDbNode[];
  edges: MindMapDbEdge[];
  collapsedIds: Set<string>;
  typeFilter: MindMapTypeFilterId;
  search: string;
}): Set<string> {
  const { nodes, edges, collapsedIds, typeFilter, search } = params;
  const out = buildOutgoing(edges);
  const hidden = new Set<string>();
  for (const id of collapsedIds) {
    for (const d of descendantsFrom(out, id)) hidden.add(d);
  }

  const typeSet =
    typeFilter === "all"
      ? null
      : new Set<string>(
          typeFilter === "concepts"
            ? ["concept"]
            : typeFilter === "sections"
              ? ["section", "subsection"]
              : typeFilter === "pages"
                ? ["page"]
                : typeFilter === "glossary"
                  ? ["glossary"]
                  : typeFilter === "visuals"
                    ? ["visual"]
                    : typeFilter === "people"
                      ? ["person", "organization"]
                      : typeFilter === "dates"
                        ? ["date"]
                        : typeFilter === "requirements"
                          ? ["requirement", "fee"]
                          : [],
        );

  const q = search.trim().toLowerCase();
  const visible = new Set<string>();
  for (const n of nodes) {
    if (hidden.has(n.id)) continue;
    if (typeSet && n.node_type !== "document_root" && !typeSet.has(n.node_type)) continue;
    if (q) {
      const hit =
        n.node_type === "document_root" ||
        n.label.toLowerCase().includes(q) ||
        (n.description || "").toLowerCase().includes(q) ||
        (n.keywords ?? []).some((k) => k.toLowerCase().includes(q));
      if (!hit) continue;
    }
    visible.add(n.id);
  }

  const rid = rootIdOf(nodes);
  if (!rid) return visible;

  const capped = new Set<string>();
  const queue: string[] = [];
  if (visible.has(rid)) {
    capped.add(rid);
    queue.push(rid);
  }
  while (queue.length > 0 && capped.size < MAX_VISIBLE) {
    const u = queue.shift()!;
    for (const v of out.get(u) ?? []) {
      if (!visible.has(v) || capped.has(v)) continue;
      if (capped.size >= MAX_VISIBLE) break;
      capped.add(v);
      queue.push(v);
    }
  }
  return capped;
}

function toRfNodes(
  nodes: MindMapDbNode[],
  visible: Set<string>,
  selectedId: string | null,
  highlightIds: Set<string>,
): MindMapFlowNode[] {
  return nodes
    .filter((n) => visible.has(n.id))
    .map((n) => ({
      id: n.id,
      type: "mindMap" as const,
      position: { x: Number(n.position_x) || 0, y: Number(n.position_y) || 0 },
      data: {
        db: n,
        selected: n.id === selectedId,
        dimmed: Boolean(selectedId) && n.id !== selectedId && !highlightIds.has(n.id),
      },
    }));
}

function toRfEdges(edges: MindMapDbEdge[], visible: Set<string>, selectedId: string | null): Edge[] {
  return edges
    .filter((e) => visible.has(e.source_node_id) && visible.has(e.target_node_id))
    .map((e) => {
      const sel = Boolean(selectedId && (e.source_node_id === selectedId || e.target_node_id === selectedId));
      return {
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        animated: false,
        style: {
          stroke: sel ? "rgba(200,229,58,0.55)" : "rgba(148,163,184,0.35)",
          strokeWidth: sel ? 2 : 1.2,
        },
        label: e.label ?? undefined,
        labelStyle: { fill: "rgba(226,232,240,0.75)", fontSize: 9 },
        labelBgStyle: { fill: "rgba(15,15,18,0.85)" },
      } satisfies Edge;
    });
}

function neighborIds(edges: MindMapDbEdge[], nid: string): Set<string> {
  const s = new Set<string>([nid]);
  for (const e of edges) {
    if (e.source_node_id === nid) s.add(e.target_node_id);
    if (e.target_node_id === nid) s.add(e.source_node_id);
  }
  return s;
}

function AutoFitView({ mapKey, nodeCount }: { mapKey: number; nodeCount: number }) {
  const rf = useReactFlow();
  const lastSignature = useRef<string>("");
  useEffect(() => {
    if (nodeCount === 0) {
      lastSignature.current = "";
      return;
    }
    const sig = `${mapKey}:${nodeCount}`;
    if (lastSignature.current === sig) return;
    lastSignature.current = sig;
    const id = requestAnimationFrame(() => {
      rf.fitView({ padding: 0.18, duration: 300 });
    });
    return () => cancelAnimationFrame(id);
  }, [mapKey, nodeCount, rf]);
  return null;
}

function ToolbarWithFit(props: Omit<MindMapToolbarProps, "onFitView" | "onResetView">) {
  const rf = useReactFlow();
  return (
    <MindMapToolbar
      {...props}
      onFitView={() => {
        void rf.fitView({ padding: 0.18, duration: 280 });
      }}
      onResetView={() => {
        rf.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 220 });
      }}
    />
  );
}

function MindMapShell(props: {
  dbNodes: MindMapDbNode[];
  dbEdges: MindMapDbEdge[];
  selectedId: string | null;
  onSelect: (n: MindMapDbNode | null) => void;
  search: string;
  typeFilter: MindMapTypeFilterId;
  onSearchChange: (v: string) => void;
  onTypeFilterChange: (v: MindMapTypeFilterId) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onRegenerate: () => void;
  regenerateBusy: boolean;
  branchNudge: number;
  unlockNeighborsNudge: number;
  viewportResetKey: number;
}) {
  const {
    dbNodes,
    dbEdges,
    selectedId,
    onSelect,
    search,
    typeFilter,
    onSearchChange,
    onTypeFilterChange,
    onExpandAll,
    onCollapseAll,
    onRegenerate,
    regenerateBusy,
    branchNudge,
    unlockNeighborsNudge,
    viewportResetKey,
  } = props;

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const lastBranch = useRef(0);
  const lastUnlock = useRef(0);

  useEffect(() => {
    const next = new Set<string>();
    for (const n of dbNodes) {
      if (n.collapsed) next.add(n.id);
    }
    setCollapsedIds(next);
  }, [dbNodes]);

  const highlightIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    return neighborIds(dbEdges, selectedId);
  }, [dbEdges, selectedId]);

  const visibleIds = useMemo(
    () =>
      computeVisibleIds({
        nodes: dbNodes,
        edges: dbEdges,
        collapsedIds,
        typeFilter,
        search,
      }),
    [dbNodes, dbEdges, collapsedIds, typeFilter, search],
  );

  const rfNodes = useMemo(
    () => toRfNodes(dbNodes, visibleIds, selectedId, highlightIds),
    [dbNodes, visibleIds, selectedId, highlightIds],
  );
  const rfEdges = useMemo(() => toRfEdges(dbEdges, visibleIds, selectedId), [dbEdges, visibleIds, selectedId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  useEffect(() => {
    setNodes(rfNodes);
  }, [rfNodes, setNodes]);

  useEffect(() => {
    setEdges(rfEdges);
  }, [rfEdges, setEdges]);

  const nodeTypes = useMemo(() => ({ mindMap: MindMapNode }), []);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, n: MindMapFlowNode) => {
      const row = dbNodes.find((d) => d.id === n.id);
      if (row) onSelect(row);
    },
    [dbNodes, onSelect],
  );

  const onPaneClick = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  const toggleCollapseSelected = useCallback(() => {
    if (!selectedId) return;
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(selectedId)) next.delete(selectedId);
      else next.add(selectedId);
      return next;
    });
  }, [selectedId]);

  useEffect(() => {
    if (branchNudge <= 0 || branchNudge === lastBranch.current) return;
    lastBranch.current = branchNudge;
    if (!selectedId) return;
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(selectedId)) next.delete(selectedId);
      else next.add(selectedId);
      return next;
    });
  }, [branchNudge, selectedId]);

  useEffect(() => {
    if (unlockNeighborsNudge <= 0 || unlockNeighborsNudge === lastUnlock.current) return;
    lastUnlock.current = unlockNeighborsNudge;
    if (!selectedId) return;
    const nset = neighborIds(dbEdges, selectedId);
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      for (const id of nset) next.delete(id);
      return next;
    });
  }, [unlockNeighborsNudge, selectedId, dbEdges]);

  const handleExpandAll = useCallback(() => {
    setCollapsedIds(new Set());
    onExpandAll();
  }, [onExpandAll]);

  const handleCollapseAll = useCallback(() => {
    const next = new Set<string>();
    const rid = rootIdOf(dbNodes);
    for (const n of dbNodes) {
      if (n.id !== rid && n.node_type !== "document_root") next.add(n.id);
    }
    setCollapsedIds(next);
    onCollapseAll();
  }, [dbNodes, onCollapseAll]);

  const miniColor = useCallback((n: MindMapFlowNode) => mindMapNodeAccent(n.data.db.node_type).minimap, []);

  return (
    <div className="flex h-[72dvh] min-h-[520px] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#050508] md:h-[70dvh] md:min-h-[620px] xl:h-[min(76vh,760px)] xl:min-h-[620px]">
      <div className="relative min-h-0 flex-1 touch-pan-y">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          minZoom={0.12}
          maxZoom={2}
          fitView={false}
          fitViewOptions={{ padding: 0.18 }}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          panOnScroll={false}
          nodesDraggable
          elementsSelectable
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
          className="!bg-transparent"
          defaultEdgeOptions={{ type: "smoothstep", style: { strokeWidth: 1.2 } }}
        >
          <AutoFitView mapKey={viewportResetKey} nodeCount={dbNodes.length} />
          <Panel position="top-left" className="!m-0 w-[min(100%,920px)] max-w-[calc(100%-8px)] p-1 sm:p-1.5">
            <ToolbarWithFit
              search={search}
              onSearchChange={onSearchChange}
              typeFilter={typeFilter}
              onTypeFilterChange={onTypeFilterChange}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              onRegenerate={onRegenerate}
              regenerateBusy={regenerateBusy}
              onToggleBranch={toggleCollapseSelected}
              branchToggleDisabled={!selectedId}
            />
          </Panel>
          <Background id="mm-grid" variant={BackgroundVariant.Dots} gap={18} size={1} color="rgba(148,163,184,0.12)" />
          <Controls className="!m-2 !scale-90 !border-white/10 !bg-black/70 !shadow-lg sm:!scale-100" />
          <MiniMap
            className="!m-2 !hidden !rounded-lg !border !border-white/10 !bg-black/60 md:!block"
            pannable
            zoomable
            nodeStrokeWidth={2}
            nodeColor={miniColor}
          />
          <Panel position="bottom-center" className="!m-2 max-w-[calc(100%-1rem)] text-center text-[10px] text-white/40 md:hidden">
            Pinch to zoom · drag to move
          </Panel>
          <Panel position="bottom-right" className="!m-2 hidden text-[10px] text-white/35 md:block">
            Scroll to zoom · drag to pan
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

export function MindMapCanvas(props: {
  dbNodes: MindMapDbNode[];
  dbEdges: MindMapDbEdge[];
  selectedId: string | null;
  viewportResetKey: number;
  onSelect: (n: MindMapDbNode | null) => void;
  search: string;
  typeFilter: MindMapTypeFilterId;
  onSearchChange: (v: string) => void;
  onTypeFilterChange: (v: MindMapTypeFilterId) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onRegenerate: () => void;
  regenerateBusy: boolean;
  branchNudge?: number;
  unlockNeighborsNudge?: number;
}) {
  return (
    <ReactFlowProvider>
      <MindMapShell
        {...props}
        branchNudge={props.branchNudge ?? 0}
        unlockNeighborsNudge={props.unlockNeighborsNudge ?? 0}
      />
    </ReactFlowProvider>
  );
}
