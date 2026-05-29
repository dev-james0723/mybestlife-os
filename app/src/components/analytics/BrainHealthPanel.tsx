"use client";

import { BrainCircuit, Link2Off } from "lucide-react";

import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import { Badge } from "@/components/ui/badge";
import type { BrainHealth } from "@/lib/analytics/types";

function MiniConstellation({ health }: { health: BrainHealth }) {
  const connected = Math.max(1, Math.min(8, health.topConnectedDomains.length + 3));
  const orphanCount = Math.max(0, Math.min(8, Math.round(health.orphanRate * 8)));
  const nodes = Array.from({ length: connected + orphanCount }, (_, index) => ({
    id: index,
    orphan: index >= connected,
    x: 18 + ((index * 23) % 150),
    y: 22 + ((index * 37) % 76),
  }));

  return (
    <svg
      viewBox="0 0 190 120"
      className="h-36 w-full rounded-xl border border-border/50 bg-background/25"
      role="img"
      aria-label="Mini Brain constellation preview"
    >
      {nodes.slice(0, connected).map((node, index) => {
        const next = nodes[(index + 1) % connected];
        return (
          <line
            key={`edge-${node.id}`}
            x1={node.x}
            y1={node.y}
            x2={next.x}
            y2={next.y}
            stroke="hsl(var(--primary) / 0.26)"
            strokeWidth="1.5"
          />
        );
      })}
      {nodes.map((node) => (
        <circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r={node.orphan ? 3.2 : 4.4}
          fill={node.orphan ? "hsl(var(--muted-foreground) / 0.42)" : "hsl(var(--primary) / 0.82)"}
        />
      ))}
    </svg>
  );
}

export function BrainHealthPanel({ health }: { health: BrainHealth }) {
  return (
    <GlassTintPanel tint="violet" className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-4 text-primary" />
            <h2 className="text-base font-semibold tracking-normal">Brain Health</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{health.interpretation}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <MiniConstellation health={health} />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-background/35 p-3">
              <p className="text-2xl font-semibold tabular-nums">{health.totalNodes}</p>
              <p className="text-xs text-muted-foreground">nodes</p>
            </div>
            <div className="rounded-xl bg-background/35 p-3">
              <p className="text-2xl font-semibold tabular-nums">{health.totalEdges}</p>
              <p className="text-xs text-muted-foreground">edges</p>
            </div>
            <div className="rounded-xl bg-background/35 p-3">
              <p className="text-2xl font-semibold tabular-nums">
                {Math.round(health.orphanRate * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">orphan rate</p>
            </div>
            <div className="rounded-xl bg-background/35 p-3">
              <p className="text-2xl font-semibold tabular-nums">
                {health.averageDegree}
              </p>
              <p className="text-xs text-muted-foreground">avg degree</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Top connected domains
            </p>
            <div className="flex flex-wrap gap-2">
              {health.topConnectedDomains.length > 0 ? (
                health.topConnectedDomains.map((domain) => (
                  <Badge key={domain.domain} variant="outline">
                    {domain.domain} · {domain.degree}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No connected domains yet.
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Isolated domains
            </p>
            <div className="flex flex-wrap gap-2">
              {health.isolatedDomains.length > 0 ? (
                health.isolatedDomains.map((domain) => (
                  <Badge key={domain} variant="secondary">
                    <Link2Off className="size-3" />
                    {domain}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No fully isolated domains detected.
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/30 p-4">
            <p className="mb-2 text-sm font-medium">Suggested missing connections</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              {health.suggestedMissingConnections.length > 0 ? (
                health.suggestedMissingConnections.map((suggestion) => (
                  <p key={suggestion}>{suggestion}</p>
                ))
              ) : (
                <p>The graph has enough basic links for this lens. Keep linking new captures as they arrive.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </GlassTintPanel>
  );
}
