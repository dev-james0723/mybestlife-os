/**
 * Brain Detail Panel — slide-out details for the currently selected node.
 *
 * Differences from the KB Constellation detail panel:
 *
 * 1. Knows about all 26 node types, not just the original 9.
 * 2. The "open this entity" action navigates to the correct feature route
 *    per type (e.g. clicking a Goal node → `/goals`, a Quote → `/quote-library`).
 * 3. Uses the Brain UI store (mode/selection) instead of the KB store.
 */

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Compass, ExternalLink, X } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useBrainStore } from "@/stores/brain-store";
import {
  EDGE_TYPE_LABEL,
  NODE_COLORS,
  NODE_TYPE_LABEL,
} from "@/lib/knowledge/constellation/constants";
import { graphDetailShellClass } from "@/lib/knowledge/constellation/graphThemeTokens";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import type {
  ConstellationEdge,
  ConstellationNode,
  ConstellationNodeType,
} from "@/types/constellation";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { DEFAULT_LOCALE_SLUG, normalizeLocaleSlug } from "@/lib/i18n/locale-slug";

interface BrainDetailPanelProps {
  selectedNode: ConstellationNode | null;
  incidentEdges: ConstellationEdge[];
  nodeIndex: Map<string, ConstellationNode>;
  variant?: "panel" | "drawer";
  /** Hide the header ✕ when the parent provides an external expand/collapse control (e.g. mobile dock). */
  hideHeaderClose?: boolean;
  onClose?: () => void;
  onFocusNode: (nodeId: string) => void;
}

/**
 * Where should clicking "Open" on a given node type take the user? We
 * navigate to the feature page rather than opening an in-app drawer
 * because every Brain node lives on a different page in the app.
 */
function nodeRoute(node: ConstellationNode): string | null {
  switch (node.type) {
    case "goal":
      return "/goals";
    case "habit":
      return "/habits";
    case "quote":
      return "/quote-library";
    case "role_model":
      return "/relationship?tab=role-model";
    case "person":
      return "/relationship?tab=relationship";
    case "project":
      return "/projects";
    case "task":
      return "/tasks";
    case "idea":
      return "/ideas";
    case "journal_entry":
      return "/journal";
    case "career_event":
      return "/career/timeline";
    case "health_goal":
      return "/health";
    case "finance_goal":
      return "/finance";
    case "bucket_item":
      return "/bucket-list";
    case "gratitude":
      return "/grateful-things";
    case "about_me":
      return "/about-me";
    case "asset":
      return "/resources";
    case "ai_prompt":
      return "/ai-knowledge";
    case "software":
      return "/vault";
    case "daily_plan":
      return "/daily-planner";
    case "knowledge":
      return "/knowledge-base";
    case "category":
    case "tag":
    case "collection":
    case "source":
    case "concept":
    case "organization":
      return "/knowledge-base";
    default:
      return null;
  }
}

