/**
 * Orphan Resolver — actionable suggestions panel for the Brain page.
 *
 * Lists nodes the user's graph has not yet meaningfully connected (degree
 * <= threshold), then offers per-orphan suggestions with reasons. The
 * user can confirm, reject, or skip each suggestion. Confirmed
 * suggestions become immediately visible edges; rejected ones never
 * resurface (their evidence_hash is persisted in `brain_edges`).
 *
 * Wired into the Brain detail panel as a sibling tab — the user lands on
 * the Orphan Resolver when they click the "Orphans" filter chip in the
 * toolbar OR when they select an orphan node directly.
 */

"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NODE_COLORS, NODE_TYPE_LABEL } from "@/lib/knowledge/constellation/constants";
import { graphLocalOrbitShellClass } from "@/lib/knowledge/constellation/graphThemeTokens";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import {
  brainNodeToConstellationNode,
} from "@/lib/brain/compat";
import {
  suggestConnectionsForNode,
} from "@/lib/brain/orphans/suggestConnectionsForNode";
import { findOrphans } from "@/lib/brain/orphans/findOrphans";
import {
  useConfirmBrainSuggestion,
  useRejectBrainSuggestion,
} from "@/hooks/use-brain-edge-mutations";
import type {
  BrainEdge,
  BrainEdgeStatus,
  BrainNode,
} from "@/types/brain-graph";
import type { BrainGraphData } from "@/lib/brain/compat";

interface BrainOrphanResolverProps {
  /** Rich Brain graph (use `buildBrainDataRich` upstream). */
  graph: BrainGraphData;
  /** Hashes of suggestions the user has already rejected. */
  rejectedHashes?: ReadonlySet<string>;
  /** When the user picks a node from the list, focus it on the canvas. */
  onFocusNode?: (nodeId: string) => void;
}

