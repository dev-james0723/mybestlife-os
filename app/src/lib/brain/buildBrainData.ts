/**
 * Brain graph orchestrator (Connected Brain Engine integration).
 *
 * Old job (kept for back-compat):
 *   - Take per-domain rows from `useBrainQueries`.
 *   - Produce a `ConstellationGraphData` for the existing canvas.
 *
 * New job (this file post-refactor):
 *   1. Normalize every row into a canonical `BrainNode` via `lib/brain/normalize/*`.
 *   2. Run the Connected Brain Engine (`lib/brain/relationship-engine/*`)
 *      to generate explicit + taxonomy + entity + time edges with
 *      strength/confidence/reason.
 *   3. Translate `BrainGraphData` → `ConstellationGraphData` for the canvas.
 *
 * Multi-user safety: every normalizer filters by `userId` defensively.
 */

import type { ConstellationGraphData } from "@/types/constellation";
import type { BrainEdge, BrainNode } from "@/types/brain-graph";
import type { Goal, Project, Task, JournalEntry, Idea } from "@/types/database";
import type {
  AboutMe,
  Asset as AssetRow,
  CareerDecision,
  CareerEvent,
  CareerNetworkNode,
  DailyPlan,
  Document,
  FinanceAccount,
  FinanceCategory,
  GratefulThing,
  HealthGoal,
  Note,
  Relationship,
  RoleModel,
  SavingsGoal,
  SoftwareVaultEntry,
  UserPromptRow,
} from "@/types/database";
import type { Habit, HabitLink } from "@/lib/habits/types";
import type { Quote } from "@/types/quote";
import type { BucketItem } from "@/types/bucket-list";
import type { BrainRelationRow } from "@/types/brain";
import type {
  KnowledgeConnection,
  KnowledgeItem,
  SmartCollection,
} from "@/types/knowledge";

import { brainGraphToConstellationGraph } from "./compat";
import { buildBrainGraph } from "./relationship-engine";
import { brainRelationsToBrainEdges } from "./adapters/brain-relations-bridge";
import {
  brainEdgeRowsToBrainEdges,
  rejectedEvidenceHashes,
} from "./adapters/brain-edges-bridge";
import type { BrainEdgeRow } from "./edges";
import {
  knowledgeItemsToBrainNodes,
  smartCollectionsToBrainNodes,
} from "./normalize/knowledge";
import {
  bucketItemsToBrainNodes,
  dailyPlansToBrainNodes,
  goalsToBrainNodes,
  habitsToBrainNodes,
  projectsToBrainNodes,
  tasksToBrainNodes,
} from "./normalize/action";
import {
  careerDecisionsToBrainNodes,
  gratitudeToBrainNodes,
  ideasToBrainNodes,
  journalEntriesToBrainNodes,
  notesToBrainNodes,
  quotesToBrainNodes,
} from "./normalize/capture";
import {
  careerNetworkToBrainNodes,
  relationshipsToBrainNodes,
  roleModelsToBrainNodes,
} from "./normalize/people";
import { careerEventsToBrainNodes } from "./normalize/career";
import {
  assetsToBrainNodes,
  documentsToBrainNodes,
  financeAccountsToBrainNodes,
  financeCategoriesToBrainNodes,
  savingsGoalsToBrainNodes,
  softwareToBrainNodes,
} from "./normalize/resources";
import {
  aboutMeToBrainNodes,
  aiPromptsToBrainNodes,
  healthGoalsToBrainNodes,
} from "./normalize/wellbeing";

// ============================================================
// Public API
// ============================================================

export type BuildBrainOptions = {
  /** Hard cap on emitted nodes. */
  maxNodes?: number;
  /** Drop nodes with no edges. */
  hideOrphanNodes?: boolean;
  /** Minimum strength for an edge to be visible. */
  minStrength?: number;
  /** Skip generators by name (diagnostics only). */
  disable?: {
    explicit?: boolean;
    taxonomy?: boolean;
    entity?: boolean;
    time?: boolean;
  };
};

