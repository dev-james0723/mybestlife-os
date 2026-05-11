/**
 * Brain Filters — domain-grouped filter panel.
 *
 * Unlike the KB Constellation Filters which has flat node-type toggles, the
 * Brain groups its 26 node types under 8 life domains, then offers
 * additional filters for orphan hiding and AI suggestion confidence.
 */

"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useBrainStore } from "@/stores/brain-store";
import {
  BRAIN_DOMAIN_LABEL,
  BRAIN_DOMAIN_NODE_MAP,
  type BrainDomain,
} from "@/types/brain";
import {
  NODE_COLORS,
  NODE_TYPE_LABEL,
} from "@/lib/knowledge/constellation/constants";
import { graphFiltersShellClass } from "@/lib/knowledge/constellation/graphThemeTokens";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import type { ConstellationNode } from "@/types/constellation";

interface BrainFiltersProps {
  /** All nodes in the unfiltered graph — drives the per-domain counts. */
  nodes: ConstellationNode[];
  variant?: "panel" | "drawer";
  onClose?: () => void;
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

function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/60 py-2 last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && <div className="mt-1.5 space-y-1">{children}</div>}
    </div>
  );
}

export function BrainFilters({
  nodes,
  variant = "panel",
  onClose,
}: BrainFiltersProps) {
  const domainToggles = useBrainStore((s) => s.domainToggles);
  const toggleDomain = useBrainStore((s) => s.toggleDomain);
  const resetDomainToggles = useBrainStore((s) => s.resetDomainToggles);
  const filters = useBrainStore((s) => s.filters);
  const setFilters = useBrainStore((s) => s.setFilters);
  const clearFilters = useBrainStore((s) => s.clearFilters);

  const { mode: graphMode } = useGraphSurface();

  const countByType = new Map<string, number>();
  for (const n of nodes) {
    countByType.set(n.type, (countByType.get(n.type) ?? 0) + 1);
  }
  const countByDomain = new Map<BrainDomain, number>();
  for (const domain of DOMAIN_ORDER) {
    let sum = 0;
    for (const t of BRAIN_DOMAIN_NODE_MAP[domain]) {
      sum += countByType.get(t) ?? 0;
    }
    countByDomain.set(domain, sum);
  }

  return (
    <aside
      className={cn(
        "flex flex-col gap-1 overflow-hidden text-sm",
        graphFiltersShellClass(graphMode, variant),
      )}
      aria-label="Brain filters"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-3 py-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Filters
        </h3>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              resetDomainToggles();
              clearFilters();
            }}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            Reset
          </Button>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              onClick={onClose}
              aria-label="Close filters"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <FilterSection title="Domains">
          {DOMAIN_ORDER.map((domain) => {
            const visible = domainToggles[domain];
            const count = countByDomain.get(domain) ?? 0;
            return (
              <label
                key={domain}
                className="flex cursor-pointer items-center justify-between rounded-md px-1.5 py-1 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={visible}
                    onCheckedChange={() => toggleDomain(domain)}
                    aria-label={`Toggle ${BRAIN_DOMAIN_LABEL[domain]}`}
                  />
                  <span className="text-xs text-foreground/90">
                    {BRAIN_DOMAIN_LABEL[domain]}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">{count}</span>
              </label>
            );
          })}
        </FilterSection>

        <FilterSection title="Node types">
          {DOMAIN_ORDER.map((domain) => (
            <div key={domain} className="space-y-0.5 pb-1">
              <p className="px-1.5 pt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {BRAIN_DOMAIN_LABEL[domain]}
              </p>
              {BRAIN_DOMAIN_NODE_MAP[domain].map((t) => {
                const count = countByType.get(t) ?? 0;
                if (count === 0) return null;
                return (
                  <div
                    key={t}
                    className="flex items-center justify-between rounded-md px-1.5 py-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: NODE_COLORS[t].core,
                          boxShadow: `0 0 6px ${NODE_COLORS[t].glow}`,
                        }}
                        aria-hidden
                      />
                      <span className="text-xs text-foreground/90">
                        {NODE_TYPE_LABEL[t]}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </FilterSection>

        <FilterSection title="Connections">
          <label className="flex items-center gap-2 px-1.5 py-1">
            <Checkbox
              checked={filters.hideOrphanNodes ?? false}
              onCheckedChange={(v) =>
                setFilters({ hideOrphanNodes: Boolean(v) })
              }
            />
            <span className="text-xs text-foreground/90">Hide orphan nodes</span>
          </label>
          <label className="flex items-center gap-2 px-1.5 py-1">
            <Checkbox
              checked={filters.showAISuggestedLinks ?? true}
              onCheckedChange={(v) =>
                setFilters({ showAISuggestedLinks: Boolean(v) })
              }
            />
            <span className="text-xs text-foreground/90">Show AI suggestions</span>
          </label>
          <label className="flex items-center gap-2 px-1.5 py-1">
            <Checkbox
              checked={filters.showManualLinksOnly ?? false}
              onCheckedChange={(v) =>
                setFilters({ showManualLinksOnly: Boolean(v) })
              }
            />
            <span className="text-xs text-foreground/90">Manual links only</span>
          </label>
          <div className="space-y-2 px-1.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/90">
                Min AI confidence
              </span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round((filters.minSemanticConfidence ?? 0.78) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={Math.round(
                (filters.minSemanticConfidence ?? 0.78) * 100,
              )}
              onChange={(e) =>
                setFilters({
                  minSemanticConfidence: Number(e.target.value) / 100,
                })
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-cyan-500 dark:accent-cyan-300"
              aria-label="Minimum AI confidence"
            />
          </div>
        </FilterSection>
      </div>
    </aside>
  );
}
