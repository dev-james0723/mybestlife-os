/**
 * Canonical topic clusters for the Brain graph.
 *
 * Topic clusters are mid-level concepts used to fold together raw / AI tags
 * into a meaningful slug. Where Life Areas are the largest hubs (Career,
 * Finance, …), topic clusters are the next layer (AI Music, Product
 * Management, D Festival, Habit Design, Discipline, …).
 *
 * The matcher is alias-based:
 *   1. Every node's tags + body text are normalized to lowercase slugs.
 *   2. The matcher looks for any topic alias (verbatim slug match).
 *   3. Matches yield a topic cluster slug — the engine then connects
 *      nodes that share the same cluster.
 *
 * Generic tags ("note", "article", "misc") are excluded by `isGenericTag`
 * so they never become huge false hubs.
 *
 * The taxonomy is *intentionally hand-curated*. It complements the existing
 * Knowledge Base seed taxonomy in `lib/knowledge/tags/seed-taxonomy.ts` —
 * we keep this list shorter and Life-OS-wide (covers values, life events,
 * music, AI/product, finance, etc.).
 */

import type { LifeAreaSlug } from "./life-areas";

/** Slug used in `BrainNode.canonicalTags` and edge evidence. */
export type TopicSlug = string;

export interface TopicDef {
  /** Canonical slug — stable id. */
  slug: TopicSlug;
  /** Human-friendly display name. */
  name: string;
  /** Aliases the matcher checks against, all in normalized form. */
  aliases: string[];
  /** Optional life-area hints — when matched, contribute these life areas. */
  lifeAreas?: LifeAreaSlug[];
  /** Optional parent topic slug for hierarchical filtering. */
  parent?: TopicSlug;
  /**
   * Soft "generic" flag. Generic topics (e.g. "ai", "product") are still
   * matched, but the engine penalizes their strength when used alone so
   * they don't dominate the graph.
   */
  generic?: boolean;
}