export type BuildBrainInput = {
  userId: string;

  // Knowledge Base
  knowledgeItems?: KnowledgeItem[];
  knowledgeCollections?: SmartCollection[];
  knowledgeConnections?: KnowledgeConnection[];

  // Action / planning
  goals?: Goal[];
  habits?: Habit[];
  habitLinks?: HabitLink[];
  projects?: Project[];
  tasks?: Task[];
  bucketItems?: BucketItem[];
  dailyPlans?: DailyPlan[];

  // Capture / reflection
  journalEntries?: JournalEntry[];
  quotes?: Quote[];
  gratefulThings?: GratefulThing[];
  ideas?: Idea[];
  notes?: Note[];
  careerDecisions?: CareerDecision[];

  // People / relationships
  relationships?: Relationship[];
  roleModels?: RoleModel[];
  careerNetworkNodes?: CareerNetworkNode[];

  // Career
  careerEvents?: CareerEvent[];

  // Resources
  documents?: Document[];
  assets?: AssetRow[];
  financeGoals?: SavingsGoal[];
  financeAccounts?: FinanceAccount[];
  financeCategories?: FinanceCategory[];

  // AI / tools
  software?: SoftwareVaultEntry[];
  aiPrompts?: UserPromptRow[];

  // Wellbeing
  aboutMe?: AboutMe | null;
  healthGoals?: HealthGoal[];

  // Persisted edges
  brainRelations?: BrainRelationRow[];
  brainEdges?: BrainEdgeRow[];

  options?: BuildBrainOptions;
};

/**
 * Build the Brain graph in `ConstellationGraphData` shape (for the
 * existing canvas). Internally runs the Connected Brain Engine.
 */
export function buildBrainData(input: BuildBrainInput): ConstellationGraphData {
  const userId = input.userId;

  // ── Step 1: Normalize all sources into BrainNode[] ────────────────
  const nodes: BrainNode[] = [
    // Knowledge
    ...knowledgeItemsToBrainNodes({ items: input.knowledgeItems, userId }),
    ...smartCollectionsToBrainNodes({
      collections: input.knowledgeCollections,
      userId,
    }),

    // Action / planning
    ...projectsToBrainNodes({ rows: input.projects, userId }),
    ...goalsToBrainNodes({ rows: input.goals, userId }),
    ...tasksToBrainNodes({ rows: input.tasks, userId }),
    ...habitsToBrainNodes({ rows: input.habits, userId }),
    ...dailyPlansToBrainNodes({ rows: input.dailyPlans, userId }),
    ...bucketItemsToBrainNodes({ rows: input.bucketItems, userId }),

    // Capture / reflection
    ...journalEntriesToBrainNodes({ rows: input.journalEntries, userId }),
    ...quotesToBrainNodes({ rows: input.quotes, userId }),
    ...gratitudeToBrainNodes({ rows: input.gratefulThings, userId }),
    ...ideasToBrainNodes({ rows: input.ideas, userId }),
    ...notesToBrainNodes({ rows: input.notes, userId }),
    ...careerDecisionsToBrainNodes({ rows: input.careerDecisions, userId }),

    // People
    ...relationshipsToBrainNodes({ rows: input.relationships, userId }),
    ...roleModelsToBrainNodes({ rows: input.roleModels, userId }),
    ...careerNetworkToBrainNodes({ rows: input.careerNetworkNodes, userId }),

    // Career
    ...careerEventsToBrainNodes({ rows: input.careerEvents, userId }),

    // Resources
    ...documentsToBrainNodes({ rows: input.documents, userId }),
    ...assetsToBrainNodes({ rows: input.assets, userId }),
    ...savingsGoalsToBrainNodes({ rows: input.financeGoals, userId }),
    ...financeAccountsToBrainNodes({ rows: input.financeAccounts, userId }),
    ...financeCategoriesToBrainNodes({
      rows: input.financeCategories,
      userId,
    }),

    // AI / tools
    ...softwareToBrainNodes({ rows: input.software, userId }),
    ...aiPromptsToBrainNodes({ rows: input.aiPrompts, userId }),

    // Wellbeing
    ...aboutMeToBrainNodes({ row: input.aboutMe, userId }),
    ...healthGoalsToBrainNodes({ rows: input.healthGoals, userId }),
  ];

  // ── Step 2: Translate persisted edges to BrainEdge[] ──────────────
  const knownIds = new Set(nodes.map((n) => n.id));
  const persistedFromRelations = brainRelationsToBrainEdges({
    rows: input.brainRelations,
    userId,
    knownNodeIds: knownIds,
  });
  const persistedFromEdges = brainEdgeRowsToBrainEdges({
    rows: input.brainEdges,
    userId,
    knownNodeIds: knownIds,
  });
  // Drop rejected rows from the visible set — the engine should not
  // re-render rejected edges. Their evidence hashes are computed below
  // and used to filter newly-generated suggestions.
  const visiblePersisted: BrainEdge[] = [
    ...persistedFromRelations,
    ...persistedFromEdges.filter((e) => e.status !== "rejected"),
  ];
  const rejectedHashes = rejectedEvidenceHashes(input.brainEdges);

  // ── Step 3: Run the relationship engine ───────────────────────────
  const brainGraph = buildBrainGraph({
    userId,
    nodes,
    persistedEdges: visiblePersisted,
    habitLinks: input.habitLinks,
    rejectedEvidenceHashes: rejectedHashes,
    options: input.options,
  });

  // ── Step 4: Translate to canvas shape ─────────────────────────────
  return brainGraphToConstellationGraph(brainGraph);
}

