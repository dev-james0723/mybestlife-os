import { flattenSearchableTags } from "./build-tree";
import { normalizeTagName, slugifyTagName } from "./normalize";
import type { KnowledgeItem } from "@/types/knowledge";
import type { TaxonomySnapshot } from "./types";

type SmartRule = {
  categoryId:
    | "technology"
    | "business"
    | "design"
    | "media"
    | "education"
    | "music"
    | "productivity"
    | "events"
    | "research";
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  keywords: string[];
  /** Lower number = higher priority. */
  priority: number;
};

export type SmartClassification = {
  categoryId: SmartRule["categoryId"];
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  confidence: number;
  reason: "exact" | "phrase" | "token" | "fuzzy";
};

export const TARGET_OTHER_RATIO = 0.03;
export const STRICT_CLASSIFICATION_CONFIDENCE = 0.58;
export const RESCUE_CLASSIFICATION_CONFIDENCE = 0.34;

export const TAG_CLASSIFICATION_RULES: SmartRule[] = [
  {
    categoryId: "technology",
    categoryName: "Technology",
    subcategoryId: "ai",
    subcategoryName: "AI",
    priority: 10,
    keywords: [
      "ai",
      "artificial intelligence",
      "chatgpt",
      "openai",
      "claude",
      "gemini",
      "llm",
      "prompt",
      "agent",
      "ai course",
      "ai scriptwriting",
      "ai 取代",
      "ai取代",
      "future of work",
    ],
  },
  {
    categoryId: "technology",
    categoryName: "Technology",
    subcategoryId: "programming",
    subcategoryName: "Programming",
    priority: 20,
    keywords: [
      "java",
      "python",
      "javascript",
      "typescript",
      "react",
      "nextjs",
      "next js",
      "node",
      "nodejs",
      "c++",
      "programming",
      "code",
      "coding",
      "software development",
      "auth js",
      "auth.js",
    ],
  },
  {
    categoryId: "technology",
    categoryName: "Technology",
    subcategoryId: "developer-tools",
    subcategoryName: "Developer Tools",
    priority: 30,
    keywords: [
      "developer tools",
      "open source",
      "open-source",
      "github",
      "cursor",
      "vercel",
      "api",
      "sdk",
      "framework",
      "tooling",
      "auth js",
      "auth.js",
    ],
  },
  {
    categoryId: "technology",
    categoryName: "Technology",
    subcategoryId: "cloud",
    subcategoryName: "Cloud",
    priority: 40,
    keywords: ["cloud", "alibaba cloud", "aws", "azure", "gcp", "hosting", "deployment", "server"],
  },
  {
    categoryId: "business",
    categoryName: "Business",
    subcategoryId: "branding",
    subcategoryName: "Branding",
    priority: 50,
    keywords: ["brand", "branding", "brand design", "identity", "positioning"],
  },
  {
    categoryId: "business",
    categoryName: "Business",
    subcategoryId: "marketing",
    subcategoryName: "Marketing",
    priority: 60,
    keywords: [
      "marketing",
      "social media marketing",
      "call to action",
      "call-to-action",
      "campaign",
      "conversion",
      "growth",
      "cta",
    ],
  },
  {
    categoryId: "business",
    categoryName: "Business",
    subcategoryId: "entrepreneurship",
    subcategoryName: "Entrepreneurship",
    priority: 70,
    keywords: ["startup", "entrepreneurship", "founder", "venture", "product strategy", "business development"],
  },
  {
    categoryId: "design",
    categoryName: "Design",
    subcategoryId: "visual-design",
    subcategoryName: "Visual Design",
    priority: 80,
    keywords: ["cinematic design", "visual", "layout", "typography", "brand design", "design"],
  },
  {
    categoryId: "design",
    categoryName: "Design",
    subcategoryId: "ai-design",
    subcategoryName: "AI Design",
    priority: 85,
    keywords: ["claude design", "claude-design", "ai design"],
  },
  {
    categoryId: "design",
    categoryName: "Design",
    subcategoryId: "ui-ux",
    subcategoryName: "UI / UX",
    priority: 90,
    keywords: ["ui", "ux", "interface", "glassmorphism", "ui ux", "user experience"],
  },
  {
    categoryId: "media",
    categoryName: "Media & Content",
    subcategoryId: "social-media",
    subcategoryName: "Social Media",
    priority: 100,
    keywords: [
      "social media",
      "x.com",
      "twitter",
      "threads",
      "facebook",
      "instagram",
      "microblogging",
      "short video",
      "post",
      "reels",
    ],
  },
  {
    categoryId: "media",
    categoryName: "Media & Content",
    subcategoryId: "content-creation",
    subcategoryName: "Content Creation",
    priority: 110,
    keywords: ["content creation", "content", "scriptwriting", "copywriting", "creator", "thumbnail"],
  },
  {
    categoryId: "media",
    categoryName: "Media & Content",
    subcategoryId: "video",
    subcategoryName: "Video",
    priority: 120,
    keywords: ["video", "videos", "video editing", "video production"],
  },
  {
    categoryId: "education",
    categoryName: "Education",
    subcategoryId: "learning",
    subcategoryName: "Learning Systems",
    priority: 130,
    keywords: ["course", "learning", "education", "teaching", "pedagogy", "student", "training", "tutorial"],
  },
  {
    categoryId: "music",
    categoryName: "Music & Arts",
    subcategoryId: "music-arts",
    subcategoryName: "Music & Arts",
    priority: 140,
    keywords: ["music", "piano", "performance", "concert", "artist", "arts"],
  },
  {
    categoryId: "events",
    categoryName: "Events",
    subcategoryId: "events-festivals",
    subcategoryName: "Events & Festivals",
    priority: 150,
    keywords: ["event", "festival", "competition", "program", "workshop", "seminar", "masterclass"],
  },
  {
    categoryId: "research",
    categoryName: "Research",
    subcategoryId: "research-analysis",
    subcategoryName: "Research",
    priority: 160,
    keywords: ["research", "paper", "study", "analysis", "report", "dataset", "academic"],
  },
  {
    categoryId: "productivity",
    categoryName: "Productivity",
    subcategoryId: "workflow",
    subcategoryName: "Productivity & Workflow",
    priority: 170,
    keywords: ["workflow", "productivity", "task", "project management", "system", "knowledge base"],
  },
];

