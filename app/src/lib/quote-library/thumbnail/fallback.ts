/**
 * Deterministic premium fallback backgrounds for quote thumbnails.
 *
 * Used in three places:
 *   1. Server-side, when image generation fails — we record the chosen
 *      mood/palette on the row so the row still has metadata to display.
 *   2. Client-side, when the row has no image yet (`pending` /
 *      `generating` / `failed` / `fallback`).
 *   3. Generation prompt — Gemini sees the chosen mood as a hint when the
 *      AI analyzer itself is missing.
 *
 * Design goals:
 *   - Never look like an "error state": always premium, dark, editorial.
 *   - Never repeat the SAME color story across two quotes — even when those
 *     quotes share a category, we deterministically vary palette variant +
 *     hue rotation + accent positions + gradient angle from a stable hash
 *     of the quote id. The space of possible looks per family is in the
 *     thousands, so library scrolls feel visually rich.
 *   - Output is always identical for the same input → no flicker on
 *     navigation or reload.
 */

import type {
  Quote,
  QuoteCategory,
  QuoteEmotionTone,
} from "@/types/quote";

// ============================================================
// Mood families
// ============================================================

export type FallbackMoodFamily =
  | "mindfulness"
  | "ambition"
  | "warmth"
  | "courage"
  | "creativity"
  | "wisdom"
  | "grief"
  | "default";

/**
 * A single palette variant — defined in HSL space so we can rotate hue per
 * quote while keeping the dark, editorial look intact. Each variant carries
 * 4 background stops + 3 radial accents.
 */
type PaletteVariant = {
  label: string;
  /** 4 layered linear gradient stops (background base) — hue, sat%, light%. */
  stops: HslStop[];
  /** 3 radial accent options (any subset chosen per quote). */
  accents: HslAccent[];
};

type HslStop = { h: number; s: number; l: number };
type HslAccent = { h: number; s: number; l: number; a: number };

// ============================================================
// Palette variants — multiple per family for visual diversity
// ============================================================
//
// Each variant is hand-tuned to feel cinematic + dark first. The per-quote
// pipeline below applies (variant pick) → (hue rotation) → (accent
// shuffle/positions) → (gradient angle) so two quotes in the same family
// never read the same.

