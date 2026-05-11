/**
 * Canonical personal-value anchors.
 *
 * Values bridge quotes ↔ goals ↔ journal entries ↔ decisions. When a quote
 * mentions "Discipline creates freedom", the engine resolves "discipline"
 * and "freedom" to value slugs and then connects the quote to:
 *   - any goal whose name/description mentions the value
 *   - any journal entry whose body mentions the value
 *   - any habit whose name/description mentions the value
 *   - the synthetic `value` node materialized for that slug
 *
 * Values are intentionally a small, stable set so they reliably create hubs
 * — like the target image, where Knowledge / Goals / Quotes / Relationships
 * each act as one of ~12 anchor clusters.
 */

export type ValueSlug =
  | "discipline"
  | "freedom"
  | "self_mastery"
  | "courage"
  | "resilience"
  | "kindness"
  | "honesty"
  | "curiosity"
  | "creativity"
  | "love"
  | "gratitude"
  | "service"
  | "growth"
  | "purpose"
  | "wisdom"
  | "simplicity"
  | "excellence"
  | "presence"
  | "patience"
  | "responsibility";

export interface ValueDef {
  slug: ValueSlug;
  name: string;
  /** Aliases the matcher checks (after normalization). */
  aliases: string[];
}

export const VALUES: ValueDef[] = [
  {
    slug: "discipline",
    name: "Discipline",
    aliases: ["discipline", "self-discipline", "self discipline", "consistency", "紀律"],
  },
  {
    slug: "freedom",
    name: "Freedom",
    aliases: ["freedom", "liberty", "independence", "自由"],
  },
  {
    slug: "self_mastery",
    name: "Self-Mastery",
    aliases: ["self-mastery", "self mastery", "mastery", "self-control"],
  },
  {
    slug: "courage",
    name: "Courage",
    aliases: ["courage", "bravery", "brave", "勇氣", "勇敢"],
  },
  {
    slug: "resilience",
    name: "Resilience",
    aliases: ["resilience", "resilient", "perseverance", "persistence", "韌性"],
  },
  {
    slug: "kindness",
    name: "Kindness",
    aliases: ["kindness", "kind", "compassion", "compassionate"],
  },
  {
    slug: "honesty",
    name: "Honesty",
    aliases: ["honesty", "honest", "truth", "truthful", "integrity"],
  },
  {
    slug: "curiosity",
    name: "Curiosity",
    aliases: ["curiosity", "curious", "wonder"],
  },
  {
    slug: "creativity",
    name: "Creativity",
    aliases: ["creativity", "creative", "creativity and imagination"],
  },
  {
    slug: "love",
    name: "Love",
    aliases: ["love", "loving", "affection"],
  },
  {
    slug: "gratitude",
    name: "Gratitude",
    aliases: ["gratitude", "grateful", "thankful", "thankfulness", "感恩"],
  },
  {
    slug: "service",
    name: "Service",
    aliases: ["service", "serving", "service to others", "contribution"],
  },
  {
    slug: "growth",
    name: "Growth",
    aliases: ["growth", "personal growth", "growing", "成長"],
  },
  {
    slug: "purpose",
    name: "Purpose",
    aliases: ["purpose", "meaningful", "meaning", "vocation"],
  },
  {
    slug: "wisdom",
    name: "Wisdom",
    aliases: ["wisdom", "wise", "perspective", "智慧"],
  },
  {
    slug: "simplicity",
    name: "Simplicity",
    aliases: ["simplicity", "simple", "minimal", "minimalism"],
  },
  {
    slug: "excellence",
    name: "Excellence",
    aliases: ["excellence", "excellent", "craft", "craftsmanship", "mastery of craft"],
  },
  {
    slug: "presence",
    name: "Presence",
    aliases: ["presence", "present", "mindfulness", "mindful", "be here now"],
  },
  {
    slug: "patience",
    name: "Patience",
    aliases: ["patience", "patient", "long-term", "long term thinking"],
  },
  {
    slug: "responsibility",
    name: "Responsibility",
    aliases: ["responsibility", "responsible", "accountability", "accountable"],
  },
];

/** Index alias → ValueSlug. Built once at module load. */
export const VALUE_ALIAS_INDEX: Map<string, ValueSlug> = (() => {
  const idx = new Map<string, ValueSlug>();
  for (const v of VALUES) {
    idx.set(v.slug, v.slug);
    for (const a of v.aliases) idx.set(a.toLowerCase(), v.slug);
  }
  return idx;
})();

const VALUES_BY_SLUG = new Map<ValueSlug, ValueDef>(VALUES.map((v) => [v.slug, v]));

export function getValue(slug: ValueSlug): ValueDef | undefined {
  return VALUES_BY_SLUG.get(slug);
}
