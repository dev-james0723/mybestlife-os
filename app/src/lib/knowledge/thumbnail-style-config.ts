/**
 * Single source of truth for knowledge (and shared project) thumbnail styles:
 * UI order, preview paths, Gemini style prompts, and SVG placeholder gradients.
 */

export const THUMBNAIL_STYLES_ORDER = [
  "minimal",
  "gradient",
  "illustrated",
  "photographic",
  "abstract",
  "glassmorphism",
  "three_d_render",
  "editorial",
  "isometric",
  "brutalist",
  "retro_y2k",
  "na",
] as const;

export type ThumbnailStyle = (typeof THUMBNAIL_STYLES_ORDER)[number];

export const THUMBNAIL_STYLES: ThumbnailStyle[] = [...THUMBNAIL_STYLES_ORDER];

export type GeneratableThumbnailStyle = Exclude<ThumbnailStyle, "na">;

export const GENERATABLE_THUMBNAIL_STYLES: GeneratableThumbnailStyle[] =
  THUMBNAIL_STYLES.filter((s): s is GeneratableThumbnailStyle => s !== "na");

const KNOWN = new Set<string>(THUMBNAIL_STYLES);

const NO_READABLE_TEXT =
  "Purely visual — no readable text, letters, numbers, captions, titles, watermarks, or logos; " +
  "no photorealistic people. Use abstract shapes, color fields, light, and composition only.";

/** Gemini “Style:” clause — topic/context still drive subject matter in generateThumbnail. */
export const KNOWLEDGE_THUMBNAIL_GEMINI_PROMPTS: Record<GeneratableThumbnailStyle, string> = {
  minimal:
    "Minimalist illustration: clean lines, muted neutral palette, generous whitespace, calm hierarchy. " +
    NO_READABLE_TEXT,
  gradient:
    "Vibrant gradient backdrop, abstract shapes, modern design, bold colors. " + NO_READABLE_TEXT,
  illustrated:
    "Hand-drawn illustration style, warm tones, sketch-like quality, soft editorial mood (no type). " +
    NO_READABLE_TEXT,
  photographic:
    "Cinematic photograph mood: shallow depth of field, moody lighting, dark tones — still life, " +
    "texture, environment, or abstract scene only. " +
    NO_READABLE_TEXT,
  abstract:
    "Abstract geometric art, bold shapes, contrasting colors, contemporary design. " +
    NO_READABLE_TEXT,
  glassmorphism:
    "Glassmorphism / liquid-glass UI aesthetic: frosted translucent layers, soft blur, subtle specular " +
    "highlights, depth stacking, calm futuristic light — abstract panels and shapes only, no labels or icons " +
    "that imply text. " +
    NO_READABLE_TEXT,
  three_d_render:
    "Polished 3D product-style render: soft studio lighting, smooth rounded forms, subtle reflections, " +
    "premium material feel — abstract objects or symbolic forms, not branded gadgets. " +
    NO_READABLE_TEXT,
  editorial:
    "High-end print layout mood without any type: generous margins, paper grain, duotone or muted blocks, " +
    "tasteful crop and column rhythm suggested by abstract rectangles and photography-like negative space — " +
    "magazine sophistication as pure geometry and tone, zero letterforms. " +
    NO_READABLE_TEXT,
  isometric:
    "Isometric 3D illustration: clean axonometric perspective, tidy geometric blocks, soft shadows, " +
    "miniature abstract scene (objects/platforms only), calm storytelling through shape and color. " +
    NO_READABLE_TEXT,
  brutalist:
    "Neo-brutalist graphic design (web/UI inspired): bold rectangular slabs, visible grid, high contrast, " +
    "chunky abstract composition — contemporary digital brutalism, not violence; stark geometry only. " +
    NO_READABLE_TEXT,
  retro_y2k:
    "Retro Y2K / early-web futurism: chrome sheen, glossy gradients, soft bloom, holographic accents, " +
    "playful abstract shapes — nostalgic cyber aesthetic, no brand marks or UI chrome that reads as text. " +
    NO_READABLE_TEXT,
};

export const KNOWLEDGE_THUMBNAIL_PLACEHOLDER_GRADIENTS: Record<
  GeneratableThumbnailStyle,
  { from: string; to: string; accent: string }
> = {
  minimal: { from: "#f8fafc", to: "#e2e8f0", accent: "#64748b" },
  gradient: { from: "#818cf8", to: "#c084fc", accent: "#ffffff" },
  illustrated: { from: "#fef3c7", to: "#fde68a", accent: "#92400e" },
  photographic: { from: "#0f172a", to: "#1e293b", accent: "#94a3b8" },
  abstract: { from: "#f43f5e", to: "#8b5cf6", accent: "#ffffff" },
  glassmorphism: { from: "#e0f2fe", to: "#c7d2fe", accent: "#334155" },
  three_d_render: { from: "#f1f5f9", to: "#cbd5e1", accent: "#475569" },
  editorial: { from: "#fafaf9", to: "#d6d3d1", accent: "#1c1917" },
  isometric: { from: "#ecfeff", to: "#a5f3fc", accent: "#0e7490" },
  brutalist: { from: "#fafafa", to: "#171717", accent: "#fafafa" },
  retro_y2k: { from: "#fbcfe8", to: "#a78bfa", accent: "#fdf4ff" },
};

const PREVIEW_BASE = "/knowledge/thumbnail-style-previews";

/** Public URL path for Next/Image; `na` has no raster preview. */
export function thumbnailStylePreviewSrc(style: ThumbnailStyle): string | undefined {
  if (style === "na") return undefined;
  return `${PREVIEW_BASE}/${style}.jpg`;
}

/** English fallback when i18n does not supply a label. */
export const THUMBNAIL_STYLE_DEFAULT_LABELS: Record<ThumbnailStyle, string> = {
  minimal: "Minimal",
  gradient: "Gradient",
  illustrated: "Illustrated",
  photographic: "Photo",
  abstract: "Abstract",
  glassmorphism: "Glassmorphism",
  three_d_render: "3D Render",
  editorial: "Editorial",
  isometric: "Isometric",
  brutalist: "Brutalist",
  retro_y2k: "Retro / Y2K",
  na: "N/A",
};

export function isGeneratableThumbnailStyle(
  s: ThumbnailStyle,
): s is GeneratableThumbnailStyle {
  return s !== "na";
}

/** Coerce DB / API strings to a known style (unknown → minimal). */
export function normalizeThumbnailStyle(raw: unknown): ThumbnailStyle {
  if (typeof raw !== "string" || !KNOWN.has(raw)) return "minimal";
  return raw as ThumbnailStyle;
}

export function parseThumbnailStyle(formValue: FormDataEntryValue | null): ThumbnailStyle {
  if (formValue == null) return "minimal";
  if (typeof formValue !== "string") return "minimal";
  return normalizeThumbnailStyle(formValue);
}