const VARIANTS: Record<FallbackMoodFamily, PaletteVariant[]> = {
  // ----- Mindfulness ----------------------------------------------------
  mindfulness: [
    {
      label: "moonlit emerald mist",
      stops: [
        { h: 222, s: 70, l: 5 },
        { h: 210, s: 38, l: 11 },
        { h: 168, s: 32, l: 12 },
        { h: 220, s: 50, l: 8 },
      ],
      accents: [
        { h: 142, s: 65, l: 50, a: 0.22 },
        { h: 215, s: 80, l: 60, a: 0.18 },
        { h: 220, s: 16, l: 70, a: 0.12 },
      ],
    },
    {
      label: "ocean depth jade",
      stops: [
        { h: 210, s: 80, l: 6 },
        { h: 200, s: 60, l: 9 },
        { h: 178, s: 50, l: 14 },
        { h: 210, s: 70, l: 7 },
      ],
      accents: [
        { h: 175, s: 70, l: 50, a: 0.22 },
        { h: 200, s: 80, l: 65, a: 0.16 },
        { h: 188, s: 40, l: 75, a: 0.1 },
      ],
    },
    {
      label: "slate stillness",
      stops: [
        { h: 220, s: 24, l: 7 },
        { h: 215, s: 18, l: 12 },
        { h: 200, s: 14, l: 16 },
        { h: 220, s: 22, l: 8 },
      ],
      accents: [
        { h: 188, s: 40, l: 65, a: 0.18 },
        { h: 220, s: 12, l: 75, a: 0.14 },
        { h: 240, s: 30, l: 55, a: 0.16 },
      ],
    },
    {
      label: "pine dawn",
      stops: [
        { h: 160, s: 70, l: 6 },
        { h: 150, s: 50, l: 10 },
        { h: 35, s: 30, l: 15 },
        { h: 160, s: 60, l: 7 },
      ],
      accents: [
        { h: 150, s: 55, l: 50, a: 0.22 },
        { h: 38, s: 85, l: 60, a: 0.14 },
        { h: 175, s: 30, l: 70, a: 0.1 },
      ],
    },
  ],

  // ----- Ambition -------------------------------------------------------
  ambition: [
    {
      label: "graphite + warm gold",
      stops: [
        { h: 240, s: 12, l: 5 },
        { h: 235, s: 14, l: 10 },
        { h: 30, s: 26, l: 11 },
        { h: 240, s: 16, l: 6 },
      ],
      accents: [
        { h: 38, s: 90, l: 55, a: 0.22 },
        { h: 215, s: 30, l: 25, a: 0.32 },
        { h: 45, s: 90, l: 75, a: 0.1 },
      ],
    },
    {
      label: "burgundy summit",
      stops: [
        { h: 350, s: 35, l: 6 },
        { h: 355, s: 40, l: 12 },
        { h: 30, s: 24, l: 13 },
        { h: 350, s: 30, l: 7 },
      ],
      accents: [
        { h: 25, s: 80, l: 55, a: 0.2 },
        { h: 350, s: 60, l: 30, a: 0.28 },
        { h: 40, s: 80, l: 65, a: 0.12 },
      ],
    },
    {
      label: "steel crucible",
      stops: [
        { h: 215, s: 28, l: 6 },
        { h: 210, s: 22, l: 10 },
        { h: 28, s: 40, l: 13 },
        { h: 215, s: 30, l: 7 },
      ],
      accents: [
        { h: 32, s: 90, l: 55, a: 0.22 },
        { h: 200, s: 60, l: 35, a: 0.24 },
        { h: 218, s: 40, l: 70, a: 0.1 },
      ],
    },
    {
      label: "midnight ascent",
      stops: [
        { h: 230, s: 60, l: 5 },
        { h: 225, s: 50, l: 9 },
        { h: 22, s: 50, l: 14 },
        { h: 235, s: 60, l: 6 },
      ],
      accents: [
        { h: 30, s: 75, l: 55, a: 0.2 },
        { h: 225, s: 70, l: 50, a: 0.22 },
        { h: 12, s: 70, l: 60, a: 0.12 },
      ],
    },
  ],

  // ----- Warmth ---------------------------------------------------------
  warmth: [
    {
      label: "burgundy rose-gold",
      stops: [
        { h: 350, s: 30, l: 5 },
        { h: 340, s: 36, l: 10 },
        { h: 12, s: 40, l: 13 },
        { h: 350, s: 30, l: 7 },
      ],
      accents: [
        { h: 348, s: 70, l: 55, a: 0.18 },
        { h: 22, s: 85, l: 60, a: 0.18 },
        { h: 45, s: 85, l: 65, a: 0.1 },
      ],
    },
    {
      label: "amber hearth",
      stops: [
        { h: 18, s: 50, l: 6 },
        { h: 22, s: 55, l: 11 },
        { h: 38, s: 50, l: 13 },
        { h: 16, s: 50, l: 7 },
      ],
      accents: [
        { h: 28, s: 85, l: 60, a: 0.22 },
        { h: 12, s: 75, l: 50, a: 0.18 },
        { h: 40, s: 90, l: 70, a: 0.1 },
      ],
    },
    {
      label: "clay candlelight",
      stops: [
        { h: 14, s: 30, l: 6 },
        { h: 22, s: 30, l: 10 },
        { h: 30, s: 28, l: 14 },
        { h: 16, s: 28, l: 7 },
      ],
      accents: [
        { h: 32, s: 70, l: 60, a: 0.18 },
        { h: 8, s: 60, l: 50, a: 0.18 },
        { h: 38, s: 75, l: 70, a: 0.1 },
      ],
    },
    {
      label: "muted plum",
      stops: [
        { h: 320, s: 30, l: 6 },
        { h: 332, s: 32, l: 11 },
        { h: 348, s: 30, l: 13 },
        { h: 320, s: 28, l: 7 },
      ],
      accents: [
        { h: 340, s: 60, l: 55, a: 0.2 },
        { h: 305, s: 50, l: 60, a: 0.16 },
        { h: 350, s: 80, l: 75, a: 0.1 },
      ],
    },
  ],

  // ----- Courage --------------------------------------------------------
  courage: [
    {
      label: "stormy blues + silver",
      stops: [
        { h: 220, s: 80, l: 4 },
        { h: 215, s: 60, l: 9 },
        { h: 220, s: 50, l: 14 },
        { h: 220, s: 65, l: 6 },
      ],
      accents: [
        { h: 215, s: 90, l: 65, a: 0.22 },
        { h: 220, s: 14, l: 88, a: 0.16 },
        { h: 230, s: 70, l: 30, a: 0.28 },
      ],
    },
    {
      label: "dusk ember",
      stops: [
        { h: 250, s: 50, l: 6 },
        { h: 240, s: 40, l: 10 },
        { h: 18, s: 60, l: 13 },
        { h: 250, s: 50, l: 7 },
      ],
      accents: [
        { h: 22, s: 90, l: 60, a: 0.2 },
        { h: 250, s: 70, l: 55, a: 0.18 },
        { h: 220, s: 18, l: 85, a: 0.12 },
      ],
    },
    {
      label: "steel breakwater",
      stops: [
        { h: 200, s: 30, l: 5 },
        { h: 210, s: 26, l: 11 },
        { h: 195, s: 30, l: 14 },
        { h: 200, s: 30, l: 6 },
      ],
      accents: [
        { h: 195, s: 70, l: 55, a: 0.22 },
        { h: 220, s: 16, l: 88, a: 0.12 },
        { h: 215, s: 60, l: 30, a: 0.26 },
      ],
    },
  ],

  // ----- Creativity -----------------------------------------------------
  creativity: [
    {
      label: "violet ink",
      stops: [
        { h: 260, s: 70, l: 5 },
        { h: 270, s: 60, l: 10 },
        { h: 290, s: 50, l: 14 },
        { h: 260, s: 70, l: 6 },
      ],
      accents: [
        { h: 280, s: 80, l: 60, a: 0.22 },
        { h: 320, s: 75, l: 55, a: 0.18 },
        { h: 260, s: 80, l: 50, a: 0.16 },
      ],
    },
    {
      label: "magenta studio",
      stops: [
        { h: 312, s: 60, l: 5 },
        { h: 320, s: 55, l: 11 },
        { h: 340, s: 50, l: 14 },
        { h: 312, s: 60, l: 6 },
      ],
      accents: [
        { h: 332, s: 85, l: 60, a: 0.22 },
        { h: 280, s: 70, l: 55, a: 0.18 },
        { h: 350, s: 80, l: 70, a: 0.1 },
      ],
    },
    {
      label: "cyan ink trail",
      stops: [
        { h: 200, s: 70, l: 5 },
        { h: 210, s: 65, l: 10 },
        { h: 270, s: 50, l: 13 },
        { h: 200, s: 70, l: 6 },
      ],
      accents: [
        { h: 188, s: 85, l: 55, a: 0.22 },
        { h: 270, s: 80, l: 60, a: 0.16 },
        { h: 210, s: 70, l: 70, a: 0.1 },
      ],
    },
    {
      label: "golden alchemy",
      stops: [
        { h: 280, s: 50, l: 5 },
        { h: 270, s: 40, l: 10 },
        { h: 40, s: 35, l: 13 },
        { h: 280, s: 50, l: 6 },
      ],
      accents: [
        { h: 45, s: 85, l: 60, a: 0.2 },
        { h: 280, s: 70, l: 55, a: 0.2 },
        { h: 18, s: 80, l: 50, a: 0.14 },
      ],
    },
  ],

  // ----- Wisdom ---------------------------------------------------------
  wisdom: [
    {
      label: "antique gold library",
      stops: [
        { h: 30, s: 14, l: 5 },
        { h: 35, s: 16, l: 9 },
        { h: 42, s: 22, l: 12 },
        { h: 30, s: 14, l: 6 },
      ],
      accents: [
        { h: 45, s: 80, l: 60, a: 0.16 },
        { h: 38, s: 60, l: 75, a: 0.1 },
        { h: 28, s: 70, l: 25, a: 0.24 },
      ],
    },
    {
      label: "moss study",
      stops: [
        { h: 100, s: 18, l: 5 },
        { h: 90, s: 22, l: 10 },
        { h: 60, s: 18, l: 13 },
        { h: 100, s: 18, l: 6 },
      ],
      accents: [
        { h: 78, s: 60, l: 55, a: 0.16 },
        { h: 50, s: 70, l: 65, a: 0.1 },
        { h: 110, s: 50, l: 30, a: 0.22 },
      ],
    },
    {
      label: "ivory candle",
      stops: [
        { h: 28, s: 8, l: 5 },
        { h: 30, s: 10, l: 9 },
        { h: 38, s: 12, l: 12 },
        { h: 28, s: 8, l: 6 },
      ],
      accents: [
        { h: 50, s: 70, l: 70, a: 0.14 },
        { h: 30, s: 30, l: 80, a: 0.1 },
        { h: 22, s: 50, l: 30, a: 0.22 },
      ],
    },
  ],

  // ----- Grief / healing ------------------------------------------------
  grief: [
    {
      label: "fogged horizon",
      stops: [
        { h: 215, s: 16, l: 5 },
        { h: 218, s: 14, l: 10 },
        { h: 220, s: 18, l: 14 },
        { h: 215, s: 16, l: 6 },
      ],
      accents: [
        { h: 218, s: 22, l: 70, a: 0.18 },
        { h: 215, s: 14, l: 82, a: 0.12 },
        { h: 218, s: 30, l: 30, a: 0.28 },
      ],
    },
    {
      label: "lavender dusk",
      stops: [
        { h: 250, s: 18, l: 5 },
        { h: 260, s: 22, l: 10 },
        { h: 240, s: 16, l: 14 },
        { h: 250, s: 18, l: 6 },
      ],
      accents: [
        { h: 260, s: 50, l: 65, a: 0.18 },
        { h: 240, s: 20, l: 85, a: 0.12 },
        { h: 270, s: 30, l: 30, a: 0.24 },
      ],
    },
    {
      label: "weathered teal",
      stops: [
        { h: 195, s: 18, l: 5 },
        { h: 188, s: 22, l: 10 },
        { h: 180, s: 16, l: 13 },
        { h: 195, s: 20, l: 6 },
      ],
      accents: [
        { h: 188, s: 50, l: 55, a: 0.18 },
        { h: 200, s: 22, l: 80, a: 0.12 },
        { h: 200, s: 35, l: 30, a: 0.24 },
      ],
    },
  ],

  // ----- Default --------------------------------------------------------
  default: [
    {
      label: "editorial navy bloom",
      stops: [
        { h: 222, s: 60, l: 5 },
        { h: 220, s: 50, l: 9 },
        { h: 215, s: 30, l: 12 },
        { h: 220, s: 50, l: 7 },
      ],
      accents: [
        { h: 215, s: 80, l: 60, a: 0.18 },
        { h: 260, s: 60, l: 60, a: 0.14 },
        { h: 200, s: 80, l: 60, a: 0.1 },
      ],
    },
    {
      label: "midnight rose",
      stops: [
        { h: 280, s: 30, l: 5 },
        { h: 320, s: 35, l: 10 },
        { h: 350, s: 30, l: 13 },
        { h: 280, s: 30, l: 6 },
      ],
      accents: [
        { h: 332, s: 70, l: 60, a: 0.18 },
        { h: 280, s: 60, l: 55, a: 0.14 },
        { h: 22, s: 70, l: 55, a: 0.1 },
      ],
    },
    {
      label: "deep teal mood",
      stops: [
        { h: 195, s: 60, l: 5 },
        { h: 200, s: 50, l: 10 },
        { h: 175, s: 40, l: 13 },
        { h: 195, s: 60, l: 6 },
      ],
      accents: [
        { h: 178, s: 80, l: 55, a: 0.2 },
        { h: 220, s: 70, l: 60, a: 0.14 },
        { h: 195, s: 60, l: 70, a: 0.1 },
      ],
    },
  ],
};

