import type { AppLocale } from "@/lib/i18n/app-locale";

export type PlannerAiQuestion = {
  id: string;
  question: string;
  options: string[];
};

export type PlannerAiClarification = {
  questionId: string;
  question: string;
  answer: string;
};

export type PlannerAiQuestionsPayload = {
  mode: "questions";
  taskTitle: string;
  locale: AppLocale;
};

export type PlannerAiBlocksPayload = {
  mode: "blocks";
  taskTitle: string;
  locale: AppLocale;
  clarifications: PlannerAiClarification[];
  blockMinutes: number;
};

export type PlannerAiMetadataPayload = {
  mode: "metadata";
  taskTitle: string;
  locale: AppLocale;
  clarifications: PlannerAiClarification[];
  blockMinutes: number;
};

export type PlannerAiRequestBody =
  | PlannerAiQuestionsPayload
  | PlannerAiBlocksPayload
  | PlannerAiMetadataPayload;

export type PlannerAiResourceType = "YouTube" | "Article" | "Podcast" | "Shopping" | "Other";

export type PlannerAiWebResource = {
  type: PlannerAiResourceType;
  title: string;
  url: string;
  description: string;
  source: string;
};

export type PlannerAiRelatedItem = {
  id: string;
  label: string;
  score: number;
};

export type PlannerAiQuestionsResult = {
  questions: PlannerAiQuestion[];
  source: "gemini" | "fallback";
};

export type PlannerAiBlocksResult = {
  suggestedBlocks: number;
  source: "gemini" | "fallback";
};

export type PlannerAiMetadataResult = {
  description: string;
  reminders: string[];
  suggestedBlocks: number;
  suggestedPriority: "low" | "medium" | "high" | "urgent";
  /** When present, client may pre-fill task status (metadata autofill). */
  suggestedStatus?: "todo" | "in-progress" | "done" | "cancelled";
  /** ISO date YYYY-MM-DD when the model infers a concrete due date. */
  suggestedDueDate?: string;
  relatedProjects: PlannerAiRelatedItem[];
  relatedNotes: PlannerAiRelatedItem[];
  relatedKnowledge: PlannerAiRelatedItem[];
  relatedIdeas: PlannerAiRelatedItem[];
  webResources: PlannerAiWebResource[];
  source: "gemini" | "fallback";
};
