import { describe, expect, it } from "vitest";
import type {
  ConstellationGraphData,
  ConstellationNode,
} from "@/types/constellation";
import {
  BRAIN_HH,
  BRAIN_HW,
  generateBrainShapedLayout,
  isInsideBrain,
  type PositionedNode,
} from "@/lib/brain/layout/brainLayout";

function node(
  id: string,
  type: ConstellationNode["type"],
  overrides: Partial<ConstellationNode> = {},
): ConstellationNode {
  return {
    id,
    userId: "u1",
    label: id,
    type,
    ...overrides,
  };
}

function positioned(graph: ConstellationGraphData): PositionedNode[] {
  return graph.nodes as PositionedNode[];
}

describe("generateBrainShapedLayout", () => {
  it("pins hubs and keeps every node inside the brain boundary", () => {
    const graph: ConstellationGraphData = {
      nodes: [
        node("career-area", "tag", {
          metadata: {
            brainType: "life_area",
            anchorKind: "life_area",
            anchorSlug: "career",
          },
        }),
        node("core-self", "about_me"),
        node("goal-hub", "goal", { importance: 0.95, connectionCount: 5 }),
        node("habit-1", "habit"),
        node("task-1", "task"),
      ],
      edges: [],
    };

    const byId = new Map(
      positioned(generateBrainShapedLayout(graph)).map((n) => [n.id, n]),
    );

    for (const n of byId.values()) {
      expect(isInsideBrain(n.x, n.y)).toBe(true);
    }

    expect(byId.get("career-area")?.fx).toBeTypeOf("number");
    expect(byId.get("core-self")?.fx).toBeTypeOf("number");
    expect(byId.get("goal-hub")?.fx).toBeTypeOf("number");
    expect(byId.get("habit-1")?.fx).toBeUndefined();
    expect(byId.get("task-1")?.fx).toBeUndefined();
  });

  it("spreads children across the widened brain canvas deterministically", () => {
    const children = Array.from({ length: 36 }, (_, i) =>
      node(`task-${String(i).padStart(2, "0")}`, "task"),
    );
    const graph: ConstellationGraphData = {
      nodes: [
        node("project-hub", "project", {
          importance: 0.9,
          connectionCount: 8,
        }),
        ...children,
      ],
      edges: [],
    };

    const first = positioned(generateBrainShapedLayout(graph));
    const second = positioned(generateBrainShapedLayout(graph));
    const childNodes = first.filter((n) => n.id.startsWith("task-"));
    const xs = childNodes.map((n) => n.x);
    const ys = childNodes.map((n) => n.y);

    expect(BRAIN_HW).toBeGreaterThanOrEqual(560);
    expect(BRAIN_HH).toBeGreaterThanOrEqual(330);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(260);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(220);
    expect(childNodes.every((n) => Math.hypot(n.x, n.y) > 60)).toBe(true);

    for (const n of first) {
      const match = second.find((m) => m.id === n.id);
      expect(match?.x).toBeCloseTo(n.x, 6);
      expect(match?.y).toBeCloseTo(n.y, 6);
    }
  });
});
