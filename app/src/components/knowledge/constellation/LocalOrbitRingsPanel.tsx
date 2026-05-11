"use client";

import {
  EDGE_TYPE_LABEL,
  NODE_COLORS,
  NODE_TYPE_LABEL,
} from "@/lib/knowledge/constellation/constants";
import { graphLocalOrbitShellClass } from "@/lib/knowledge/constellation/graphThemeTokens";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import type { KnowledgeUiCopy } from "@/lib/i18n/knowledge-ui-copy-type";
import type {
  LocalOrbitRingMember,
  LocalOrbitState,
} from "@/lib/knowledge/constellation/computeLocalOrbitState";
import { truncateLabelForLocalOrbitCanvas } from "@/lib/knowledge/constellation/computeLocalOrbitState";
import { cn } from "@/lib/utils";
import { Compass } from "lucide-react";

export type LocalOrbitRingsPanelCopy = {
  title: string;
  pickCenterHint: string;
  centerBadge: string;
  depthLine: (depth: number) => string;
  graphCounts: (nodes: number, edges: number) => string;
  /** When the canvas uses progressive disclosure, explain canvas vs full neighborhood. */
  localOrbitGraphSubsetSummary: (
    canvasNodes: number,
    canvasEdges: number,
    availableNodes: number,
    availableEdges: number,
  ) => string;
  innerTitle: string;
  innerDesc: string;
  middleTitle: string;
  middleDesc: string;
  outerTitle: string;
  outerDesc: string;
  noMembers: string;
};

export function localOrbitPanelCopyFromKnowledge(
  c: KnowledgeUiCopy["constellation"],
): LocalOrbitRingsPanelCopy {
  return {
    title: c.localOrbitPanelTitle,
    pickCenterHint: c.localOrbitPickCenterHint,
    centerBadge: c.localOrbitCenterBadge,
    depthLine: c.localOrbitDepthLine,
    graphCounts: c.localOrbitGraphCounts,
    localOrbitGraphSubsetSummary: c.localOrbitGraphSubsetSummary,
    innerTitle: c.localOrbitInnerRingTitle,
    innerDesc: c.localOrbitInnerRingDesc,
    middleTitle: c.localOrbitMiddleRingTitle,
    middleDesc: c.localOrbitMiddleRingDesc,
    outerTitle: c.localOrbitOuterRingTitle,
    outerDesc: c.localOrbitOuterRingDesc,
    noMembers: c.localOrbitNoMembers,
  };
}

type LocalOrbitRingsPanelProps = {
  /** null = no selection */
  localOrbit: LocalOrbitState | null;
  copy: LocalOrbitRingsPanelCopy;
  onFocusNode: (id: string) => void;
  /** Use graph shell styling (Brain + Constellation local orbit chrome). */
  useOrbitChrome?: boolean;
  className?: string;
  /** When true, skip the large center-node header (parent panel already shows it). */
  compact?: boolean;
};

export function LocalOrbitRingsPanel({
  localOrbit,
  copy,
  onFocusNode,
  useOrbitChrome = true,
  className,
  compact = false,
}: LocalOrbitRingsPanelProps) {
  const { mode: graphMode } = useGraphSurface();

  if (!localOrbit) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground",
          useOrbitChrome && graphLocalOrbitShellClass(graphMode),
          className,
        )}
      >
        <Compass className="h-5 w-5 text-violet-500 dark:text-violet-300" aria-hidden />
        <p className="max-w-xs text-xs">{copy.pickCenterHint}</p>
      </div>
    );
  }

  const { centerNode, ringGroups, counts, maxDepth } = localOrbit;
  const totalRing =
    counts.innerRingCount + counts.middleRingCount + counts.outerRingCount;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col",
        useOrbitChrome && graphLocalOrbitShellClass(graphMode),
        className,
      )}
    >
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <Compass
            className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-300"
            aria-hidden
          />
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {copy.title}
          </h3>
        </div>
        <p className="break-words text-[10px] uppercase tracking-wider leading-snug text-muted-foreground">
          {copy.localOrbitGraphSubsetSummary(
            counts.canvasNodes,
            counts.canvasEdges,
            counts.totalAvailableNodes,
            counts.totalAvailableEdges,
          )}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {!compact && (
          <header className="mb-3">
            <h4 className="text-sm font-medium text-foreground">{centerNode.label}</h4>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {copy.centerBadge}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {copy.depthLine(maxDepth)} · {totalRing}{" "}
              {totalRing === 1 ? "connection" : "connections"} in rings
            </p>
          </header>
        )}
        {compact && (
          <p className="mb-3 text-[11px] text-muted-foreground">
            {copy.depthLine(maxDepth)} ·{" "}
            {copy.localOrbitGraphSubsetSummary(
              counts.canvasNodes,
              counts.canvasEdges,
              counts.totalAvailableNodes,
              counts.totalAvailableEdges,
            )}{" "}
            {totalRing} {totalRing === 1 ? "ring member" : "ring members"}
          </p>
        )}

        <RingBlock
          title={copy.innerTitle}
          description={copy.innerDesc}
          accent="emerald"
          members={ringGroups.inner}
          onFocusNode={onFocusNode}
          noMembers={copy.noMembers}
        />
        <RingBlock
          title={copy.middleTitle}
          description={copy.middleDesc}
          accent="cyan"
          members={ringGroups.middle}
          onFocusNode={onFocusNode}
          noMembers={copy.noMembers}
        />
        <RingBlock
          title={copy.outerTitle}
          description={copy.outerDesc}
          accent="violet"
          members={ringGroups.outer}
          onFocusNode={onFocusNode}
          noMembers={copy.noMembers}
        />
      </div>
    </div>
  );
}

function RingBlock({
  title,
  description,
  members,
  accent,
  onFocusNode,
  noMembers,
}: {
  title: string;
  description: string;
  members: LocalOrbitRingMember[];
  accent: "emerald" | "cyan" | "violet";
  onFocusNode: (id: string) => void;
  noMembers: string;
}) {
  const accentClasses = {
    emerald: "border-emerald-300/30 text-emerald-200",
    cyan: "border-cyan-300/30 text-cyan-200",
    violet: "border-violet-300/30 text-violet-200",
  }[accent];

  if (members.length === 0) {
    return (
      <section className="mb-4">
        <h5
          className={cn(
            "mb-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
            accentClasses,
          )}
        >
          {title}
        </h5>
        <p className="ml-1 mt-1 text-[11px] text-muted-foreground">{description}</p>
        <p className="ml-1 mt-2 text-[11px] text-muted-foreground">{noMembers}</p>
      </section>
    );
  }

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between">
        <h5
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
            accentClasses,
          )}
        >
          {title}
        </h5>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {members.length}
        </span>
      </div>
      <p className="ml-1 mt-1 text-[11px] text-muted-foreground">{description}</p>
      <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-0.5">
        {members.slice(0, 40).map(({ node, edge, score, depth }) => {
          const palette = NODE_COLORS[node.type];
          const preview = truncateLabelForLocalOrbitCanvas(node, depth);
          return (
            <li key={`${edge.id}::${node.id}`}>
              <button
                type="button"
                onClick={() => onFocusNode(node.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted/50"
                title={node.label}
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: palette.core,
                    boxShadow: `0 0 6px ${palette.glow}`,
                  }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{preview}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {EDGE_TYPE_LABEL[edge.type]}
                </span>
                <span className="ml-2 shrink-0 font-mono text-[10px] text-muted-foreground">
                  {Math.round(score * 100)}%
                </span>
              </button>
              <span className="sr-only">{NODE_TYPE_LABEL[node.type]}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
