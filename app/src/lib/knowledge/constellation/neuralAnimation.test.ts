import { describe, expect, it } from "vitest";
import type { ConstellationEdgeType } from "@/types/constellation";
import {
  MAX_NEURAL_ANIMATED_EDGES,
  selectNeuralAnimatedEdgeIds,
  type NeuralAnimationLink,
  type NeuralAnimationNode,
} from "@/lib/knowledge/constellation/neuralAnimation";

type TestNode = NeuralAnimationNode & {
  userId: string;
  label: string;
  type: "knowledge";
};

function node(
  id: string,
  x: number,
  connectionCount = 0,
): TestNode {
  return {
    id,
    userId: "u1",
    label: id,
    type: "knowledge",
    x,
    y: 0,
    connectionCount,
  };
}

function edge(
  id: string,
  type: ConstellationEdgeType,
  source: TestNode,
  target: TestNode,
): NeuralAnimationLink<TestNode> {
  return {
    id,
    userId: "u1",
    source,
    target,
    type,
  };
}

describe("selectNeuralAnimatedEdgeIds", () => {
  it("keeps the pulse set capped while prioritizing important visible edges", () => {
    const selected = node("selected", -420, 16);
    const hover = node("hover", 90, 5);
    const right = node("right", 420, 12);
    const bulkLinks = Array.from({ length: 260 }, (_, i) => {
      const source = node(`bulk-source-${i}`, -120 + (i % 8) * 8, 1);
      const target = node(`bulk-target-${i}`, 100 + (i % 8) * 8, 1);
      return edge(
        `bulk-${String(i).padStart(3, "0")}`,
        "semantic_similarity",
        source,
        target,
      );
    });
    const importantLinks = [
      edge("selected-edge", "manual_link", selected, right),
      edge("hover-edge", "explicit_link", hover, right),
      edge("spotlight-edge", "semantic_similarity", node("left", -360), right),
      edge("bridge-edge", "goal_project", node("bridge-left", -360), right),
    ];

    const ids = selectNeuralAnimatedEdgeIds({
      links: [...bulkLinks, ...importantLinks],
      selectedNodeId: selected.id,
      hoveredNodeId: hover.id,
      spotlightDirectEdgeIds: new Set(["spotlight-edge"]),
      reducedMotion: false,
    });

    expect(MAX_NEURAL_ANIMATED_EDGES).toBeGreaterThanOrEqual(120);
    expect(MAX_NEURAL_ANIMATED_EDGES).toBeLessThanOrEqual(250);
    expect(ids.size).toBe(MAX_NEURAL_ANIMATED_EDGES);
    expect(ids.has("selected-edge")).toBe(true);
    expect(ids.has("hover-edge")).toBe(true);
    expect(ids.has("spotlight-edge")).toBe(true);
    expect(ids.has("bridge-edge")).toBe(true);
  });

  it("returns a static edge set for reduced-motion users", () => {
    const ids = selectNeuralAnimatedEdgeIds({
      links: [edge("edge-1", "manual_link", node("a", -100), node("b", 100))],
      selectedNodeId: "a",
      hoveredNodeId: null,
      reducedMotion: true,
    });

    expect(ids.size).toBe(0);
  });
});