/**
 * Same as {@link buildBrainData} but returns the rich `BrainGraphData`
 * shape — used by diagnostics, the orphan resolver, and (later) the
 * detail panel which needs full edge metadata.
 */
export function buildBrainDataRich(
  input: BuildBrainInput,
): ReturnType<typeof buildBrainGraph> {
  const userId = input.userId;
  const nodes: BrainNode[] = [
    ...knowledgeItemsToBrainNodes({ items: input.knowledgeItems, userId }),
    ...smartCollectionsToBrainNodes({
      collections: input.knowledgeCollections,
      userId,
    }),
    ...projectsToBrainNodes({ rows: input.projects, userId }),
    ...goalsToBrainNodes({ rows: input.goals, userId }),
    ...tasksToBrainNodes({ rows: input.tasks, userId }),
    ...habitsToBrainNodes({ rows: input.habits, userId }),
    ...dailyPlansToBrainNodes({ rows: input.dailyPlans, userId }),
    ...bucketItemsToBrainNodes({ rows: input.bucketItems, userId }),
    ...journalEntriesToBrainNodes({ rows: input.journalEntries, userId }),
    ...quotesToBrainNodes({ rows: input.quotes, userId }),
    ...gratitudeToBrainNodes({ rows: input.gratefulThings, userId }),
    ...ideasToBrainNodes({ rows: input.ideas, userId }),
    ...notesToBrainNodes({ rows: input.notes, userId }),
    ...careerDecisionsToBrainNodes({ rows: input.careerDecisions, userId }),
    ...relationshipsToBrainNodes({ rows: input.relationships, userId }),
    ...roleModelsToBrainNodes({ rows: input.roleModels, userId }),
    ...careerNetworkToBrainNodes({ rows: input.careerNetworkNodes, userId }),
    ...careerEventsToBrainNodes({ rows: input.careerEvents, userId }),
    ...documentsToBrainNodes({ rows: input.documents, userId }),
    ...assetsToBrainNodes({ rows: input.assets, userId }),
    ...savingsGoalsToBrainNodes({ rows: input.financeGoals, userId }),
    ...financeAccountsToBrainNodes({ rows: input.financeAccounts, userId }),
    ...financeCategoriesToBrainNodes({
      rows: input.financeCategories,
      userId,
    }),
    ...softwareToBrainNodes({ rows: input.software, userId }),
    ...aiPromptsToBrainNodes({ rows: input.aiPrompts, userId }),
    ...aboutMeToBrainNodes({ row: input.aboutMe, userId }),
    ...healthGoalsToBrainNodes({ rows: input.healthGoals, userId }),
  ];
  const knownIds = new Set(nodes.map((n) => n.id));
  const visiblePersisted: BrainEdge[] = [
    ...brainRelationsToBrainEdges({
      rows: input.brainRelations,
      userId,
      knownNodeIds: knownIds,
    }),
    ...brainEdgeRowsToBrainEdges({
      rows: input.brainEdges,
      userId,
      knownNodeIds: knownIds,
    }).filter((e) => e.status !== "rejected"),
  ];
  return buildBrainGraph({
    userId,
    nodes,
    persistedEdges: visiblePersisted,
    habitLinks: input.habitLinks,
    rejectedEvidenceHashes: rejectedEvidenceHashes(input.brainEdges),
    options: input.options,
  });
}