function normalizeKeyword(keyword: string): string {
  return normalizeTagName(keyword);
}

function tokenize(value: string): string[] {
  return value.split(" ").filter(Boolean);
}

export function classifyTag(rawTag: string): SmartClassification | null {
  const normalized = normalizeTagName(rawTag);
  if (!normalized) return null;

  let best: SmartClassification | null = null;

  for (const rule of TAG_CLASSIFICATION_RULES) {
    let localScore = 0;
    let localReason: SmartClassification["reason"] | null = null;
    for (const keyword of rule.keywords) {
      const normalizedKeyword = normalizeKeyword(keyword);
      if (!normalizedKeyword) continue;
      if (normalized === normalizedKeyword) {
        localScore = 1;
        localReason = "exact";
        break;
      }
      if (normalized.includes(normalizedKeyword) || normalizedKeyword.includes(normalized)) {
        localScore = Math.max(localScore, 0.92);
        localReason = localReason ?? "phrase";
      } else {
        const tagTokens = tokenize(normalized);
        const keywordTokens = tokenize(normalizedKeyword);
        const overlap = keywordTokens.filter((t) => tagTokens.includes(t)).length;
        if (overlap > 0) {
          const tokenScore = Math.min(0.88, 0.65 + overlap * 0.08);
          if (tokenScore > localScore) {
            localScore = tokenScore;
            localReason = "token";
          }
        }
      }
    }

    if (localScore <= 0 || !localReason) continue;
    const confidence = Math.max(0, localScore - rule.priority * 0.0006);
    const candidate: SmartClassification = {
      categoryId: rule.categoryId,
      categoryName: rule.categoryName,
      subcategoryId: rule.subcategoryId,
      subcategoryName: rule.subcategoryName,
      confidence,
      reason: localReason,
    };

    if (!best || candidate.confidence > best.confidence) {
      best = candidate;
    }
  }
  return best;
}

