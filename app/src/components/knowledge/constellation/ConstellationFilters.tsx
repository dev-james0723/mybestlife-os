"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import {
  EDGE_TYPE_LABEL,
  NODE_COLORS,
} from "@/lib/knowledge/constellation/constants";
import { graphFiltersShellClass } from "@/lib/knowledge/constellation/graphThemeTokens";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import type {
  ConstellationEdgeType,
  ConstellationNode,
  ConstellationNodeType,
} from "@/types/constellation";

interface ConstellationFiltersProps {
  /** Drives the dynamic tag/collection lists. */
  nodes: ConstellationNode[];
  /** When true the panel is rendered in mobile-drawer mode (no max-height). */
  variant?: "panel" | "drawer";
  onClose?: () => void;
}

const NODE_TYPE_KEYS: ConstellationNodeType[] = [
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

const RELATION_KEYS: ConstellationEdgeType[] = [
  "manual_link",
  "explicit_link",
  "ai_suggested_link",
  "category_reference",
  "shared_tag",
  "same_collection",
  "same_source",
  "project_reference",
  "concept_reference",
  "person_reference",
  "organization_reference",
  "semantic_similarity",
  "timeline_relation",
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
        />
      </button>
      {open && <div className="mt-2 space-y-2 px-1">{children}</div>}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  swatch,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  swatch?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-foreground/90 select-none">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(Boolean(v))}
        aria-label={label}
        className="border-border/50 bg-muted/40"
      />
      {swatch && (
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: swatch, boxShadow: `0 0 6px ${swatch}` }}
        />
      )}
      <span className="truncate">{label}</span>
    </label>
  );
}

