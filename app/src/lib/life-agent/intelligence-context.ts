import type { SupabaseClient } from "@supabase/supabase-js";
import { assembleLifeAgentContextPacket } from "@/lib/life-agent/context-summarizers";
import type { LifeAgentContextPacket, LifeAgentMemoryUsedItem } from "@/lib/life-agent/context-types";
import { fetchLifeAgentContextSources } from "@/lib/life-agent/context-fetchers";
import { routeLifeAgentIntent } from "@/lib/life-agent/intent-router";
import { canReadDomain, resolveLifeAgentPermissions } from "@/lib/life-agent/permission-policy";
import type { LifeAgentContextSources } from "@/lib/life-agent/context-types";
import type { LifeAgentIntent } from "@/lib/life-agent/context-types";
import type { IntelligenceFeatureKey } from "@/lib/life-agent/intelligence-types";
import type { LifeAgentMode } from "@/lib/life-agent/types";
import type {
  LifeAgentPermission,
  LifeAgentPermissionDomain,
} from "@/types/life-agent";
import { parseWorkflowSessionGrants } from "@/lib/life-agent/workflow-context";

export { parseWorkflowSessionGrants as parseIntelligenceSessionGrants };

const INTELLIGENCE_DOMAINS: Record<IntelligenceFeatureKey, LifeAgentPermissionDomain[]> = {
  "life-coherence": [
    "about_me",
    "tasks",
    "projects",
    "goals",
    "relationships",
    "notes",
    "journal",
    "habits",
  ],
  "life-chapters": [
    "about_me",
    "projects",
    "goals",
    "relationships",
    "tasks",
    "notes",
    "journal",
    "bucket_list",
  ],
  "inner-conflicts": ["about_me", "tasks", "goals", "journal", "notes", "habits"],
  "memory-timeline": [
    "journal",
    "goals",
    "projects",
    "notes",
    "about_me",
  ],
  "future-self": ["about_me", "goals", "journal", "bucket_list", "projects"],
};

const TRIGGER_MESSAGE: Record<IntelligenceFeatureKey, string> = {
  "life-coherence": "Are my tasks, projects, relationships, goals, and values aligned?",
  "life-chapters": "Map my current life chapters",
  "inner-conflicts": "What possible tensions exist in my life patterns?",
  "memory-timeline": "Show my memory timeline from stored records",
  "future-self": "Future self reflection",
};

const INTELLIGENCE_MODE: Record<IntelligenceFeatureKey, LifeAgentMode> = {
  "life-coherence": "mirror",
  "life-chapters": "orchestrator",
  "inner-conflicts": "mirror",
  "memory-timeline": "mirror",
  "future-self": "companion",
};

export type IntelligenceContextBundle = {
  permissions: ReturnType<typeof resolveLifeAgentPermissions>;
  sources: LifeAgentContextSources;
  packet: LifeAgentContextPacket;
  memoryUsed: LifeAgentMemoryUsedItem[];
  warnings: string[];
};

export function domainsForIntelligence(
  permissions: ReturnType<typeof resolveLifeAgentPermissions>,
  feature: IntelligenceFeatureKey,
): Set<LifeAgentPermissionDomain> {
  const set = new Set<LifeAgentPermissionDomain>();
  for (const d of INTELLIGENCE_DOMAINS[feature]) {
    if (canReadDomain(permissions, d)) set.add(d);
  }
  return set;
}

export async function loadIntelligenceContext(
  supabase: SupabaseClient,
  userId: string,
  feature: IntelligenceFeatureKey,
  options: {
    sessionGrants?: LifeAgentPermissionDomain[];
    referenceDate?: Date;
  } = {},
): Promise<IntelligenceContextBundle> {
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

  const domainOverride = domainsForIntelligence(permissions, feature);
  const mode = INTELLIGENCE_MODE[feature];
  const triggerMessage = TRIGGER_MESSAGE[feature];
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
      "No Life OS domains are readable for this insight. Adjust permissions to see patterns.",
    );
  }

  const memoryUsed = buildIntelligenceMemoryUsed(sources, domainOverride, packet);

  return { permissions, sources, packet, memoryUsed, warnings };
}

function buildIntelligenceMemoryUsed(
  sources: LifeAgentContextSources,
  domains: Set<LifeAgentPermissionDomain>,
  packet: LifeAgentContextPacket,
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
      reason: "Used for personal intelligence scan",
      domain,
    });
  };

  if (domains.has("about_me") && sources.aboutMe) {
    push("about_me", sources.aboutMe.id, "About Me", "about_me");
  }
  if (domains.has("goals")) {
    for (const g of sources.goals.slice(0, 8)) {
      push("goal", g.id, g.name, "goals");
    }
  }
  if (domains.has("projects")) {
    for (const p of sources.projects.slice(0, 8)) {
      push("project", p.id, p.name, "projects");
    }
  }
  if (domains.has("tasks")) {
    for (const t of sources.tasks.slice(0, 10)) {
      push("task", t.id, t.title, "tasks");
    }
  }
  if (domains.has("relationships")) {
    for (const r of sources.relationships.slice(0, 6)) {
      push("relationship", r.id, r.person_name, "relationships");
    }
  }
  if (domains.has("journal")) {
    for (const j of sources.journalEntries.slice(0, 5)) {
      push("journal_entry", j.id, j.topic, "journal");
    }
  }
  if (domains.has("notes")) {
    for (const n of sources.notes.slice(0, 5)) {
      push("note", n.id, n.title, "notes");
    }
  }

  for (const m of packet.memoryUsed.slice(0, 6)) {
    if (!items.some((i) => i.sourceId === m.sourceId)) {
      items.push(m);
    }
  }

  return items.slice(0, 28);
}
