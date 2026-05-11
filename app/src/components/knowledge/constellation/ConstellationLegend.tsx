"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  EDGE_STYLE,
  EDGE_TYPE_LABEL,
  NODE_COLORS,
} from "@/lib/knowledge/constellation/constants";
import type {
  ConstellationEdgeType,
  ConstellationNodeType,
} from "@/types/constellation";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";

interface ConstellationLegendProps {
  open: boolean;
  onClose: () => void;
}

const NODE_ENTRIES: ConstellationNodeType[] = [
  "knowledge",
  "category",
  "tag",
  "collection",
  "source",
  "project",
  "person",
  "organization",
  "concept",
];

const EDGE_ENTRIES: ConstellationEdgeType[] = [
  "manual_link",
  "explicit_link",
  "ai_suggested_link",
  "category_reference",
  "shared_tag",
  "same_collection",
  "same_source",
  "project_reference",
  "concept_reference",
  "semantic_similarity",
];

export function ConstellationLegend({ open, onClose }: ConstellationLegendProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const c = ui.constellation;
  const { t: graphT } = useGraphSurface();
  if (!open) return null;

  const typeLabel: Partial<Record<ConstellationNodeType, string>> = {
    knowledge: c.typeKnowledge,
    category: c.typeCategory,
    tag: c.typeTag,
    collection: c.typeCollection,
    source: c.typeSource,
    project: c.typeProject,
    person: c.typePerson,
    organization: c.typeOrganization,
    concept: c.typeConcept,
  };

  return (
    <div
      role="dialog"
      aria-label={c.legendTitle}
      className={cn("pointer-events-auto absolute right-3 bottom-3 z-30 w-72 rounded-2xl p-4 text-sm", graphT.legend.wrap)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium tracking-tight text-foreground">{c.legendTitle}</h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          onClick={onClose}
          aria-label={ui.detail.close}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {c.legendNodes}
          </p>
          <ul className="grid grid-cols-2 gap-y-1.5 text-xs">
            {NODE_ENTRIES.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: NODE_COLORS[t].core,
                    boxShadow: `0 0 8px ${NODE_COLORS[t].glow}`,
                  }}
                  aria-hidden
                />
                <span className="text-foreground/90">{typeLabel[t]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {c.legendEdges}
          </p>
          <ul className="space-y-1 text-xs">
            {EDGE_ENTRIES.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span
                  className="inline-block w-6"
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
                <span className="text-foreground/90">{EDGE_TYPE_LABEL[t]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
