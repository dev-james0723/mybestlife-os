"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Background, BaseEdge, EdgeLabelRenderer, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider, getBezierPath, useNodesInitialized, useReactFlow, useViewport, type Edge, type EdgeProps, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, LayoutGrid, Link2, Maximize2, Minus, Move, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/database";
import type { ProjectMapEdge } from "@/lib/projects/connections";
import type { ProjectMapUiCopy } from "@/lib/i18n/project-map-ui";
import styles from "./project-map.module.css";

type Props = {
  projects: Project[]; edges: ProjectMapEdge[]; counts: Map<string, number>; highlighted: Set<string>;
  selectedId: string | null; selectedEdgeId: string | null; disabled: boolean; ui: ProjectMapUiCopy;
  status: (p: Project) => string; sentence: (edge: ProjectMapEdge) => string;
  onInspect: (id: string) => void; onConnect: (id: string) => void; onInspectEdge: (id: string) => void;
};
type CardData = { project: Project; status: string; count: number; active: boolean; dimmed: boolean; disabled: boolean; ui: ProjectMapUiCopy; inspect: () => void; connect: () => void };
type CardNode = Node<CardData, "projectCard">;
type LineData = { title: string; sentence: string; inspect: () => void; offset: number };
type LineEdge = Edge<LineData, "connection">;
const W = 240, H = 166;