export function fallbackToOtherOnlyWhenNecessary(
  rawTag: string,
  minConfidence = STRICT_CLASSIFICATION_CONFIDENCE,
): boolean {
  const classification = classifyTag(rawTag);
  return !classification || classification.confidence < minConfidence;
}

export function getTagCategoryPath(rawTag: string): string[] {
  const classification = classifyTag(rawTag);
  if (!classification || fallbackToOtherOnlyWhenNecessary(rawTag)) return ["Other"];
  return [classification.categoryName, classification.subcategoryName];
}

export function getSmartAutoSubcategoryId(classification: SmartClassification): string {
  return `__smart-sub__:${classification.categoryId}:${classification.subcategoryId}`;
}

export function getSmartAutoTagId(rawTag: string, classification: SmartClassification): string {
  const slug = slugifyTagName(rawTag) || normalizeTagName(rawTag).replace(/\s+/g, "-");
  return `__smart-tag__:${classification.categoryId}:${classification.subcategoryId}:${slug}`;
}

export function resolveSmartClassifiedTagId(rawTag: string): string | null {
  if (fallbackToOtherOnlyWhenNecessary(rawTag)) return null;
  const classification = classifyTag(rawTag);
  if (!classification) return null;
  return getSmartAutoTagId(rawTag, classification);
}

export function resolveSmartClassification(
  rawTag: string,
  minConfidence = STRICT_CLASSIFICATION_CONFIDENCE,
): SmartClassification | null {
  const classification = classifyTag(rawTag);
  if (!classification || classification.confidence < minConfidence) return null;
  return classification;
}

export function getUnclassifiedTags(tags: string[]): string[] {
  return tags.filter((tag) => fallbackToOtherOnlyWhenNecessary(tag));
}

/**
 * Build a deterministic category > subcategory > tag tree from a raw list of
 * tags. This utility is intentionally lightweight and is useful for admin
 * diagnostics and tests.
 */
export function buildSmartTagTree(tags: string[]): Record<string, Record<string, string[]>> {
  const tree: Record<string, Record<string, Set<string>>> = {};
  for (const raw of tags) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const classification = classifyTag(trimmed);
    const category = classification?.categoryName ?? "Other";
    const subcategory = classification?.subcategoryName ?? "Other";
    if (!tree[category]) tree[category] = {};
    if (!tree[category][subcategory]) tree[category][subcategory] = new Set();
    tree[category][subcategory].add(trimmed);
  }
  return Object.fromEntries(
    Object.entries(tree).map(([category, sub]) => [
      category,
      Object.fromEntries(
        Object.entries(sub).map(([subcategory, values]) => [
          subcategory,
          [...values].sort((a, b) => a.localeCompare(b)),
        ]),
      ),
    ]),
  );
}

export function filterItemsBySmartTagPath(
  items: KnowledgeItem[],
  path: string[],
  snapshot: TaxonomySnapshot,
): KnowledgeItem[] {
  if (path.length === 0) return items;
  const key = path[path.length - 1]?.trim().toLowerCase();
  if (!key) return items;
  const hit = [...snapshot.tagIndex.values()].find((n) => n.name.toLowerCase() === key || n.id === key);
  if (!hit) return items;
  const allowed = new Set([hit.id, ...hit.children.map((child) => child.id)]);
  return items.filter((item) => {
    const all = [...item.aiTags, ...item.manualTags];
    return all.some((raw) => {
      const id = resolveSmartClassifiedTagId(raw) ?? `__other__:${slugifyTagName(raw) || raw}`;
      return allowed.has(id);
    });
  });
}

export function searchSmartTags(query: string, snapshot: TaxonomySnapshot) {
  const normalized = normalizeTagName(query);
  if (!normalized) return [];
  return flattenSearchableTags(snapshot)
    .filter((entry) => {
      const targets = [entry.name, ...entry.aliases, ...entry.path];
      return targets.some((token) => normalizeTagName(token).includes(normalized));
    })
    .sort((a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name));
}
