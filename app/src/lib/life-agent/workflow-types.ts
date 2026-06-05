import type { LifeAgentActionPreviewCard } from "@/lib/life-agent/action-types";
import type { LifeAgentSuggestedAction } from "@/lib/life-agent/chat-types";
import type { ContextOpenLoop, LifeAgentMemoryUsedItem } from "@/lib/life-agent/context-types";

export type LifeAgentWorkflowKey =
  | "daily-brief"
  | "open-loops"
  | "plan-day"
  | "weekly-review";

export type OpenLoopCategory =
  | "urgent"
  | "important"
  | "waiting"
  | "unclear"
  | "emotional"
  | "admin"
  | "relationship"
  | "creative"
  | "finance"
  | "document";

export type RadarOpenLoop = ContextOpenLoop & {
  category: OpenLoopCategory;
};

export type OpenLoopRadarGroup = {
  category: OpenLoopCategory;
  label: string;
  count: number;
  loops: RadarOpenLoop[];
};

export type LifeAgentPeopleFollowUp = {
  id: string;
  name: string;
  nextAction: string;
  nextActionDate: string | null;
};

export type LifeAgentProjectBottleneck = {
  id: string;
  name: string;
  reason: string;
};

export type LifeBriefResponse = {
  greeting: string;
  focusSuggestions: string[];
  openLoops: RadarOpenLoop[];
  openLoopGroups: OpenLoopRadarGroup[];
  peopleToFollowUp: LifeAgentPeopleFollowUp[];
  projectBottlenecks: LifeAgentProjectBottleneck[];
  gentleReflection?: string;
  closingQuestion?: string;
  suggestedActions: LifeAgentSuggestedAction[];
  actionPreviews: LifeAgentActionPreviewCard[];
  memoryUsed: LifeAgentMemoryUsedItem[];
  warnings?: string[];
};

export type OpenLoopsResponse = {
  summary: string;
  openLoops: RadarOpenLoop[];
  groups: OpenLoopRadarGroup[];
  memoryUsed: LifeAgentMemoryUsedItem[];
  suggestedActions: LifeAgentSuggestedAction[];
  actionPreviews: LifeAgentActionPreviewCard[];
  warnings?: string[];
};

export type EnergyLevel =
  | "low"
  | "normal"
  | "high_focus"
  | "scattered"
  | "emotionally_tired";

export type PlanMyDayResponse = {
  energyLevel: EnergyLevel;
  morning: string[];
  afternoon: string[];
  evening: string[];
  minimumViableDay: string[];
  optionalStretch: string[];
  memoryUsed: LifeAgentMemoryUsedItem[];
  suggestedActions: LifeAgentSuggestedAction[];
  actionPreviews: LifeAgentActionPreviewCard[];
  warnings?: string[];
};

export type WeeklyReviewResponse = {
  headline: string;
  wins: string[];
  patterns: string[];
  openLoops: RadarOpenLoop[];
  groups: OpenLoopRadarGroup[];
  focusForNextWeek: string[];
  gentleReflection?: string;
  memoryUsed: LifeAgentMemoryUsedItem[];
  suggestedActions: LifeAgentSuggestedAction[];
  actionPreviews: LifeAgentActionPreviewCard[];
  warnings?: string[];
};

export type OpenLoopDisposition =
  | "do_now"
  | "schedule"
  | "delegate"
  | "clarify"
  | "waiting"
  | "drop";

export type ClearOpenLoopsRequest = {
  assignments: { loopId: string; disposition: OpenLoopDisposition }[];
  conversationId?: string;
  temporaryPermissions?: Partial<Record<string, boolean>>;
};

export type ClearOpenLoopsResponse = {
  actionPreviews: LifeAgentActionPreviewCard[];
  skipped: number;
  memoryUsed: LifeAgentMemoryUsedItem[];
  warnings?: string[];
};
