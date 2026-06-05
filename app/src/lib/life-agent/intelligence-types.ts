import type { LifeAgentMemoryUsedItem } from "@/lib/life-agent/context-types";

export type IntelligenceFeatureKey =
  | "life-coherence"
  | "life-chapters"
  | "inner-conflicts"
  | "memory-timeline"
  | "future-self";

export type GentleAccountabilityItem = {
  topic: string;
  mentionCount: number;
  prompt: string;
};

export type LifeCoherenceResponse = {
  coherenceSummary: string;
  alignedAreas: string[];
  frictionAreas: string[];
  suggestedAdjustments: string[];
  gentleAccountability: GentleAccountabilityItem[];
  memoryUsed: LifeAgentMemoryUsedItem[];
  warnings?: string[];
};

export type InnerConflictItem = {
  pattern: string;
  evidence: string[];
};

export type InnerConflictResponse = {
  summary: string;
  conflicts: InnerConflictItem[];
  emotionalPatterns: string[];
  memoryUsed: LifeAgentMemoryUsedItem[];
  warnings?: string[];
};

export type LifeChapter = {
  id: string;
  title: string;
  description: string;
  activeProjects: string[];
  relatedPeople: string[];
  openLoops: string[];
  nextAction?: string;
  emotionalTone?: string;
};

export type LifeChapterMapResponse = {
  chapters: LifeChapter[];
  memoryUsed: LifeAgentMemoryUsedItem[];
  warnings?: string[];
};

export type MemoryTimelineEntry = {
  id: string;
  date: string;
  sourceType: string;
  title: string;
  theme?: string;
};

export type MemoryTimelineResponse = {
  headline: string;
  entries: MemoryTimelineEntry[];
  memoryUsed: LifeAgentMemoryUsedItem[];
  warnings?: string[];
};

export type FutureSelfResponse = {
  framing: string;
  questions: string[];
  themesFromLifeOs: string[];
  reflectiveNote: string;
  memoryUsed: LifeAgentMemoryUsedItem[];
  warnings?: string[];
};
