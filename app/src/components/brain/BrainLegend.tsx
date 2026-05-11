/**
 * Brain Legend — domain-grouped, interactive control panel.
 *
 * Unlike the KB Constellation Legend (a static colour key), this component
 * is the primary "what's in my brain right now?" overview. Users can:
 *
 *  - See live counts per domain.
 *  - Toggle whole domains on/off (e.g. hide all Knowledge nodes).
 *  - See a colour swatch + label for each node type that exists in the
 *    current graph (zero-count types are dimmed).
 *  - Read the edge-type key.
 */

"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBrainStore } from "@/stores/brain-store";
import {
  BRAIN_DOMAIN_LABEL,
  BRAIN_DOMAIN_NODE_MAP,
  type BrainDomain,
} from "@/types/brain";
import {
  EDGE_STYLE,
  EDGE_TYPE_LABEL,
  NODE_COLORS,
  NODE_TYPE_LABEL,
} from "@/lib/knowledge/constellation/constants";
import type { ConstellationEdgeType } from "@/types/constellation";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";

interface BrainLegendProps {
  open: boolean;
  onClose: () => void;
  /** Per-domain node counts in the current (unfiltered) graph. */
  domainCounts: Partial<Record<string, number>>;
}

const DOMAIN_ORDER: BrainDomain[] = [
  "growth",
  "career",
  "relationships",
  "knowledge",
  "life",
  "health",
  "finance",
  "tools",
];

/**
 * Edges relevant to surface in the Brain (skips redundant KB-internal
 * variants that are not used in cross-module relationships).
 */
const EDGE_KEYS: ConstellationEdgeType[] = [
  "manual_link",
  "ai_suggested_link",
  "goal_habit",
  "goal_project",
  "goal_task",
  "quote_goal",
  "role_model_goal",
  "habit_goal",
  "idea_project",
  "journal_project",
  "bucket_project",
  "career_project",
  "category_reference",
  "shared_tag",
  "same_collection",
  "semantic_similarity",
];

export function BrainLegend({
  open,
  onClose,
  domainCounts,
}: BrainLegendProps) {
  const domainToggles = useBrainStore((s) => s.domainToggles);
  const toggleDomain = useBrainStore((s) => s.toggleDomain);
  const { t: graphT } = useGraphSurface();

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Brain legend"
      className={cn(
        "pointer-events-auto absolute right-3 bottom-3 z-30 max-h-[calc(100vh-7rem)] w-80 overflow-hidden rounded-2xl text-sm",
        graphT.legend.wrap,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <h4 className="text-sm font-medium tracking-tight text-foreground">
            Life OS Brain
          </h4>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Domains · Nodes · Edges
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          onClick={onClose}
          aria-label="Close legend"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-4">
        <div className="space-y-3">
          {DOMAIN_ORDER.map((domain) => {
            const count = domainCounts[domain] ?? 0;
            const visible = domainToggles[domain];
            const types = BRAIN_DOMAIN_NODE_MAP[domain];
            return (
              <div
                key={domain}
                className={cn(
                  "rounded-xl border border-border/60 bg-muted/30 p-2.5 transition-colors",
                  !visible && "opacity-50",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleDomain(domain)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5 text-left hover:bg-muted/50"
                  aria-pressed={visible}
                  aria-label={`Toggle ${BRAIN_DOMAIN_LABEL[domain]}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                        visible
                          ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-200"
                          : "border-border/50 bg-transparent text-transparent",
                      )}
                      aria-hidden
                    >
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wider text-foreground/90">
                      {BRAIN_DOMAIN_LABEL[domain]}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {count}
                  </span>
                </button>

                <ul className="mt-1.5 grid grid-cols-2 gap-y-1 pl-6 text-[11px]">
                  {types.map((t) => (
                    <li key={t} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: NODE_COLORS[t].core,
                          boxShadow: `0 0 6px ${NODE_COLORS[t].glow}`,
                        }}
                        aria-hidden
                      />
                      <span className="truncate text-foreground/80">
                        {NODE_TYPE_LABEL[t]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            Strength
          </p>
          <ul className="mb-3 grid grid-cols-3 gap-x-2 gap-y-1.5 text-[11px]">
            <li className="flex items-center gap-2">
              <span
                className="inline-block w-6 shrink-0"
                style={{
                  height: 2,
                  backgroundColor: "rgba(125,211,252,0.95)",
                }}
                aria-hidden
              />
              <span className="truncate text-foreground">Strong</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className="inline-block w-6 shrink-0"
                style={{
                  height: 1,
                  borderTop: "1px dashed rgba(167,139,250,0.6)",
                }}
                aria-hidden
              />
              <span className="truncate text-foreground/80">Suggested</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className="inline-block w-6 shrink-0"
                style={{
                  height: 1,
                  borderTop: "1px dotted rgba(148,163,184,0.5)",
                }}
                aria-hidden
              />
              <span className="truncate text-foreground/70">Weak</span>
            </li>
          </ul>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            Relationship types
          </p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            {EDGE_KEYS.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span
                  className="inline-block w-5 shrink-0"
                  style={{
                    height: Math.max(1, EDGE_STYLE[t].width),
                    backgroundColor: EDGE_STYLE[t].dashed
                      ? "transparent"
                      : EDGE_STYLE[t].color,
                    borderTop: EDGE_STYLE[t].dashed
                      ? `1px dashed ${EDGE_STYLE[t].color}`
                      : undefined,
                  }}
                  aria-hidden
                />
                <span className="truncate text-foreground/85">
                  {EDGE_TYPE_LABEL[t]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
