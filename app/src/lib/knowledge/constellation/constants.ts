import type {
  BuildConstellationOptions,
  ConstellationEdgeType,
  ConstellationFilters,
  ConstellationNodeType,
} from "@/types/constellation";

/**
 * Tags that are too generic to be useful as graph nodes or as the basis
 * for `shared_tag` edges. Lower-cased; matched case-insensitively.
 */
export const GENERIC_TAGS: ReadonlySet<string> = new Set([
  "note",
  "notes",
  "idea",
  "ideas",
  "misc",
  "general",
  "article",
  "articles",
  "link",
  "links",
  "reference",
  "references",
  "saved",
  "temporary",
  "uncategorized",
  "imported",
  "unknown",
  "other",
  "todo",
  "draft",
]);

export function isGenericTag(tag: string): boolean {
  return GENERIC_TAGS.has(tag.trim().toLowerCase());
}

/**
 * Visual palette per node type. Colors are calm, controlled, dark-mode
 * optimized — never random rainbow. Each color is a stable HSL string
 * so canvas rendering can apply alpha on top.
 */
export const NODE_COLORS: Record<
  ConstellationNodeType,
  { core: string; glow: string; ring: string; label: string }
> = {
  knowledge: {
    core: "#7dd3fc", // cyan-300
    glow: "rgba(56, 189, 248, 0.45)",
    ring: "rgba(125, 211, 252, 0.85)",
    label: "rgba(186, 230, 253, 0.95)",
  },
  category: {
    core: "#fbbf24", // amber-400 — anchor / hub
    glow: "rgba(245, 158, 11, 0.55)",
    ring: "rgba(251, 191, 36, 0.95)",
    label: "rgba(254, 240, 138, 0.98)",
  },
  tag: {
    core: "#c4b5fd", // violet-300
    glow: "rgba(167, 139, 250, 0.45)",
    ring: "rgba(196, 181, 253, 0.85)",
    label: "rgba(221, 214, 254, 0.95)",
  },
  collection: {
    core: "#fb923c", // orange-400 (warmer than category to differentiate)
    glow: "rgba(249, 115, 22, 0.45)",
    ring: "rgba(251, 146, 60, 0.85)",
    label: "rgba(254, 215, 170, 0.95)",
  },
  source: {
    core: "#cbd5e1", // slate-300
    glow: "rgba(148, 163, 184, 0.45)",
    ring: "rgba(203, 213, 225, 0.85)",
    label: "rgba(226, 232, 240, 0.95)",
  },
  project: {
    core: "#6ee7b7", // emerald-300
    glow: "rgba(52, 211, 153, 0.45)",
    ring: "rgba(110, 231, 183, 0.85)",
    label: "rgba(167, 243, 208, 0.95)",
  },
  person: {
    core: "#fda4af", // rose-300
    glow: "rgba(251, 113, 133, 0.45)",
    ring: "rgba(253, 164, 175, 0.85)",
    label: "rgba(254, 205, 211, 0.95)",
  },
  organization: {
    core: "#f0abfc", // fuchsia-300
    glow: "rgba(232, 121, 249, 0.45)",
    ring: "rgba(240, 171, 252, 0.85)",
    label: "rgba(245, 208, 254, 0.95)",
  },
  concept: {
    core: "#5eead4", // teal-300
    glow: "rgba(45, 212, 191, 0.45)",
    ring: "rgba(94, 234, 212, 0.85)",
    label: "rgba(153, 246, 228, 0.95)",
  },

  // ── Life OS Brain — cross-module nodes ─────────────────────────────
  // Goals are intentionally the brightest node — they are the gravity
  // wells of the brain graph; every other domain orbits them.
  goal: {
    core: "#facc15", // yellow-400 — brightest, hub
    glow: "rgba(234, 179, 8, 0.65)",
    ring: "rgba(250, 204, 21, 1)",
    label: "rgba(254, 240, 138, 1)",
  },
  habit: {
    core: "#a3e635", // lime-400
    glow: "rgba(132, 204, 22, 0.45)",
    ring: "rgba(163, 230, 53, 0.85)",
    label: "rgba(217, 249, 157, 0.95)",
  },
  daily_plan: {
    core: "#818cf8", // indigo-400
    glow: "rgba(99, 102, 241, 0.45)",
    ring: "rgba(129, 140, 248, 0.85)",
    label: "rgba(199, 210, 254, 0.95)",
  },
  bucket_item: {
    core: "#34d399", // emerald-400
    glow: "rgba(16, 185, 129, 0.45)",
    ring: "rgba(52, 211, 153, 0.85)",
    label: "rgba(167, 243, 208, 0.95)",
  },
  role_model: {
    core: "#f472b6", // pink-400
    glow: "rgba(236, 72, 153, 0.45)",
    ring: "rgba(244, 114, 182, 0.85)",
    label: "rgba(251, 207, 232, 0.95)",
  },
  career_event: {
    core: "#60a5fa", // blue-400
    glow: "rgba(59, 130, 246, 0.45)",
    ring: "rgba(96, 165, 250, 0.85)",
    label: "rgba(191, 219, 254, 0.95)",
  },
  idea: {
    core: "#fb923c", // orange-400 (matched to collection but warmer)
    glow: "rgba(249, 115, 22, 0.5)",
    ring: "rgba(251, 146, 60, 0.9)",
    label: "rgba(254, 215, 170, 0.95)",
  },
  task: {
    core: "#94a3b8", // slate-400
    glow: "rgba(100, 116, 139, 0.4)",
    ring: "rgba(148, 163, 184, 0.85)",
    label: "rgba(203, 213, 225, 0.95)",
  },
  journal_entry: {
    core: "#22d3ee", // cyan-400
    glow: "rgba(6, 182, 212, 0.45)",
    ring: "rgba(34, 211, 238, 0.85)",
    label: "rgba(165, 243, 252, 0.95)",
  },
  quote: {
    core: "#67e8f9", // cyan-300 (lighter than journal)
    glow: "rgba(34, 211, 238, 0.45)",
    ring: "rgba(103, 232, 249, 0.85)",
    label: "rgba(207, 250, 254, 0.95)",
  },
  gratitude: {
    core: "#fbbf24", // amber-400
    glow: "rgba(245, 158, 11, 0.5)",
    ring: "rgba(251, 191, 36, 0.85)",
    label: "rgba(254, 240, 138, 0.95)",
  },
  about_me: {
    core: "#c084fc", // purple-400
    glow: "rgba(168, 85, 247, 0.5)",
    ring: "rgba(192, 132, 252, 0.9)",
    label: "rgba(233, 213, 255, 0.95)",
  },
  health_goal: {
    core: "#4ade80", // green-400
    glow: "rgba(34, 197, 94, 0.45)",
    ring: "rgba(74, 222, 128, 0.85)",
    label: "rgba(187, 247, 208, 0.95)",
  },
  finance_goal: {
    core: "#fde047", // yellow-300 (gold-leaning)
    glow: "rgba(250, 204, 21, 0.45)",
    ring: "rgba(253, 224, 71, 0.85)",
    label: "rgba(254, 249, 195, 0.95)",
  },
  asset: {
    core: "#cbd5e1", // slate-300 (matches `source` but a touch warmer)
    glow: "rgba(148, 163, 184, 0.4)",
    ring: "rgba(203, 213, 225, 0.85)",
    label: "rgba(226, 232, 240, 0.95)",
  },
  ai_prompt: {
    core: "#a78bfa", // violet-400
    glow: "rgba(139, 92, 246, 0.5)",
    ring: "rgba(167, 139, 250, 0.9)",
    label: "rgba(221, 214, 254, 0.95)",
  },
  software: {
    core: "#fdba74", // orange-300 (lighter than idea)
    glow: "rgba(251, 146, 60, 0.4)",
    ring: "rgba(253, 186, 116, 0.85)",
    label: "rgba(254, 215, 170, 0.95)",
  },
};

