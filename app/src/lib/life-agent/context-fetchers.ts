import type { SupabaseClient } from "@supabase/supabase-js";
import type { LifeAgentIntent } from "@/lib/life-agent/context-types";
import type {
  LifeAgentBrainEdgeRow,
  LifeAgentContextSources,
  LifeAgentKnowledgeRow,
} from "@/lib/life-agent/context-types";
import { canReadDomain } from "@/lib/life-agent/permission-policy";
import {
  domainsForIntent,
  domainsForMode,
  isDomainRelevantForContext,
} from "@/lib/life-agent/intent-router";
import type { LifeAgentMode } from "@/lib/life-agent/types";
import type { LifeAgentResolvedPermissions } from "@/lib/life-agent/context-types";
import type {
  AboutMe,
  Document,
  Goal,
  HealthDailyLog,
  Note,
  Project,
  Relationship,
  RoleModel,
  Task,
} from "@/types/database";
import type { Asset } from "@/types/assets";
import type { BucketItem } from "@/types/bucket-list";
import type { Habit } from "@/lib/habits/types";
import type { LifeAgentMemory } from "@/types/life-agent";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";
import { LIFE_AGENT_PERMISSION_DOMAINS } from "@/types/life-agent";
import type { JournalEntry } from "@/types/database";

const TASK_SELECT = "*, project:projects(id, name, status, priority)";

function isMissingTableError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "42P01" || e.code === "PGRST205") return true;
  const msg = String(e.message ?? "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("could not find the table");
}

type JournalRow = {
  id: string;
  user_id: string;
  entry_date: string;
  topic: string;
  primary_emotion: string;
  created_at: string;
  updated_at: string;
};

