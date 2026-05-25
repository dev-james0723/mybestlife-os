/**
 * Single source of truth for AI Career Mirror identity-banner styles:
 * UI order, Gemini style prompts, dark Liquid-Glass placeholder gradients,
 * and a deterministic 16:9 SVG placeholder.
 *
 * Mirrors `@/lib/knowledge/thumbnail-style-config` (style union + prompt /
 * gradient records) and the SVG-fallback approach in
 * `@/lib/knowledge/ai/generateThumbnail` — `buildCareerBannerSvgPlaceholder`
 * returns a raw SVG markup string (no `<text>`, no data-URL wrapper) so the
 * caller can upload it or inline it however it likes.
 */

export type CareerBannerStyle =
  | "editorial-portrait"
  | "illustrative-photo"
  | "cinematic-founder"
  | "minimal-knowledge"
  | "abstract-landscape"
  | "brand-poster";

/** UI order — drives the picker grid and any select menus. */
export const CAREER_BANNER_STYLES: CareerBannerStyle[] = [
  "editorial-portrait",
  "illustrative-photo",
  "cinematic-founder",
  "minimal-knowledge",
  "abstract-landscape",
  "brand-poster",
];

const KNOWN = new Set<string>(CAREER_BANNER_STYLES);

/**
 * Shared safety clause for every banner prompt. Reuses the no-text language
 * from the knowledge thumbnail config and the respectful-portrait conventions
 * from the quote-thumbnail system prompt: the banner is a tasteful career
 * IDENTITY visual, never a fabricated résumé.
 */
const BANNER_SAFETY =
  "Strictly forbidden: any readable text, letters, numbers, captions, titles, " +
  "typography, watermarks, or logos; any fake awards, trophies, certificates, " +
  "medals, or badges; any fabricated institutions, employers, brands, or " +
  "affiliations; any exaggerated or altered identity (do not change the " +
  "subject's apparent age, ethnicity, body, or profession beyond what is " +
  "natural and respectful). If a portrait reference is provided, treat the " +
  "person naturally, professionally, and respectfully — flattering but honest, " +
  "never glamorized into someone they are not. Compose for a 16:9 (1920x1080) " +
  "cinematic banner with deliberate negative space for an overlay. " +
  "Purely visual — no words.";

/** Gemini "Style:" clause for each banner identity. */
export const CAREER_BANNER_GEMINI_PROMPTS: Record<CareerBannerStyle, string> = {
  "editorial-portrait":
    "高級雜誌式職業肖像 — premium editorial magazine career portrait. Refined " +
    "studio lighting, sophisticated muted palette, generous margins and column " +
    "rhythm, the poise of a cover feature. Suited to creators, artists, and " +
    "founders who want a quietly prestigious presence. " +
    BANNER_SAFETY,
  "illustrative-photo":
    "Half-realistic, half-illustration treatment — a photographic base softened " +
    "and stylized with hand-drawn linework, painterly textures, and gentle color " +
    "grading, in the visual language of a Knowledge Card / Idea Card. Warm, " +
    "thoughtful, conceptual. " +
    BANNER_SAFETY,
  "cinematic-founder":
    "Cinematic, dramatic dark background with strong directional light and deep " +
    "shadow — chiaroscuro, volumetric haze, a single hero light source. Conveys " +
    "resolve and momentum; suited to founders, performers, and strategists. " +
    BANNER_SAFETY,
  "minimal-knowledge":
    "Minimal abstract background — clean color fields, calm hierarchy, a single " +
    "quiet focal gesture. Focus on identity, direction, and clarity rather than " +
    "scenery; lots of breathing room. " +
    BANNER_SAFETY,
  "abstract-landscape":
    "Abstract scene representing the subject's current career state — a stage, a " +
    "city skyline at dusk, a path forward, a star map, or a command center — " +
    "rendered as atmospheric, semi-abstract environment rather than literal " +
    "detail. Evokes where they stand and where they are heading. " +
    BANNER_SAFETY,
  "brand-poster":
    "Personal-brand campaign image — bold, confident art direction with a clear " +
    "hero composition and signature accent color, the feel of a flagship launch " +
    "poster (typography and copy removed). Polished and memorable. " +
    BANNER_SAFETY,
};

