"use client";

import { useMemo, useState } from "react";
import { Plus, Link2, Users, Building2, Lightbulb, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import {
  useCareerNetworkEdges,
  useCareerNetworkNodes,
} from "@/hooks/use-career-network";
import { layoutNetwork } from "@/lib/network/force-layout";
import { computeWarmth, daysSince } from "@/lib/dashboard/aggregators";
import type {
  CareerNetworkEdge,
  CareerNetworkNode,
  NetworkNodeType,
} from "@/types/database";
import { AddNodeModal } from "./AddNodeModal";
import { AddEdgeModal } from "./AddEdgeModal";
import { NodeDetailPanel } from "./NodeDetailPanel";

type FilterKey = "all" | "people" | "organizations" | "projects" | "opportunities";

const NODE_COLORS: Record<NetworkNodeType, string> = {
  person: "#60a5fa",
  organization: "#f59e0b",
  project: "#a78bfa",
  opportunity: "#34d399",
};

const WARMTH_RING: Record<string, string> = {
  hot: "#ef4444",
  warm: "#f59e0b",
  cooling: "#94a3b8",
  cold: "#38bdf8",
  unknown: "#9ca3af",
};

export function NetworkGraph() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).network;

  const nodesQ = useCareerNetworkNodes();
  const edgesQ = useCareerNetworkEdges();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [addEdgeOpen, setAddEdgeOpen] = useState(false);
  const [activeNode, setActiveNode] = useState<CareerNetworkNode | null>(null);

  const filteredNodes = useMemo<CareerNetworkNode[]>(() => {
    const list = nodesQ.data ?? [];
    if (filter === "all") return list;
    const map: Record<FilterKey, NetworkNodeType | null> = {
      all: null,
      people: "person",
      organizations: "organization",
      projects: "project",
      opportunities: "opportunity",
    };
    const kind = map[filter];
    return kind ? list.filter((n) => n.node_type === kind) : list;
  }, [nodesQ.data, filter]);

  const filteredEdges = useMemo<CareerNetworkEdge[]>(() => {
    const ids = new Set(filteredNodes.map((n) => n.id));
    return (edgesQ.data ?? []).filter(
      (e) => ids.has(e.source_node_id) && ids.has(e.target_node_id),
    );
  }, [filteredNodes, edgesQ.data]);

  const layout = useMemo(() => {
    return layoutNetwork(
      filteredNodes.map((n) => ({ id: n.id, size: n.size })),
      filteredEdges.map((e) => ({
        source: e.source_node_id,
        target: e.target_node_id,
      })),
    );
  }, [filteredNodes, filteredEdges]);

  const positions = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const p of layout) m.set(p.id, { x: p.x, y: p.y });
    return m;
  }, [layout]);

  if (nodesQ.isLoading || edgesQ.isLoading) return <LoadingPage />;

  const hotCount = (nodesQ.data ?? []).filter(
    (n) => computeWarmth(n.last_interaction_date) === "hot",
  ).length;
  const coldCount = (nodesQ.data ?? []).filter((n) => {
    const w = computeWarmth(n.last_interaction_date);
    return w === "cold" || w === "cooling";
  }).length;

  return (
    <PageShell
      title={copy.pageTitle}
      description={copy.pageDescription}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddEdgeOpen(true)}>
            <Link2 className="mr-1 h-4 w-4" />
            {copy.addEdge}
          </Button>
          <Button size="sm" onClick={() => setAddNodeOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {copy.addNode}
          </Button>
        </div>
      }
    >
      <section className="grid grid-cols-3 gap-2 sm:grid-cols-3">
        <StatBlock
          icon={<Users className="h-4 w-4" />}
          label={copy.stats.total}
          value={(nodesQ.data ?? []).length}
        />
        <StatBlock
          icon={<Building2 className="h-4 w-4" />}
          label={copy.stats.hot}
          value={hotCount}
        />
        <StatBlock
          icon={<Lightbulb className="h-4 w-4" />}
          label={copy.stats.needReconnect}
          value={coldCount}
        />
      </section>

      <nav className="flex flex-wrap gap-2">
        {(["all", "people", "organizations", "projects", "opportunities"] as FilterKey[]).map(
          (k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                filter === k
                  ? "bg-foreground text-background"
                  : "bg-background hover:bg-accent/40"
              }`}
            >
              {copy.filters[k]}
            </button>
          ),
        )}
      </nav>

      {filteredNodes.length === 0 ? (
        <p className="rounded-xl border bg-card py-16 text-center text-sm text-muted-foreground">
          {copy.empty}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <svg
            viewBox="0 0 800 600"
            className="h-[70vh] w-full touch-none"
            role="img"
            aria-label={copy.pageTitle}
          >
            {filteredEdges.map((e) => {
              const a = positions.get(e.source_node_id);
              const b = positions.get(e.target_node_id);
              if (!a || !b) return null;
              const opacity = 0.2 + Math.min(5, e.strength ?? 2) * 0.14;
              return (
                <line
                  key={e.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="currentColor"
                  strokeOpacity={opacity}
                  strokeWidth={1.2}
                />
              );
            })}
            {filteredNodes.map((n) => {
              const p = positions.get(n.id);
              if (!p) return null;
              const r = 10 + Math.min(4, Math.max(0, (n.size ?? 1) - 1)) * 2;
              const warmth = computeWarmth(n.last_interaction_date);
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x},${p.y})`}
                  className="cursor-pointer"
                  onClick={() => setActiveNode(n)}
                >
                  <circle
                    r={r + 3}
                    fill="none"
                    stroke={WARMTH_RING[warmth] ?? WARMTH_RING.unknown}
                    strokeWidth={2}
                    opacity={0.7}
                  />
                  <circle r={r} fill={NODE_COLORS[n.node_type]} opacity={0.9} />
                  <text
                    y={r + 14}
                    textAnchor="middle"
                    className="fill-foreground text-[10px]"
                    style={{ pointerEvents: "none" }}
                  >
                    {n.name.length > 20 ? `${n.name.slice(0, 20)}…` : n.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Rekindle suggestions */}
      <ReconnectSuggestions nodes={nodesQ.data ?? []} />

      <AddNodeModal open={addNodeOpen} onOpenChange={setAddNodeOpen} />
      <AddEdgeModal
        open={addEdgeOpen}
        onOpenChange={setAddEdgeOpen}
        nodes={nodesQ.data ?? []}
      />
      <NodeDetailPanel node={activeNode} onClose={() => setActiveNode(null)} />
    </PageShell>
  );
}

function StatBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <div className="mx-auto mb-1 grid h-6 w-6 place-items-center text-muted-foreground">
        {icon}
      </div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function ReconnectSuggestions({ nodes }: { nodes: CareerNetworkNode[] }) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).network;
  const cold = useMemo(
    () =>
      nodes
        .filter((n) => n.node_type === "person")
        .map((n) => {
          const w = computeWarmth(n.last_interaction_date);
          const d = daysSince(
            n.last_interaction_date
              ? n.last_interaction_date + "T00:00:00"
              : null,
          );
          return { node: n, warmth: w, days: d };
        })
        .filter((x) => x.warmth === "cold" || x.warmth === "cooling")
        .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))
        .slice(0, 3),
    [nodes],
  );

  if (cold.length === 0) return null;

  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Briefcase className="h-3.5 w-3.5" />
        {copy.suggestions.heading}
      </h2>
      <ul className="space-y-1">
        {cold.map((c) => (
          <li key={c.node.id} className="text-sm">
            {copy.suggestions.reconnect(c.node.name, c.days ?? 0)}
          </li>
        ))}
      </ul>
    </section>
  );
}