// ============================================================
// Category / tone / tag → family classification
// ============================================================

const CATEGORY_TO_FAMILY: Record<QuoteCategory, FallbackMoodFamily> = {
  // Inner Life
  Resilience: "courage",
  "Self-Awareness": "mindfulness",
  Mindfulness: "mindfulness",
  Courage: "courage",
  Acceptance: "mindfulness",
  Gratitude: "warmth",
  // Purpose & Direction
  Purpose: "ambition",
  Vision: "ambition",
  Discipline: "ambition",
  Growth: "ambition",
  Learning: "wisdom",
  Creativity: "creativity",
  // Relationships
  Love: "warmth",
  Friendship: "warmth",
  Kindness: "warmth",
  Family: "warmth",
  Community: "warmth",
  Forgiveness: "grief",
  // Action & Mastery
  Action: "courage",
  Leadership: "ambition",
  Craft: "creativity",
  Excellence: "ambition",
  Simplicity: "mindfulness",
  Focus: "ambition",
  // Mind & Time
  Wisdom: "wisdom",
  Perspective: "wisdom",
  Time: "wisdom",
  Change: "courage",
  "Death & Impermanence": "grief",
  Wonder: "creativity",
};

const TONE_TO_FAMILY: Record<QuoteEmotionTone, FallbackMoodFamily> = {
  uplifting: "warmth",
  contemplative: "mindfulness",
  challenging: "courage",
  grounding: "mindfulness",
  bittersweet: "grief",
  playful: "creativity",
  fierce: "courage",
  tender: "warmth",
  curious: "creativity",
  resolute: "ambition",
};

