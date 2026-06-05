import { isOverdue } from "@/lib/utils/date";
import type {
  BuildLifeAgentContextInput,
  ContextAsset,
  ContextBrainEdge,
  ContextBrainNode,
  ContextDeadline,
  ContextDocument,
  ContextFinanceSummary,
  ContextNote,
  ContextOpenLoop,
  ContextProject,
  ContextPromise,
  ContextRelationship,
  ContextRoleModel,
  ContextTask,
  LifeAgentContextPacket,
  LifeAgentMemoryUsedItem,
  LifeAgentOmitReason,
} from "@/lib/life-agent/context-types";
import { LIFE_AGENT_CONTEXT_CAPS } from "@/lib/life-agent/context-types";
import { extractOpenLoops, brainNodeTitleFromId } from "@/lib/life-agent/open-loops";
import {
  canReadDomain,
  omitReasonForDomain,
} from "@/lib/life-agent/permission-policy";
import { isDomainRelevantForContext, routeLifeAgentIntent } from "@/lib/life-agent/intent-router";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";

function clampText(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function memoryItem(
  sourceType: string,
  sourceId: string,
  title: string,
  reason: string,
  domain?: LifeAgentPermissionDomain,
): LifeAgentMemoryUsedItem {
  return { sourceType, sourceId, title, reason, domain };
}

type DomainGate = {
  readable: boolean;
  relevant: boolean;
  omitReason?: LifeAgentOmitReason;
};

function gateDomain(
  input: BuildLifeAgentContextInput,
  domain: LifeAgentPermissionDomain,
  intent: LifeAgentContextPacket["intent"],
): DomainGate {
  const permReason = omitReasonForDomain(input.permissions, domain);
  if (permReason) {
    return { readable: false, relevant: false, omitReason: permReason };
  }
  if (!canReadDomain(input.permissions, domain)) {
    return { readable: false, relevant: false, omitReason: "permission_off" };
  }
  const relevant = isDomainRelevantForContext(domain, intent, input.mode);
  if (!relevant) {
    return { readable: true, relevant: false, omitReason: "not_relevant" };
  }
  return { readable: true, relevant: true };
}

function activeProjects(
  sources: BuildLifeAgentContextInput["sources"],
): ContextProject[] {
  return sources.projects
    .filter((p) => p.status !== "completed" && p.status !== "cancelled")
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, LIFE_AGENT_CONTEXT_CAPS.maxActiveProjects)
    .map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      priority: p.priority,
      endDate: p.end_date ?? null,
      summary: p.description ? clampText(p.description, 120) : undefined,
    }));
}

function urgentTasks(sources: BuildLifeAgentContextInput["sources"]): ContextTask[] {
  const open = sources.tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
  const scored = open.map((t) => {
    let score = 0;
    if (t.priority === "urgent") score += 40;
    if (t.priority === "high") score += 25;
    if (t.due_date && isOverdue(t.due_date)) score += 50;
    else if (t.due_date) score += 10;
    return { t, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, LIFE_AGENT_CONTEXT_CAPS.maxUrgentTasks).map(({ t }) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.due_date,
    projectName: t.project?.name ?? null,
    isOverdue: t.due_date ? isOverdue(t.due_date) : false,
  }));
}

function upcomingDeadlines(
  sources: BuildLifeAgentContextInput["sources"],
  ref: Date,
): ContextDeadline[] {
  const items: ContextDeadline[] = [];
  const horizon = ref.getTime() + 21 * 86400000;

  for (const task of sources.tasks) {
    if (!task.due_date || task.status === "done") continue;
    const t = new Date(task.due_date).getTime();
    if (t >= ref.getTime() && t <= horizon) {
      items.push({ id: task.id, kind: "task", title: task.title, date: task.due_date });
    }
  }
  for (const goal of sources.goals) {
    if (!goal.target_date || goal.status !== "active") continue;
    const t = new Date(goal.target_date).getTime();
    if (t >= ref.getTime() && t <= horizon) {
      items.push({ id: goal.id, kind: "goal", title: goal.name, date: goal.target_date });
    }
  }
  for (const doc of sources.documents) {
    if (!doc.expiration_date) continue;
    const t = new Date(doc.expiration_date).getTime();
    if (t >= ref.getTime() && t <= horizon) {
      items.push({ id: doc.id, kind: "document", title: doc.name, date: doc.expiration_date });
    }
  }

  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return items.slice(0, LIFE_AGENT_CONTEXT_CAPS.maxUpcomingDeadlines);
}