export const TOPICS: TopicDef[] = [
  // ── AI & Product ─────────────────────────────────────────────────────
  {
    slug: "ai",
    name: "AI",
    aliases: ["ai", "artificial intelligence", "ai general", "人工智慧", "人工智能"],
    lifeAreas: ["ai_product"],
    generic: true,
  },
  {
    slug: "ai-agents",
    name: "AI Agents",
    aliases: [
      "ai agent",
      "agent",
      "agentic",
      "agentic ai",
      "agentic system",
      "autonomous agent",
      "llm agent",
      "智能代理",
    ],
    lifeAreas: ["ai_product"],
    parent: "ai",
  },
  {
    slug: "ai-music",
    name: "AI Music",
    aliases: ["ai music", "ai for music", "music ai", "ai music education"],
    lifeAreas: ["ai_product", "music"],
    parent: "ai",
  },
  {
    slug: "llm",
    name: "Large Language Models",
    aliases: ["llm", "large language model", "gpt", "chatgpt", "claude", "gemini"],
    lifeAreas: ["ai_product"],
    parent: "ai",
  },
  {
    slug: "product-management",
    name: "Product Management",
    aliases: ["product management", "pm", "product manager", "product"],
    lifeAreas: ["ai_product", "career"],
    generic: true,
  },
  {
    slug: "startup",
    name: "Startup",
    aliases: ["startup", "startups", "founder", "entrepreneur", "entrepreneurship"],
    lifeAreas: ["ai_product", "business"],
  },

  // ── Music ────────────────────────────────────────────────────────────
  {
    slug: "music-education",
    name: "Music Education",
    aliases: [
      "music education",
      "music ed",
      "music teaching",
      "music pedagogy",
      "音樂教育",
    ],
    lifeAreas: ["music", "learning"],
  },
  {
    slug: "piano",
    name: "Piano",
    aliases: ["piano", "pianist", "鋼琴"],
    lifeAreas: ["music"],
  },
  {
    slug: "d-festival",
    name: "D Festival",
    aliases: ["d festival", "dfestival", "d-festival"],
    lifeAreas: ["music", "creativity", "business"],
  },
  {
    slug: "performance",
    name: "Performance",
    aliases: ["performance", "performer", "concert", "recital", "stage"],
    lifeAreas: ["music"],
  },
  {
    slug: "competition",
    name: "Competition",
    aliases: ["competition", "competitions", "contest"],
    lifeAreas: ["music"],
  },
  {
    slug: "student-recruitment",
    name: "Student Recruitment",
    aliases: ["student recruitment", "recruiting student", "recruit student"],
    lifeAreas: ["music", "business"],
  },

  // ── Career ───────────────────────────────────────────────────────────
  {
    slug: "graduate-school",
    name: "Graduate School",
    aliases: ["graduate school", "grad school", "phd", "masters", "msc", "ma"],
    lifeAreas: ["career", "learning"],
  },
  {
    slug: "law-school",
    name: "Law School",
    aliases: ["law school", "law", "legal study", "lsat"],
    lifeAreas: ["career", "learning"],
  },
  {
    slug: "personal-brand",
    name: "Personal Brand",
    aliases: ["personal brand", "personal branding", "branding"],
    lifeAreas: ["career", "business"],
  },
  {
    slug: "interview",
    name: "Interview",
    aliases: ["interview", "interviewing", "phone screen", "onsite"],
    lifeAreas: ["career"],
  },

  // ── Finance ──────────────────────────────────────────────────────────
  {
    slug: "savings",
    name: "Savings",
    aliases: ["saving", "savings", "saving goal", "saving money"],
    lifeAreas: ["finance"],
  },
  {
    slug: "investment",
    name: "Investment",
    aliases: ["investment", "investing", "investor", "portfolio"],
    lifeAreas: ["finance"],
  },
  {
    slug: "budget",
    name: "Budget",
    aliases: ["budget", "budgeting", "expense tracking"],
    lifeAreas: ["finance"],
  },
  {
    slug: "asset",
    name: "Assets",
    aliases: ["asset", "real estate", "property", "vehicle"],
    lifeAreas: ["finance"],
    generic: true,
  },

  // ── Personal Growth ──────────────────────────────────────────────────
  {
    slug: "discipline",
    name: "Discipline",
    aliases: ["discipline", "self-discipline", "self discipline", "consistency"],
    lifeAreas: ["personal_growth"],
  },
  {
    slug: "anxiety",
    name: "Anxiety",
    aliases: ["anxiety", "anxious", "worry", "panic"],
    lifeAreas: ["personal_growth", "health"],
  },
  {
    slug: "habits",
    name: "Habits",
    aliases: ["habit", "habits", "routine", "routines"],
    lifeAreas: ["personal_growth"],
    generic: true,
  },
  {
    slug: "reflection",
    name: "Reflection",
    aliases: ["reflection", "reflecting", "introspection", "journaling"],
    lifeAreas: ["personal_growth"],
  },
  {
    slug: "identity",
    name: "Identity",
    aliases: ["identity", "who am i", "self"],
    lifeAreas: ["personal_growth"],
  },
  {
    slug: "freedom",
    name: "Freedom",
    aliases: ["freedom", "liberty", "independence"],
    lifeAreas: ["personal_growth"],
  },
  {
    slug: "self-mastery",
    name: "Self-Mastery",
    aliases: ["self-mastery", "self mastery", "mastery"],
    lifeAreas: ["personal_growth"],
  },

  // ── Productivity / Workflows ─────────────────────────────────────────
  {
    slug: "productivity",
    name: "Productivity",
    aliases: ["productivity", "productive", "focus", "deep work"],
    lifeAreas: ["personal_growth", "career"],
    generic: true,
  },
  {
    slug: "automation",
    name: "Automation",
    aliases: ["automation", "automating", "workflow", "workflows"],
    lifeAreas: ["ai_product", "personal_growth"],
  },

  // ── Health ───────────────────────────────────────────────────────────
  {
    slug: "sleep",
    name: "Sleep",
    aliases: ["sleep", "sleeping", "rest", "insomnia"],
    lifeAreas: ["health"],
  },
  {
    slug: "exercise",
    name: "Exercise",
    aliases: ["exercise", "workout", "training", "running"],
    lifeAreas: ["health"],
  },
  {
    slug: "nutrition",
    name: "Nutrition",
    aliases: ["nutrition", "diet", "food", "eating"],
    lifeAreas: ["health"],
  },

  // ── Relationships ────────────────────────────────────────────────────
  {
    slug: "mentor",
    name: "Mentor",
    aliases: ["mentor", "mentoring", "coach"],
    lifeAreas: ["relationships", "learning"],
  },
  {
    slug: "family-time",
    name: "Family Time",
    aliases: ["family time", "family dinner", "with family"],
    lifeAreas: ["family"],
  },
];

/**
 * Index: alias (normalized slug) → topic slug.
 * Built once at module load. Used by `match.ts` to do O(1) lookups.
 */
export const TOPIC_ALIAS_INDEX: Map<string, TopicSlug> = (() => {
  const idx = new Map<string, TopicSlug>();
  for (const t of TOPICS) {
    idx.set(t.slug, t.slug);
    for (const alias of t.aliases) {
      idx.set(alias.toLowerCase(), t.slug);
    }
  }
  return idx;
})();

const TOPIC_BY_SLUG = new Map<TopicSlug, TopicDef>(TOPICS.map((t) => [t.slug, t]));

/** Lookup a TopicDef by canonical slug. */
export function getTopic(slug: TopicSlug): TopicDef | undefined {
  return TOPIC_BY_SLUG.get(slug);
}

/**
 * Generic tags that should NEVER become topic cluster anchors on their own.
 * Their match still counts as a weak signal but doesn't create dedicated
 * `same_topic_cluster` edges between dozens of nodes.
 */
const GENERIC_BLOCKLIST = new Set<string>([
  "note",
  "notes",
  "idea",
  "ideas",
  "misc",
  "general",
  "article",
  "articles",
  "saved",
  "todo",
  "draft",
  "uncategorized",
  "other",
  "imported",
  "untagged",
]);

/** Returns true if the input matches a generic / low-signal tag. */
export function isGenericTopic(input: string): boolean {
  return GENERIC_BLOCKLIST.has(input.toLowerCase());
}
