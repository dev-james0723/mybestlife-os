/**
 * Dev-only diagnostics overlay for the Brain page.
 *
 * Renders a tiny corner card with `analyzeBrainGraph` output:
 *   - total nodes / edges
 *   - orphan count + percentage
 *   - average / max degree
 *   - top edge sources (explicit / tag / life_area / entity / …)
 *
 * Visible only when `?brainDebug=1` is in the URL — never in production
 * unless the user explicitly opts in.
 */

"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeBrainGraph, summarizeBrainDiagnostics } from "@/lib/brain/diagnostics/analyzeBrainGraph";
import type { BrainGraphData } from "@/lib/brain/compat";

interface BrainDiagnosticsOverlayProps {
  /** Rich Brain graph (recompute upstream only when needed). */
  graph: BrainGraphData | null;
}

/** Resolve `?brainDebug=1` once on first render — never re-checks. */
function readDebugFlag(): boolean {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).get("brainDebug") === "1"
  );
}

export function BrainDiagnosticsOverlay({
  graph,
}: BrainDiagnosticsOverlayProps) {
  const [enabled] = useState<boolean>(readDebugFlag);
  const [open, setOpen] = useState(true);

  const diag = useMemo(
    () => (enabled && graph ? analyzeBrainGraph(graph) : null),
    [enabled, graph],
  );

  if (!enabled || !diag) return null;

  return (
    <div className="pointer-events-auto absolute left-3 top-12 z-30 max-w-xs rounded-xl border border-emerald-300/40 bg-card/95 p-3 text-[11px] text-card-foreground shadow-lg backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-200">
          Brain diagnostics
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div className="mt-2 space-y-2 leading-relaxed">
          <p className="text-muted-foreground">
            {summarizeBrainDiagnostics(diag)}
          </p>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Edges by source
            </p>
            <ul className="mt-1 space-y-0.5">
              {Object.entries(diag.edgesBySourceMethod)
                .sort(([, a], [, b]) => b - a)
                .map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between">
                    <span className="text-foreground/90">{k}</span>
                    <span className="font-mono text-muted-foreground">{v}</span>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Top components
            </p>
            <p className="text-muted-foreground">
              {diag.topComponentSizes.join(" · ") || "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Isolated by type
            </p>
            <ul className="mt-1 space-y-0.5">
              {Object.entries(diag.isolatedNodesByDomain)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between">
                    <span className="text-foreground/90">{k}</span>
                    <span className="font-mono text-muted-foreground">{v}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
