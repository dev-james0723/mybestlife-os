"use client";

import { useMemo } from "react";
import { ChevronDown, Compass, ExternalLink, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import {
  EDGE_TYPE_LABEL,
  NODE_COLORS,
} from "@/lib/knowledge/constellation/constants";
import { graphDetailShellClass } from "@/lib/knowledge/constellation/graphThemeTokens";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import type {
  ConstellationEdge,
  ConstellationNode,
  ConstellationNodeType,
} from "@/types/constellation";
import type { LocalOrbitState } from "@/lib/knowledge/constellation/computeLocalOrbitState";
import {
  LocalOrbitRingsPanel,
  localOrbitPanelCopyFromKnowledge,
} from "@/components/knowledge/constellation/LocalOrbitRingsPanel";

interface ConstellationDetailPanelProps {
  selectedNode: ConstellationNode | null;
  /** Edges that touch the selected node, used for related lists. */
  incidentEdges: ConstellationEdge[];
  /** Lookup of all nodes (for showing target labels in related lists). */
  nodeIndex: Map<string, ConstellationNode>;
  variant?: "panel" | "drawer" | "bottomBar";
  onClose?: () => void;
  onFocusNode: (nodeId: string) => void;
  onOpenKnowledge: (knowledgeId: string) => void;
  onApplyFilter: (filter: {
    tagIds?: string[];
    collectionIds?: string[];
    sourceTypes?: string[];
    projectIds?: string[];
  }) => void;
  /** Local mode: same orbit model as the canvas (depth rings). */
  localOrbitState?: LocalOrbitState | null;
  /** Suppress header ✕ when the shell provides a collapse control (mobile dock). */
  hideHeaderClose?: boolean;
}

function typeColor(type: ConstellationNodeType) {
  return NODE_COLORS[type];
}

export function ConstellationDetailPanel({
  selectedNode,
  incidentEdges,
  nodeIndex,
  variant = "panel",
  onClose,
  onFocusNode,
  onOpenKnowledge,
  onApplyFilter,
  localOrbitState = null,
  hideHeaderClose = false,
}: ConstellationDetailPanelProps) {
  const { mode: graphMode, t: graphT } = useGraphSurface();
  const tone = graphT.tone;
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const c = ui.constellation;
  const setMode = useKnowledgeStore((s) => s.setConstellationMode);
  const setSelectedNodeId = useKnowledgeStore(
    (s) => s.setConstellationSelectedNodeId,
  );
  const toggleCategoryFilter = useKnowledgeStore(
    (s) => s.toggleCategoryFilter,
  );

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

  const groupedRelated = useMemo<
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

  const aiSuggestions = useMemo(
    () =>
      groupedRelated.filter(
        ({ edge }) =>
          edge.type === "ai_suggested_link" ||
          edge.type === "semantic_similarity",
      ),
    [groupedRelated],
  );

  const confirmedRelated = useMemo(
    () =>
      groupedRelated.filter(
        ({ edge }) =>
          edge.type !== "ai_suggested_link" &&
          edge.type !== "semantic_similarity",
      ),
    [groupedRelated],
  );

  const localOrbitCopy = useMemo(
    () => localOrbitPanelCopyFromKnowledge(c),
    [c],
  );

  const localOrbitBlock =
    localOrbitState !== null ? (
      <div className={cn("shrink-0 border-b", tone.border)}>
        <LocalOrbitRingsPanel
          localOrbit={localOrbitState}
          copy={localOrbitCopy}
          onFocusNode={onFocusNode}
          useOrbitChrome={false}
          compact
          className="max-h-56 min-h-0 sm:max-h-64"
        />
      </div>
    ) : null;

  const containerClasses = cn(
    "flex flex-col gap-0 overflow-hidden text-sm",
    graphDetailShellClass(graphMode, variant),
  );

  if (variant === "bottomBar" && !selectedNode) {
    return null;
  }

  if (!selectedNode) {
    return (
      <aside className={containerClasses} aria-label={c.detailNoSelection}>
        <div className={cn("flex shrink-0 items-center justify-between border-b px-3 py-2", tone.border)}>
          <h3 className={cn("text-xs font-medium uppercase tracking-wider", tone.heading)}>
            {c.detailNoSelection}
          </h3>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", tone.ghostBtn)}
              onClick={onClose}
              aria-label={ui.detail.close}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className={cn("flex flex-1 items-center justify-center p-6 text-center text-sm", tone.muted)}>
          {c.detailNoSelectionHint}
        </div>
      </aside>
    );
  }

  const palette = typeColor(selectedNode.type);

  if (variant === "bottomBar") {
    const sourceOrCategory =
      selectedNode.sourceType || selectedNode.category || selectedNode.collectionName;
    const showSecondaryMore =
      (selectedNode.type === "category" && !!selectedNode.categoryId) ||
      (selectedNode.type === "tag" && !!selectedNode.tagId) ||
      (selectedNode.type === "collection" && !!selectedNode.collectionId) ||
      (selectedNode.type === "source" && !!selectedNode.sourceType) ||
      (selectedNode.type === "project" && !!selectedNode.projectId) ||
      !!(selectedNode.tags && selectedNode.tags.length > 0) ||
      selectedNode.type === "knowledge" ||
      !!selectedNode.createdAt;

    return (
      <aside className={containerClasses} aria-label={selectedNode.label}>
        {!hideHeaderClose && (
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-3 py-1.5">
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
                className="ml-2 h-7 w-7 shrink-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                onClick={onClose}
                aria-label={ui.detail.close}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        <div
          className={cn(
            "min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2",
            hideHeaderClose && "pt-3",
          )}
        >
          {localOrbitBlock}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <Badge
              variant="outline"
              className="shrink-0 border-border/60 bg-muted/50 text-[11px] text-foreground"
            >
              {typeLabel[selectedNode.type]}
            </Badge>
            {sourceOrCategory && (
              <span className="min-w-0 max-w-full truncate text-muted-foreground">{sourceOrCategory}</span>
            )}
            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
              {c.detailConnectionCount}:{" "}
              <span className="font-mono text-muted-foreground">{selectedNode.connectionCount ?? 0}</span>
            </span>
          </div>
          {selectedNode.description && (
            <p className="line-clamp-1 text-sm leading-snug text-foreground/85">
              {selectedNode.description}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {selectedNode.type === "knowledge" && selectedNode.knowledgeId && (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 border border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
                onClick={() => onOpenKnowledge(selectedNode.knowledgeId!)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {c.actionOpenKnowledge}
              </Button>
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
              {c.actionExploreLocal}
            </Button>
          </div>

          {showSecondaryMore && (
            <Collapsible>
              <CollapsibleTrigger
                className="flex w-full items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/50 py-1.5 pr-2 pl-3 text-left text-[11px] font-medium text-muted-foreground hover:bg-muted/70"
                type="button"
              >
                {c.detailBottomMore}
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
              </CollapsibleTrigger>
              <CollapsibleContent className="!block border-t-0 p-0">
                <div className="space-y-1.5 border-t border-dashed border-border/60 py-2">
                  {selectedNode.type === "category" && selectedNode.categoryId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 w-full justify-start gap-1.5 border-border/60 bg-muted/50 text-xs text-foreground/90 hover:bg-muted/70"
                      onClick={() => {
                        const cat = selectedNode.categoryId as Parameters<
                          typeof toggleCategoryFilter
                        >[0];
                        if (
                          !useKnowledgeStore
                            .getState()
                            .activeCategoryFilters.includes(cat)
                        ) {
                          toggleCategoryFilter(cat);
                        }
                      }}
                    >
                      {c.actionFilterByCategory}
                    </Button>
                  )}
                  {selectedNode.type === "tag" && selectedNode.tagId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 w-full justify-start gap-1.5 border-border/60 bg-muted/50 text-xs text-foreground/90 hover:bg-muted/70"
                      onClick={() => onApplyFilter({ tagIds: [selectedNode.tagId!] })}
                    >
                      {c.actionFilterByTag}
                    </Button>
                  )}
                  {selectedNode.type === "collection" && selectedNode.collectionId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 w-full justify-start gap-1.5 border-border/60 bg-muted/50 text-xs text-foreground/90 hover:bg-muted/70"
                      onClick={() =>
                        onApplyFilter({ collectionIds: [selectedNode.collectionId!] })
                      }
                    >
                      {c.actionFilterByCollection}
                    </Button>
                  )}
                  {selectedNode.type === "source" && selectedNode.sourceType && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 w-full justify-start gap-1.5 border-border/60 bg-muted/50 text-xs text-foreground/90 hover:bg-muted/70"
                      onClick={() =>
                        onApplyFilter({ sourceTypes: [selectedNode.sourceType!] })
                      }
                    >
                      {c.actionFilterBySource}
                    </Button>
                  )}
                  {selectedNode.type === "project" && selectedNode.projectId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 w-full justify-start gap-1.5 border-border/60 bg-muted/50 text-xs text-foreground/90 hover:bg-muted/70"
                      onClick={() =>
                        onApplyFilter({ projectIds: [selectedNode.projectId!] })
                      }
                    >
                      {c.actionFilterByProject}
                    </Button>
                  )}
                  {selectedNode.tags && selectedNode.tags.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground">{c.detailTags}</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.tags.slice(0, 8).map((t) => (
                          <button data-control-variant="outline"
                            type="button"
                            key={t}
                            className="rounded-full border border-violet-300/30 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-100"
                            onClick={() => onApplyFilter({ tagIds: [t.toLowerCase()] })}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedNode.type === "knowledge" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 w-full justify-start gap-1.5 border-dashed border-border/60 bg-transparent text-xs text-muted-foreground hover:bg-muted/50"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.alert(c.manualLinkComingSoon);
                        }
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      {c.actionAddManualLink}
                    </Button>
                  )}
                  {selectedNode.createdAt && (
                    <p className="text-[11px] text-muted-foreground">
                      {c.detailCreated}{" "}
                      <span className="text-muted-foreground">
                        {new Date(selectedNode.createdAt).toLocaleDateString()}
                      </span>
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {aiSuggestions.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger
                className="flex w-full items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/50 py-1.5 pr-2 pl-3 text-left text-[11px] font-medium text-muted-foreground hover:bg-muted/70"
                type="button"
              >
                {c.detailAISuggestions} ({aiSuggestions.length})
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
              </CollapsibleTrigger>
              <CollapsibleContent className="!block p-0">
                <ul className="mt-1 space-y-1.5 border-t border-dashed border-border/60 pt-1.5">
                  {aiSuggestions.slice(0, 8).map(({ node, edge }) => (
                    <li
                      key={`${edge.id}`}
                      className="rounded border border-border/60 bg-muted/50 p-1.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left text-foreground hover:underline"
                          onClick={() => onFocusNode(node.id)}
                        >
                          {node.label}
                        </button>
                        {typeof edge.confidence === "number" && (
                          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                            {edge.confidence.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          )}

          {confirmedRelated.length > 0 && (
            <section className="min-h-0">
              <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {c.detailRelatedKnowledge}
              </h4>
              <ul className="mt-1.5 max-h-36 space-y-0.5 overflow-y-auto pr-0.5">
                {confirmedRelated.map(({ node, edge }) => (
                  <li key={`${edge.id}`}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-[11px] text-foreground/90 hover:bg-muted/50"
                      onClick={() => onFocusNode(node.id)}
                    >
                      <span
                        aria-hidden
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: NODE_COLORS[node.type].core,
                          boxShadow: `0 0 6px ${NODE_COLORS[node.type].glow}`,
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate">{node.label}</span>
                      <span className="shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground">
                        {EDGE_TYPE_LABEL[edge.type]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className={containerClasses} aria-label={selectedNode.label}>
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
            aria-label={ui.detail.close}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {localOrbitBlock}
        {/* Metadata */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{c.detailNodeType}</span>
            <Badge
              variant="outline"
              className="border-border/60 bg-muted/50 text-[11px] text-foreground/90"
            >
              {typeLabel[selectedNode.type]}
            </Badge>
          </div>

          {selectedNode.description && (
            <p className="pt-1 text-sm leading-relaxed text-foreground/90 line-clamp-4">
              {selectedNode.description}
            </p>
          )}

          {selectedNode.category && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{ui.categories}</span>
              <span className="text-foreground/90">{selectedNode.category}</span>
            </div>
          )}

          {selectedNode.sourceType && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{c.detailSource}</span>
              <span className="text-foreground/90">{selectedNode.sourceType}</span>
            </div>
          )}

          {selectedNode.tags && selectedNode.tags.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-muted-foreground">{c.detailTags}</span>
              <div className="flex flex-wrap gap-1">
                {selectedNode.tags.slice(0, 12).map((t) => (
                  <button data-control-variant="outline"
                    type="button"
                    key={t}
                    className="rounded-full border border-violet-300/30 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-100 transition-colors hover:bg-violet-500/20"
                    onClick={() => onApplyFilter({ tagIds: [t.toLowerCase()] })}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
            <span>
              {c.detailConnectionCount}:{" "}
              <span className="font-mono text-foreground/90">
                {selectedNode.connectionCount ?? 0}
              </span>
            </span>
            {selectedNode.createdAt && (
              <span>
                {c.detailCreated}:{" "}
                <span className="text-muted-foreground">
                  {new Date(selectedNode.createdAt).toLocaleDateString()}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-1.5">
          {selectedNode.type === "knowledge" && selectedNode.knowledgeId && (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 border border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
              onClick={() => onOpenKnowledge(selectedNode.knowledgeId!)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {c.actionOpenKnowledge}
            </Button>
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
            {c.actionExploreLocal}
          </Button>
          {selectedNode.type === "category" && selectedNode.categoryId && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-border/60 bg-muted/50 text-foreground/90 hover:bg-muted/70"
              onClick={() => {
                const cat = selectedNode.categoryId as Parameters<
                  typeof toggleCategoryFilter
                >[0];
                if (
                  !useKnowledgeStore
                    .getState()
                    .activeCategoryFilters.includes(cat)
                ) {
                  toggleCategoryFilter(cat);
                }
              }}
            >
              {c.actionFilterByCategory}
            </Button>
          )}
          {selectedNode.type === "tag" && selectedNode.tagId && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-border/60 bg-muted/50 text-foreground/90 hover:bg-muted/70"
              onClick={() => onApplyFilter({ tagIds: [selectedNode.tagId!] })}
            >
              {c.actionFilterByTag}
            </Button>
          )}
          {selectedNode.type === "collection" && selectedNode.collectionId && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-border/60 bg-muted/50 text-foreground/90 hover:bg-muted/70"
              onClick={() =>
                onApplyFilter({ collectionIds: [selectedNode.collectionId!] })
              }
            >
              {c.actionFilterByCollection}
            </Button>
          )}
          {selectedNode.type === "source" && selectedNode.sourceType && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-border/60 bg-muted/50 text-foreground/90 hover:bg-muted/70"
              onClick={() =>
                onApplyFilter({ sourceTypes: [selectedNode.sourceType!] })
              }
            >
              {c.actionFilterBySource}
            </Button>
          )}
          {selectedNode.type === "project" && selectedNode.projectId && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-border/60 bg-muted/50 text-foreground/90 hover:bg-muted/70"
              onClick={() =>
                onApplyFilter({ projectIds: [selectedNode.projectId!] })
              }
            >
              {c.actionFilterByProject}
            </Button>
          )}
          {selectedNode.type === "knowledge" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-dashed border-border/60 bg-transparent text-muted-foreground hover:bg-muted/50"
              title={c.manualLinkComingSoon}
              onClick={() => {
                // TODO(phase17): persistence-backed manual links go here.
                // For now we surface the intent without faking persistence.
                if (typeof window !== "undefined") {
                  window.alert(c.manualLinkComingSoon);
                }
              }}
            >
              <Link2 className="h-3.5 w-3.5" />
              {c.actionAddManualLink}
            </Button>
          )}
        </div>

        {/* AI suggestions */}
        {aiSuggestions.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {c.detailAISuggestions}
            </h4>
            <ul className="space-y-2">
              {aiSuggestions.slice(0, 6).map(({ node, edge }) => (
                <li
                  key={`${edge.id}`}
                  className="rounded-lg border border-border/60 bg-muted/50 p-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2 text-left text-foreground hover:underline"
                      onClick={() => onFocusNode(node.id)}
                    >
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: NODE_COLORS[node.type].core,
                          boxShadow: `0 0 6px ${NODE_COLORS[node.type].glow}`,
                        }}
                      />
                      <span className="truncate">{node.label}</span>
                    </button>
                    {typeof edge.confidence === "number" && (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {edge.confidence.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {edge.reason && (
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      {edge.reason}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Confirmed related */}
        {confirmedRelated.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {c.detailRelatedKnowledge}
            </h4>
            <ul className="space-y-1">
              {confirmedRelated.slice(0, 25).map(({ node, edge }) => (
                <li key={`${edge.id}`}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs text-foreground/90 hover:bg-muted/50"
                    onClick={() => onFocusNode(node.id)}
                  >
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: NODE_COLORS[node.type].core,
                        boxShadow: `0 0 6px ${NODE_COLORS[node.type].glow}`,
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate">{node.label}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {EDGE_TYPE_LABEL[edge.type]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
