import { describe, expect, it } from "vitest";
import {
  buildRadarOpenLoops,
  categorizeOpenLoop,
  groupOpenLoops,
} from "@/lib/life-agent/open-loop-radar";
import type { ContextOpenLoop } from "@/lib/life-agent/context-types";
import { emptyLifeAgentContextSources } from "@/lib/life-agent/context-fetchers";

describe("categorizeOpenLoop", () => {
  it("marks overdue tasks as urgent", () => {
    const loop: ContextOpenLoop = {
      id: "t1",
      kind: "overdue_task",
      title: "Pay rent",
      sourceType: "task",
      sourceId: "t1",
      priority: "high",
    };
    expect(categorizeOpenLoop(loop)).toBe("urgent");
  });

  it("marks relationship follow-ups as relationship", () => {
    const loop: ContextOpenLoop = {
      id: "r1",
      kind: "relationship_follow_up",
      title: "Call Alex",
      sourceType: "relationship",
      sourceId: "r1",
    };
    expect(categorizeOpenLoop(loop)).toBe("relationship");
  });
});

describe("groupOpenLoops", () => {
  it("groups radar loops by category with counts", () => {
    const loops = [
      {
        id: "1",
        kind: "overdue_task" as const,
        title: "A",
        sourceType: "task",
        sourceId: "1",
        priority: "high" as const,
        category: "urgent" as const,
      },
      {
        id: "2",
        kind: "relationship_follow_up" as const,
        title: "B",
        sourceType: "relationship",
        sourceId: "2",
        category: "relationship" as const,
      },
    ];
    const groups = groupOpenLoops(loops);
    expect(groups).toHaveLength(2);
    expect(groups[0].category).toBe("urgent");
    expect(groups[0].count).toBe(1);
    expect(groups[1].category).toBe("relationship");
  });
});

describe("buildRadarOpenLoops", () => {
  it("returns empty when sources have no loops", () => {
    const radar = buildRadarOpenLoops(emptyLifeAgentContextSources(), new Date("2026-05-30"));
    expect(radar).toEqual([]);
  });
});
