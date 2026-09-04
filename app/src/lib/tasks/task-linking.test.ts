import { describe, expect, it } from "vitest";

import type { DailyPlan, Idea, Task } from "@/types/database";
import type { BrainRelationRow } from "@/types/brain";
import type { HabitLink } from "@/lib/habits/types";
import {
  buildTaskLinkIndex,
  collectPlannerTaskIds,
  computeProjectTaskProgress,
  findGoalTaskRelationId,
  findTaskEntityRelationIds,
  goalIdsForTask,
  ideaIdsForTask,
  knowledgeIdsForTask,
  linkedEntityIdsForTask,
  noteIdsForTask,
  taskIdsForGoal,
} from "./task-linking";

const IDEA_ID = "11111111-1111-4111-8111-111111111111";
const KNOWLEDGE_ID = "22222222-2222-4222-8222-222222222222";
const NOTE_ID = "33333333-3333-4333-8333-333333333333";

function task(id: string, over: Partial<Task> = {}): Task {
  return {
    id,
    status: "todo",
    calendar_event_id: null,
    ...over,
  } as Task;
}

function relation(over: Partial<BrainRelationRow>): BrainRelationRow {
  return {
    id: "r1",
    user_id: "u1",
    source_id: "s",
    source_type: "goal",
    target_id: "t",
    target_type: "task",
    relation_type: "goal_task",
    status: "confirmed",
    weight: null,
    is_manual: true,
    is_ai_suggested: false,
    reason: null,
    metadata: null,
    created_at: "",
    updated_at: "",
    ...over,
  } as BrainRelationRow;
}

describe("computeProjectTaskProgress", () => {
  it("ignores cancelled tasks in the denominator", () => {
    const r = computeProjectTaskProgress([
      task("a", { status: "done" }),
      task("b", { status: "todo" }),
      task("c", { status: "cancelled" }),
    ]);
    expect(r.total).toBe(3);
    expect(r.done).toBe(1);
    expect(r.active).toBe(1);
    expect(r.cancelled).toBe(1);
    // done / (total - cancelled) = 1 / 2 = 50
    expect(r.completionPct).toBe(50);
  });

  it("returns 0% for an empty / all-cancelled set", () => {
    expect(computeProjectTaskProgress([]).completionPct).toBe(0);
    expect(
      computeProjectTaskProgress([task("x", { status: "cancelled" })])
        .completionPct,
    ).toBe(0);
  });
});

describe("collectPlannerTaskIds", () => {
  it("collects taskIds from both time-block and free lists", () => {
    const plans = [
      {
        tasks: [{ taskId: "t1" }, { taskName: "no id" }],
        free_tasks: [{ taskId: "t2" }],
      },
    ] as unknown as DailyPlan[];
    const ids = collectPlannerTaskIds(plans);
    expect([...ids].sort()).toEqual(["t1", "t2"]);
  });
});

describe("goal <-> task relations", () => {
  const rels = [
    relation({ id: "r1", source_id: "g1", target_id: "t1" }),
    relation({ id: "r2", source_id: "g2", target_id: "t1" }),
    // reverse direction is tolerated
    relation({
      id: "r3",
      source_type: "task",
      source_id: "t2",
      target_type: "goal",
      target_id: "g1",
    }),
    // unrelated relation type ignored
    relation({
      id: "r4",
      relation_type: "habit_task",
      source_id: "g9",
      target_id: "t1",
    }),
  ];

  it("goalIdsForTask returns linked goals (both directions)", () => {
    expect(goalIdsForTask(rels, "t1").sort()).toEqual(["g1", "g2"]);
    expect(goalIdsForTask(rels, "t2")).toEqual(["g1"]);
  });

  it("taskIdsForGoal returns linked tasks (both directions)", () => {
    expect(taskIdsForGoal(rels, "g1").sort()).toEqual(["t1", "t2"]);
  });

  it("findGoalTaskRelationId locates the edge row", () => {
    expect(findGoalTaskRelationId(rels, "t1", "g2")).toBe("r2");
    expect(findGoalTaskRelationId(rels, "t1", "g404")).toBeNull();
  });
});