/**
 * Per-type base radius. Final node radius is computed as
 *   base + sqrt(connectionCount + 1) * NODE_SIZE_SCALE
 * inside the canvas component.
 */
export const NODE_BASE_SIZE: Record<ConstellationNodeType, number> = {
  knowledge: 5,
  category: 9,
  tag: 4,
  collection: 7,
  project: 8,
  source: 6,
  person: 5,
  organization: 6,
  concept: 5,

  // Brain — Goals are gravity wells (largest); habits/projects are
  // anchor-class; tasks/quotes/gratitude are leaf-class.
  goal: 11,
  habit: 7,
  daily_plan: 6,
  bucket_item: 7,
  role_model: 7,
  career_event: 6,
  idea: 5,
  task: 4,
  journal_entry: 5,
  quote: 5,
  gratitude: 4,
  about_me: 9,
  health_goal: 7,
  finance_goal: 7,
  asset: 5,
  ai_prompt: 5,
  software: 5,
};

export const NODE_SIZE_SCALE = 2.6;

/**
 * Default edge styling. Everything calm, low-opacity until highlighted.
 * Width is a multiplier on a base width (1) inside the canvas.
 */
export const EDGE_STYLE: Record<
  ConstellationEdgeType,
  { color: string; width: number; dashed?: boolean; opacity: number }
