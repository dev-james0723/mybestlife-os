import { describe, expect, it } from "vitest";
import { buildIdeasConstellationData } from "./build-ideas-constellation-data";
import type { Idea } from "@/types/database";

function idea(partial: Partial<Idea> & Pick<Idea, "id" | "content">): Idea {
  return {
    id: partial.id,
    user_id: partial.user_id ?? "user-1",
    content: partial.content,
    source_type: partial.source_type ?? "text",
    capture_kind: partial.capture_kind ?? "idea",
    voice_transcript: partial.voice_transcript ?? null,
    linked_project_ids: partial.linked_project_ids ?? [],
    linked_task_ids: partial.linked_task_ids ?? [],
    linked_goal_ids: partial.linked_goal_ids ?? [],
    linked_idea_ids: partial.linked_idea_ids ?? [],
    status: partial.status ?? "captured",
    category: partial.category ?? "product",
    created_at: partial.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: partial.updated_at ?? "2026-01-01T00:00:00.000Z",
    title: partial.title ?? null,
    ai_tags: partial.ai_tags ?? [],
    manual_tags: partial.manual_tags ?? [],
    destinations: partial.destinations ?? [],
    attachments: partial.attachments ?? [],
    ai_suggestions: partial.ai_suggestions ?? null,
    processing_step: partial.processing_step ?? null,
    linked_knowledge_item_ids: partial.linked_knowledge_item_ids ?? [],
    linked_node_ids: partial.linked_node_ids ?? [],
    related_resource_refs: partial.related_resource_refs ?? [],
  };
}

describe("buildIdeasConstellationData", () => {
  it("emits only idea nodes while preserving idea-to-idea relationships", () => {
    const graph = buildIdeasConstellationData([
      idea({
        id: "idea-a",
        title: "Tiny capture inbox",
        content: "Create a faster idea inbox",
        manual_tags: ["capture", "workflow"],
        linked_idea_ids: ["idea-b"],
        linked_project_ids: ["project-1"],
      }),
      idea({
        id: "idea-b",
        title: "Review ritual",
        content: "Review captured ideas every Friday",
        manual_tags: ["workflow"],
        linked_project_ids: ["project-1"],
      }),
      idea({
        id: "idea-c",
        title: "Solo thought",
        content: "No links yet",
      }),
    ]);

    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes.every((node) => node.type === "idea")).toBe(true);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(
      graph.edges.every((edge) => edge.source.startsWith("idea:") && edge.target.startsWith("idea:")),
    ).toBe(true);
    expect(graph.edges.some((edge) => edge.type === "manual_link")).toBe(true);
    expect(graph.edges.some((edge) => edge.type === "idea_project")).toBe(true);
  });
});
