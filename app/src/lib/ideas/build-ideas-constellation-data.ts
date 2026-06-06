import { isGenericTag } from "@/lib/knowledge/constellation/constants";
import type {
  ConstellationEdge,
  ConstellationEdgeType,
  ConstellationGraphData,
  ConstellationNode,
} from "@/types/constellation";
import type { Idea } from "@/types/database";
import { ideaRelatedResources, previewIdeaBody, previewIdeaTitle } from "./idea-helpers";

type EdgeDraft = Omit<ConstellationEdge, "id" | "userId"> & {
  reasonParts?: string[];
};

type IdeaConstellationOptions = {
  includeSharedTags?: boolean;
  includeSharedReferences?: boolean;
  maxNodes?: number;
  maxEdges?: number;
};

const DEFAULT_OPTIONS: Required<IdeaConstellationOptions> = {
  includeSharedTags: true,
  includeSharedReferences: true,
  maxNodes: 700,
  maxEdges: 1600,
};

const IDEA_NODE_PREFIX = "idea:";

function ideaNodeId(id: string): string {
  return `${IDEA_NODE_PREFIX}${id}`;
}

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function edgeKey(source: string, target: string, type: ConstellationEdgeType): string {
  const [a, b] = pair(source, target);
  return `${type}::${a}::${b}`;
}

function normalizedTags(idea: Idea): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of [...(idea.manual_tags ?? []), ...(idea.ai_tags ?? [])]) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key) || isGenericTag(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

function titleForRef(kind: string, id: string): string {
  return `${kind}:${id}`;
}

function addToIndex(index: Map<string, Set<string>>, key: string, nodeId: string) {
  if (!key) return;
  if (!index.has(key)) index.set(key, new Set());
  index.get(key)!.add(nodeId);
}

function addPairEdgesFromIndex(input: {
  index: Map<string, Set<string>>;
  edges: Map<string, EdgeDraft>;
  type: ConstellationEdgeType;
  reasonPrefix: string;
  weight: number;
  maxFanout?: number;
}) {
  const maxFanout = input.maxFanout ?? 80;
  for (const [ref, nodeSet] of input.index) {
    const ids = [...nodeSet].slice(0, maxFanout);
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        addEdge(input.edges, {
          source: ids[i],
          target: ids[j],
          sourceType: "idea",
          targetType: "idea",
          type: input.type,
          status: "confirmed",
          weight: input.weight,
          reasonParts: [`${input.reasonPrefix}: ${ref}`],
        });
      }
    }
  }
}

function addEdge(edges: Map<string, EdgeDraft>, draft: EdgeDraft) {
  const [source, target] = pair(draft.source, draft.target);
  if (source === target) return;
  const key = edgeKey(source, target, draft.type);
  const existing = edges.get(key);
  const reasonParts = draft.reasonParts ?? (draft.reason ? [draft.reason] : []);
  if (existing) {
    edges.set(key, {
      ...existing,
      weight: Math.max(existing.weight ?? 0, draft.weight ?? 0),
      confidence: Math.max(existing.confidence ?? 0, draft.confidence ?? 0),
      reasonParts: [
        ...(existing.reasonParts ?? (existing.reason ? [existing.reason] : [])),
        ...reasonParts,
      ],
    });
    return;
  }
  edges.set(key, {
    ...draft,
    source,
    target,
    reasonParts,
  });
}

function edgeScore(edge: EdgeDraft): number {
  const typeScore: Partial<Record<ConstellationEdgeType, number>> = {
    manual_link: 8,
    ai_suggested_link: 6,
    idea_project: 5,
    idea_knowledge: 4,
    domain_tag: 3,
    shared_tag: 2,
  };
  return (typeScore[edge.type] ?? 1) + (edge.weight ?? 0);
}

function finalizeEdges(edges: Map<string, EdgeDraft>, userId: string, maxEdges: number): ConstellationEdge[] {
  return [...edges.entries()]
    .map(([id, edge]) => {
      const reasonParts = [...new Set(edge.reasonParts ?? [])].slice(0, 4);
      const rest: Omit<EdgeDraft, "reasonParts"> = { ...edge };
      delete (rest as EdgeDraft).reasonParts;
      return {
        id,
        userId,
        ...rest,
        reason: rest.reason ?? reasonParts.join("; "),
      };
    })
    .sort((a, b) => edgeScore(b) - edgeScore(a))
    .slice(0, maxEdges);
}