function ProjectCard({ data }: NodeProps<CardNode>) {
  return <article className={`${styles.node} nopan nodrag`} data-active={data.active} data-dimmed={data.dimmed}>
    {[Position.Left, Position.Right].map((position) => <Handle key={`target-${position}`} type="target" position={position} id={`target-${position}`} isConnectable={false} className={styles.handle} />)}
    <button type="button" className={styles.nodeBody} onClick={data.inspect} aria-pressed={data.active} aria-label={`${data.project.name}. ${data.status}. ${data.ui.connections(data.count)}`}>
      <span className={styles.status} data-status={data.project.status}>{data.status}</span>
      <span className={styles.nodeName}>{data.project.name}</span>
      <span className={styles.muted}>{data.ui.connections(data.count)}</span>
    </button>
    <button type="button" className={styles.nodeConnect} onClick={data.connect} disabled={data.disabled} aria-label={`${data.ui.connect}: ${data.project.name}`}><Link2 size={15} aria-hidden="true" />{data.ui.connect}</button>
    {[Position.Left, Position.Right].map((position) => <Handle key={`source-${position}`} type="source" position={position} id={`source-${position}`} isConnectable={false} className={styles.handle} />)}
  </article>;
}
function ConnectionLine(props: EdgeProps<LineEdge>) {
  const [basePath, x, y] = getBezierPath(props);
  const offset = props.data?.offset ?? 0;
  // Shared-idea evidence can coexist with a manual edge. Route it separately
  // instead of placing two identical labels on top of each other.
  const path = offset ? `M ${props.sourceX} ${props.sourceY} C ${(props.sourceX + props.targetX) / 2} ${props.sourceY + offset * 3}, ${(props.sourceX + props.targetX) / 2} ${props.targetY + offset * 3}, ${props.targetX} ${props.targetY}` : basePath;
  return <>
    <BaseEdge id={props.id} path={path} markerEnd={props.markerEnd} style={props.style} interactionWidth={24} />
    <EdgeLabelRenderer><button type="button" className={`${styles.edgeLabel} nodrag nopan`} style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y + offset * 2.25}px)` }} aria-label={props.data?.sentence} onClick={(event) => { event.stopPropagation(); props.data?.inspect(); }}>{props.data?.title}</button></EdgeLabelRenderer>
  </>;
}
const nodeTypes = { projectCard: ProjectCard };
const edgeTypes = { connection: ConnectionLine };

export function ProjectMapCanvas(props: Props) {
  return <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>;
}
function Canvas(props: Props) {
  const { ui } = props;
  const { fitView, getViewport, setViewport, zoomIn, zoomOut } = useReactFlow<CardNode, LineEdge>();
  const { zoom } = useViewport();
  const ready = useNodesInitialized();
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : 160;
  const container = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [showMove, setShowMove] = useState(false);
  const signature = JSON.stringify([props.projects.map((p) => p.id).sort(), props.edges.map((e) => [e.id, e.source, e.target]).sort()]);
  const positions = useMemo(() => {
    const [ids, edges] = JSON.parse(signature) as [string[], [string, string, string][]];
    const result = new Map<string, { x: number; y: number }>();
    if (!edges.length) {
      const columns = ids.length < 3 ? ids.length : ids.length <= 6 ? 2 : Math.ceil(Math.sqrt(ids.length));
      ids.forEach((id, i) => result.set(id, { x: (i % columns) * (W + 56), y: Math.floor(i / columns) * (H + 48) }));
      return result;
    }
    const graph = new dagre.graphlib.Graph({ multigraph: true });
    graph.setGraph({ rankdir: "LR", nodesep: 64, ranksep: 196, marginx: 24, marginy: 64 });
    graph.setDefaultEdgeLabel(() => ({}));
    ids.forEach((id) => graph.setNode(id, { width: W, height: H }));
    edges.forEach(([id, source, target]) => graph.setEdge(source, target, {}, id));
    dagre.layout(graph);
    ids.forEach((id) => { const point = graph.node(id); result.set(id, { x: point.x - W / 2, y: point.y - H / 2 }); });
    return result;
  }, [signature]);
  const nodes: CardNode[] = props.projects.map((project) => ({
    id: project.id, type: "projectCard", position: positions.get(project.id)!, width: W, height: H,
    data: { project, status: props.status(project), count: props.counts.get(project.id) ?? 0,
      active: props.selectedId === project.id, dimmed: props.highlighted.size > 0 && !props.highlighted.has(project.id),
      disabled: props.disabled, ui, inspect: () => props.onInspect(project.id), connect: () => props.onConnect(project.id) },
  }));
  const edges: LineEdge[] = props.edges.map((edge) => {
    const right = positions.get(edge.source)!.x <= positions.get(edge.target)!.x;
    const color = edge.kind === "blocks" ? "#dc5967" : edge.kind === "depends-on" ? "#558be8" : edge.kind === "contains" ? "#9474db" : "var(--muted-foreground)";
    const active = edge.id === props.selectedEdgeId || edge.source === props.selectedId || edge.target === props.selectedId;
    return {
      id: edge.id, type: "connection", source: edge.source, target: edge.target,
      sourceHandle: `source-${right ? "right" : "left"}`, targetHandle: `target-${right ? "left" : "right"}`,
      markerEnd: edge.kind === "related" || edge.kind === "shared-idea" ? undefined : { type: MarkerType.ArrowClosed, color },
      style: { stroke: color, strokeWidth: active ? 2.6 : 1.8, strokeDasharray: edge.kind === "shared-idea" ? "6 5" : undefined, opacity: props.highlighted.size && !active ? 0.3 : 0.9 },
      data: { title: edge.kind === "shared-idea" ? ui.shared : ui.kinds[edge.kind], sentence: props.sentence(edge), inspect: () => props.onInspectEdge(edge.id), offset: edge.kind === "shared-idea" ? 32 : 0 },
    };
  });
  const fit = useCallback(() => { void fitView({ padding: 0.22, minZoom: 0.2, maxZoom: 1, duration: 0 }); }, [fitView]);
  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(frame);
  }, [signature, ready, fit]);
  useEffect(() => {
    if (!container.current || !ready) return;
    let frame = 0;
    const observer = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); });
    observer.observe(container.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [fit, ready]);
  const move = (x: number, y: number) => { const current = getViewport(); void setViewport({ ...current, x: current.x + x, y: current.y + y }, { duration }); };
  return <div className={styles.canvasShell}>
    <div className={styles.canvasControls}>
      <div className={styles.controls}>
        <Button type="button" variant="outline" size="icon" aria-label={ui.zoomOut} onClick={() => { void zoomOut({ duration }); }}><Minus /></Button>
        <output className={styles.zoom}>{Math.round(zoom * 100)}%</output>
        <Button type="button" variant="outline" size="icon" aria-label={ui.zoomIn} onClick={() => { void zoomIn({ duration }); }}><Plus /></Button>
        <Button type="button" variant="outline" onClick={fit}><Maximize2 />{ui.fit}</Button>
        <Button type="button" variant="outline" onClick={fit}><LayoutGrid />{ui.arrange}</Button>
        <Button type="button" variant="outline" aria-expanded={showMove} onClick={() => setShowMove(!showMove)}><Move />{ui.move}</Button>
      </div>
      {showMove && <div className={styles.controls} role="group" aria-label={ui.move}>
        <Button type="button" variant="outline" size="icon" aria-label={ui.left} onClick={() => move(80, 0)}><ArrowLeft /></Button>
        <Button type="button" variant="outline" size="icon" aria-label={ui.up} onClick={() => move(0, 80)}><ArrowUp /></Button>
        <Button type="button" variant="outline" size="icon" aria-label={ui.down} onClick={() => move(0, -80)}><ArrowDown /></Button>
        <Button type="button" variant="outline" size="icon" aria-label={ui.right} onClick={() => move(-80, 0)}><ArrowRight /></Button>
      </div>}
    </div>
    <div ref={container} className={styles.canvas} tabIndex={0} aria-label={ui.title} aria-describedby={hintId} onKeyDown={(event) => {
      if (event.target !== event.currentTarget) return;
      const shifts: Record<string, [number, number]> = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] };
      if (shifts[event.key]) { event.preventDefault(); move(...shifts[event.key]); }
      else if (event.key === "+" || event.key === "=") { event.preventDefault(); void zoomIn({ duration }); }
      else if (event.key === "-") { event.preventDefault(); void zoomOut({ duration }); }
      else if (event.key === "0") { event.preventDefault(); fit(); }
    }}>
      <ReactFlow<CardNode, LineEdge> nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        nodesDraggable={false} nodesConnectable={false} nodesFocusable={false} edgesFocusable={false} elementsSelectable={false}
        deleteKeyCode={null} selectionKeyCode={null} panActivationKeyCode={null} minZoom={0.2} maxZoom={2}
        zoomOnScroll={false} zoomOnPinch zoomOnDoubleClick={false} panOnDrag preventScrolling={false}
        onEdgeClick={(_, edge) => props.onInspectEdge(edge.id)}>
        <Background gap={24} size={1} />
      </ReactFlow>
    </div>
    <p id={hintId} className={styles.hint}>{ui.navigationHint}</p>
  </div>;
}
