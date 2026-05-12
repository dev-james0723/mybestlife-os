import { z } from "zod";

export const infographicFocusOptionsResponseSchema = z.object({
  document_type: z.enum([
    "financial_report",
    "event_guide",
    "academic",
    "policy",
    "manual",
    "marketing",
    "legal",
    "unknown",
  ]),
  summary: z.string(),
  focus_options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
      recommended_styles: z.array(z.string()).optional(),
      source_pages: z.array(z.number()).optional(),
      source_sections: z.array(z.string()).optional(),
    }),
  ),
});

export type InfographicFocusOptionsResponse = z.infer<typeof infographicFocusOptionsResponseSchema>;

export const audioFocusOptionsResponseSchema = z.object({
  document_summary: z.string(),
  focus_options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
      recommended_duration: z.string().optional(),
    }),
  ),
});

export type AudioFocusOptionsResponse = z.infer<typeof audioFocusOptionsResponseSchema>;

const chapterSchema = z.object({
  title: z.string(),
  text: z.string(),
  source_pages: z.array(z.number()).optional(),
});

export const audioScriptSingleHostSchema = z.object({
  format: z.literal("single_host").optional(),
  title: z.string(),
  estimated_duration_seconds: z.number().optional(),
  script: z.string(),
  chapters: z.array(chapterSchema),
  source_pages: z.array(z.number()),
  source_sections: z.array(z.string()),
});

export const audioScriptTwoHostsSchema = z.object({
  format: z.literal("two_hosts"),
  title: z.string().optional(),
  estimated_duration_seconds: z.number().optional(),
  turns: z.array(
    z.object({
      speaker: z.string(),
      text: z.string(),
    }),
  ),
  source_pages: z.array(z.number()).optional(),
  source_sections: z.array(z.string()).optional(),
});

export type AudioScriptSingleHost = z.infer<typeof audioScriptSingleHostSchema>;
export type AudioScriptTwoHosts = z.infer<typeof audioScriptTwoHostsSchema>;
