import type { BucketDreamImage, BucketType } from "@/types/bucket-list";

/** Stable Unsplash CDN URLs (auto=format, fit=crop) — photographic, not illustration. */
function unsplash(photoId: string, width = 1200): string {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&q=80`;
}

export type DreamImageRule = {
  id: string;
  patterns: RegExp[];
  types?: BucketType[];
  image: BucketDreamImage;
  /** Higher = checked first among rules with equal pattern hits. */
  priority?: number;
};

/** Keyword / destination rules — ordered by specificity (first strong match wins). */
export const DREAM_IMAGE_RULES: DreamImageRule[] = [
  {
    id: "iceland-aurora",
    patterns: [
      /\biceland\b/i,
      /\bnorthern lights\b/i,
      /\baurora\b/i,
      /\breykjav/i,
    ],
    types: ["travel"],
    priority: 100,
    image: {
      url: unsplash("1483342388111-0b3bfbd84308"),
      alt: "Northern lights over Icelandic landscape",
      source: "Unsplash",
      sourceType: "static",
    },
  },
  {
    id: "sri-lanka",
    patterns: [/\bsri lanka\b/i, /\bcolombo\b/i, /\bella\b/i, /\bsigiriya\b/i],
    types: ["travel"],
    priority: 95,
    image: {
      url: unsplash("1580619305218-8423e50c6b0d"),
      alt: "Coastal landscape in Sri Lanka",
      source: "Unsplash",
      sourceType: "static",
    },
  },
  {
    id: "japan-culture",
    patterns: [
      /\bjapan(?:ese)?\b/i,
      /\bjlpt\b/i,
      /\bkyoto\b/i,
      /\btokyo\b/i,
      /\bmt\.?\s*fuji\b/i,
      /\bfuji\b/i,
    ],
    priority: 90,
    image: {
      url: unsplash("1493976040374-85c8e712f0f6"),
      alt: "Traditional street scene in Japan",
      source: "Unsplash",
      sourceType: "static",
    },
  },
  {
    id: "cabin-retreat",
    patterns: [
      /\bcabin\b/i,
      /\bretreat\b/i,
      /\boff-?grid\b/i,
      /\bcottage\b/i,
      /\blake house\b/i,
    ],
    types: ["purchase", "lifestyle"],
    priority: 85,
    image: {
      url: unsplash("1449158743716-0a113ebbef1b"),
      alt: "Quiet cabin retreat in a forest",
      source: "Unsplash",
      sourceType: "static",
    },
  },
  {
    id: "marathon",
    patterns: [/\bmarathon\b/i, /\b42\.?2\b/i, /\brunning race\b/i],
    types: ["growth", "achievement"],
    priority: 80,
    image: {
      url: unsplash("1452626038306-9d0ae0c2d0c0"),
      alt: "Runners at a road marathon",
      source: "Unsplash",
      sourceType: "static",
    },
  },
  {
    id: "creative-product",
    patterns: [
      /\bprofitable\b/i,
      /\bcreative product\b/i,
      /\bship\b.*\b(product|app|course)\b/i,
      /\bentrepreneur/i,
    ],
    types: ["achievement"],
    priority: 75,
    image: {
      url: unsplash("1519389950473-47ba0277781c"),
      alt: "Creative team building a product",
      source: "Unsplash",
      sourceType: "static",
    },
  },
  {
    id: "family-trip",
    patterns: [
      /\bparents\b/i,
      /\bfamily trip\b/i,
      /\bweekend getaway\b/i,
      /\breconnect\b/i,
    ],
    types: ["relationship"],
    priority: 70,
    image: {
      url: unsplash("1529156069898-49953e39b3ac"),
      alt: "Warm family moment on a coastal trip",
      source: "Unsplash",
      sourceType: "static",
    },
  },
  {
    id: "dream-car",
    patterns: [/\bdream car\b/i, /\bnew car\b/i, /\broad trip\b/i],
    types: ["purchase"],
    priority: 65,
    image: {
      url: unsplash("1492144534655-ae79c964c9d7"),
      alt: "Car on an open road at golden hour",
      source: "Unsplash",
      sourceType: "static",
    },
  },
  {
    id: "europe-city",
    patterns: [
      /\bparis\b/i,
      /\blondon\b/i,
      /\brome\b/i,
      /\bbarcelona\b/i,
      /\bamsterdam\b/i,
    ],
    types: ["travel"],
    priority: 60,
    image: {
      url: unsplash("1502602898657-3e91760cbb34"),
      alt: "European city skyline at dusk",
      source: "Unsplash",
      sourceType: "static",
    },
  },
  {
    id: "tropical-beach",
    patterns: [
      /\bbeach\b/i,
      /\bisland\b/i,
      /\bmaldives\b/i,
      /\bbali\b/i,
      /\bhawaii\b/i,
      /\bthailand\b/i,
    ],
    types: ["travel", "lifestyle"],
    priority: 55,
    image: {
      url: unsplash("1507525428034-b723cf961d3e"),
      alt: "Tropical beach and clear water",
      source: "Unsplash",
      sourceType: "static",
    },
  },
  {
    id: "mountain-summit",
    patterns: [
      /\bclimb\b/i,
      /\bsummit\b/i,
      /\beverest\b/i,
      /\balps\b/i,
      /\bhike\b/i,
      /\bmountain\b/i,
    ],
    types: ["travel", "growth", "achievement"],
    priority: 50,
    image: {
      url: unsplash("1464822759023-fed622ff2c3b"),
      alt: "Mountain summit above the clouds",
      source: "Unsplash",
      sourceType: "static",
    },
  },
  {
    id: "language-learning",
    patterns: [
      /\bconversational\b/i,
      /\blanguage\b/i,
      /\blearning\b/i,
      /\bfluent\b/i,
    ],
    types: ["growth"],
    priority: 45,
    image: {
      url: unsplash("1528164343825-96cf4a393bac"),
      alt: "Japanese street atmosphere for language learning",
      source: "Unsplash",
      sourceType: "static",
    },
  },
];

export const DREAM_IMAGE_TYPE_FALLBACKS: Record<BucketType, BucketDreamImage> = {
  travel: {
    url: unsplash("1469854523086-cc02fe5d8800"),
    alt: "Scenic travel destination landscape",
    source: "Unsplash",
    sourceType: "static",
  },
  achievement: {
    url: unsplash("1552664730-d307ca884978"),
    alt: "Achievement and milestone celebration",
    source: "Unsplash",
    sourceType: "static",
  },
  growth: {
    url: unsplash("1456513080510-7bf3a84b82f8"),
    alt: "Personal growth and learning environment",
    source: "Unsplash",
    sourceType: "static",
  },
  relationship: {
    url: unsplash("1529156069898-49953e39b3ac"),
    alt: "Warm connection and shared memories",
    source: "Unsplash",
    sourceType: "static",
  },
  purchase: {
    url: unsplash("1560448204-e02f11c2d0e2"),
    alt: "Lifestyle purchase aspiration",
    source: "Unsplash",
    sourceType: "static",
  },
  lifestyle: {
    url: unsplash("1506905925346-21bda4d32df4"),
    alt: "Calm lifestyle and wellbeing scene",
    source: "Unsplash",
    sourceType: "static",
  },
};

export const DREAM_IMAGE_GLOBAL_FALLBACK: BucketDreamImage = {
  url: unsplash("1506744038136-46273834b3fb"),
  alt: "Dream horizon landscape",
  source: "Unsplash",
  sourceType: "static",
};