describe("task relationship lookups", () => {
  const relations = [
    relation({
      id: "forward",
      source_type: "task",
      source_id: "t1",
      target_type: "knowledge",
      target_id: KNOWLEDGE_ID,
      relation_type: "explicit_link",
    }),
    relation({
      id: "reverse",
      source_type: "knowledge",
      source_id: "knowledge-reverse",
      target_type: "task",
      target_id: "t1",
      relation_type: "explicit_link",
    }),
    relation({
      id: "hidden",
      source_type: "task",
      source_id: "t1",
      target_type: "knowledge",
      target_id: "knowledge-hidden",
      relation_type: "explicit_link",
      status: "hidden",
    }),
    relation({
      id: "wrong-entity-type",
      source_type: "task",
      source_id: "t1",
      target_type: "idea",
      target_id: KNOWLEDGE_ID,
      relation_type: "explicit_link",
    }),
  ];

  it("finds visible entity ids and relation rows in either direction", () => {
    expect(linkedEntityIdsForTask(relations, "t1", "knowledge").sort()).toEqual(
      [KNOWLEDGE_ID, "knowledge-reverse"].sort(),
    );
    expect(
      findTaskEntityRelationIds(relations, "t1", "knowledge", KNOWLEDGE_ID),
    ).toEqual(["forward"]);
    expect(
      findTaskEntityRelationIds(
        relations,
        "t1",
        "knowledge",
        "knowledge-hidden",
      ),
    ).toEqual([]);
  });

  it("unions canonical idea and knowledge links with legacy metadata", () => {
    const linkedTask = task("t1", {
      tags: [`idea:${IDEA_ID}`, `knowledge:${KNOWLEDGE_ID}`, `note:${NOTE_ID}`],
      description: null,
    });
    const ideas = [
      { id: "canonical-idea", linked_task_ids: ["t1"] } as Idea,
      { id: "other-idea", linked_task_ids: ["t2"] } as Idea,
    ];

    expect(ideaIdsForTask(ideas, linkedTask).sort()).toEqual(
      [IDEA_ID, "canonical-idea"].sort(),
    );
    expect(knowledgeIdsForTask(relations, linkedTask).sort()).toEqual(
      [KNOWLEDGE_ID, "knowledge-reverse"].sort(),
    );
    expect(noteIdsForTask(linkedTask)).toEqual([NOTE_ID]);
  });
});

describe("buildTaskLinkIndex", () => {
  it("flags planner / calendar / goal / habit / idea / knowledge", () => {
    const tasks = [
      task("t1", { calendar_event_id: "planner-time:p:x" }),
      task("t2"),
      task("t3"),
    ];
    const dailyPlans = [
      { tasks: [{ taskId: "t2" }], free_tasks: [] },
    ] as unknown as DailyPlan[];
    const brainRelations = [
      relation({ source_id: "g1", target_id: "t1" }),
      relation({
        id: "rk",
        source_type: "knowledge",
        source_id: "k1",
        target_type: "task",
        target_id: "t3",
        relation_type: "explicit_link",
      }),
    ];
    const habitLinks = [
      { target_kind: "task", target_id: "t2" } as HabitLink,
      { target_kind: "goal", target_id: "g1" } as HabitLink,
    ];
    const ideas = [{ linked_task_ids: ["t3"] } as Idea];

    const index = buildTaskLinkIndex({
      tasks,
      dailyPlans,
      brainRelations,
      habitLinks,
      ideas,
    });

    expect(index.get("t1")).toMatchObject({ calendar: true, goal: true });
    expect(index.get("t2")).toMatchObject({ planner: true, habit: true });
    expect(index.get("t3")).toMatchObject({ idea: true, knowledge: true });
    expect(index.get("t2")?.calendar).toBe(false);
  });

  it("uses legacy relationship metadata as an idea and knowledge fallback", () => {
    const index = buildTaskLinkIndex({
      tasks: [
        task("legacy", {
          tags: [`idea:${IDEA_ID}`, `knowledge:${KNOWLEDGE_ID}`],
          description: null,
        }),
      ],
    });

    expect(index.get("legacy")).toMatchObject({
      idea: true,
      knowledge: true,
    });
  });
});
