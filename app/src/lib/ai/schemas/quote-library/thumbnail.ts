/**
 * Gemini structured-output schema for the Quote Thumbnail analyzer.
 *
 * The model receives the quote, author, tags, and category, and returns
 * structured visual direction (mood, palette, composition notes) plus a
 * single ready-to-render image prompt. Pair with the Zod validator in
 * `lib/validators/quote.ts` to harden the boundary.
 */

import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

export const ThumbnailDirectionGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: [
    "mood",
    "tone",
    "visual_keywords",
    "color_palette",
    "composition_notes",
    "symbolism",
    "image_prompt",
  ],
  properties: {
    mood: {
      type: "string",
      description:
        "2–4 mood adjectives separated by commas (e.g. 'mindful, contemplative, calm').",
    },
    tone: {
      type: "string",
      description:
        "2–4 emotional/tonal adjectives that describe how the image should feel (e.g. 'quiet, reflective, disciplined').",
    },
    visual_keywords: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "string",
        description:
          "Concrete visual element to include: mist, moonlight, still water, particles, soft horizon, etc.",
      },
    },
    color_palette: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "string",
        description:
          "Color name in plain English (e.g. 'deep navy', 'muted emerald', 'soft silver'). Stay dark-premium.",
      },
    },
    composition_notes: {
      type: "string",
      description:
        "One paragraph: where to leave negative space, depth, focal point, abstraction level. Always preserve readability for white quote typography overlay.",
    },
    symbolism: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: {
        type: "string",
        description:
          "Symbolic concepts the image should evoke (release, peace, ascent, etc.). Keep abstract.",
      },
    },
    image_prompt: {
      type: "string",
      description:
        "Final image-generation prompt — a single self-contained paragraph (250–520 chars) that an image model can render directly. Must explicitly forbid text/logos/human faces, demand strong negative space for white typography overlay, and request a cinematic dark editorial aesthetic.",
    },
  },
};