const TAG_KEYWORDS: Array<[FallbackMoodFamily, RegExp]> = [
  ["mindfulness", /\b(mindful|calm|peace|stillness|breath|present|meditat)/i],
  ["ambition", /\b(ambition|discipline|growth|grit|hustle|focus|goal|vision)/i],
  ["warmth", /\b(love|family|friend|kind|warm|heart|community|tender)/i],
  ["courage", /\b(courage|brave|fear|resilien|storm|fight|challenge)/i],
  ["creativity", /\b(creat|art|imagin|wonder|play|express|inspir)/i],
  ["wisdom", /\b(wisdom|knowledge|learn|philosoph|truth|reflect|study)/i],
  ["grief", /\b(grief|loss|forgive|heal|sorrow|mourn|let go|release)/i],
];

// ============================================================
// Hashing + HSL helpers
// ============================================================

/** djb2-style stable hash. Not cryptographic — just consistent across runs. */
function stableHash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h * 33) ^ input.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Splitmix32 — generates a sequence of well-distributed pseudo-random ints
 * from a seed. Used so that derived values (variant pick, hue shift, accent
 * positions, angle, accent count) are mutually independent. Same seed
 * → same sequence, so cards stay stable across reloads.
 */
function rngFromSeed(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    z = (z ^ (z >>> 16)) >>> 0;
    return z;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) =>
    light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const toHex = (v: number) =>
    Math.round(255 * v)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hslToCss(h: number, s: number, l: number, a = 1): string {
  if (a >= 0.999) return hslToHex(h, s, l);
  return `hsla(${Math.round(h)}, ${Math.round(clamp(s, 0, 100))}%, ${Math.round(clamp(l, 0, 100))}%, ${a.toFixed(3)})`;
}