export function BrainOrphanResolver({
  graph,
  rejectedHashes,
  onFocusNode,
}: BrainOrphanResolverProps) {
  const { mode: graphMode } = useGraphSurface();
  const [maxDegree, setMaxDegree] = useState(0);
  const [selectedOrphanId, setSelectedOrphanId] = useState<string | null>(null);

  const { orphans, degree } = useMemo(
    () => findOrphans({ ...graph, maxDegree }),
    [graph, maxDegree],
  );

  // Resolve the currently-selected orphan (or the first if none selected).
  const selectedOrphan = useMemo<BrainNode | null>(() => {
    if (orphans.length === 0) return null;
    if (selectedOrphanId) {
      return orphans.find((n) => n.id === selectedOrphanId) ?? orphans[0];
    }
    return orphans[0];
  }, [orphans, selectedOrphanId]);

  // Top suggestions for the selected orphan.
  const suggestions = useMemo(() => {
    if (!selectedOrphan) return [];
    return suggestConnectionsForNode({
      node: selectedOrphan,
      allNodes: graph.nodes,
      edges: graph.edges,
      rejectedHashes,
      limit: 8,
    });
  }, [selectedOrphan, graph.nodes, graph.edges, rejectedHashes]);

  const confirm = useConfirmBrainSuggestion();
  const reject = useRejectBrainSuggestion();

  // Track per-suggestion in-flight + dismissed state for snappy UI.
  const [localStatus, setLocalStatus] = useState<
    Record<string, "idle" | "confirming" | "rejecting" | "done" | "rejected">
  >({});

  function setStatusFor(id: string, s: BrainEdgeStatus | "confirming" | "rejecting" | "idle" | "done" | "rejected") {
    setLocalStatus((prev) => ({ ...prev, [id]: s as never }));
  }

  async function handleConfirm(edge: BrainEdge) {
    setStatusFor(edge.id, "confirming");
    try {
      await confirm.mutateAsync(edge);
      setStatusFor(edge.id, "done");
    } catch {
      setStatusFor(edge.id, "idle");
    }
  }

  async function handleReject(edge: BrainEdge) {
    setStatusFor(edge.id, "rejecting");
    try {
      await reject.mutateAsync(edge);
      setStatusFor(edge.id, "rejected");
    } catch {
      setStatusFor(edge.id, "idle");
    }
  }

  return (
    <aside className={graphLocalOrbitShellClass(graphMode)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" aria-hidden />
          <h3 className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Orphan Resolver
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Show</span>
          <button
            type="button"
            className={cn(
              "rounded-md border px-1.5 py-0.5 transition-colors",
              maxDegree === 0
                ? "border-amber-300/40 bg-amber-500/10 text-amber-800 dark:text-amber-100"
                : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70",
            )}
            onClick={() => setMaxDegree(0)}
          >
            0 links
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md border px-1.5 py-0.5 transition-colors",
              maxDegree === 1
                ? "border-amber-300/40 bg-amber-500/10 text-amber-800 dark:text-amber-100"
                : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70",
            )}
            onClick={() => setMaxDegree(1)}
          >
            ≤1 link
          </button>
        </div>
      </div>

      {orphans.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
          <Sparkles className="h-5 w-5 text-emerald-300" aria-hidden />
          <p className="text-sm font-medium text-foreground/90">
            Your brain is fully connected.
          </p>
          <p className="max-w-xs text-xs">
            Every node has at least {maxDegree + 1} relationship. Try
            increasing the threshold to surface weakly-connected nodes.
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Orphan list */}
          <div className="flex w-44 shrink-0 flex-col overflow-y-auto border-r border-border/60 py-1">
            {orphans.slice(0, 200).map((n) => {
              const palette = NODE_COLORS[
                brainNodeToConstellationNode(n).type
              ];
              const active = selectedOrphan?.id === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedOrphanId(n.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                    active
                      ? "bg-amber-500/10 text-amber-800 dark:text-amber-100"
                      : "text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: palette.core,
                      boxShadow: `0 0 6px ${palette.glow}`,
                    }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{n.title}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {degree.get(n.id) ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Suggestions for the selected orphan */}
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-3 py-3">
            {selectedOrphan && (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => onFocusNode?.(selectedOrphan.id)}
                  className="text-left text-sm font-medium text-foreground hover:underline"
                >
                  {selectedOrphan.title}
                </button>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {NODE_TYPE_LABEL[
                    brainNodeToConstellationNode(selectedOrphan).type
                  ]}{" "}
                  · degree {degree.get(selectedOrphan.id) ?? 0}
                </p>
                {selectedOrphan.summary && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground/90 line-clamp-3">
                    {selectedOrphan.summary}
                  </p>
                )}
              </div>
            )}

            {suggestions.length === 0 ? (
              <p className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                No suggestions yet. Try adding tags or content to this node, or
                connect it manually from the detail panel.
              </p>
            ) : (
              <ul className="space-y-2">
                {suggestions.map(({ edge, combinedScore }) => {
                  const target = graph.nodes.find(
                    (n) => n.id === edge.targetNodeId,
                  );
                  if (!target) return null;
                  const palette = NODE_COLORS[
                    brainNodeToConstellationNode(target).type
                  ];
                  const status = localStatus[edge.id] ?? "idle";
                  const dim = status === "rejected";
                  return (
                    <li
                      key={edge.id}
                      className={cn(
                        "rounded-lg border border-border/60 bg-muted/30 p-2 text-xs transition-opacity",
                        dim && "opacity-40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: palette.core,
                            boxShadow: `0 0 6px ${palette.glow}`,
                          }}
                          aria-hidden
                        />
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left text-foreground hover:underline"
                          onClick={() => onFocusNode?.(target.id)}
                        >
                          {target.title}
                        </button>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-border/60 bg-muted/50 text-[10px] text-foreground/90"
                        >
                          {Math.round(combinedScore * 100)}%
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground/90">{edge.reason}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        via {edge.sourceMethod}
                      </p>
                      {status !== "done" && status !== "rejected" && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 gap-1 border border-emerald-300/30 bg-emerald-400/10 px-2 text-[11px] text-emerald-100 hover:bg-emerald-400/20"
                            onClick={() => void handleConfirm(edge)}
                            disabled={status === "confirming"}
                          >
                            {status === "confirming" ? (
                              <Loader2
                                className="h-3 w-3 animate-spin"
                                aria-hidden
                              />
                            ) : (
                              <Check className="h-3 w-3" aria-hidden />
                            )}
                            Confirm
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 border-border/60 bg-muted/40 px-2 text-[11px] text-muted-foreground hover:bg-muted/70"
                            onClick={() => void handleReject(edge)}
                            disabled={status === "rejecting"}
                          >
                            {status === "rejecting" ? (
                              <Loader2
                                className="h-3 w-3 animate-spin"
                                aria-hidden
                              />
                            ) : (
                              <X className="h-3 w-3" aria-hidden />
                            )}
                            Reject
                          </Button>
                        </div>
                      )}
                      {status === "done" && (
                        <p className="mt-2 text-[10px] uppercase tracking-wider text-emerald-300">
                          Connected.
                        </p>
                      )}
                      {status === "rejected" && (
                        <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                          Rejected — won&apos;t reappear.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
