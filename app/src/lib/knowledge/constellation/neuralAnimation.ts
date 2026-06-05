import { EDGE_STYLE } from "@/lib/knowledge/constellation/constants";
import type {
  ConstellationEdge,
  ConstellationEdgeType,
  ConstellationNode,
} from "@/types/constellation";

export const MAX_NEURAL_ANIMATED_EDGES = 180;

export type NeuralAnimationNode = Pick<
  ConstellationNode,
  "id" | "connectionCount"
> & {
  x?: number;
  y?: number;
};

export type NeuralAnimationLink<
  TNode extends NeuralAnimationNode = NeuralAnimationNode,
> = Omit<ConstellationEdge, "source" | "target"> & {
  source: string | TNode;
  target: string | TNode;
};

export function linkEndpointIds(
  link: NeuralAnimationLink,
): { sourceId: string; targetId: string } {
  return {
    sourceId:
      typeof link.source === "object" ? link.source.id : link.source,
    targetId:
      typeof link.target === "object" ? link.target.id : link.target,
  };
}

export function linkEndpointNodes<TNode extends NeuralAnimationNode>(
  link: NeuralAnimationLink<TNode>,
): { source: TNode | null; target: TNode | null } {
  return {
    source: typeof link.source === "object" ? link.source : null,
    target: typeof link.target === "object" ? link.target : null,
  };
}

export function isStrongNeuralEdgeType(type: ConstellationEdgeType): boolean {
  return (
    type === "manual_link" ||
    type === "explicit_link" ||
    type === "goal_project" ||
    type === "goal_habit" ||
    type === "goal_task"
  );
}

export function selectNeuralAnimatedEdgeIds<
  TNode extends NeuralAnimationNode,
>({
  links,
  selectedNodeId,
  hoveredNodeId,
  spotlightDirectEdgeIds,
  reducedMotion,
  maxEdges = MAX_NEURAL_ANIMATED_EDGES,
}: {
  links: readonly NeuralAnimationLink<TNode>[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  spotlightDirectEdgeIds?: ReadonlySet<string> | null;
  reducedMotion: boolean;
  maxEdges?: number;
}): Set<string> {
  if (reducedMotion || links.length === 0 || maxEdges <= 0) {
    return new Set<string>();
  }

  const ranked = links.map((link) => {
    const { sourceId, targetId } = linkEndpointIds(link);
    const { source, target } = linkEndpointNodes(link);
    const style = EDGE_STYLE[link.type] ?? EDGE_STYLE.explicit_link;
    const touchesSelection =
      selectedNodeId !== null &&
      (sourceId === selectedNodeId || targetId === selectedNodeId);
    const touchesHover =
      hoveredNodeId !== null &&
      (sourceId === hoveredNodeId || targetId === hoveredNodeId);
    const degreeScore =
      ((source?.connectionCount ?? 0) + (target?.connectionCount ?? 0)) * 0.8;
    let score = style.opacity * 120 + style.width * 60 + degreeScore;

    if (touchesHover) score += 12000;
    if (touchesSelection || spotlightDirectEdgeIds?.has(link.id)) score += 10000;
    if (isStrongNeuralEdgeType(link.type)) score += 900;
    if (
      typeof source?.x === "number" &&
      typeof target?.x === "number" &&
      source.x * target.x < 0
    ) {
      score += 180;
    }

    return { id: link.id, score };
  });

  ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return new Set(ranked.slice(0, maxEdges).map((edge) => edge.id));
}