> = {
  manual_link: {
    color: "rgba(125, 211, 252, 0.95)",
    width: 1.6,
    opacity: 0.85,
  },
  explicit_link: {
    color: "rgba(125, 211, 252, 0.85)",
    width: 1.4,
    opacity: 0.75,
  },
  ai_suggested_link: {
    color: "rgba(196, 181, 253, 0.75)",
    width: 1.1,
    opacity: 0.55,
  },
  semantic_similarity: {
    color: "rgba(94, 234, 212, 0.55)",
    width: 0.9,
    opacity: 0.35,
  },
  shared_tag: {
    color: "rgba(167, 139, 250, 0.45)",
    width: 0.7,
    opacity: 0.22,
  },
  same_collection: {
    color: "rgba(251, 146, 60, 0.55)",
    width: 0.9,
    opacity: 0.32,
  },
  category_reference: {
    color: "rgba(251, 191, 36, 0.65)",
    width: 1.1,
    opacity: 0.45,
  },
  same_source: {
    color: "rgba(203, 213, 225, 0.45)",
    width: 0.7,
    dashed: true,
    opacity: 0.28,
  },
  project_reference: {
    color: "rgba(110, 231, 183, 0.65)",
    width: 1.0,
    opacity: 0.5,
  },
  person_reference: {
    color: "rgba(253, 164, 175, 0.55)",
    width: 0.8,
    opacity: 0.4,
  },
  organization_reference: {
    color: "rgba(240, 171, 252, 0.55)",
    width: 0.8,
    opacity: 0.4,
  },
  concept_reference: {
    color: "rgba(94, 234, 212, 0.55)",
    width: 0.8,
    opacity: 0.4,
  },
  timeline_relation: {
    color: "rgba(148, 163, 184, 0.4)",
    width: 0.6,
    dashed: true,
    opacity: 0.25,
  },

  // ── Life OS Brain — cross-module edges ─────────────────────────────
  // Goal-anchored edges are bright gold so the gravity wells are easy
  // to read. Inspiration / role-model edges use a soft pink. AI-derived
  // semantic edges share the violet treatment with `ai_suggested_link`.
  goal_task: {
    color: "rgba(250, 204, 21, 0.65)",
    width: 1.2,
    opacity: 0.55,
  },
  goal_habit: {
    color: "rgba(250, 204, 21, 0.7)",
    width: 1.3,
    opacity: 0.6,
  },
  goal_project: {
    color: "rgba(250, 204, 21, 0.7)",
    width: 1.4,
    opacity: 0.65,
  },
  goal_bucket: {
    color: "rgba(250, 204, 21, 0.65)",
    width: 1.2,
    opacity: 0.55,
  },
  quote_goal: {
    color: "rgba(103, 232, 249, 0.55)",
    width: 1.0,
    opacity: 0.45,
  },
  role_model_goal: {
    color: "rgba(244, 114, 182, 0.6)",
    width: 1.0,
    opacity: 0.5,
  },
  role_model_project: {
    color: "rgba(244, 114, 182, 0.55)",
    width: 0.9,
    opacity: 0.45,
  },
  idea_project: {
    color: "rgba(251, 146, 60, 0.6)",
    width: 1.0,
    opacity: 0.5,
  },
  idea_knowledge: {
    color: "rgba(251, 146, 60, 0.5)",
    width: 0.9,
    opacity: 0.4,
  },
  habit_goal: {
    color: "rgba(163, 230, 53, 0.65)",
    width: 1.1,
    opacity: 0.55,
  },
  habit_project: {
    color: "rgba(163, 230, 53, 0.55)",
    width: 0.9,
    opacity: 0.45,
  },
  habit_task: {
    color: "rgba(163, 230, 53, 0.5)",
    width: 0.8,
    opacity: 0.4,
  },
  habit_knowledge: {
    color: "rgba(163, 230, 53, 0.45)",
    width: 0.8,
    opacity: 0.35,
  },
  journal_project: {
    color: "rgba(34, 211, 238, 0.55)",
    width: 0.9,
    opacity: 0.4,
  },
  journal_task: {
    color: "rgba(34, 211, 238, 0.5)",
    width: 0.8,
    opacity: 0.35,
  },
  bucket_project: {
    color: "rgba(52, 211, 153, 0.55)",
    width: 0.9,
    opacity: 0.45,
  },
  bucket_task: {
    color: "rgba(52, 211, 153, 0.5)",
    width: 0.8,
    opacity: 0.4,
  },
  career_project: {
    color: "rgba(96, 165, 250, 0.6)",
    width: 1.0,
    opacity: 0.5,
  },
  gratitude_person: {
    color: "rgba(251, 191, 36, 0.55)",
    width: 0.9,
    opacity: 0.4,
  },
  domain_tag: {
    color: "rgba(167, 139, 250, 0.4)",
    width: 0.6,
    dashed: true,
    opacity: 0.25,
  },
};

