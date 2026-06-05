import type { SupabaseClient } from "@supabase/supabase-js";
import { assembleLifeAgentContextPacket } from "@/lib/life-agent/context-summarizers";
import type { LifeAgentContextPacket, LifeAgentMemoryUsedItem } from "@/lib/life-agent/context-types";
import { fetchLifeAgentContextSources } from "@/lib/life-agent/context-fetchers";
import { routeLifeAgentIntent } from "@/lib/life-agent/intent-router";
import { resolveLifeAgentPermissions } from "@/lib/life-agent/permission-policy";
import type { LifeAgentMode } from "@/lib/life-agent/types";
import type { LifeAgentWorkflowKey } from "@/lib/life-agent/workflow-types";
import type {
  LifeAgentPermission,
  LifeAgentPermissionDomain,
} from "@/types/life-agent";
import { LIFE_AGENT_PERMISSION_DOMAINS } from "@/types/life-agent";
import { canReadDomain } from "@/lib/life-agent/permission-policy";
import type { LifeAgentContextSources } from "@/lib/life-agent/context-types";
import type { LifeAgentIntent } from "@/lib/life-agent/context-types";

const WORKFLOW_DOMAINS: Record<LifeAgentWorkflowKey, LifeAgentPermissionDomain[]> = {
  "daily-brief": [
    "about_me",
    "tasks",
    "projects",
    "goals",
    "relationships",
    "documents",
    "notes",
    "journal",
    "habits",
  ],
  "open-loops": [
    "tasks",
    "projects",
    "goals",
    "relationships",
    "documents",
    "notes",
    "assets",
  ],
  "plan-day": ["tasks", "projects", "goals", "habits", "about_me"],
  "weekly-review": [
    "journal",
    "about_me",
    "goals",
    "projects",
    "tasks",
    "bucket_list",
    "habits",
  ],
};

const WORKFLOW_TRIGGER_MESSAGE: Record<LifeAgentWorkflowKey, string> = {
  "daily-brief": "Give me my life brief for today",
  "open-loops": "What am I missing? Show open loops",
  "plan-day": "Help me plan my day",
  "weekly-review": "Weekly life review",
};

const WORKFLOW_MODE: Record<LifeAgentWorkflowKey, LifeAgentMode> = {
  "daily-brief": "orchestrator",
  "open-loops": "orchestrator",
  "plan-day": "orchestrator",
  "weekly-review": "mirror",
};

export function domainsForWorkflow(
  permissions: ReturnType<typeof resolveLifeAgentPermissions>,
  workflow: LifeAgentWorkflowKey,
): Set<LifeAgentPermissionDomain> {
  const set = new Set<LifeAgentPermissionDomain>();
  for (const d of WORKFLOW_DOMAINS[workflow]) {
    if (canReadDomain(permissions, d)) set.add(d);
  }
  return set;
}

export type WorkflowContextBundle = {
  permissions: ReturnType<typeof resolveLifeAgentPermissions>;
  sources: LifeAgentContextSources;
  packet: LifeAgentContextPacket;
  memoryUsed: LifeAgentMemoryUsedItem[];
  warnings: string[];
};

export async function loadWorkflowContext(
  supabase: SupabaseClient,
  userId: string,
  workflow: LifeAgentWorkflowKey,
  options: {
    sessionGrants?: LifeAgentPermissionDomain[];
    referenceDate?: Date;
  } = {},
): Promise<WorkflowContextBundle> {
  const { data: permissionRows, error } = await supabase
    .from("life_agent_permissions")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;

  const permissions = resolveLifeAgentPermissions(
    userId,
    (permissionRows ?? []) as LifeAgentPermission[],
    options.sessionGrants ?? [],
  );

  const domainOverride = domainsForWorkflow(permissions, workflow);
  const mode = WORKFLOW_MODE[workflow];
  const triggerMessage = WORKFLOW_TRIGGER_MESSAGE[workflow];
  const intent: LifeAgentIntent = routeLifeAgentIntent({ userMessage: triggerMessage, mode });

  const sources = await fetchLifeAgentContextSources({
    supabase,
    userId,
    permissions,
    intent,
    mode,
    domainOverride,
  });

  const packet = assembleLifeAgentContextPacket({
    userId,
    mode,
    userMessage: triggerMessage,
    permissions,
    sources,
    referenceDate: options.referenceDate,
  });

  const warnings: string[] = [];
  if (domainOverride.size === 0) {
    warnings.push(
      "No Life OS domains are currently readable. Adjust permissions to see your brief.",
    );
  }
  for (const domain of WORKFLOW_DOMAINS[workflow]) {
    const level = permissions.byDomain[domain];
    if (level === "ask_every_time" && !permissions.sessionGrants.has(domain)) {
      warnings.push(`${domain} requires permission for full context.`);
    }
  }

  const memoryUsed = buildWorkflowMemoryUsed(sources, domainOverride);

  return { permissions, sources, packet, memoryUsed, warnings };
}

function buildWorkflowMemoryUsed(
  sources: LifeAgentContextSources,
  domains: Set<LifeAgentPermissionDomain>,
): LifeAgentMemoryUsedItem[] {
  const items: LifeAgentMemoryUsedItem[] = [];
  const push = (
    sourceType: string,
    sourceId: string,
    title: string,
    domain?: LifeAgentPermissionDomain,
  ) => {
    items.push({
      sourceType,
      sourceId,
      title,
      reason: "Included in workflow scan",
      domain,
    });
  };

  if (domains.has("about_me") && sources.aboutMe) {
    push("about_me", sources.aboutMe.id, "About Me", "about_me");
  }
  if (domains.has("tasks")) {
    for (const t of sources.tasks.slice(0, 8)) {
      push("task", t.id, t.title, "tasks");
    }
  }
  if (domains.has("projects")) {
    for (const p of sources.projects.slice(0, 6)) {
      push("project", p.id, p.name, "projects");
    }
  }
  if (domains.has("relationships")) {
    for (const r of sources.relationships.slice(0, 6)) {
      push("relationship", r.id, r.person_name, "relationships");
    }
  }
  if (domains.has("documents")) {
    for (const d of sources.documents.slice(0, 4)) {
      push("document", d.id, d.name, "documents");
    }
  }
  if (domains.has("journal")) {
    for (const j of sources.journalEntries.slice(0, 3)) {
      push("journal_entry", j.id, j.topic, "journal");
    }
  }

  return items.slice(0, 24);
}

export function parseWorkflowSessionGrants(
  body: unknown,
): LifeAgentPermissionDomain[] {
  if (!body || typeof body !== "object") return [];
  const tp = (body as Record<string, unknown>).temporaryPermissions;
  if (!tp || typeof tp !== "object") return [];
  return LIFE_AGENT_PERMISSION_DOMAINS.filter((d) => (tp as Record<string, boolean>)[d] === true);
}
