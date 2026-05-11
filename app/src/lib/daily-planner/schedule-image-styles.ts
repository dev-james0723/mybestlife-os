export type ScheduleImageStyle = {
  id: string;
  /** Dropdown label (matches Blocks / product copy). */
  label: string;
  /**
   * Full art direction for Gemini image models — keep in sync with the UI list.
   * The API merges this into the schedule poster prompt so the model does not
   * have to infer the look from the short label alone.
   */
  promptDirective: string;
};

/**
 * Curated visual styles for schedule posters (matches original Blocks app options).
 * Each `promptDirective` is written for image generation: palette, typography, texture, layout.
 */
export const SCHEDULE_IMAGE_STYLES: ScheduleImageStyle[] = [
  {
    id: "museum-label-editorial",
    label: "Museum Label Editorial (Monochrome)",
    promptDirective:
      "Monochrome museum / gallery editorial: generous white space, quiet grid, captions that feel like wall labels and catalog entries. Typography: refined serif for titles, small neutral sans for times. Black ink on warm-white or cool-white paper; subtle print grain or letterpress impression. Thin hairline rules only; no color accents. Calm, institutional, legible at a glance.",
  },
  {
    id: "swiss-typographic",
    label: "Swiss / International Typographic Style",
    promptDirective:
      "Swiss International Typographic poster: strict modular grid, asymmetrical balance, Helvetica-like neo-grotesk, flush-left ragged-right discipline. Strong hierarchy with one dominant scale contrast; optional single disciplined accent (e.g. red or black) used sparingly. Mathematical spacing, objective tone, zero decoration beyond structure.",
  },
  {
    id: "luxury-fashion-editorial",
    label: "Luxury Fashion Editorial (Muted, Minimal)",
    promptDirective:
      "Luxury fashion editorial spread: muted stone, taupe, warm gray, and soft black; whisper-thin type and airy leading. Minimal ornament; negative space feels expensive. Subtle paper tooth or matte print finish. Titles elegant and restrained; body copy quiet. Overall impression: quiet couture lookbook, not loud branding.",
  },
  {
    id: "archival-portrait",
    label: "Archival Classical Portrait Restoration (Subtle)",
    promptDirective:
      "Archival / classical restoration aesthetic: soft ivory or aged paper, very subtle foxing or plate tone (barely visible). Gentle vignette or museum mat border suggestion—no literal photo frame. Typography classic and understated; colors restrained sepia-to-charcoal range. Mood: conserved document, dignified and timeless.",
  },
  {
    id: "concert-poster",
    label: "Modern Concert Poster Design (Minimalist)",
    promptDirective:
      "Contemporary minimalist gig poster: bold but simple typographic lockup, strong vertical or horizontal rhythm, limited palette (often 2–3 flat colors or black + one accent). High impact from scale and spacing, not from ornament. Clear poster hierarchy: date and schedule read as the hero information.",
  },
  {
    id: "bauhaus-modernism",
    label: "Bauhaus-Inspired Modernism (Understated)",
    promptDirective:
      "Understated Bauhaus-modernist layout: primary geometry (circles, bars, right angles) used sparingly as structure, not busy pattern. Functional sans-serif, rational grid, red-blue-yellow or black used in small disciplined touches if color appears at all. Flat planes, no skeuomorphism; clarity and craft over decoration.",
  },
  {
    id: "fine-art-book-spread",
    label: "Fine-Art Book Spread (Gallery Catalog Layout)",
    promptDirective:
      "Fine-art auction or gallery catalog spread: wide margins, caption-driven layout, catalog numbering feel without inventing fake ISBNs or logos. Serif + complementary sans; subtle column rhythm. Neutral gallery paper; black and soft gray ink. Feels like a plate page from a serious art book.",
  },
  {
    id: "cinematic-monochrome",
    label: "Cinematic Low-Key Monochrome (Stage Lighting)",
    promptDirective:
      "Cinematic low-key monochrome: deep blacks, controlled highlights, stage-spotlight contrast. Typography can sit on dark fields with crisp white or silver type, or reverse with dramatic negative space. Subtle film grain optional. Mood: hushed theater or backstage call sheet—moody but still highly readable.",
  },
  {
    id: "ink-paper-texture",
    label: "Minimal Ink + Paper Texture (Warm Gray / Muted Gold Accent)",
    promptDirective:
      "Warm gray handmade paper or laid paper texture, charcoal and soft black ink. One muted gold accent only (thin rule, small cap line, or micro-highlight)—no metallic rainbow. Minimalist composition; type feels pressed into fiber. Artisan notebook or letterpress stationery vibe, not glossy UI.",
  },
  {
    id: "neo-classical-branding",
    label: "Neo-Classical Branding System (Series Template Aesthetic)",
    promptDirective:
      "Neo-classical luxury branding system: refined high-contrast serif for display, disciplined secondary sans. Template-like consistency—repeated zones for date, title band, and schedule blocks. Ivory, deep navy, or soft black with restrained gold line work optional. Feels like a numbered series identity manual made into a poster.",
  },
];

export type ResolvedScheduleImageStyle = {
  id: string;
  label: string;
  promptDirective: string;
};

/** Normalize client `styleId` to a known catalog entry (defaults to first style). */
export function resolveScheduleImageStyle(styleId: string | undefined): ResolvedScheduleImageStyle {
  const trimmed = (styleId ?? "").trim();
  const hit = SCHEDULE_IMAGE_STYLES.find((s) => s.id === trimmed);
  if (hit) return { id: hit.id, label: hit.label, promptDirective: hit.promptDirective };
  const fallback = SCHEDULE_IMAGE_STYLES[0]!;
  return { id: fallback.id, label: fallback.label, promptDirective: fallback.promptDirective };
}

export function getScheduleImageStyleLabel(styleId: string): string {
  return resolveScheduleImageStyle(styleId).label;
}