function summarizeIdentity(
  sources: BuildLifeAgentContextInput["sources"],
  memory: LifeAgentMemoryUsedItem[],
): LifeAgentContextPacket["identityContext"] {
  const about = sources.aboutMe;
  if (!about) return undefined;

  memory.push(
    memoryItem("about_me", about.id, "About Me", "Core identity profile", "about_me"),
  );

  const coreValues = about.core_values
    ? about.core_values
        .split(/[,;\n]/)
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 8)
    : undefined;

  const prefs = sources.memories
    .filter((m) => m.user_confirmed && (m.memory_type === "preference" || m.memory_type === "identity"))
    .slice(0, LIFE_AGENT_CONTEXT_CAPS.maxMemories)
    .map((m) => clampText(m.content, 100));

  for (const m of sources.memories.filter((m) => m.user_confirmed).slice(0, 5)) {
    memory.push(
      memoryItem("memory", m.id, clampText(m.content, 60), "User-confirmed companion memory"),
    );
  }

  const longTermGoals = sources.goals
    .filter((g) => g.status === "active")
    .slice(0, 5)
    .map((g) => g.name);

  return {
    aboutMe: clampText(
      [about.mission, about.instruction_manual, about.personality_insights]
        .filter(Boolean)
        .join(" "),
      600,
    ),
    coreValues,
    longTermGoals: longTermGoals.length ? longTermGoals : undefined,
    knownPreferences: prefs.length ? prefs : undefined,
  };
}

function summarizePeople(
  sources: BuildLifeAgentContextInput["sources"],
  memory: LifeAgentMemoryUsedItem[],
  includeRelationships: boolean,
  includeRoleModels: boolean,
): LifeAgentContextPacket["peopleContext"] {
  const relationships: ContextRelationship[] = includeRelationships
    ? sources.relationships
        .slice()
        .sort((a, b) => {
          const ad = a.next_action_date ? new Date(a.next_action_date).getTime() : Infinity;
          const bd = b.next_action_date ? new Date(b.next_action_date).getTime() : Infinity;
          return ad - bd;
        })
        .slice(0, LIFE_AGENT_CONTEXT_CAPS.maxRelationships)
        .map((r) => {
          memory.push(
            memoryItem(
              "relationship",
              r.id,
              r.person_name,
              "Relationship in people context",
              "relationships",
            ),
          );
          return {
            id: r.id,
            name: r.person_name,
            category: r.category,
            nextAction: r.next_action,
            nextActionDate: r.next_action_date,
          };
        })
    : [];

  const roleModels: ContextRoleModel[] = includeRoleModels
    ? sources.roleModels.slice(0, LIFE_AGENT_CONTEXT_CAPS.maxRoleModels).map((rm) => {
        memory.push(
          memoryItem("role_model", rm.id, rm.name, "Role model reference", "role_models"),
        );
        return {
          id: rm.id,
          name: rm.name,
          category: rm.category,
          admirationBlurb: rm.admiration_blurb,
        };
      })
    : [];

  const openPromises: ContextPromise[] = includeRelationships
    ? sources.relationships
        .filter((r) => r.commitments_made?.trim())
        .slice(0, 8)
        .map((r) => ({
          id: `promise-${r.id}`,
          relationshipId: r.id,
          personName: r.person_name,
          promise: clampText(r.commitments_made!, 160),
        }))
    : [];

  if (!relationships.length && !roleModels.length && !openPromises.length) {
    return undefined;
  }

  return { relevantRelationships: relationships, roleModels, openPromises };
}

