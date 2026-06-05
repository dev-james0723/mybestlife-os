import { describe, expect, it } from "vitest";
import { buildContinuityFromMemories } from "@/lib/life-agent/continuity";
import type { LifeAgentMemory } from "@/types/life-agent";

function memory(partial: Partial<LifeAgentMemory> & Pick<LifeAgentMemory, "id" | "content">): LifeAgentMemory {
  return {
    id: partial.id,
    user_id: "u1",
    content: partial.content,
    memory_type: partial.memory_type ?? "preference",
    visibility: partial.visibility ?? "private",
    user_confirmed: partial.user_confirmed ?? true,
    source_type: partial.source_type ?? null,
    source_id: partial.source_id ?? null,
    confidence: partial.confidence ?? null,
    created_at: partial.created_at ?? "2026-01-01T00:00:00Z",
    updated_at: partial.updated_at ?? "2026-01-02T00:00:00Z",
  };
}

describe("buildContinuityFromMemories", () => {
  it("returns null when no confirmed memories match", () => {
    expect(buildContinuityFromMemories([])).toBeNull();
    expect(
      buildContinuityFromMemories([
        memory({ id: "1", content: "random note", user_confirmed: false }),
      ]),
    ).toBeNull();
  });

  it("matches scatter pattern from confirmed memory", () => {
    const result = buildContinuityFromMemories([
      memory({ id: "m1", content: "My week feels too scattered lately" }),
    ]);
    expect(result?.memorySourceId).toBe("m1");
    expect(result?.message).toMatch(/less scattered/i);
  });

  it("ignores unconfirmed memories even with matching text", () => {
    expect(
      buildContinuityFromMemories([
        memory({ id: "m2", content: "open loop everywhere", user_confirmed: false }),
      ]),
    ).toBeNull();
  });
});