/** Dark Liquid-Glass placeholder gradients per style. */
export const CAREER_BANNER_PLACEHOLDER_GRADIENTS: Record<
  CareerBannerStyle,
  { from: string; to: string; accent: string }
> = {
  "editorial-portrait": { from: "#1c1917", to: "#3f3a36", accent: "#d6c7a1" },
  "illustrative-photo": { from: "#1e1b2e", to: "#3b2f4a", accent: "#c4a3ff" },
  "cinematic-founder": { from: "#0a0a0f", to: "#1c1f2b", accent: "#f2b134" },
  "minimal-knowledge": { from: "#0f172a", to: "#1e293b", accent: "#7dd3fc" },
  "abstract-landscape": { from: "#0b1d2a", to: "#11324a", accent: "#34d399" },
  "brand-poster": { from: "#1a0f1e", to: "#3a1330", accent: "#fb7185" },
};

/** English fallback when i18n does not supply a label. */
export const CAREER_BANNER_STYLE_DEFAULT_LABELS: Record<CareerBannerStyle, string> = {
  "editorial-portrait": "Editorial Portrait",
  "illustrative-photo": "Illustrative Photo",
  "cinematic-founder": "Cinematic Founder",
  "minimal-knowledge": "Minimal Knowledge",
  "abstract-landscape": "Abstract Landscape",
  "brand-poster": "Brand Poster",
};

export function isCareerBannerStyle(s: unknown): s is CareerBannerStyle {
  return typeof s === "string" && KNOWN.has(s);
}

/** Coerce DB / API strings to a known style (unknown → editorial-portrait). */
export function normalizeCareerBannerStyle(raw: unknown): CareerBannerStyle {
  if (typeof raw !== "string" || !KNOWN.has(raw)) return "editorial-portrait";
  return raw as CareerBannerStyle;
}

/** djb2-style stable hash — not cryptographic, just consistent across runs. */
function stableHash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h * 33) ^ input.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Deterministic 16:9 (1600x900 viewBox) placeholder banner. Mirrors the SVG
 * fallback in `generateThumbnail.buildPlaceholderSvg` — returns raw SVG markup
 * (string), uses the style gradient, and contains NO text. Instead of a title,
 * it draws an abstract career motif (constellation nodes joined by a rising
 * "path" line) seeded so the same style + seed always renders identically.
 */
export function buildCareerBannerSvgPlaceholder(
  style: CareerBannerStyle,
  opts?: { seed?: string },
): string {
  const { from, to, accent } = CAREER_BANNER_PLACEHOLDER_GRADIENTS[style];
  const seed = stableHash(`${style}:${opts?.seed ?? "career-banner"}`);

  // Derive a rising "career path" polyline across the 16:9 canvas.
  const W = 1600;
  const H = 900;
  const POINTS = 6;
  const pathPoints: Array<{ x: number; y: number }> = [];
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return ((z ^ (z >>> 16)) >>> 0) / 0xffffffff;
  };

  for (let i = 0; i < POINTS; i += 1) {
    const t = i / (POINTS - 1);
    const x = 120 + t * (W - 240);
    // Trend upward (toward smaller y) with per-node jitter.
    const baseY = H - 180 - t * (H - 460);
    const y = baseY + (next() - 0.5) * 120;
    pathPoints.push({ x: Math.round(x), y: Math.round(y) });
  }

  const linePath = pathPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`)
    .join(" ");

  const nodes = pathPoints
    .map((p, i) => {
      const r = i === pathPoints.length - 1 ? 14 : 7;
      const o = i === pathPoints.length - 1 ? "0.95" : "0.6";
      return `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${accent}" fill-opacity="${o}"/>`;
    })
    .join("");

  // Scattered "star map" specks for depth.
  let specks = "";
  for (let i = 0; i < 24; i += 1) {
    const x = Math.round(next() * W);
    const y = Math.round(next() * H);
    const r = (next() * 2 + 0.6).toFixed(2);
    const o = (next() * 0.22 + 0.05).toFixed(2);
    specks += `<circle cx="${x}" cy="${y}" r="${r}" fill="${accent}" fill-opacity="${o}"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="glow" cx="78%" cy="22%" r="60%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${specks}
  <path d="${linePath}" fill="none" stroke="${accent}" stroke-opacity="0.55" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  ${nodes}
</svg>`;
}