function summarizeResources(
  sources: BuildLifeAgentContextInput["sources"],
  memory: LifeAgentMemoryUsedItem[],
  includeAssets: boolean,
  includeDocuments: boolean,
  includeFinance: boolean,
): LifeAgentContextPacket["resourceContext"] {
  const relevantAssets: ContextAsset[] = includeAssets
    ? sources.assets.slice(0, LIFE_AGENT_CONTEXT_CAPS.maxAssets).map((a) => {
        memory.push(memoryItem("asset", a.id, a.name, "Asset in resource context", "assets"));
        return {
          id: a.id,
          name: a.name,
          category: a.category_key ?? a.category,
          value: a.current_value ?? a.value,
        };
      })
    : [];

  const relevantDocuments: ContextDocument[] = includeDocuments
    ? sources.documents.slice(0, LIFE_AGENT_CONTEXT_CAPS.maxDocuments).map((d) => {
        memory.push(
          memoryItem("document", d.id, d.name, "Document in resource context", "documents"),
        );
        return {
          id: d.id,
          name: d.name,
          documentType: d.document_type,
          expirationDate: d.expiration_date,
        };
      })
    : [];

  let financeSummary: ContextFinanceSummary | undefined;
  if (
    includeFinance &&
    (sources.financeTransactions.length > 0 || sources.financeBudgets.length > 0)
  ) {
    const spend = sources.financeTransactions
      .filter((t) => t.type === "expense")
      .slice(0, LIFE_AGENT_CONTEXT_CAPS.maxFinanceTransactions)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    financeSummary = {
      accountCount: sources.financeAccounts.length,
      recentSpendTotal: Math.round(spend * 100) / 100,
      currencyHint: sources.financeAccounts[0]?.currency ?? "USD",
      budgetAlerts: sources.financeBudgets
        .filter((b) => new Date(b.period_end).getTime() > Date.now())
        .slice(0, 3)
        .map((b) => `Budget period ends ${b.period_end}`),
    };
    memory.push(
      memoryItem("finance", "summary", "Finance summary", "Aggregated finance snapshot", "finance"),
    );
  }

  if (!relevantAssets.length && !relevantDocuments.length && !financeSummary) {
    return undefined;
  }

  return { relevantAssets, relevantDocuments, financeSummary };
}

function summarizeReflection(
  sources: BuildLifeAgentContextInput["sources"],
  memory: LifeAgentMemoryUsedItem[],
): LifeAgentContextPacket["reflectionContext"] {
  const recentJournalThemes = sources.journalEntries
    .slice(0, LIFE_AGENT_CONTEXT_CAPS.maxRecentJournalEntries)
    .map((e) => `${e.topic} (${e.primaryEmotion})`);

  for (const e of sources.journalEntries.slice(0, 3)) {
    memory.push(
      memoryItem("journal_entry", e.id, e.topic, "Recent journal theme", "journal"),
    );
  }

  const gratitudeThemes = sources.gratefulEntries
    .slice(0, 5)
    .map((g) => clampText(g.content, 80));

  const emotionalPatterns = sources.healthDailyLogs
    .slice(0, 5)
    .filter((l) => l.mood_valence != null)
    .map((l) => `Mood ${l.mood_valence}/10 on ${l.log_date}`);

  const bucketListThemes = sources.bucketItems
    .filter((b) => b.status !== "completed")
    .slice(0, LIFE_AGENT_CONTEXT_CAPS.maxBucketItems)
    .map((b) => b.title);

  if (
    !recentJournalThemes.length &&
    !gratitudeThemes.length &&
    !emotionalPatterns.length &&
    !bucketListThemes.length
  ) {
    return undefined;
  }

  return {
    recentJournalThemes,
    gratitudeThemes,
    emotionalPatterns,
    bucketListThemes,
  };
}

