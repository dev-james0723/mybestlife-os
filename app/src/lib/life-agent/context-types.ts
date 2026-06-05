import type { LifeAgentMode } from "@/lib/life-agent/types";
import type {
  LifeAgentAccessLevel,
  LifeAgentMemory,
  LifeAgentPermissionDomain,
} from "@/types/life-agent";
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
import type { JournalEntry } from "@/types/database";

/** Caps applied when assembling context packets (hard limits). */
export const LIFE_AGENT_CONTEXT_CAPS = {
  maxActiveProjects: 8,
  maxUrgentTasks: 12,
  maxUpcomingDeadlines: 10,
  maxOpenLoops: 20,
  maxRelationships: 8,
  maxRoleModels: 6,
  maxNotes: 10,
  maxRecentJournalEntries: 5,
  maxBucketItems: 8,
  maxKnowledgeItems: 8,
  maxAssets: 8,
  maxDocuments: 8,
  maxGoals: 8,
  maxHabits: 8,
  maxBrainNodes: 20,
  maxBrainEdges: 30,
  maxMemories: 20,
  maxFinanceTransactions: 10,
} as const;

export type LifeAgentIntent =
  | "general_chat"
  | "reflection"
  | "planning"
  | "task_creation"
  | "open_loop_review"
  | "relationship_help"
  | "asset_document_help"
  | "project_strategy"
  | "career_decision"
  | "creative_work"
  | "health_wellbeing"
  | "finance"
  | "life_review"
  | "upload_processing"
  | "message_drafting"
  | "unknown";

export type LifeAgentOmitReason =
  | "permission_off"
  | "ask_every_time"
  | "not_relevant"
  | "too_large"
  | "not_available";

export type LifeAgentResolvedPermissions = {
  userId: string;
  byDomain: Record<LifeAgentPermissionDomain, LifeAgentAccessLevel>;
  /** Domains temporarily granted for this session (`ask_every_time` → readable). */
  sessionGrants: Set<LifeAgentPermissionDomain>;
};

export type LifeAgentMemoryUsedItem = {
  sourceType: string;
  sourceId: string;
  title: string;
  reason: string;
  domain?: LifeAgentPermissionDomain;
};

export type ContextProject = {
  id: string;
  name: string;
  status: string;
  priority: string;
  endDate: string | null;
  summary?: string;
};

export type ContextTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectName?: string | null;
  isOverdue?: boolean;
};

export type ContextDeadline = {
  id: string;
  kind: "task" | "goal" | "document" | "relationship" | "project";
  title: string;
  date: string;
};

export type ContextOpenLoop = {
  id: string;
  kind:
    | "incomplete_task"
    | "overdue_task"
    | "project_without_next_action"
    | "relationship_follow_up"
    | "open_promise"
    | "expiring_document"
    | "asset_missing_docs"
    | "goal_without_task"
    | "note_action_hint";
  title: string;
  detail?: string;
  sourceType: string;
  sourceId: string;
  priority?: "low" | "medium" | "high";
};

export type ContextNote = {
  id: string;
  title: string;
  excerpt: string;
};

export type ContextRelationship = {
  id: string;
  name: string;
  category: string;
  nextAction: string | null;
  nextActionDate: string | null;
};

export type ContextRoleModel = {
  id: string;
  name: string;
  category: string | null;
  admirationBlurb: string | null;
};

export type ContextPromise = {
  id: string;
  relationshipId: string;
  personName: string;
  promise: string;
};

export type ContextAsset = {
  id: string;
  name: string;
  category: string | null;
  value: number | null;
};

export type ContextDocument = {
  id: string;
  name: string;
  documentType: string | null;
  expirationDate: string | null;
};

export type ContextFinanceSummary = {
  accountCount: number;
  recentSpendTotal: number;
  currencyHint: string;
  budgetAlerts: string[];
};

export type ContextBrainNode = {
  id: string;
  nodeType: string;
  title: string;
  strength?: number;
};

export type ContextBrainEdge = {
  id: string;
  sourceLabel: string;
  targetLabel: string;
  relationshipType: string;
  strength: number;
};

export type LifeAgentContextPacket = {
  userId: string;
  mode: LifeAgentMode;
  intent: LifeAgentIntent;
  permissions: LifeAgentResolvedPermissions;

  identityContext?: {
    aboutMe?: string;
    coreValues?: string[];
    longTermGoals?: string[];
    knownPreferences?: string[];
  };

  activeLifeContext?: {
    activeProjects: ContextProject[];
    urgentTasks: ContextTask[];
    upcomingDeadlines: ContextDeadline[];
    openLoops: ContextOpenLoop[];
    recentNotes: ContextNote[];
  };

  peopleContext?: {
    relevantRelationships: ContextRelationship[];
    roleModels: ContextRoleModel[];
    openPromises: ContextPromise[];
  };

  resourceContext?: {
    relevantAssets: ContextAsset[];
    relevantDocuments: ContextDocument[];
    financeSummary?: ContextFinanceSummary;
  };

  reflectionContext?: {
    recentJournalThemes: string[];
    gratitudeThemes: string[];
    emotionalPatterns: string[];
    bucketListThemes: string[];
  };

  brainContext?: {
    relevantNodes: ContextBrainNode[];
    relevantEdges: ContextBrainEdge[];
    patternSummary?: string;
  };

  memoryUsed: LifeAgentMemoryUsedItem[];

  omittedDomains: {
    domain: LifeAgentPermissionDomain;
    reason: LifeAgentOmitReason;
  }[];

  safetyNotes: string[];
};

/** Raw rows loaded once per build (server or test fixtures). */
export type LifeAgentContextSources = {
  aboutMe: AboutMe | null;
  projects: Project[];
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  relationships: Relationship[];
  roleModels: RoleModel[];
  assets: Asset[];
  documents: Document[];
  notes: Note[];
  journalEntries: JournalEntry[];
  bucketItems: BucketItem[];
  knowledgeItems: LifeAgentKnowledgeRow[];
  financeAccounts: { id: string; name: string; currency: string }[];
  financeTransactions: {
    id: string;
    amount: number;
    type: string;
    description: string | null;
    transaction_date: string;
  }[];
  financeBudgets: { id: string; limit_amount: number; period_end: string }[];
  healthDailyLogs: HealthDailyLog[];
  brainEdges: LifeAgentBrainEdgeRow[];
  gratefulEntries: { id: string; content: string; created_at: string }[];
  memories: LifeAgentMemory[];
};

export type LifeAgentKnowledgeRow = {
  id: string;
  title: string;
  ai_summary: string | null;
  ai_tldr: string | null;
  status: string;
  updated_at: string;
};

export type LifeAgentBrainEdgeRow = {
  id: string;
  source_node_id: string;
  source_node_type: string;
  target_node_id: string;
  target_node_type: string;
  relationship_type: string;
  strength: number;
  reason: string;
  status: string;
};

export type BuildLifeAgentContextInput = {
  userId: string;
  mode: LifeAgentMode;
  userMessage: string;
  permissions: LifeAgentResolvedPermissions;
  sources: LifeAgentContextSources;
  referenceDate?: Date;
};