// ============================================================
// Public API
// ============================================================

export type FallbackInput = {
  quote_id?: string | null;
  quote_text?: string | null;
  category?: QuoteCategory | null;
  emotion_tone?: QuoteEmotionTone | null;
  tags?: string[] | null;
  thumbnail_mood?: string | null;
};

export type FallbackThumbnailConfig = {
  family: FallbackMoodFamily;
  variantLabel: string;
  /** Single-string `background:` value the card can drop straight into `style`. */
  cssBackground: string;
  /** Hex stops for tooling / DB metadata (post-rotation). */
  paletteHex: string[];
  /** Mood label used for the metadata field. */
  moodLabel: string;
};

export function classifyFallbackFamily(input: FallbackInput): FallbackMoodFamily {
  if (input.thumbnail_mood) {
    const m = input.thumbnail_mood.toLowerCase();
    for (const family of Object.keys(VARIANTS) as FallbackMoodFamily[]) {
      if (family === "default") continue;
      if (m.includes(family)) return family;
    }
  }

  if (input.category) return CATEGORY_TO_FAMILY[input.category];
  if (input.emotion_tone) return TONE_TO_FAMILY[input.emotion_tone];

  const haystack = [
    ...(input.tags ?? []),
    input.quote_text ?? "",
  ]
    .join(" ")
    .toLowerCase();
  if (haystack.trim().length > 0) {
    for (const [family, rx] of TAG_KEYWORDS) {
      if (rx.test(haystack)) return family;
    }
  }

  // No category / tone / tag signal: rotate through non-default families
  // by hash so even "naked" quotes look diverse.
  const seed = stableHash(input.quote_id ?? input.quote_text ?? "default");
  const families: FallbackMoodFamily[] = [
    "mindfulness",
    "ambition",
    "warmth",
    "courage",
    "creativity",
    "wisdom",
  ];
  return families[seed % families.length] ?? "default";
}

