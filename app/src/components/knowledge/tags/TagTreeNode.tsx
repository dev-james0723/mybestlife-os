"use client";

import { useCallback } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TagNode } from "@/lib/knowledge/tags/types";
import { TagCountBadge } from "./TagCountBadge";

interface TagTreeNodeProps {
  node: TagNode;
  depth: number;
  activeTagId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  /** When provided, only render nodes whose id is in this set (used for search filtering). */
  visibleIds?: Set<string> | null;
  /** When true, descendants render expanded regardless of `expandedIds`. Used for search. */
  forceExpand?: boolean;
  /** Localized labels. */
  labels: {
    expand: (name: string) => string;
    collapse: (name: string) => string;
    selectTag: (path: string) => string;
  };
}

const INDENT_STEP = 14; // px per nesting level

/**
 * One row in the taxonomy tree. Renders a chevron when the node has
 * children, an item-count badge, and an active state. The chevron is
 * keyboard-focusable but a click on the row body itself selects the node.
 */
export function TagTreeNode({
  node,
  depth,
  activeTagId,
  expandedIds,
  onSelect,
  onToggle,
  visibleIds = null,
  forceExpand = false,
  labels,
}: TagTreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = forceExpand || expandedIds.has(node.id);
  const isActive = activeTagId === node.id;

  const handleSelect = useCallback(() => onSelect(node.id), [onSelect, node.id]);
  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(node.id);
      } else if (e.key === "ArrowRight" && hasChildren && !isExpanded) {
        e.preventDefault();
        onToggle(node.id);
      } else if (e.key === "ArrowLeft" && hasChildren && isExpanded) {
        e.preventDefault();
        onToggle(node.id);
      }
    },
    [hasChildren, isExpanded, node.id, onSelect, onToggle],
  );

  if (visibleIds && !visibleIds.has(node.id)) return null;

  return (
    <div className="min-w-0">
      <div
        data-selection-glow={isActive ? "active" : undefined}
        className={cn(
          "group/tag-row flex items-center gap-0.5 rounded-md transition-colors",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        )}
        style={{ paddingLeft: depth * INDENT_STEP }}
      >
        <button
          type="button"
          aria-label={
            hasChildren
              ? isExpanded
                ? labels.collapse(node.name)
                : labels.expand(node.name)
              : undefined
          }
          aria-expanded={hasChildren ? isExpanded : undefined}
          tabIndex={hasChildren ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          className={cn(
            "flex h-6 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 transition-transform",
            hasChildren ? "hover:text-foreground" : "opacity-0",
            isExpanded && hasChildren && "rotate-90",
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleSelect}
          onKeyDown={handleKey}
          aria-pressed={isActive}
          aria-label={labels.selectTag(node.path.join(" / "))}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 pr-1.5 text-left text-[13px] outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring/50",
            isActive ? "font-medium text-foreground" : "font-normal",
          )}
          title={node.path.join(" / ")}
        >
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
          <TagCountBadge count={node.totalCount} active={isActive} />
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TagTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeTagId={activeTagId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              visibleIds={visibleIds}
              forceExpand={forceExpand}
              labels={labels}
            />
          ))}
        </div>
      )}
    </div>
  );
}