export function BrainDetailPanel({
  selectedNode,
  incidentEdges,
  nodeIndex,
  variant = "panel",
  hideHeaderClose = false,
  onClose,
  onFocusNode,
}: BrainDetailPanelProps) {
  const { mode: graphMode } = useGraphSurface();
  const setMode = useBrainStore((s) => s.setMode);
  const setSelectedNodeId = useBrainStore((s) => s.setSelectedNodeId);
  const params = useParams<{ locale?: string }>();
  const localeSlug =
    (params?.locale ? normalizeLocaleSlug(params.locale) : null) ??
    DEFAULT_LOCALE_SLUG;

  const grouped = useMemo<
    { node: ConstellationNode; edge: ConstellationEdge }[]
  >(() => {
    if (!selectedNode) return [];
    const out: { node: ConstellationNode; edge: ConstellationEdge }[] = [];
    for (const edge of incidentEdges) {
      const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
      const other = nodeIndex.get(otherId);
      if (other) out.push({ node: other, edge });
    }
    return out;
  }, [selectedNode, incidentEdges, nodeIndex]);

  const containerClasses = cn(
    "flex flex-col gap-0 overflow-hidden text-sm",
    graphDetailShellClass(graphMode, variant),
  );

  if (!selectedNode) {
    return (
      <aside className={containerClasses} aria-label="No selection">
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-3 py-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Details
          </h3>
          {onClose && !hideHeaderClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Click a node to inspect it.
        </div>
      </aside>
    );
  }

  const palette = NODE_COLORS[selectedNode.type];
  const route = nodeRoute(selectedNode);
  const fullRoute = route ? withLocalePrefix(localeSlug, route) : null;

  return (
    <aside className={containerClasses} aria-label={selectedNode.label}>
      {!hideHeaderClose && (
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: palette.core,
                boxShadow: `0 0 10px ${palette.glow}`,
              }}
            />
            <h3 className="truncate text-sm font-medium text-foreground">
              {selectedNode.label}
            </h3>
          </div>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-2 h-7 w-7 shrink-0 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <div
        className={cn(
          "min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4",
          hideHeaderClose && "pt-3",
        )}
      >
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Type</span>
            <Badge
              variant="outline"
              className="border-border/60 bg-muted/50 text-[11px] text-foreground/90"
            >
              {NODE_TYPE_LABEL[selectedNode.type as ConstellationNodeType]}
            </Badge>
          </div>

          {selectedNode.description && (
            <p className="pt-1 text-sm leading-relaxed text-foreground/90 line-clamp-5">
              {selectedNode.description}
            </p>
          )}

          {selectedNode.category && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Category</span>
              <span className="text-foreground/90">{selectedNode.category}</span>
            </div>
          )}

          {selectedNode.tags && selectedNode.tags.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-muted-foreground">Tags</span>
              <div className="flex flex-wrap gap-1">
                {selectedNode.tags.slice(0, 12).map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-violet-300/30 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-100"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
            <span>
              Connections:{" "}
              <span className="font-mono text-foreground/90">
                {selectedNode.connectionCount ?? 0}
              </span>
            </span>
            {selectedNode.createdAt && (
              <span>
                Created:{" "}
                <span className="text-muted-foreground">
                  {new Date(selectedNode.createdAt).toLocaleDateString()}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {fullRoute && (
            <Link
              href={fullRoute}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-cyan-300/30 bg-cyan-400/10 px-3 text-xs font-medium text-cyan-100 transition-colors hover:bg-cyan-400/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </Link>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-border/60 bg-muted/50 text-foreground/90 hover:bg-muted/70"
            onClick={() => {
              setMode("local");
              setSelectedNodeId(selectedNode.id);
              onFocusNode(selectedNode.id);
            }}
          >
            <Compass className="h-3.5 w-3.5" />
            Explore locally
          </Button>
        </div>

        {grouped.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Connections ({grouped.length})
            </h4>
            <ul className="space-y-1.5">
              {grouped.slice(0, 30).map(({ node, edge }) => {
                const targetPalette = NODE_COLORS[node.type];
                const strength = typeof edge.weight === "number"
                  ? edge.weight
                  : 0;
                const confidence = typeof edge.confidence === "number"
                  ? edge.confidence
                  : 0;
                return (
                  <li
                    key={`${edge.id}::${node.id}`}
                    className="rounded-md border border-border/60 bg-muted/30 p-2"
                  >
                    <button
                      type="button"
                      onClick={() => onFocusNode(node.id)}
                      className="flex w-full items-center gap-2 text-left text-xs text-foreground hover:underline"
                    >
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: targetPalette.core,
                          boxShadow: `0 0 6px ${targetPalette.glow}`,
                        }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {node.label}
                      </span>
                      <span className="shrink-0 rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {EDGE_TYPE_LABEL[edge.type]}
                      </span>
                    </button>
                    {edge.reason && (
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/85">
                        {edge.reason}
                      </p>
                    )}
                    {(strength > 0 || confidence > 0) && (
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        {strength > 0 && (
                          <span>
                            Strength{" "}
                            <span className="font-mono text-muted-foreground">
                              {Math.round(strength * 100)}%
                            </span>
                          </span>
                        )}
                        {confidence > 0 && (
                          <span>
                            Confidence{" "}
                            <span className="font-mono text-muted-foreground">
                              {Math.round(confidence * 100)}%
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