/**
 * Defaults used by the build helper. These are intentionally conservative
 * to keep the constellation calm — semantic and shared-tag edges are off
 * unless explicitly enabled.
 */
export const DEFAULT_BUILD_OPTIONS: Required<BuildConstellationOptions> = {
  includeCategoryNodes: true,
  includeTagNodes: true,
  includeCollectionNodes: true,
  includeSourceNodes: false,
  includeProjectNodes: true,
  includeEntityNodes: true,
  // Drop singleton tags by default — solo tags add clutter without
  // meaningful relationships. The user can lower this in Filters.
  minTagPopularity: 2,

  includeSharedTagEdges: false,
  includeSemanticEdges: false,
  includeAISuggestedEdges: true,
  includeManualEdges: true,

  minSemanticConfidence: 0.75,
  minSharedTagCount: 2,
  maxNodes: 1500,
  hideGenericTags: true,
  hideOrphanNodes: false,
};

export const DEFAULT_FILTERS: Required<
  Pick<
    ConstellationFilters,
    | "hideOrphanNodes"
    | "showCategoryNodes"
    | "showTagNodes"
    | "showCollectionNodes"
    | "showSourceNodes"
    | "showProjectNodes"
    | "showEntityNodes"
    | "showSemanticLinks"
    | "showAISuggestedLinks"
    | "showManualLinksOnly"
    | "minSemanticConfidence"
    | "minConnectionCount"
  >
> = {
  hideOrphanNodes: false,
  showCategoryNodes: true,
  showTagNodes: true,
  showCollectionNodes: true,
  showSourceNodes: false,
  showProjectNodes: true,
  showEntityNodes: true,
  showSemanticLinks: false,
  showAISuggestedLinks: true,
  showManualLinksOnly: false,
  minSemanticConfidence: 0.78,
  minConnectionCount: 0,
};

/** A label for each node type, used in legends/details (English defaults). */
export const NODE_TYPE_LABEL: Record<ConstellationNodeType, string> = {
  knowledge: "Knowledge",
  category: "Category",
  tag: "Tag",
  collection: "Collection",
  source: "Source",
  project: "Project",
  person: "Person",
  organization: "Organization",
  concept: "Concept",

  // Brain
  goal: "Goal",
  habit: "Habit",
  daily_plan: "Daily Plan",
  bucket_item: "Bucket List",
  role_model: "Role Model",
  career_event: "Career Event",
  idea: "Idea",
  task: "Task",
  journal_entry: "Journal",
  quote: "Quote",
  gratitude: "Gratitude",
  about_me: "About Me",
  health_goal: "Health Goal",
  finance_goal: "Finance Goal",
  asset: "Asset",
  ai_prompt: "AI Prompt",
  software: "Software",
};

export const EDGE_TYPE_LABEL: Record<ConstellationEdgeType, string> = {
  manual_link: "Manual link",
  explicit_link: "Explicit link",
  ai_suggested_link: "AI-suggested",
  semantic_similarity: "Semantic similarity",
  shared_tag: "Shared tag",
  same_collection: "Same collection",
  same_source: "Same source",
  category_reference: "Category",
  project_reference: "Project reference",
  person_reference: "Person reference",
  organization_reference: "Organization reference",
  concept_reference: "Concept reference",
  timeline_relation: "Timeline relation",

  // Brain
  goal_task: "Goal → Task",
  goal_habit: "Goal → Habit",
  goal_project: "Goal → Project",
  goal_bucket: "Goal → Bucket List",
  quote_goal: "Quote inspires Goal",
  role_model_goal: "Role Model → Goal",
  role_model_project: "Role Model → Project",
  idea_project: "Idea → Project",
  idea_knowledge: "Idea → Knowledge",
  habit_goal: "Habit → Goal",
  habit_project: "Habit → Project",
  habit_task: "Habit → Task",
  habit_knowledge: "Habit → Knowledge",
  journal_project: "Journal → Project",
  journal_task: "Journal → Task",
  bucket_project: "Bucket List → Project",
  bucket_task: "Bucket List → Task",
  career_project: "Career → Project",
  gratitude_person: "Gratitude → Person",
  domain_tag: "Cross-domain tag",
};