/**
 * Build the deterministic fallback config. Pure function — safe to call
 * server- or client-side. Same input ALWAYS yields the same output.
 *
 * Variation knobs (each derived from the quote-id hash):
 *   - palette variant index (3–4 per family)
 *   - hue rotation        ±18°
 *   - saturation jitter   ±10%
 *   - lightness jitter    ±4%
 *   - 2 of 3 accents picked + per-accent micro hue rotation ±6°
 *   - accent positions    drawn from a 5×5 grid + jitter
 *   - linear angle        90°–200°
 */
export function getFallbackQuoteThumbnailConfig(
  input: FallbackInput,
): FallbackThumbnailConfig {
  const family = classifyFallbackFamily(input);
  const variants = VARIANTS[family];

  const seedSource =
    input.quote_id ?? input.quote_text ?? input.thumbnail_mood ?? family;
  const seed = stableHash(`${family}:${seedSource}`);
  const rng = rngFromSeed(seed);

  const variant = variants[rng() % variants.length] ?? variants[0];

  // Deterministic transforms.
  const hueShift = (rng() % 37) - 18; // -18..+18
  const satMul = 0.9 + (rng() % 21) / 100; // 0.90..1.10
  const lightShift = (rng() % 9) - 4; // -4..+4
  const angle = 90 + (rng() % 111); // 90..200

  // Apply rotation to base stops.
  const rotatedStops = variant.stops.map((stop) => ({
    h: (stop.h + hueShift + 360) % 360,
    s: clamp(stop.s * satMul, 0, 100),
    l: clamp(stop.l + lightShift, 2, 22), // stay dark
  }));

  // Pick 2 accents out of 3 deterministically (skip one) + slightly rotate.
  const skipIndex = rng() % variant.accents.length;
  const chosenAccents = variant.accents
    .filter((_, idx) => idx !== skipIndex)
    .map((accent) => ({
      h: (accent.h + hueShift + ((rng() % 13) - 6) + 360) % 360,
      s: clamp(accent.s * satMul, 20, 95),
      l: clamp(accent.l + lightShift, 25, 80),
      a: accent.a,
    }));

  // Add a third "sparkle" accent — same family, but pulled from the *next*
  // variant in the family with a strong hue rotation, so similar quotes get
  // complementary highlights instead of identical ones.
  const sparkleSource =
    variants[(variants.indexOf(variant) + 1) % variants.length]?.accents[
      rng() % 3
    ];
  if (sparkleSource) {
    chosenAccents.push({
      h: (sparkleSource.h + hueShift + ((rng() % 21) - 10) + 360) % 360,
      s: clamp(sparkleSource.s * satMul, 20, 95),
      l: clamp(sparkleSource.l + lightShift, 25, 80),
      a: sparkleSource.a * 0.65,
    });
  }

  // Accent positions: 5×5 grid (interior cells) + small jitter so two quotes
  // never light the same corner identically.
  const positions = pickPositions(rng, chosenAccents.length);

  const radialLayers = chosenAccents
    .map((accent, idx) => {
      const pos = positions[idx];
      return `radial-gradient(circle at ${pos.x}% ${pos.y}%, ${hslToCss(
        accent.h,
        accent.s,
        accent.l,
        accent.a,
      )}, transparent 38%)`;
    })
    .join(", ");
  const linearLayer = `linear-gradient(${angle}deg, ${rotatedStops
    .map((s) => hslToHex(s.h, s.s, s.l))
    .join(", ")})`;

  const paletteHex = [
    ...rotatedStops.map((s) => hslToHex(s.h, s.s, s.l)),
    ...chosenAccents.map((a) => hslToHex(a.h, a.s, a.l)),
  ];

  return {
    family,
    variantLabel: variant.label,
    cssBackground: `${radialLayers}, ${linearLayer}`,
    paletteHex,
    moodLabel: `${capitalizeFirst(family)} — ${variant.label}`,
  };
}

