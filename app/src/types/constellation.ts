/**
 * Constellation View — second-brain knowledge graph types.
 *
 * Every node and edge MUST be scoped by `userId`. Helpers in
 * `@/lib/knowledge/constellation/*` rely on this invariant to prevent
 * cross-user leakage in multi-user environments.
 */

export type ConstellationNodeType =
  // ── Knowledge Base (existing) ──────────────────────────────────────
  | "knowledge"
  | "category"
  | "tag"
  | "collection"
  | "source"
  | "project"
  | "person"
  | "organization"
  | "concept"
  // ── Life OS Brain (cross-module) ───────────────────────────────────
  | "goal"
  | "habit"
  | "journal_entry"
  | "quote"
  | "bucket_item"
  | "task"
  | "role_model"
  | "idea"
  | "health_goal"
  | "career_event"
  | "finance_goal"
  | "gratitude"
  | "asset"
  | "ai_prompt"
  | "software"
  | "daily_plan"
  | "about_me";

export type ConstellationEdgeType =
  // ── Knowledge Base (existing) ──────────────────────────────────────
  | "explicit_link"
  | "manual_link"
  | "ai_suggested_link"
  | "shared_tag"
  | "same_collection"
  | "same_source"
  | "semantic_similarity"
  | "category_reference"
  | "project_reference"
  | "person_reference"
  | "organization_reference"
  | "concept_reference"
  | "timeline_relation"
  // ── Life OS Brain (cross-module) ───────────────────────────────────
  | "goal_task"
  | "goal_habit"
  | "goal_project"
  | "goal_bucket"
  | "quote_goal"
  | "role_model_goal"
  | "role_model_project"
  | "idea_project"
  | "idea_knowledge"
  | "habit_goal"
  | "habit_project"
  | "habit_task"
  | "habit_knowledge"
  | "journal_project"
  | "journal_task"
  | "bucket_project"
  | "bucket_task"
  | "career_project"
  | "gratitude_person"
  | "domain_tag";

export type ConstellationEdgeStatus =
  | "confirmed"
  | "suggested"
  | "hidden"
  | "dismissed";

export type ConstellationNode = {
  id: string;
  userId: string;
  label: string;
  type: ConstellationNodeType;

  /** Pointer to the underlying domain entity for navigation / detail panel. */
  knowledgeId?: string;
  categoryId?: string;
  tagId?: string;
  collectionId?: string;
  sourceId?: string;
  projectId?: string;
  // ── Life OS Brain pointers (cross-module) ────────────────────────
  goalId?: string;
  habitId?: string;
  journalEntryId?: string;
  quoteId?: string;
  bucketItemId?: string;
  taskId?: string;
  roleModelId?: string;
  ideaId?: string;
  healthGoalId?: string;
  careerEventId?: string;
  financeGoalId?: string;
  gratitudeId?: string;
  assetId?: string;
  aiPromptId?: string;
  softwareId?: string;
  dailyPlanId?: string;
  aboutMeId?: string;
  /** Used for personId on the relationships table (distinct from KB person nodes). */
  relationshipId?: string;

  /** Surface-level description (knowledge: TL;DR; tag: parent category, etc.). */
  category?: string;
  description?: string;

  tags?: string[];
  tagIds?: string[];
  collectionName?: string;
  sourceType?: string;

  /** Importance & connectivity signals — used for sizing / visibility. */
  importance?: number;
  connectionCount?: number;
  backlinkCount?: number;
  usageCount?: number;

  createdAt?: string;
  updatedAt?: string;

  metadata?: Record<string, unknown>;
};

export type ConstellationEdge = {
  id: string;
  userId: string;

  source: string;
  target: string;

  sourceType?: ConstellationNodeType;
  targetType?: ConstellationNodeType;

  type: ConstellationEdgeType;
  status?: ConstellationEdgeStatus;

  label?: string;
  weight?: number;
  confidence?: number;

  isManual?: boolean;
  isAISuggested?: boolean;
  isConfirmed?: boolean;

  reason?: string;

  createdAt?: string;
  updatedAt?: string;

  metadata?: Record<string, unknown>;
};

export type BuildConstellationOptions = {
  includeCategoryNodes?: boolean;
  includeTagNodes?: boolean;
  includeCollectionNodes?: boolean;
  includeSourceNodes?: boolean;
  includeProjectNodes?: boolean;
  includeEntityNodes?: boolean;
  /**
   * When true, only emit a tag node if it is shared by at least
   * `minTagPopularity` knowledge items in the (already filtered) input.
   * Solo tags (count=1) become sidebar noise — usually safer to drop.
   */
  minTagPopularity?: number;

  includeSharedTagEdges?: boolean;
  includeSemanticEdges?: boolean;
  includeAISuggestedEdges?: boolean;
  includeManualEdges?: boolean;

  /** AI-suggested / semantic edges below this confidence are dropped. */
  minSemanticConfidence?: number;
  /** A `shared_tag` edge requires at least this many shared meaningful tags. */
  minSharedTagCount?: number;
  /** Hard cap on emitted nodes (after sorting by importance). */
  maxNodes?: number;
  /** Drop generic tags like "note", "article", "misc" from tag-node creation. */
  hideGenericTags?: boolean;
  /** Strip nodes that ended up with zero edges. */
  hideOrphanNodes?: boolean;
};

export type ConstellationFilters = {
  search?: string;
  nodeTypes?: ConstellationNodeType[];
  relationTypes?: ConstellationEdgeType[];
  collectionIds?: string[];
  tagIds?: string[];
  sourceTypes?: string[];
  projectIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  minConnectionCount?: number;
  hideOrphanNodes?: boolean;
  showCategoryNodes?: boolean;
  showTagNodes?: boolean;
  showCollectionNodes?: boolean;
  showSourceNodes?: boolean;
  showProjectNodes?: boolean;
  showEntityNodes?: boolean;
  showSemanticLinks?: boolean;
  showAISuggestedLinks?: boolean;
  /** When true, show only manual/explicit links. */
  showManualLinksOnly?: boolean;
  minSemanticConfidence?: number;
};

export type ConstellationGraphData = {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
};

export type ConstellationGraphMode = "global" | "local" | "sphere_3d";
export type ConstellationDepth = 1 | 2 | 3;

/**
 * Cluster dimension used by 3D Sphere Mode to assign colored regions
 * across the sphere surface. Stored in the store so the Cluster By
 * dropdown survives mode switches.
 */
export type ConstellationClusterBy =
  | "category"
  | "node_type"
  | "library"
  | "collection"
  | "project"
  | "source_type"
  | "none";
