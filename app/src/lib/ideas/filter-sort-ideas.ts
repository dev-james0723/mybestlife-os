import { stripHtml } from "@/lib/utils/html";
import type { Idea } from "@/types/database";
import {
  ideaHasAnyLinks,
  ideaRelatedResources,
  ideaTags,
  previewIdeaBody,
  previewIdeaTitle,
  displayCategory,
} from "./idea-helpers";
import type {
  IdeasLibraryScope,
  IdeasQuickFilter,
  IdeasRelatedScopeFilter,
  IdeasSortKey,
} from "./ideas-list-types";

const statusOrder: Record<Idea["status"], number> = {
  captured: 0,
  reviewed: 1,
  archived: 2,
};

function matchesSearch(idea: Idea, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const hay = [
    idea.title ?? "",
    stripHtml(idea.content),
    idea.voice_transcript ?? "",
    ...ideaTags(idea),
    displayCategory(idea.category),
    previewIdeaTitle(idea, 500),
    previewIdeaBody(idea, 2000),
  ]
    .join("\n")
    .toLowerCase();
  return hay.includes(needle);
}

function matchesQuickFilter(idea: Idea, f: IdeasQuickFilter): boolean {
  const now = Date.now();
  const recentMs = 14 * 24 * 60 * 60 * 1000;
  const created = new Date(idea.created_at).getTime();
  const tagCount = ideaTags(idea).length;
  const linked = ideaHasAnyLinks(idea);

  switch (f) {
    case "recent":
      return now - created <= recentMs;
    case "unreviewed":
      return idea.status === "captured";
    case "hasTags":
      return tagCount > 0;
    case "noTags":
      return tagCount === 0;
    case "linked":
      return linked;
    case "unlinked":
      return !linked;
    case "archived":
      return idea.status === "archived";
    default:
      return true;
  }
}

function matchesRelatedScope(idea: Idea, scope: IdeasRelatedScopeFilter): boolean {
  const related = ideaRelatedResources(idea);
  switch (scope) {
    case "none":
      return true;
    case "hasIdea":
      return (idea.linked_idea_ids?.length ?? 0) > 0 || related.some((r) => r.scope === "idea");
    case "hasProject":
      return (idea.linked_project_ids?.length ?? 0) > 0 || related.some((r) => r.scope === "project");
    case "hasGoal":
      return (idea.linked_goal_ids?.length ?? 0) > 0 || related.some((r) => r.scope === "goal");
    case "hasResource":
      return (idea.related_resource_refs?.length ?? 0) > 0 || related.some((r) => r.scope === "resource");
    case "hasTask":
      return (idea.linked_task_ids?.length ?? 0) > 0 || related.some((r) => r.scope === "task");
    case "hasKnowledge":
      return (idea.linked_knowledge_item_ids?.length ?? 0) > 0 || related.some((r) => r.scope === "knowledge");
    case "noRelated":
      return !ideaHasAnyLinks(idea);
    default:
      return true;
  }
}

export type IdeaListFilterState = {
  searchQuery: string;
  ideaStatusScope: IdeasLibraryScope;
  activeSourceFilters: Idea["source_type"][];
  activeCategoryFilters: string[];
  /** `tag:tag`; legacy `manual:tag` and `ai:tag` are still accepted. */
  activeTagToken: string | null;
  activeQuickFilters: IdeasQuickFilter[];
  relatedScopeFilter: IdeasRelatedScopeFilter;
};

export function filterIdeas(items: Idea[], state: IdeaListFilterState): Idea[] {
  return items.filter((idea) => {
    if (!matchesSearch(idea, state.searchQuery.trim())) return false;

    if (state.ideaStatusScope !== "all" && idea.status !== state.ideaStatusScope) {
      return false;
    }

    if (
      state.activeSourceFilters.length > 0 &&
      !state.activeSourceFilters.includes(idea.source_type)
    ) {
      return false;
    }

    if (
      state.activeCategoryFilters.length > 0 &&
      !state.activeCategoryFilters.includes(displayCategory(idea.category))
    ) {
      return false;
    }

    if (state.activeTagToken) {
      const [kind, ...rest] = state.activeTagToken.split(":");
      const tag = rest.join(":");
      if (kind === "tag") {
        if (!ideaTags(idea).includes(tag)) return false;
      } else if (kind === "manual") {
        if (!idea.manual_tags?.includes(tag)) return false;
      } else if (kind === "ai") {
        if (!idea.ai_tags?.includes(tag)) return false;
      }
    }

    for (const qf of state.activeQuickFilters) {
      if (!matchesQuickFilter(idea, qf)) return false;
    }

    if (!matchesRelatedScope(idea, state.relatedScopeFilter)) return false;

    return true;
  });
}

export function sortIdeas(items: Idea[], sortBy: IdeasSortKey): Idea[] {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (sortBy) {
      case "updated":
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case "titleAZ": {
        const ta = (a.title?.trim() || previewIdeaTitle(a, 200)).toLowerCase();
        const tb = (b.title?.trim() || previewIdeaTitle(b, 200)).toLowerCase();
        return ta.localeCompare(tb);
      }
      case "status":
        return (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
      case "category":
        return displayCategory(a.category).localeCompare(displayCategory(b.category));
      case "sourceType":
        return a.source_type.localeCompare(b.source_type);
      case "latest":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
  return copy;
}