export function ConstellationFilters({
  nodes,
  variant = "panel",
  onClose,
}: ConstellationFiltersProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const c = ui.constellation;

  const { mode: graphMode } = useGraphSurface();

  const filters = useKnowledgeStore((s) => s.constellationFilters);
  const setFilters = useKnowledgeStore((s) => s.setConstellationFilters);
  const reset = useKnowledgeStore((s) => s.resetConstellationFilters);

  const tagOptions = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "tag")
        .map((n) => ({ id: n.tagId ?? n.label, label: n.label }))
        .sort((a, b) => a.label.localeCompare(b.label))
        .slice(0, 60),
    [nodes],
  );

  const collectionOptions = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "collection" && n.collectionId)
        .map((n) => ({ id: n.collectionId!, label: n.label })),
    [nodes],
  );

  const sourceOptions = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "source" && n.sourceType)
        .map((n) => n.sourceType!)
        .filter((v, i, a) => a.indexOf(v) === i),
    [nodes],
  );

  const projectOptions = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "project" && n.projectId)
        .map((n) => ({ id: n.projectId!, label: n.label })),
    [nodes],
  );

  const isNodeTypeActive = (t: ConstellationNodeType) =>
    !filters.nodeTypes || filters.nodeTypes.includes(t);

  const toggleNodeType = (t: ConstellationNodeType, next: boolean) => {
    const current =
      filters.nodeTypes && filters.nodeTypes.length > 0
        ? filters.nodeTypes
        : NODE_TYPE_KEYS;
    const set = new Set(current);
    if (next) set.add(t);
    else set.delete(t);
    const arr = [...set];
    setFilters({
      nodeTypes: arr.length === NODE_TYPE_KEYS.length ? undefined : arr,
    });
  };

  const isRelationActive = (r: ConstellationEdgeType) =>
    !filters.relationTypes || filters.relationTypes.includes(r);
  const toggleRelation = (r: ConstellationEdgeType, next: boolean) => {
    const current =
      filters.relationTypes && filters.relationTypes.length > 0
        ? filters.relationTypes
        : RELATION_KEYS;
    const set = new Set(current);
    if (next) set.add(r);
    else set.delete(r);
    const arr = [...set];
    setFilters({
      relationTypes: arr.length === RELATION_KEYS.length ? undefined : arr,
    });
  };

  const toggleArrayValue = (
    key: "tagIds" | "collectionIds" | "sourceTypes" | "projectIds",
    value: string,
  ) => {
    const current = filters[key] ?? [];
    const set = new Set(current);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    setFilters({ [key]: set.size === 0 ? undefined : [...set] });
  };

  const isSelected = (
    key: "tagIds" | "collectionIds" | "sourceTypes" | "projectIds",
    value: string,
  ) => (filters[key] ?? []).includes(value);

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
    <aside
      className={cn(
        "flex flex-col gap-1 overflow-hidden text-sm",
        graphFiltersShellClass(graphMode, variant),
      )}
      aria-label={c.filtersTitle}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-3 py-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {c.filtersTitle}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            onClick={reset}
          >
            {c.filtersResetAll}
          </Button>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={onClose}
              aria-label={ui.detail.close}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <FilterSection title={c.filtersNodeTypes}>
          {NODE_TYPE_KEYS.map((t) => (
            <ToggleRow
              key={t}
              label={typeLabel[t] ?? t}
              checked={isNodeTypeActive(t)}
              onChange={(v) => toggleNodeType(t, v)}
              swatch={NODE_COLORS[t].core}
            />
          ))}
        </FilterSection>

        <FilterSection title={c.filtersRelations}>
          {RELATION_KEYS.map((r) => (
            <ToggleRow
              key={r}
              label={EDGE_TYPE_LABEL[r]}
              checked={isRelationActive(r)}
              onChange={(v) => toggleRelation(r, v)}
            />
          ))}
        </FilterSection>

        {(tagOptions.length > 0 || collectionOptions.length > 0) && (
          <FilterSection title={c.filtersTagsCollections} defaultOpen={false}>
            {collectionOptions.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {ui.aiCollections}
                </p>
                {collectionOptions.map((opt) => (
                  <ToggleRow
                    key={opt.id}
                    label={opt.label}
                    checked={isSelected("collectionIds", opt.id)}
                    onChange={() => toggleArrayValue("collectionIds", opt.id)}
                  />
                ))}
              </div>
            )}
            {tagOptions.length > 0 && (
              <div className="space-y-1 pt-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {ui.tags}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tagOptions.map((opt) => {
                    const active = isSelected("tagIds", opt.id);
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        aria-pressed={active}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs transition-colors",
                          active
                            ? "border-violet-300/50 bg-violet-500/15 text-violet-800 dark:text-violet-100"
                            : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70",
                        )}
                        onClick={() => toggleArrayValue("tagIds", opt.id)}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </FilterSection>
        )}

        {(sourceOptions.length > 0 || projectOptions.length > 0) && (
          <FilterSection title={c.filtersSourcesProjects} defaultOpen={false}>
            {projectOptions.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {c.typeProject}
                </p>
                {projectOptions.map((opt) => (
                  <ToggleRow
                    key={opt.id}
                    label={opt.label}
                    checked={isSelected("projectIds", opt.id)}
                    onChange={() => toggleArrayValue("projectIds", opt.id)}
                  />
                ))}
              </div>
            )}
            {sourceOptions.length > 0 && (
              <div className="space-y-1 pt-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {c.typeSource}
                </p>
                {sourceOptions.map((s) => (
                  <ToggleRow
                    key={s}
                    label={s}
                    checked={isSelected("sourceTypes", s)}
                    onChange={() => toggleArrayValue("sourceTypes", s)}
                  />
                ))}
              </div>
            )}
          </FilterSection>
        )}

        <FilterSection title={c.filtersDisplay}>
          <ToggleRow
            label={c.filtersShowCategoryNodes}
            checked={filters.showCategoryNodes !== false}
            onChange={(v) => setFilters({ showCategoryNodes: v })}
          />
          <ToggleRow
            label={c.filtersShowTagNodes}
            checked={filters.showTagNodes !== false}
            onChange={(v) => setFilters({ showTagNodes: v })}
          />
          <ToggleRow
            label={c.filtersShowCollectionNodes}
            checked={filters.showCollectionNodes !== false}
            onChange={(v) => setFilters({ showCollectionNodes: v })}
          />
          <ToggleRow
            label={c.filtersShowSourceNodes}
            checked={Boolean(filters.showSourceNodes)}
            onChange={(v) => setFilters({ showSourceNodes: v })}
          />
          <ToggleRow
            label={c.filtersShowProjectNodes}
            checked={filters.showProjectNodes !== false}
            onChange={(v) => setFilters({ showProjectNodes: v })}
          />
          <ToggleRow
            label={c.filtersShowEntityNodes}
            checked={filters.showEntityNodes !== false}
            onChange={(v) => setFilters({ showEntityNodes: v })}
          />
        </FilterSection>

        <FilterSection title={c.filtersAdvanced} defaultOpen={false}>
          <ToggleRow
            label={c.filtersShowSemanticLinks}
            checked={Boolean(filters.showSemanticLinks)}
            onChange={(v) => setFilters({ showSemanticLinks: v })}
          />
          <ToggleRow
            label={c.filtersShowAISuggestedLinks}
            checked={filters.showAISuggestedLinks !== false}
            onChange={(v) => setFilters({ showAISuggestedLinks: v })}
          />
          <ToggleRow
            label={c.filtersManualLinksOnly}
            checked={Boolean(filters.showManualLinksOnly)}
            onChange={(v) => setFilters({ showManualLinksOnly: v })}
          />
          <div className="pt-2">
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <span className="flex items-center justify-between">
                <span>{c.filtersMinSemanticConfidence}</span>
                <span className="font-mono text-foreground/90">
                  {(filters.minSemanticConfidence ?? 0).toFixed(2)}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={filters.minSemanticConfidence ?? 0.75}
                onChange={(e) =>
                  setFilters({
                    minSemanticConfidence: Number(e.target.value),
                  })
                }
                className="h-1 w-full appearance-none rounded-full bg-muted accent-cyan-500 dark:accent-cyan-300"
                aria-label={c.filtersMinSemanticConfidence}
              />
            </label>
          </div>
          <div className="pt-2">
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <span className="flex items-center justify-between">
                <span>{c.filtersMinConnectionCount}</span>
                <span className="font-mono text-foreground/90">
                  {filters.minConnectionCount ?? 0}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={filters.minConnectionCount ?? 0}
                onChange={(e) =>
                  setFilters({
                    minConnectionCount: Number(e.target.value),
                  })
                }
                className="h-1 w-full appearance-none rounded-full bg-muted accent-cyan-500 dark:accent-cyan-300"
                aria-label={c.filtersMinConnectionCount}
              />
            </label>
          </div>
        </FilterSection>
      </div>
    </aside>
  );
}
