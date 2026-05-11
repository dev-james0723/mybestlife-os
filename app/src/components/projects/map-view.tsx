"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getProjectDateRangeLabelLocalized,
  getProjectStatusLabel,
} from "@/lib/projects/presentation";
import { useAppStore } from "@/stores/app-store";
import type { ProjectWithMeta } from "@/app/[locale]/(protected)/projects/page";
import type { Project } from "@/types/database";
import type { Idea } from "@/types/database";
import type { ProjectsUiCopy } from "@/lib/i18n/projects-ui";
import { Maximize2, Move, MousePointer2, Sparkles } from "lucide-react";

interface MapViewProps {
  projects: ProjectWithMeta[];
  ideas: Idea[];
  onSelectProject: (project: Project) => void;
  ui: ProjectsUiCopy;
}

type Pos = { x: number; y: number };

type EdgeKind = "shared-idea" | "related" | "depends-on" | "blocks" | "parent-child";

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  label: string;
};

type PendingConnection = {
  sourceId: string;
  targetId: string;
};

function circleLayout(ids: string[], cx: number, cy: number, radius: number): Map<string, Pos> {
  const map = new Map<string, Pos>();
  const n = ids.length;
  if (n === 0) return map;
  ids.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    map.set(id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });
  return map;
}

function buildIdeaEdges(ideas: Idea[], ui: ProjectsUiCopy): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const idea of ideas) {
    const ids = idea.linked_project_ids ?? [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        edges.push({
          id: `${idea.id}:${ids[i]}:${ids[j]}`,
          source: ids[i],
          target: ids[j],
          kind: "shared-idea",
          label: ui.relationshipTypeIdea,
        });
      }
    }
  }
  return edges;
}

const STATUS_COLOR: Record<string, string> = {
  planning: "#60a5fa",
  active: "#22c55e",
  paused: "#fbbf24",
  completed: "#34d399",
  cancelled: "#94a3b8",
};

const EDGE_STYLE: Record<
  EdgeKind,
  {
    stroke: string;
    dasharray?: string;
    marker?: boolean;
  }
> = {
  "shared-idea": { stroke: "hsl(var(--muted-foreground))", dasharray: "5 5" },
  related: { stroke: "hsl(var(--primary))", dasharray: "6 4" },
  "depends-on": { stroke: "#2563eb", marker: true },
  blocks: { stroke: "#dc2626", marker: true },
  "parent-child": { stroke: "#7c3aed", marker: true },
};