export function buildIdeasConstellationData(
  ideas: Idea[],
  options?: IdeaConstellationOptions,
): ConstellationGraphData {
  const opts = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const userId = ideas.find((idea) => idea.user_id)?.user_id ?? "ideas";
  const rows = ideas
    .filter((idea) => idea.id && (!idea.user_id || idea.user_id === userId))
    .slice(0, opts.maxNodes);
  const ideaIds = new Set(rows.map((idea) => idea.id));
  const nodes: ConstellationNode[] = rows.map((idea) => {
    const tags = normalizedTags(idea);
    return {
      id: ideaNodeId(idea.id),
      userId,
      label: previewIdeaTitle(idea, 80),
      type: "idea",
      ideaId: idea.id,
      category: idea.category,
      description: previewIdeaBody(idea, 220),
      tags,
      createdAt: idea.created_at,
      updatedAt: idea.updated_at,
      metadata: {
        status: idea.status,
        sourceType: idea.source_type,
        captureKind: idea.capture_kind,
      },
    };
  });

  const edges = new Map<string, EdgeDraft>();
  const tagIndex = new Map<string, Set<string>>();
  const projectIndex = new Map<string, Set<string>>();
  const taskIndex = new Map<string, Set<string>>();
  const goalIndex = new Map<string, Set<string>>();
  const knowledgeIndex = new Map<string, Set<string>>();
  const resourceIndex = new Map<string, Set<string>>();

  for (const idea of rows) {
    const sourceNodeId = ideaNodeId(idea.id);

    for (const linkedIdeaId of idea.linked_idea_ids ?? []) {
      if (!ideaIds.has(linkedIdeaId)) continue;
      addEdge(edges, {
        source: sourceNodeId,
        target: ideaNodeId(linkedIdeaId),
        sourceType: "idea",
        targetType: "idea",
        type: "manual_link",
        status: "confirmed",
        weight: 0.95,
        reasonParts: ["Directly linked idea"],
      });
    }

    for (const related of ideaRelatedResources(idea)) {
      if (related.scope !== "idea" || !ideaIds.has(related.id)) continue;
      addEdge(edges, {
        source: sourceNodeId,
        target: ideaNodeId(related.id),
        sourceType: "idea",
        targetType: "idea",
        type: "ai_suggested_link",
        status: "suggested",
        confidence: related.percentage / 100,
        weight: Math.max(0.25, related.percentage / 100),
        reasonParts: [
          related.explanation
            ? `AI related idea: ${related.explanation}`
            : "AI related idea",
        ],
      });
    }

    for (const tag of normalizedTags(idea)) {
      addToIndex(tagIndex, tag.toLowerCase(), sourceNodeId);
    }

    if (opts.includeSharedReferences) {
      for (const id of idea.linked_project_ids ?? []) addToIndex(projectIndex, titleForRef("project", id), sourceNodeId);
      for (const id of idea.linked_task_ids ?? []) addToIndex(taskIndex, titleForRef("task", id), sourceNodeId);
      for (const id of idea.linked_goal_ids ?? []) addToIndex(goalIndex, titleForRef("goal", id), sourceNodeId);
      for (const id of idea.linked_knowledge_item_ids ?? []) addToIndex(knowledgeIndex, titleForRef("knowledge", id), sourceNodeId);
      for (const ref of idea.related_resource_refs ?? []) {
        if (!ref || typeof ref !== "object" || Array.isArray(ref)) continue;
        const objectRef = ref as Record<string, unknown>;
        const scope = typeof objectRef.scope === "string" ? objectRef.scope : "resource";
        const id = typeof objectRef.id === "string" ? objectRef.id : "";
        if (id) addToIndex(resourceIndex, titleForRef(scope, id), sourceNodeId);
      }
    }
  }

  if (opts.includeSharedTags) {
    addPairEdgesFromIndex({
      index: tagIndex,
      edges,
      type: "shared_tag",
      reasonPrefix: "Shared tag",
      weight: 0.45,
    });
  }

  if (opts.includeSharedReferences) {
    addPairEdgesFromIndex({
      index: projectIndex,
      edges,
      type: "idea_project",
      reasonPrefix: "Both linked to project",
      weight: 0.65,
    });
    addPairEdgesFromIndex({
      index: knowledgeIndex,
      edges,
      type: "idea_knowledge",
      reasonPrefix: "Both linked to knowledge",
      weight: 0.55,
    });
    addPairEdgesFromIndex({
      index: taskIndex,
      edges,
      type: "domain_tag",
      reasonPrefix: "Both linked to task",
      weight: 0.5,
    });
    addPairEdgesFromIndex({
      index: goalIndex,
      edges,
      type: "domain_tag",
      reasonPrefix: "Both linked to goal",
      weight: 0.5,
    });
    addPairEdgesFromIndex({
      index: resourceIndex,
      edges,
      type: "domain_tag",
      reasonPrefix: "Both linked to resource",
      weight: 0.42,
    });
  }

  const finalizedEdges = finalizeEdges(edges, userId, opts.maxEdges);
  const connectionCount = new Map<string, number>();
  for (const edge of finalizedEdges) {
    connectionCount.set(edge.source, (connectionCount.get(edge.source) ?? 0) + 1);
    connectionCount.set(edge.target, (connectionCount.get(edge.target) ?? 0) + 1);
  }

  return {
    nodes: nodes.map((node) => ({
      ...node,
      connectionCount: connectionCount.get(node.id) ?? 0,
    })),
    edges: finalizedEdges,
  };
}
