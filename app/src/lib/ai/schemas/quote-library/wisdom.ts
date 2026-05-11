import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

export const WisdomAnalysisGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["top_themes", "monthly_insight"],
  properties: {
    top_themes: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        required: ["theme", "description", "supporting_categories"],
        properties: {
          theme: {
            type: "string",
            description: "2–4 word theme name (e.g. 'Patient Endurance', 'Quiet Agency').",
          },
          description: {
            type: "string",
            description:
              "1–2 sentence reflection on how this theme shows up across the user's library.",
          },
          supporting_categories: {
            type: "array",
            items: { type: "string" },
            description:
              "The categories that feed this theme (use the canonical 30 category values).",
          },
        },
      },
    },
    monthly_insight: {
      type: "string",
      description:
        "A warm, non-judgmental paragraph (80–160 words) the user sees as 'This month's insight.' Reflects back the emotional center of their library without prescribing.",
    },
  },
};
