/**
 * Life Areas — canonical anchors for the Brain graph.
 *
 * Life Areas are the highest-level groupings the user organizes their life
 * around: Career, Finance, Health, Relationships, Learning, Creativity,
 * Music, AI/Product, Personal Growth, Travel, Family, Business.
 *
 * Why these matter:
 *   - Anchors. When two nodes from different domains share a life area
 *     (e.g. a journal entry tagged "career" and a project also tagged
 *     "career"), the engine creates a `same_life_area` edge.
 *   - Visual gravity. The renderer can size life-area nodes larger and
 *     pull their members into orbit (matches the target image's hub-and-
 *     spoke neural look).
 *   - Filtering. Density modes ("Career only", "Finance to Goals") rely on
 *     this taxonomy.
 *
 * Heuristics:
 *   - Life areas are inferred from a node's tags, category, source module,
 *     and (lightly) body text.
 *   - A node can belong to more than one life area — but we cap at 3 to
 *     prevent low-signal nodes from connecting to everything.
 */

/** Canonical life-area slug. Stable string used in URLs and DB. */
export type LifeAreaSlug =
  | "career"
  | "finance"
  | "health"
  | "relationships"
  | "learning"
  | "creativity"
  | "music"
  | "ai_product"
  | "personal_growth"
  | "travel"
  | "family"
  | "business";

export interface LifeAreaDef {
  /** Canonical slug — never changes. */
  slug: LifeAreaSlug;
  /** Display name in the legend / detail panel. */
  name: string;
  /** Short tooltip description for the legend. */
  description: string;
  /**
   * Aliases the engine matches against tags and free text. All forms are
   * matched after normalization, so case / hyphen / plural variants here
   * are redundant — just include genuine semantic synonyms (and bilingual
   * forms where relevant).
   */
  aliases: string[];
  /**
   * Soft hint: when a node's source module/category is one of these, the
   * engine pre-tags it with this life area before looking at its text.
   */
  sourceModuleHints?: string[];
  /** Hex accent used by the legend / canvas anchor color. */
  accent: string;
}

