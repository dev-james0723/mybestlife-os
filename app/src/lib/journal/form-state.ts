import { format } from "date-fns";

import type {
  Emotion,
  Need,
  Quadrant,
  Target,
  Topic,
} from "./constants";
import type { ContextFactors } from "./schema";

/**
 * Client-only form state. Topic / quadrant / primaryEmotion may be "" until
 * the user selects them; on submit we narrow to the typed schema.
 */
export type JournalFormState = {
  entryDate: string;
  topic: Topic | "";
  quadrant: Quadrant | "";
  primaryEmotion: Emotion | "";
  secondaryEmotion: Emotion | "";
  target: Target | "";
  intensity: number; // 1-10
  bullets: string[];
  selfStory: string;
  needs: Need[];
  nextTinyStep: string;
  appreciation: string;
  topicExtras: Record<string, string | number | string[]>;
  contextFactors: ContextFactors;
  projectIds: string[];
  taskIds: string[];
};

export function emptyFormState(): JournalFormState {
  return {
    entryDate: format(new Date(), "yyyy-MM-dd"),
    topic: "",
    quadrant: "",
    primaryEmotion: "",
    secondaryEmotion: "",
    target: "",
    intensity: 5,
    bullets: [""],
    selfStory: "",
    needs: [],
    nextTinyStep: "",
    appreciation: "",
    topicExtras: {},
    contextFactors: {},
    projectIds: [],
    taskIds: [],
  };
}

/** Considered "dirty" once the user has committed to any meaningful choice. */
export function isFormDirty(state: JournalFormState): boolean {
  if (state.topic) return true;
  if (state.quadrant) return true;
  if (state.primaryEmotion) return true;
  if (state.bullets.some((b) => b.trim() !== "")) return true;
  if (state.selfStory.trim() !== "") return true;
  if (state.needs.length > 0) return true;
  if (state.nextTinyStep.trim() !== "") return true;
  if (state.appreciation.trim() !== "") return true;
  if (Object.keys(state.topicExtras).length > 0) return true;
  if (Object.keys(state.contextFactors).length > 0) return true;
  return false;
}
