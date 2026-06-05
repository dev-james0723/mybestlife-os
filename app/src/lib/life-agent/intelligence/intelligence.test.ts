import { describe, expect, it } from "vitest";
import { emptyLifeAgentContextSources } from "@/lib/life-agent/context-fetchers";
import { assembleLifeAgentContextPacket } from "@/lib/life-agent/context-summarizers";
import { resolveLifeAgentPermissions } from "@/lib/life-agent/permission-policy";
import type { IntelligenceContextBundle } from "@/lib/life-agent/intelligence-context";
import { buildInnerConflicts } from "@/lib/life-agent/intelligence/inner-conflicts";
import { buildLifeCoherence } from "@/lib/life-agent/intelligence/life-coherence";
import { buildMemoryTimeline } from "@/lib/life-agent/intelligence/memory-timeline";

function testBundle(overrides?: Partial<IntelligenceContextBundle>): IntelligenceContextBundle {
  const sources = emptyLifeAgentContextSources();
  sources.goals = [
    {
      id: "g1",
      user_id: "u1",
      name: "Music doctorate practice",
      description: null,
      status: "active",
      target_date: null,
      category: null,
      created_at: "2026-01-15T00:00:00Z",
      updated_at: "2026-01-15T00:00:00Z",
    },
  ];
  sources.tasks = [
    {
      id: "t1",
      user_id: "u1",
      project_id: null,
      title: "Pay admin invoice",
      description: null,
      status: "todo",
      priority: "urgent",
      due_date: "2026-01-01",
      completed_at: null,
      estimated_blocks: null,
      tags: [],
      source: null,
      source_url: null,
      reminder_date: null,
      category: null,
      ai_generated: false,
      ai_metadata: null,
      sort_order: null,
      scheduled_date: null,
      calendar_event_id: null,
      calendar_provider: null,
      created_at: "2026-01-10T00:00:00Z",
      updated_at: "2026-01-10T00:00:00Z",
    },
    {
      id: "t2",
      user_id: "u1",
      project_id: null,
      title: "Urgent admin follow-up",
      description: null,
      status: "todo",
      priority: "urgent",
      due_date: null,
      completed_at: null,
      estimated_blocks: null,
      tags: [],
      source: null,
      source_url: null,
      reminder_date: null,
      category: null,
      ai_generated: false,
      ai_metadata: null,
      sort_order: null,
      scheduled_date: null,
      calendar_event_id: null,
      calendar_provider: null,
      created_at: "2026-01-11T00:00:00Z",
      updated_at: "2026-01-11T00:00:00Z",
    },
    {
      id: "t3",
      user_id: "u1",
      project_id: null,
      title: "Urgent schedule logistics",
      description: null,
      status: "todo",
      priority: "urgent",
      due_date: null,
      completed_at: null,
      estimated_blocks: null,
      tags: [],
      source: null,
      source_url: null,
      reminder_date: null,
      category: null,
      ai_generated: false,
      ai_metadata: null,
      sort_order: null,
      scheduled_date: null,
      calendar_event_id: null,
      calendar_provider: null,
      created_at: "2026-01-12T00:00:00Z",
      updated_at: "2026-01-12T00:00:00Z",
    },
    {
      id: "t4",
      user_id: "u1",
      project_id: null,
      title: "Email logistics schedule",
      description: null,
      status: "todo",
      priority: "high",
      due_date: null,
      completed_at: null,
      estimated_blocks: null,
      tags: [],
      source: null,
      source_url: null,
      reminder_date: null,
      category: null,
      ai_generated: false,
      ai_metadata: null,
      sort_order: null,
      scheduled_date: null,
      calendar_event_id: null,
      calendar_provider: null,
      created_at: "2026-01-11T00:00:00Z",
      updated_at: "2026-01-11T00:00:00Z",
    },
  ];

  const permissions = resolveLifeAgentPermissions("u1", [], []);
  const packet = assembleLifeAgentContextPacket({
    userId: "u1",
    mode: "mirror",
    userMessage: "test",
    permissions,
    sources,
  });

  return {
    permissions,
    sources,
    packet,
    memoryUsed: [],
    warnings: [],
    ...overrides,
  };
}

describe("buildInnerConflicts", () => {
  it("frames tensions gently", () => {
    const result = buildInnerConflicts(testBundle());
    if (result.conflicts.length > 0) {
      expect(result.conflicts[0]!.pattern).toMatch(/A possible tension I notice/i);
      expect(result.conflicts[0]!.pattern).not.toMatch(/You are conflicted because/i);
    }
    expect(result.summary).toMatch(/not diagnoses/i);
  });
});

describe("buildMemoryTimeline", () => {
  it("only includes stored records", () => {
    const bundle = testBundle();
    bundle.sources.journalEntries = [
      {
        id: "j1",
        userId: "u1",
        entryDate: "2026-02-01",
        topic: "Recital prep",
        quadrant: "GREEN",
        primaryEmotion: "focused",
        secondaryEmotion: null,
        intensity: 5,
        target: null,
        bullets: { items: [] },
        selfStory: null,
        needs: { items: [] },
        nextTinyStep: "",
        appreciation: null,
        topicExtras: null,
        contextFactors: null,
        projectIds: [],
        taskIds: [],
        aiOutput: null,
        aiMedia: null,
        source: "test",
        createdAt: "2026-02-01T00:00:00Z",
        updatedAt: "2026-02-01T00:00:00Z",
      },
    ];
    const result = buildMemoryTimeline(bundle);
    expect(result.entries.some((e) => e.id === "j1")).toBe(true);
    expect(result.headline).toMatch(/stored/i);
  });
});

describe("buildLifeCoherence", () => {
  it("returns coherence structure from real goals and tasks", () => {
    const result = buildLifeCoherence(testBundle());
    expect(result.coherenceSummary.length).toBeGreaterThan(0);
    expect(Array.isArray(result.alignedAreas)).toBe(true);
    expect(Array.isArray(result.frictionAreas)).toBe(true);
    expect(Array.isArray(result.gentleAccountability)).toBe(true);
  });
});