export function ProjectMapView({
  projects,
  ideas,
  onSelectProject,
  ui,
}: MapViewProps) {
  const language = useAppStore((s) => s.language);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 720, h: 480 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedForConnect, setSelectedForConnect] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [pendingType, setPendingType] = useState<EdgeKind>("related");
  const [manualEdges, setManualEdges] = useState<GraphEdge[]>([]);
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(
    null,
  );

  const visibleProjects = projects;
  const idsForLayout = useMemo(() => visibleProjects.map((p) => p.project.id), [visibleProjects]);

  const edges = useMemo(() => buildIdeaEdges(ideas, ui), [ideas, ui]);

  const filteredEdges = useMemo(() => {
    const idSet = new Set(idsForLayout);
    return [...edges, ...manualEdges].filter(
      ({ source, target }) => idSet.has(source) && idSet.has(target),
    );
  }, [edges, idsForLayout, manualEdges]);

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const id of idsForLayout) map.set(id, new Set());
    for (const edge of filteredEdges) {
      map.get(edge.source)?.add(edge.target);
      map.get(edge.target)?.add(edge.source);
    }
    return map;
  }, [filteredEdges, idsForLayout]);

  const layout = useMemo(() => {
    const w = 720;
    const h = 480;
    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = idsForLayout.length <= 2 ? Math.min(w, h) * 0.16 : Math.min(w, h) * 0.24;
    const r = Math.min(
      Math.min(w, h) * 0.32,
      baseRadius + Math.max(0, idsForLayout.length - 3) * 12,
    );
    return { w, h, cx, cy, r, positions: circleLayout(idsForLayout, cx, cy, r) };
  }, [idsForLayout]);

  const handleNodeClick = useCallback(
    (id: string) => {
      if (isConnecting) {
        if (selectedForConnect && selectedForConnect !== id) {
          setPendingConnection({ sourceId: selectedForConnect, targetId: id });
          setSelectedForConnect(null);
          setPendingType("related");
          return;
        }
        setSelectedForConnect(id);
        return;
      }

      const p = projects.find((x) => x.project.id === id)?.project;
      if (p) onSelectProject(p);
    },
    [isConnecting, onSelectProject, projects, selectedForConnect],
  );

  const idSet = useMemo(() => new Set(idsForLayout), [idsForLayout]);
  const connectedIds = hoveredId ? adjacency.get(hoveredId) ?? new Set() : null;

  const fitToScreen = useCallback(() => {
    setViewBox({ x: 0, y: 0, w: layout.w, h: layout.h });
  }, [layout.h, layout.w]);

  const startPan = (clientX: number, clientY: number) => {
    dragRef.current = {
      x: clientX,
      y: clientY,
      startX: viewBox.x,
      startY: viewBox.y,
    };
  };

  const onWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 1.12 : 0.9;
    setViewBox((current) => {
      const nextW = Math.max(260, Math.min(layout.w * 1.8, current.w * zoomFactor));
      const nextH = Math.max(180, Math.min(layout.h * 1.8, current.h * zoomFactor));
      return {
        x: current.x + (current.w - nextW) / 2,
        y: current.y + (current.h - nextH) / 2,
        w: nextW,
        h: nextH,
      };
    });
  };

  const getRelationshipLabel = (kind: EdgeKind) => {
    switch (kind) {
      case "related":
        return ui.relationshipTypeRelated;
      case "depends-on":
        return ui.relationshipTypeDependsOn;
      case "blocks":
        return ui.relationshipTypeBlocks;
      case "parent-child":
        return ui.relationshipTypeChild;
      default:
        return ui.relationshipTypeIdea;
    }
  };

  const savePendingConnection = () => {
    if (!pendingConnection) return;
    setManualEdges((prev) => [
      ...prev,
      {
        id: `manual:${pendingConnection.sourceId}:${pendingConnection.targetId}:${pendingType}:${prev.length}`,
        source: pendingConnection.sourceId,
        target: pendingConnection.targetId,
        kind: pendingType,
        label: getRelationshipLabel(pendingType),
      },
    ]);
    setPendingConnection(null);
    setIsConnecting(false);
  };

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1">
            <Move className="h-3.5 w-3.5" />
            {ui.relationshipHint}
          </span>
          {isConnecting && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2 py-1 text-primary">
              <MousePointer2 className="h-3.5 w-3.5" />
              {ui.relationshipCreate}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isConnecting ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setIsConnecting((current) => !current);
              setSelectedForConnect(null);
            }}
          >
            <MousePointer2 className="mr-1.5 h-3.5 w-3.5" />
            {ui.relationshipCreate}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={fitToScreen}>
            <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
            {ui.fitToScreen}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/15 px-3 py-2 text-xs">
          <div className="font-medium text-foreground">{ui.relationshipLegend}</div>
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            {[
              { key: "active", color: STATUS_COLOR.active, label: ui.statusActive },
              { key: "planning", color: STATUS_COLOR.planning, label: ui.statusPlanning },
              { key: "paused", color: STATUS_COLOR.paused, label: ui.statusPaused },
              { key: "completed", color: STATUS_COLOR.completed, label: ui.statusCompleted },
            ].map((item) => (
              <span key={item.key} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-px w-5 border-t border-dashed border-muted-foreground/70" />
              {ui.relationshipTypeIdea}
            </span>
          </div>
        </div>

        <svg
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="h-[min(70vh,520px)] w-full touch-manipulation bg-muted/20"
          role="img"
          aria-label={ui.viewMap}
          onWheel={onWheel}
          onPointerDown={(event) => {
            if ((event.target as SVGElement).closest("[data-node='true']")) return;
            startPan(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            const deltaX = ((event.clientX - dragRef.current.x) / layout.w) * viewBox.w;
            const deltaY = ((event.clientY - dragRef.current.y) / layout.h) * viewBox.h;
            setViewBox((current) => ({
              ...current,
              x: dragRef.current!.startX - deltaX,
              y: dragRef.current!.startY - deltaY,
            }));
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerLeave={() => {
            dragRef.current = null;
          }}
        >
          <defs>
            <marker
              id="graph-arrow"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
            </marker>
          </defs>

          {/* Edges */}
          {filteredEdges.map((edge) => {
            if (!idSet.has(edge.source) || !idSet.has(edge.target)) return null;
            const pa = layout.positions.get(edge.source);
            const pb = layout.positions.get(edge.target);
            if (!pa || !pb) return null;
            const isConnected =
              hoveredId &&
              (edge.source === hoveredId || edge.target === hoveredId);
            const style = EDGE_STYLE[edge.kind];
            const mx = (pa.x + pb.x) / 2;
            const my = (pa.y + pb.y) / 2 - 16;
            return (
              <g key={edge.id}>
                <line
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  stroke={style.stroke}
                  strokeOpacity={hoveredId ? (isConnected ? 0.9 : 0.12) : 0.35}
                  strokeWidth={isConnected ? 2.6 : 2}
                  strokeDasharray={style.dasharray}
                  markerEnd={style.marker ? "url(#graph-arrow)" : undefined}
                />
                {isConnected && (
                  <text
                    x={mx}
                    y={my}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px] font-medium"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {filteredEdges.length === 0 && (
            <foreignObject
              x={layout.cx - 150}
              y={layout.cy - 56}
              width={300}
              height={112}
            >
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed bg-background/90 px-4 text-center shadow-sm">
                <Sparkles className="mb-2 h-5 w-5 text-primary" />
                <p className="text-sm font-medium">{ui.relationshipNoEdgesTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ui.relationshipNoEdgesDescription}
                </p>
              </div>
            </foreignObject>
          )}

          {/* Nodes */}
          {visibleProjects.map((item) => {
            const { project } = item;
            const pos = layout.positions.get(project.id);
            if (!pos) return null;
            const fill =
              STATUS_COLOR[project.status] ?? "hsl(var(--primary))";
            const isHovered = hoveredId === project.id;
            const isNeighbor = hoveredId ? connectedIds?.has(project.id) : false;
            const isDimmed = hoveredId ? !isHovered && !isNeighbor : false;
            const radius = 34;
            return (
              <g
                key={project.id}
                data-node="true"
                className={cn("cursor-pointer transition-opacity", isDimmed && "opacity-25")}
                onClick={() => handleNodeClick(project.id)}
                onMouseEnter={() => setHoveredId(project.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(project.id)}
                onBlur={() => setHoveredId(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNodeClick(project.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={project.name}
              >
                <title>
                  {`${project.name} · ${getProjectStatusLabel(project.status, ui)} · ${
                    getProjectDateRangeLabelLocalized(project, language) || "-"
                  }`}
                </title>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill={fill}
                  stroke={selectedForConnect === project.id ? "hsl(var(--primary))" : "white"}
                  strokeOpacity={selectedForConnect === project.id ? 0.9 : 0.35}
                  strokeWidth={selectedForConnect === project.id ? 4 : 2}
                  className="transition-transform"
                  style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                />
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  className="fill-white text-[11px] font-semibold"
                  style={{ pointerEvents: "none" }}
                >
                  {project.name.trim().slice(0, 2)}
                </text>
                <foreignObject
                  x={pos.x - 62}
                  y={pos.y + 42}
                  width={124}
                  height={56}
                  style={{ pointerEvents: "none" }}
                >
                  <div className="flex flex-col items-center text-center">
                    <p className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground">
                      {project.name}
                    </p>
                    <span className="mt-1 inline-flex rounded-full border bg-background/90 px-2 py-0.5 text-[10px] text-muted-foreground shadow-sm">
                      {getProjectStatusLabel(project.status, ui)}
                    </span>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </Card>

      <p className="text-xs text-muted-foreground">{ui.relationshipHint}</p>

      <Dialog
        open={!!pendingConnection}
        onOpenChange={(open) => {
          if (!open) {
            setPendingConnection(null);
            setSelectedForConnect(null);
          }
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{ui.relationshipChooseType}</DialogTitle>
            <DialogDescription>{ui.relationshipCreate}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={pendingType}
              onValueChange={(value) => setPendingType(value as EdgeKind)}
              itemToStringLabel={(v) => getRelationshipLabel(v as EdgeKind)}
            >
              <SelectTrigger>
                <SelectValue placeholder={ui.relationshipTypeLabel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="related">{ui.relationshipTypeRelated}</SelectItem>
                <SelectItem value="depends-on">{ui.relationshipTypeDependsOn}</SelectItem>
                <SelectItem value="blocks">{ui.relationshipTypeBlocks}</SelectItem>
                <SelectItem value="parent-child">{ui.relationshipTypeChild}</SelectItem>
              </SelectContent>
            </Select>

            {pendingConnection && (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                {projects.find((item) => item.project.id === pendingConnection.sourceId)?.project.name}
                {" → "}
                {projects.find((item) => item.project.id === pendingConnection.targetId)?.project.name}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingConnection(null)}>
              {ui.cancel}
            </Button>
            <Button onClick={savePendingConnection}>{ui.relationshipCreateAction}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