export const LIFE_AREAS: LifeAreaDef[] = [
  {
    slug: "career",
    name: "Career",
    description: "Professional growth, jobs, opportunities, applications.",
    aliases: [
      "career",
      "work",
      "profession",
      "professional",
      "job",
      "jobs",
      "employment",
      "industry",
      "professional growth",
      "事業",
      "工作",
      "職涯",
    ],
    sourceModuleHints: ["career", "career_event", "career_project"],
    accent: "#60a5fa",
  },
  {
    slug: "finance",
    name: "Finance",
    description: "Money, savings, investments, assets, budgets.",
    aliases: [
      "finance",
      "financial",
      "money",
      "budget",
      "saving",
      "saving goal",
      "investment",
      "income",
      "expense",
      "wealth",
      "財務",
      "金錢",
      "存款",
      "投資",
    ],
    sourceModuleHints: ["finance", "finance_goal", "asset"],
    accent: "#facc15",
  },
  {
    slug: "health",
    name: "Health",
    description: "Sleep, exercise, nutrition, medical, wellbeing.",
    aliases: [
      "health",
      "wellness",
      "wellbeing",
      "fitness",
      "sleep",
      "exercise",
      "nutrition",
      "medical",
      "doctor",
      "energy",
      "recovery",
      "健康",
      "運動",
      "睡眠",
    ],
    sourceModuleHints: ["health", "health_goal", "habit"],
    accent: "#4ade80",
  },
  {
    slug: "relationships",
    name: "Relationships",
    description: "Family, friends, colleagues, mentors, partners.",
    aliases: [
      "relationship",
      "people",
      "friend",
      "friendship",
      "family",
      "mentor",
      "professor",
      "colleague",
      "partner",
      "love",
      "connection",
      "人際關係",
      "朋友",
      "家人",
    ],
    sourceModuleHints: ["relationship", "role_model"],
    accent: "#f472b6",
  },
  {
    slug: "learning",
    name: "Learning",
    description: "Study, research, courses, books, knowledge work.",
    aliases: [
      "learning",
      "study",
      "studying",
      "education",
      "course",
      "book",
      "reading",
      "research",
      "school",
      "university",
      "graduate school",
      "law school",
      "academic",
      "japanese study",
      "學習",
      "讀書",
      "研究",
    ],
    sourceModuleHints: [
      "knowledge_card",
      "knowledge_collection",
      "japanese_study",
    ],
    accent: "#7dd3fc",
  },
  {
    slug: "creativity",
    name: "Creativity",
    description: "Art, design, writing, performance, creative work.",
    aliases: [
      "creativity",
      "creative",
      "art",
      "design",
      "writing",
      "writer",
      "performance",
      "performer",
      "studio",
      "創作",
      "藝術",
    ],
    accent: "#a78bfa",
  },
  {
    slug: "music",
    name: "Music",
    description: "Performance, festivals, education, recording, theory.",
    aliases: [
      "music",
      "musical",
      "piano",
      "competition",
      "festival",
      "d festival",
      "music education",
      "music ed",
      "performance",
      "recording",
      "classical",
      "音樂",
      "鋼琴",
      "音樂教育",
    ],
    accent: "#fb7185",
  },
  {
    slug: "ai_product",
    name: "AI & Product",
    description: "AI, product management, tech building, software.",
    aliases: [
      "ai",
      "artificial intelligence",
      "machine learning",
      "ml",
      "llm",
      "product",
      "product management",
      "pm",
      "startup",
      "startups",
      "saas",
      "software",
      "software tools",
      "ai tools",
      "tool",
      "automation",
      "agent",
      "agents",
      "agentic",
      "人工智能",
      "人工智慧",
      "產品經理",
    ],
    sourceModuleHints: ["software", "ai_prompt", "ai_knowledge"],
    accent: "#22d3ee",
  },
  {
    slug: "personal_growth",
    name: "Personal Growth",
    description: "Habits, mindset, reflection, values, identity.",
    aliases: [
      "personal growth",
      "growth",
      "mindset",
      "habit",
      "habits",
      "discipline",
      "reflection",
      "identity",
      "value",
      "values",
      "anxiety",
      "stress",
      "recovery",
      "philosophy",
      "成長",
      "心態",
      "習慣",
    ],
    sourceModuleHints: ["habit", "journal_entry", "gratitude", "quote"],
    accent: "#a3e635",
  },
  {
    slug: "travel",
    name: "Travel",
    description: "Trips, destinations, bucket-list adventures.",
    aliases: [
      "travel",
      "trip",
      "vacation",
      "holiday",
      "destination",
      "country",
      "city",
      "tourism",
      "旅行",
      "旅遊",
    ],
    sourceModuleHints: ["bucket_list_item"],
    accent: "#34d399",
  },
  {
    slug: "family",
    name: "Family",
    description: "Parents, siblings, household, relatives.",
    aliases: [
      "family",
      "parent",
      "parents",
      "father",
      "mother",
      "sibling",
      "brother",
      "sister",
      "household",
      "家人",
      "家庭",
    ],
    accent: "#fda4af",
  },
  {
    slug: "business",
    name: "Business",
    description: "Strategy, branding, operations, side projects.",
    aliases: [
      "business",
      "branding",
      "marketing",
      "strategy",
      "operation",
      "operations",
      "side project",
      "side hustle",
      "事業",
      "副業",
    ],
    accent: "#fbbf24",
  },
];

const LIFE_AREAS_BY_SLUG = new Map<LifeAreaSlug, LifeAreaDef>(
  LIFE_AREAS.map((a) => [a.slug, a]),
);

/** Lookup: get a `LifeAreaDef` by slug. Returns undefined if not found. */
export function getLifeArea(slug: LifeAreaSlug): LifeAreaDef | undefined {
  return LIFE_AREAS_BY_SLUG.get(slug);
}

/** All canonical life-area slugs in display order. */
export const LIFE_AREA_SLUGS: LifeAreaSlug[] = LIFE_AREAS.map((a) => a.slug);