function summarizeBrain(
  sources: BuildLifeAgentContextInput["sources"],
  memory: LifeAgentMemoryUsedItem[],
): LifeAgentContextPacket["brainContext"] {
  const edges = sources.brainEdges
    .filter((e) => e.status === "confirmed" || e.status === "suggested")
    .sort((a, b) => b.strength - a.strength)
    .slice(0, LIFE_AGENT_CONTEXT_CAPS.maxBrainEdges);

  if (!edges.length) return undefined;

  const nodeIds = new Set<string>();
  const relevantEdges: ContextBrainEdge[] = edges.map((e) => {
    nodeIds.add(e.source_node_id);
    nodeIds.add(e.target_node_id);
    memory.push(
      memoryItem(
        "brain_edge",
        e.id,
        `${brainNodeTitleFromId(e.source_node_id)} ↔ ${brainNodeTitleFromId(e.target_node_id)}`,
        clampText(e.reason || e.relationship_type, 80),
        "brain_graph",
      ),
    );
    return {
      id: e.id,
      sourceLabel: brainNodeTitleFromId(e.source_node_id),
      targetLabel: brainNodeTitleFromId(e.target_node_id),
      relationshipType: e.relationship_type,
      strength: e.strength,
    };
  });

  const relevantNodes: ContextBrainNode[] = [...nodeIds]
    .slice(0, LIFE_AGENT_CONTEXT_CAPS.maxBrainNodes)
    .map((id) => ({
      id,
      nodeType: id.split("::")[0] ?? "node",
      title: brainNodeTitleFromId(id),
    }));

  return {
    relevantNodes,
    relevantEdges,
    patternSummary: `${relevantEdges.length} high-signal connections surfaced from your Brain graph.`,
  };
}

/**
 * Assembles the full permission-aware context packet from pre-fetched sources.
 */