function rowToJournalEntry(row: JournalRow): JournalEntry {
  return {
    id: row.id,
    userId: row.user_id,
    entryDate: row.entry_date,
    topic: row.topic,
    quadrant: "GREEN",
    primaryEmotion: row.primary_emotion,
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
    source: "context",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function emptyLifeAgentContextSources(): LifeAgentContextSources {
  return {
    aboutMe: null,
    projects: [],
    tasks: [],
    goals: [],
    habits: [],
    relationships: [],
    roleModels: [],
    assets: [],
    documents: [],
    notes: [],
    journalEntries: [],
    bucketItems: [],
    knowledgeItems: [],
    financeAccounts: [],
    financeTransactions: [],
    financeBudgets: [],
    healthDailyLogs: [],
    brainEdges: [],
    gratefulEntries: [],
    memories: [],
  };
}

/** Domains we will query from Supabase for this build. */
export function domainsToFetch(
  permissions: LifeAgentResolvedPermissions,
  intent: LifeAgentIntent,
  mode: LifeAgentMode,
): Set<LifeAgentPermissionDomain> {
  const set = new Set<LifeAgentPermissionDomain>();
  for (const domain of LIFE_AGENT_PERMISSION_DOMAINS) {
    if (!canReadDomain(permissions, domain)) continue;
    if (isDomainRelevantForContext(domain, intent, mode)) {
      set.add(domain);
    }
  }
  if (intent === "open_loop_review") {
    for (const d of domainsForIntent("open_loop_review") ?? []) {
      if (canReadDomain(permissions, d)) set.add(d);
    }
  }
  if (set.size === 0) {
    for (const d of domainsForMode(mode)) {
      if (canReadDomain(permissions, d)) set.add(d);
    }
  }
  return set;
}

export type FetchLifeAgentContextSourcesInput = {
  supabase: SupabaseClient;
  userId: string;
  permissions: LifeAgentResolvedPermissions;
  intent: LifeAgentIntent;
  mode: LifeAgentMode;
  /** When set, fetches exactly these domains (if permitted) instead of intent routing. */
  domainOverride?: Set<LifeAgentPermissionDomain>;
};

/**
 * Loads only rows for permission-approved, intent-relevant domains (bounded queries).
 */
export async function fetchLifeAgentContextSources(
  input: FetchLifeAgentContextSourcesInput,
): Promise<LifeAgentContextSources> {
  const { supabase, userId } = input;
  const domains =
    input.domainOverride ?? domainsToFetch(input.permissions, input.intent, input.mode);
  const sources = emptyLifeAgentContextSources();

  const wants = (d: LifeAgentPermissionDomain) => domains.has(d);

  if (wants("about_me")) {
    const { data } = await supabase
      .from("about_me")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    sources.aboutMe = (data as AboutMe | null) ?? null;
  }

  if (wants("projects")) {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false })
      .limit(24);
    sources.projects = (data ?? []) as Project[];
  }

  if (wants("tasks")) {
    const { data } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false })
      .limit(48);
    sources.tasks = (data ?? []) as Task[];
  }

  if (wants("goals")) {
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(16);
    sources.goals = (data ?? []) as Goal[];
  }

  if (wants("habits")) {
    const { data } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(16);
    sources.habits = (data ?? []) as Habit[];
  }

  if (wants("relationships")) {
    const { data } = await supabase
      .from("relationships")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20);
    sources.relationships = (data ?? []) as Relationship[];
  }

  if (wants("role_models")) {
    const { data } = await supabase
      .from("role_models")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(12);
    sources.roleModels = (data ?? []) as RoleModel[];
  }

  if (wants("assets")) {
    const { data } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(16);
    sources.assets = (data ?? []) as Asset[];
  }

  if (wants("documents")) {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(16);
    sources.documents = (data ?? []) as Document[];
  }

  if (wants("notes")) {
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20);
    sources.notes = (data ?? []) as Note[];
  }

  if (wants("journal")) {
    const { data } = await supabase
      .from("journal_entries")
      .select("id, user_id, entry_date, topic, primary_emotion, created_at, updated_at")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false })
      .limit(8);
    sources.journalEntries = ((data ?? []) as JournalRow[]).map(rowToJournalEntry);
  }

  if (wants("bucket_list")) {
    const { data } = await supabase
      .from("bucket_items")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(12);
    sources.bucketItems = (data ?? []) as BucketItem[];
  }

  if (wants("knowledge")) {
    const { data } = await supabase
      .from("knowledge_items")
      .select("id, title, ai_summary, ai_tldr, status, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(12);
    sources.knowledgeItems = (data ?? []) as LifeAgentKnowledgeRow[];
  }

  if (wants("finance")) {
    const [accounts, transactions, budgets] = await Promise.all([
      supabase
        .from("finance_accounts")
        .select("id, name, currency")
        .eq("user_id", userId)
        .limit(8),
      supabase
        .from("finance_transactions")
        .select("id, amount, type, description, transaction_date")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false })
        .limit(12),
      supabase
        .from("finance_budgets")
        .select("id, limit_amount, period_end")
        .eq("user_id", userId)
        .order("period_end", { ascending: true })
        .limit(6),
    ]);
    sources.financeAccounts = (accounts.data ?? []) as LifeAgentContextSources["financeAccounts"];
    sources.financeTransactions = (transactions.data ??
      []) as LifeAgentContextSources["financeTransactions"];
    sources.financeBudgets = (budgets.data ?? []) as LifeAgentContextSources["financeBudgets"];
  }

  if (wants("health")) {
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const from = since.toISOString().slice(0, 10);
    const { data } = await supabase
      .from("health_daily_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("log_date", from)
      .order("log_date", { ascending: false })
      .limit(14);
    sources.healthDailyLogs = (data ?? []) as HealthDailyLog[];
  }

  if (wants("brain_graph")) {
    const { data, error } = await supabase
      .from("brain_edges")
      .select(
        "id, source_node_id, source_node_type, target_node_id, target_node_type, relationship_type, strength, reason, status",
      )
      .eq("user_id", userId)
      .in("status", ["confirmed", "suggested"])
      .order("strength", { ascending: false })
      .limit(40);
    if (!error) {
      sources.brainEdges = (data ?? []) as LifeAgentBrainEdgeRow[];
    } else if (!isMissingTableError(error)) {
      throw error;
    }
  }

  if (wants("journal") || wants("about_me")) {
    const { data } = await supabase
      .from("grateful_things")
      .select("id, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8);
    sources.gratefulEntries = (data ?? []) as LifeAgentContextSources["gratefulEntries"];
  }

  if (canReadDomain(input.permissions, "about_me")) {
    const { data } = await supabase
      .from("life_agent_memories")
      .select("*")
      .eq("user_id", userId)
      .eq("user_confirmed", true)
      .order("updated_at", { ascending: false })
      .limit(20);
    sources.memories = (data ?? []) as LifeAgentMemory[];
  }

  return sources;
}
