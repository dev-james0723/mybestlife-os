"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dagre from "dagre";
import { Background, BaseEdge, EdgeLabelRenderer, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider, useNodesInitialized, useReactFlow, type Edge, type EdgeProps, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { neighborhood, relationshipLanes, type MapRelation } from "@/lib/projects/connections";
import type { ProjectMapUiCopy } from "@/lib/i18n/project-map-ui";
import styles from "./project-map.module.css";

export interface MapProject { id: string; name: string; status: string; statusLabel: string }
interface CardData extends Record<string, unknown> {
  project: MapProject; count: string; selected: boolean; dimmed: boolean;
  connect: string; disabled: boolean; select: () => void; start: () => void;
}
type CardNode = Node<CardData, "projectCard">;
interface LabelData extends Record<string, unknown> {
  label: string; sentence: string; lane: number; color: string; select: () => void; dimmed: boolean;
}
type LabelEdge = Edge<LabelData, "relationship">;
const WIDTH = 264;
const HEIGHT = 170;
const COLORS = { related: "#65a30d", "depends-on": "#3b82f6", blocks: "#dc2626", "parent-child": "#a855f7", "shared-idea": "#64748b" };
const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function ProjectCard({ data }: NodeProps<CardNode>) {
  return <div className={cn(styles.node, data.selected && styles.selected, data.dimmed && styles.dimmed)}>
    {SIDES.flatMap((side) => ["source", "target"].map((type) => <Handle key={`${type}-${side}`} id={`${type}-${side}`} type={type as "source" | "target"} position={side} isConnectable={false} style={{ opacity: 0, pointerEvents: "none" }} />))}
    <button type="button" className={cn("nodrag nopan", styles.cardBody)} onClick={data.select} aria-pressed={data.selected}>
      <span className={styles.status}><i data-status={data.project.status} />{data.project.statusLabel}</span>
      <span className={styles.name}>{data.project.name}</span>
    </button>
    <div className={styles.cardFooter}><span>{data.count}</span><button type="button" className="nodrag nopan" onClick={data.start} disabled={data.disabled}>{data.connect}</button></div>
  </div>;
}

function RelationshipEdge(props: EdgeProps<LabelEdge>) {
  const { sourceX: sx, sourceY: sy, targetX: tx, targetY: ty, data, markerEnd, id } = props;
  if (!data) return null;
  const horizontal = props.sourcePosition === Position.Left || props.sourcePosition === Position.Right;
  const sign = horizontal ? Math.sign(tx - sx) || 1 : Math.sign(ty - sy) || 1;
  const distance = Math.max(50, (horizontal ? Math.abs(tx - sx) : Math.abs(ty - sy)) / 3);
  const lane = data.lane * 4 / 3;
  const a = horizontal ? [sx + sign * distance, sy + lane] : [sx + lane, sy + sign * distance];
  const b = horizontal ? [tx - sign * distance, ty + lane] : [tx + lane, ty - sign * distance];
  const x = (sx + tx + 3 * a[0] + 3 * b[0]) / 8;
  const y = (sy + ty + 3 * a[1] + 3 * b[1]) / 8;
  return <>
    <BaseEdge id={id} path={`M${sx},${sy} C${a[0]},${a[1]} ${b[0]},${b[1]} ${tx},${ty}`} markerEnd={markerEnd} interactionWidth={28} style={{ ...props.style, opacity: data.dimmed ? 0.18 : 1 }} />
    <EdgeLabelRenderer><button type="button" className={cn("nodrag nopan", styles.edgeLabel)} aria-label={data.sentence} onClick={data.select} style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, borderColor: data.color, opacity: data.dimmed ? 0.4 : 1 }}>{data.label}</button></EdgeLabelRenderer>
  </>;
}
const nodeTypes = { projectCard: ProjectCard };
const edgeTypes = { relationship: RelationshipEdge };

interface Props {
  projects: MapProject[]; relations: MapRelation[]; selected: { type: "project" | "edge"; id: string } | null;
  counts: Map<string, number>; copy: ProjectMapUiCopy; disabled: boolean;
  selectProject: (id: string) => void; selectEdge: (id: string) => void; connect: (id: string) => void; clear: () => void;
  sentence: (edge: MapRelation) => string;
}

