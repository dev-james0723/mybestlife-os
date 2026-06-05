import { describe, expect, it } from "vitest";

import { assembleLifeAgentContextPacket } from "@/lib/life-agent/context-summarizers";
import { emptyLifeAgentContextSources } from "@/lib/life-agent/context-fetchers";
import { extractOpenLoops } from "@/lib/life-agent/open-loops";
import { routeLifeAgentIntent } from "@/lib/life-agent/intent-router";
import {
  canActInDomain,
  canReadDomain,
  canSuggestDomain,
  resolveLifeAgentPermissions,
} from "@/lib/life-agent/permission-policy";
import { LIFE_AGENT_CONTEXT_CAPS } from "@/lib/life-agent/context-types";
import type { LifeAgentPermission } from "@/types/life-agent";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";

function perm(
  domain: LifeAgentPermissionDomain,
  access_level: LifeAgentPermission["access_level"],
): LifeAgentPermission {
  return {
    id: `perm-${domain}`,
    user_id: "user-1",
    domain,
    access_level,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function allReadPermissions(): LifeAgentPermission[] {
  const domains: LifeAgentPermissionDomain[] = [
    "about_me",
    "projects",
    "tasks",
    "goals",
    "habits",
    "relationships",
    "role_models",
    "assets",
    "documents",
    "notes",
    "journal",
    "bucket_list",
    "knowledge",
    "finance",
    "health",
    "brain_graph",
  ];
  return domains.map((d) => perm(d, "read_only"));
}

describe("life-agent permission policy", () => {
  it("blocks off and ask_every_time without session grant", () => {
    const resolved = resolveLifeAgentPermissions("user-1", [
      perm("tasks", "off"),
      perm("finance", "ask_every_time"),
      perm("journal", "read_only"),
    ]);
    expect(canReadDomain(resolved, "tasks")).toBe(false);
    expect(canReadDomain(resolved, "finance")).toBe(false);
    expect(canReadDomain(resolved, "journal")).toBe(true);
    expect(canSuggestDomain(resolved, "journal")).toBe(false);
    expect(canActInDomain(resolved, "journal")).toBe(false);
  });

  it("honors session grants for ask_every_time", () => {
    const resolved = resolveLifeAgentPermissions(
      "user-1",
      [perm("finance", "ask_every_time")],
      ["finance"],
    );
    expect(canReadDomain(resolved, "finance")).toBe(true);
  });
});

describe("life-agent intent router", () => {
  it("routes planning, open loops, relationships, projects, reflection", () => {
    expect(
      routeLifeAgentIntent({ userMessage: "Help me plan my day", mode: "orchestrator" }),
    ).toBe("planning");
    expect(
      routeLifeAgentIntent({ userMessage: "What open loops am I missing?", mode: "companion" }),
    ).toBe("open_loop_review");
    expect(
      routeLifeAgentIntent({ userMessage: "My friend needs a follow up", mode: "companion" }),
    ).toBe("relationship_help");
    expect(
      routeLifeAgentIntent({ userMessage: "Project strategy for D Festival", mode: "orchestrator" }),
    ).toBe("project_strategy");
    expect(
      routeLifeAgentIntent({ userMessage: "I want to reflect on my journal", mode: "mirror" }),
    ).toBe("reflection");
  });
});

describe("life-agent open loops", () => {
  it("detects overdue tasks and projects without next action", () => {
    const sources = emptyLifeAgentContextSources();
    sources.tasks = [
      {
        id: "t1",
        user_id: "u",
        title: "Overdue item",
        status: "todo",
        priority: "high",
        due_date: "2020-01-01",
        project_id: null,
        created_at: "",
        updated_at: "",
      } as (typeof sources.tasks)[0],
    ];
    sources.projects = [
      {
        id: "p1",
        user_id: "u",
        name: "Stalled project",
        status: "active",
        priority: "medium",
        updated_at: "2026-01-01",
      } as (typeof sources.projects)[0],
    ];
    const loops = extractOpenLoops(sources, new Date("2026-05-30"));
    expect(loops.some((l) => l.kind === "overdue_task")).toBe(true);
    expect(loops.some((l) => l.kind === "project_without_next_action")).toBe(true);
  });
});

describe("life-agent context assembly", () => {
  const baseInput = {
    userId: "user-1",
    mode: "orchestrator" as const,
    permissions: resolveLifeAgentPermissions("user-1", allReadPermissions()),
    sources: emptyLifeAgentContextSources(),
    referenceDate: new Date("2026-05-30"),
  };

  it("omits domains when permission is off", () => {
    const packet = assembleLifeAgentContextPacket({
      ...baseInput,
      userMessage: "plan my week",
      permissions: resolveLifeAgentPermissions("user-1", [
        perm("tasks", "read_only"),
        perm("projects", "off"),
      ]),
    });
    expect(packet.omittedDomains.some((o) => o.domain === "projects")).toBe(true);
    expect(packet.activeLifeContext?.activeProjects).toBeUndefined();
  });

  it("reports ask_every_time in omittedDomains", () => {
    const packet = assembleLifeAgentContextPacket({
      ...baseInput,
      userMessage: "plan my week",
      permissions: resolveLifeAgentPermissions("user-1", [perm("tasks", "ask_every_time")]),
    });
    expect(packet.omittedDomains.some((o) => o.reason === "ask_every_time")).toBe(true);
  });

  it("caps urgent tasks and records memoryUsed", () => {
    const sources = emptyLifeAgentContextSources();
    sources.tasks = Array.from({ length: 20 }, (_, i) => ({
      id: `task-${i}`,
      user_id: "user-1",
      title: `Task ${i}`,
      status: "todo",
      priority: i % 2 === 0 ? "urgent" : "medium",
      due_date: null,
      project_id: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    })) as typeof sources.tasks;

    const packet = assembleLifeAgentContextPacket({
      ...baseInput,
      userMessage: "help me plan",
      sources,
    });

    expect(packet.intent).toBe("planning");
    expect(packet.activeLifeContext?.urgentTasks.length).toBeLessThanOrEqual(
      LIFE_AGENT_CONTEXT_CAPS.maxUrgentTasks,
    );
    expect(packet.memoryUsed.some((m) => m.sourceType === "task")).toBe(true);
  });

  it("builds relationship context for relationship_help intent", () => {
    const sources = emptyLifeAgentContextSources();
    sources.relationships = [
      {
        id: "r1",
        user_id: "user-1",
        person_name: "Alex",
        category: "friend",
        next_action: "Send birthday note",
        next_action_date: "2026-06-01",
        commitments_made: "Help with move",
      } as (typeof sources.relationships)[0],
    ];

    const packet = assembleLifeAgentContextPacket({
      ...baseInput,
      mode: "companion",
      userMessage: "How should I follow up with my friend?",
      sources,
    });

    expect(packet.intent).toBe("relationship_help");
    expect(packet.peopleContext?.relevantRelationships[0]?.name).toBe("Alex");
    expect(packet.memoryUsed.some((m) => m.sourceType === "relationship")).toBe(true);
  });

  it("builds reflection context without dumping unrelated finance", () => {
    const sources = emptyLifeAgentContextSources();
    sources.journalEntries = [
      {
        id: "j1",
        userId: "user-1",
        entryDate: "2026-05-29",
        topic: "Direction",
        quadrant: "GREEN",
        primaryEmotion: "hopeful",
        secondaryEmotion: null,
        intensity: 6,
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
        source: "manual",
        createdAt: "2026-05-29",
        updatedAt: "2026-05-29",
      },
    ];
    sources.financeTransactions = [
      { id: "f1", amount: 500, type: "expense", description: "Rent", transaction_date: "2026-05-01" },
    ];

    const packet = assembleLifeAgentContextPacket({
      ...baseInput,
      mode: "mirror",
      userMessage: "Help me reflect on what matters",
      sources,
    });

    expect(packet.intent).toBe("reflection");
    expect(packet.reflectionContext?.recentJournalThemes.length).toBeGreaterThan(0);
    expect(packet.resourceContext?.financeSummary).toBeUndefined();
  });
});