export function assembleLifeAgentContextPacket(
  input: BuildLifeAgentContextInput,
): LifeAgentContextPacket {
  const referenceDate = input.referenceDate ?? new Date();
  const intent = routeLifeAgentIntent({
    userMessage: input.userMessage,
    mode: input.mode,
  });
  const memoryUsed: LifeAgentMemoryUsedItem[] = [];
  const omittedDomains: LifeAgentContextPacket["omittedDomains"] = [];
  const safetyNotes: string[] = [
    "Context includes only domains you permitted. Facts come from Life OS records, not live web data.",
    "Companion responses are not professional medical, legal, or financial advice.",
  ];

  const recordOmit = (domain: LifeAgentPermissionDomain, gate: DomainGate) => {
    if (gate.omitReason) {
      omittedDomains.push({ domain, reason: gate.omitReason });
    }
  };

  const gates = Object.fromEntries(
    (
      [
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
      ] as LifeAgentPermissionDomain[]
    ).map((d) => [d, gateDomain(input, d, intent)]),
  ) as Record<LifeAgentPermissionDomain, DomainGate>;

  for (const [domain, gate] of Object.entries(gates) as [
    LifeAgentPermissionDomain,
    DomainGate,
  ][]) {
    if (!gate.relevant || !gate.readable) recordOmit(domain, gate);
  }

  let identityContext: LifeAgentContextPacket["identityContext"];
  if (gates.about_me.readable && gates.about_me.relevant) {
    identityContext = summarizeIdentity(input.sources, memoryUsed);
  }

  const activeLifeParts: Partial<NonNullable<LifeAgentContextPacket["activeLifeContext"]>> =
    {};

  if (gates.projects.readable && gates.projects.relevant) {
    activeLifeParts.activeProjects = activeProjects(input.sources);
    for (const p of activeLifeParts.activeProjects) {
      memoryUsed.push(
        memoryItem("project", p.id, p.name, "Active project for current intent", "projects"),
      );
    }
  }

  if (gates.tasks.readable && gates.tasks.relevant) {
    activeLifeParts.urgentTasks = urgentTasks(input.sources);
    for (const t of activeLifeParts.urgentTasks) {
      memoryUsed.push(
        memoryItem("task", t.id, t.title, "Urgent or high-priority open task", "tasks"),
      );
    }
  }

  if (
    (gates.tasks.readable && gates.tasks.relevant) ||
    (gates.goals.readable && gates.goals.relevant) ||
    (gates.documents.readable && gates.documents.relevant)
  ) {
    activeLifeParts.upcomingDeadlines = upcomingDeadlines(input.sources, referenceDate);
  }

  if (gates.notes.readable && gates.notes.relevant) {
    activeLifeParts.recentNotes = input.sources.notes
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, LIFE_AGENT_CONTEXT_CAPS.maxNotes)
      .map((n) => {
        memoryUsed.push(memoryItem("note", n.id, n.title, "Recent note", "notes"));
        return {
          id: n.id,
          title: n.title,
          excerpt: clampText(n.content ?? "", 140),
        } satisfies ContextNote;
      });
  }

  const openLoopDomainsReadable =
    (gates.tasks.readable && gates.tasks.relevant) ||
    (gates.projects.readable && gates.projects.relevant) ||
    (gates.relationships.readable && gates.relationships.relevant) ||
    (gates.documents.readable && gates.documents.relevant) ||
    (gates.goals.readable && gates.goals.relevant) ||
    (gates.notes.readable && gates.notes.relevant) ||
    (gates.assets.readable && gates.assets.relevant);

  let openLoops: ContextOpenLoop[] = [];
  if (openLoopDomainsReadable) {
    openLoops = extractOpenLoops(input.sources, referenceDate);
    for (const loop of openLoops.slice(0, 5)) {
      memoryUsed.push(
        memoryItem(loop.sourceType, loop.sourceId, loop.title, `Open loop: ${loop.kind}`),
      );
    }
  }
  activeLifeParts.openLoops = openLoops;

  const activeLifeContext =
    activeLifeParts.activeProjects?.length ||
    activeLifeParts.urgentTasks?.length ||
    activeLifeParts.recentNotes?.length ||
    openLoops.length ||
    activeLifeParts.upcomingDeadlines?.length
      ? (activeLifeParts as NonNullable<LifeAgentContextPacket["activeLifeContext"]>)
      : undefined;

  let peopleContext: LifeAgentContextPacket["peopleContext"];
  if (
    (gates.relationships.readable && gates.relationships.relevant) ||
    (gates.role_models.readable && gates.role_models.relevant)
  ) {
    peopleContext = summarizePeople(
      input.sources,
      memoryUsed,
      gates.relationships.readable && gates.relationships.relevant,
      gates.role_models.readable && gates.role_models.relevant,
    );
  }

  let resourceContext: LifeAgentContextPacket["resourceContext"];
  if (
    (gates.assets.readable && gates.assets.relevant) ||
    (gates.documents.readable && gates.documents.relevant) ||
    (gates.finance.readable && gates.finance.relevant)
  ) {
    resourceContext = summarizeResources(
      input.sources,
      memoryUsed,
      gates.assets.readable && gates.assets.relevant,
      gates.documents.readable && gates.documents.relevant,
      gates.finance.readable && gates.finance.relevant,
    );
  }

  let reflectionContext: LifeAgentContextPacket["reflectionContext"];
  if (
    (gates.journal.readable && gates.journal.relevant) ||
    (gates.bucket_list.readable && gates.bucket_list.relevant) ||
    (gates.health.readable && gates.health.relevant)
  ) {
    reflectionContext = summarizeReflection(input.sources, memoryUsed);
  }

  let brainContext: LifeAgentContextPacket["brainContext"];
  if (gates.brain_graph.readable && gates.brain_graph.relevant) {
    brainContext = summarizeBrain(input.sources, memoryUsed);
    if (!brainContext && input.sources.brainEdges.length === 0) {
      omittedDomains.push({ domain: "brain_graph", reason: "not_available" });
    }
  }

  if (gates.goals.readable && gates.goals.relevant) {
    for (const g of input.sources.goals
      .filter((g) => g.status === "active")
      .slice(0, LIFE_AGENT_CONTEXT_CAPS.maxGoals)) {
      memoryUsed.push(memoryItem("goal", g.id, g.name, "Active goal", "goals"));
    }
  }

  if (gates.habits.readable && gates.habits.relevant) {
    for (const h of input.sources.habits
      .filter((h) => h.is_active)
      .slice(0, LIFE_AGENT_CONTEXT_CAPS.maxHabits)) {
      memoryUsed.push(memoryItem("habit", h.id, h.name, "Active habit", "habits"));
    }
  }

  if (gates.knowledge.readable && gates.knowledge.relevant) {
    for (const k of input.sources.knowledgeItems.slice(
      0,
      LIFE_AGENT_CONTEXT_CAPS.maxKnowledgeItems,
    )) {
      memoryUsed.push(
        memoryItem("knowledge_item", k.id, k.title, "Knowledge base item", "knowledge"),
      );
    }
  }

  return {
    userId: input.userId,
    mode: input.mode,
    intent,
    permissions: input.permissions,
    identityContext,
    activeLifeContext,
    peopleContext,
    resourceContext,
    reflectionContext,
    brainContext,
    memoryUsed,
    omittedDomains,
    safetyNotes,
  };
}
