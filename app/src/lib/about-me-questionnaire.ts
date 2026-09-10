import { z } from "zod";
import type { Json } from "@/types/database";

export const questionnaireSchema = z.object({
  version: z.literal(1),
  quick: z.object({ focus: z.string().max(500), minutes: z.string().max(40), help: z.string().max(100) }),
  answers: z.record(z.string(), z.array(z.string().max(200)).max(3)),
  ownWords: z.record(z.string(), z.string().max(1500)).default({}),
  skipped: z.array(z.string()).max(20),
  step: z.number().int().min(0).max(3),
  deepStep: z.number().int().min(0).max(9),
});
export type Questionnaire = z.infer<typeof questionnaireSchema>;
export const emptyQuestionnaire = (): Questionnaire => ({ version: 1, quick: { focus: "", minutes: "", help: "" }, answers: {}, ownWords: {}, skipped: [], step: 0, deepStep: 0 });
export function readQuestionnaire(sections: Json | undefined): Questionnaire {
  const value = sections && typeof sections === "object" && !Array.isArray(sections) ? sections.questionnaire_v1 : null;
  return questionnaireSchema.safeParse(value).data ?? emptyQuestionnaire();
}
export function questionnaireFingerprint(value: Questionnaire): string {
  return JSON.stringify({ ...value, answers: Object.fromEntries(Object.entries(value.answers).sort(([a], [b]) => a.localeCompare(b))), skipped: [...value.skipped].sort() });
}
