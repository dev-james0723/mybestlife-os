"use client";

import { useMemo, useState } from "react";
import { Plus, Link2, Users, Building2, Lightbulb, Briefcase, Info } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { OSControl, OSPrimaryAction } from "@/components/ui/os-primitives";
import {
  CareerEmptyState,
  CareerFilterChips,
  CareerHelpPanel,
  CareerMetricCard,
  CareerMetricGrid,
  CareerSectionPanel,
} from "@/components/career/career-page-ui";
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

const FILTER_KEYS: FilterKey[] = ["all", "people", "organizations", "projects", "opportunities"];

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

  const filterItems = useMemo(
    () =>
      FILTER_KEYS.map((id) => {
        const typeByFilter: Record<FilterKey, NetworkNodeType | null> = {
          all: null,
          people: "person",
          organizations: "organization",
          projects: "project",
          opportunities: "opportunity",
        };
        const nodeType = typeByFilter[id];
        const count = nodeType
          ? (nodesQ.data ?? []).filter((node) => node.node_type === nodeType).length
          : (nodesQ.data ?? []).length;
        return { id, label: copy.filters[id], count };
      }),
    [copy.filters, nodesQ.data],
  );

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
        <>
          <OSControl className="gap-2" onClick={() => setAddEdgeOpen(true)}>
            <Link2 className="size-4" aria-hidden />
            {copy.addEdge}
          </OSControl>
          <OSPrimaryAction className="gap-2" onClick={() => setAddNodeOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {copy.addNode}
          </OSPrimaryAction>
        </>
      }
    >
      <div className="space-y-5">
        <CareerHelpPanel icon={Info} title="What the graph means">
          Nodes are people, organizations, projects, and opportunities. Ring color
          shows relationship warmth so you can see where a reconnect or new link matters.
        </CareerHelpPanel>

        <CareerMetricGrid className="xl:grid-cols-3">
          <CareerMetricCard
            icon={Users}
            label={copy.stats.total}
            value={(nodesQ.data ?? []).length}
          />
          <CareerMetricCard
            icon={Building2}
            label={copy.stats.hot}
            value={hotCount}
          />
          <CareerMetricCard
            icon={Lightbulb}
            label={copy.stats.needReconnect}
            value={coldCount}
          />
        </CareerMetricGrid>

        <CareerFilterChips
          items={filterItems}
          value={filter}
          onChange={setFilter}
          ariaLabel="Filter career network"
        />

        <LegendPanel copy={copy} />

        {filteredNodes.length === 0 ? (
          <CareerEmptyState
            icon={Users}
            title="Map your first career connection"
            description={copy.empty}
            actionLabel={copy.addNode}
            onAction={() => setAddNodeOpen(true)}
          />
        ) : (
          <CareerSectionPanel
            title="Relationship map"
            description="Select any node to inspect notes, last interaction, related opportunities, and next actions."
          >
            <div className="overflow-hidden rounded-xl border border-white/55 bg-white/70 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
              <svg
                viewBox="0 0 800 600"
                className="h-[70vh] min-h-[420px] w-full touch-none"
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
                      className="cursor-pointer focus:outline-none"
                      role="button"
                      tabIndex={0}
                      aria-label={`Open ${n.name}`}
                      onClick={() => setActiveNode(n)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setActiveNode(n);
                        }
                      }}
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
          </CareerSectionPanel>
        )}

        <ReconnectSuggestions nodes={nodesQ.data ?? []} />
      </div>

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

function LegendPanel({ copy }: { copy: ReturnType<typeof getCareerPhase5Copy>["network"] }) {
  const nodeItems: Array<{ label: string; color: string }> = [
    { label: copy.form.nodeTypes.person, color: NODE_COLORS.person },
    { label: copy.form.nodeTypes.organization, color: NODE_COLORS.organization },
    { label: copy.form.nodeTypes.project, color: NODE_COLORS.project },
    { label: copy.form.nodeTypes.opportunity, color: NODE_COLORS.opportunity },
  ];
  const warmthItems = Object.entries(copy.warmth).map(([key, label]) => ({
    label,
    color: WARMTH_RING[key] ?? WARMTH_RING.unknown,
  }));

  return (
    <section className="grid gap-3 rounded-xl border border-white/55 bg-white/58 p-4 text-xs dark:border-white/10 dark:bg-white/[0.04] md:grid-cols-2">
      <div>
        <h2 className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Node types
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {nodeItems.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <div>
        <h2 className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Warmth rings
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {warmthItems.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full border-2" style={{ borderColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </section>
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