function Canvas(props: Props) {
  const { copy, projects, relations, selected } = props;
  const [direction, setDirection] = useState<"TB" | "LR">("TB");
  const host = useRef<HTMLDivElement>(null);
  const flow = useReactFlow();
  const ready = useNodesInitialized();
  const topology = JSON.stringify([projects.map((p) => p.id), relations.map((e) => [e.id, e.source, e.target]), direction]);
  const positions = useMemo(() => {
    const [ids, links, dir] = JSON.parse(topology) as [string[], [string, string, string][], "TB" | "LR"];
    const result = new Map<string, { x: number; y: number }>();
    if (!links.length) {
      const columns = Math.max(1, Math.ceil(Math.sqrt(ids.length) * (dir === "TB" ? 1 : 1.6)));
      ids.forEach((id, index) => result.set(id, { x: (index % columns) * (WIDTH + 90), y: Math.floor(index / columns) * (HEIGHT + 70) }));
      return result;
    }
    const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: dir, nodesep: 100, ranksep: dir === "LR" ? 240 : 120 });
    ids.forEach((id) => graph.setNode(id, { width: WIDTH, height: HEIGHT }));
    links.forEach(([, source, target]) => graph.setEdge(source, target));
    dagre.layout(graph);
    ids.forEach((id) => { const p = graph.node(id); result.set(id, { x: p.x - WIDTH / 2, y: p.y - HEIGHT / 2 }); });
    return result;
  }, [topology]);
  const neighbors = selected?.type === "project" ? neighborhood(relations, selected.id) : null;
  const lanes = relationshipLanes(relations);
  const nodes: CardNode[] = projects.map((project) => ({
    id: project.id, type: "projectCard", position: positions.get(project.id) ?? { x: 0, y: 0 },
    data: { project, count: copy.count(props.counts.get(project.id) ?? 0), selected: selected?.type === "project" && selected.id === project.id, dimmed: !!neighbors && !neighbors.has(project.id), connect: copy.connect, disabled: props.disabled, select: () => props.selectProject(project.id), start: () => props.connect(project.id) },
  }));
  const edges: LabelEdge[] = relations.map((relation) => {
    const a = positions.get(relation.source)!; const b = positions.get(relation.target)!;
    const horizontal = Math.abs(a.x - b.x) > Math.abs(a.y - b.y);
    const sourceSide = horizontal ? (a.x < b.x ? Position.Right : Position.Left) : (a.y < b.y ? Position.Bottom : Position.Top);
    const targetSide = horizontal ? (a.x < b.x ? Position.Left : Position.Right) : (a.y < b.y ? Position.Top : Position.Bottom);
    const directed = !["related", "shared-idea"].includes(relation.kind);
    const color = COLORS[relation.kind];
    return { id: relation.id, source: relation.source, target: relation.target, sourceHandle: `source-${sourceSide}`, targetHandle: `target-${targetSide}`, type: "relationship", markerEnd: directed ? { type: MarkerType.ArrowClosed, color, width: 18, height: 18 } : undefined,
      style: { stroke: color, strokeWidth: selected?.id === relation.id ? 3 : 2, strokeDasharray: directed ? undefined : "6 5" },
      data: { label: copy.kinds[relation.kind], sentence: props.sentence(relation), lane: lanes.get(relation.id) ?? 0, color, select: () => props.selectEdge(relation.id), dimmed: selected?.type === "project" && relation.source !== selected.id && relation.target !== selected.id },
    };
  });
  const { fitView } = flow;
  useEffect(() => {
    if (!ready || !host.current) return;
    let timer: ReturnType<typeof setTimeout>;
    const fit = () => { clearTimeout(timer); timer = setTimeout(() => { void fitView({ padding: 0.2, maxZoom: 1, duration: 0 }); }, 60); };
    fit();
    const observer = new ResizeObserver(fit); observer.observe(host.current);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [ready, topology, fitView]);
  const pan = (dx: number, dy: number) => { const v = flow.getViewport(); void flow.setViewport({ ...v, x: v.x + dx, y: v.y + dy }); };
  return <div className={styles.canvasShell}>
    <div className={styles.controls}>
      <Button type="button" variant="outline" aria-label={copy.zoomOut} onClick={() => void flow.zoomOut()}>−</Button>
      <Button type="button" variant="outline" aria-label={copy.zoomIn} onClick={() => void flow.zoomIn()}>+</Button>
      <Button type="button" variant="outline" onClick={() => void flow.fitView({ padding: 0.2, maxZoom: 1 })}>{copy.fit}</Button>
      <Button type="button" variant="outline" onClick={() => setDirection((d) => d === "TB" ? "LR" : "TB")}>{copy.arrange}</Button>
      <details><summary>{copy.pan}</summary><div className={styles.panButtons}>{[[copy.left, "←", 100, 0], [copy.up, "↑", 0, 100], [copy.down, "↓", 0, -100], [copy.right, "→", -100, 0]].map(([label, icon, x, y]) => <button type="button" key={label} aria-label={String(label)} onClick={() => pan(Number(x), Number(y))}>{icon}</button>)}</div></details>
    </div>
    <div ref={host} className={styles.canvas} tabIndex={0} role="region" aria-label={`${copy.title}. ${copy.help}`} onKeyDown={(event) => {
      if (event.target !== event.currentTarget) return;
      const actions: Record<string, () => void> = { ArrowLeft: () => pan(100, 0), ArrowRight: () => pan(-100, 0), ArrowUp: () => pan(0, 100), ArrowDown: () => pan(0, -100), "+": () => { void flow.zoomIn(); }, "=": () => { void flow.zoomIn(); }, "-": () => { void flow.zoomOut(); }, "0": () => { void flow.fitView({ padding: 0.2, maxZoom: 1 }); } };
      if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
    }}>
      <ReactFlow<CardNode, LabelEdge> nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} nodesDraggable={false} nodesConnectable={false} nodesFocusable={false} edgesFocusable={false} elementsSelectable={false} deleteKeyCode={null} panOnDrag zoomOnPinch zoomOnScroll={false} preventScrolling={false} zoomOnDoubleClick={false} minZoom={0.15} maxZoom={1.6} onPaneClick={props.clear} onEdgeClick={(_, edge) => props.selectEdge(edge.id)}>
        <Background gap={24} size={1} color="var(--muted-foreground)" />
      </ReactFlow>
    </div>
    <p className={styles.help}>{copy.help}</p>
  </div>;
}
export function ProjectMapCanvas(props: Props) { return <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>; }