function pickPositions(
  rng: () => number,
  count: number,
): { x: number; y: number }[] {
  // 5×5 inner grid: 12,28,50,72,88 — avoid hard corners.
  const lanes = [12, 28, 50, 72, 88];
  const result: { x: number; y: number }[] = [];
  const used = new Set<number>();
  while (result.length < count) {
    const xi = rng() % lanes.length;
    const yi = rng() % lanes.length;
    const key = xi * 10 + yi;
    if (used.has(key)) {
      // fallback — accept duplicate but with different jitter
    } else {
      used.add(key);
    }
    const jitterX = (rng() % 7) - 3;
    const jitterY = (rng() % 7) - 3;
    result.push({
      x: clamp(lanes[xi] + jitterX, 5, 95),
      y: clamp(lanes[yi] + jitterY, 5, 95),
    });
  }
  return result;
}

function capitalizeFirst(s: string): string {
  if (s.length === 0) return s;
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * Convenience adaptor — accept a full Quote row and return the matching
 * fallback config. Useful for cards that already have the row in scope.
 */
export function getFallbackForQuote(
  quote: Pick<
    Quote,
    "id" | "quote_text" | "category" | "emotion_tone" | "tags" | "thumbnail_mood"
  >,
): FallbackThumbnailConfig {
  return getFallbackQuoteThumbnailConfig({
    quote_id: quote.id,
    quote_text: quote.quote_text,
    category: quote.category,
    emotion_tone: quote.emotion_tone,
    tags: quote.tags,
    thumbnail_mood: quote.thumbnail_mood,
  });
}
