/**
 * Types for the Role Model Intelligence Hub — the AI-powered layer that turns
 * a static Role Model record into a "living lens" inside the Life OS.
 *
 * These shapes are the contract between:
 *   - the AI routes under `app/api/ai/role-model/*` (analyze, patterns, distill-skill)
 *   - the Supabase persistence (`role_model_neural_skills`) + `ai_insights` cache
 *   - the Intelligence Modal + page-level analysis UI
 */

import type { AppLocale } from "@/lib/i18n/app-locale";

// ---------------------------------------------------------------------------
// Per-role-model analysis (`/api/ai/role-model/analyze`)
// ---------------------------------------------------------------------------

export type RoleModelInsightSourceType =
  | "project"
  | "goal"
  | "task"
  | "note"
  | "idea"
  | "knowledge"
  | "about_me"
  | "pattern";

/** A surprising, data-grounded link between the Role Model and the user's life. */
export type HiddenConnection = {
  title: string;
  sourceType: RoleModelInsightSourceType;
  sourceId?: string | null;
  sourceTitle?: string | null;
  explanation: string;
  /** 0–100 confidence the model assigns to the connection. */
  confidence: number;
  reflectionQuestion: string;
};

/** One scored axis of the Role Model's "DNA". */
export type RoleModelDNADimension = {
  key: string;
  label: string;
  /** 0–100. */
  score: number;
  explanation?: string | null;
};

/** How the user's own profile overlaps with the Role Model, bucketed. */
export type RoleModelOverlap = {
  high: string[];
  medium: string[];
  caution: string[];
};

/** A sharp, ready-to-send prompt for the Mind Council lens. */
export type RoleModelChallengePrompt = {
  title: string;
  prompt: string;
  bestFor: string[];
};

/** A suggested next action the user can take from an insight. */
export type RoleModelSuggestedAction = {
  label: string;
  /** Machine hint for the UI: which CTA this maps to. */
  kind: "experiment" | "challenge" | "neural_skill" | "reflect" | "link";
  detail?: string | null;
};

/** Full payload returned by `/api/ai/role-model/analyze`. */
export type RoleModelInsightResult = {
  whyNow: string;
  hiddenConnections: HiddenConnection[];
  whatNotToCopy: string[];
  roleModelDNA: RoleModelDNADimension[];
  overlapWithUser: RoleModelOverlap;
  mirrorInsight: string;
  challengePrompts: RoleModelChallengePrompt[];
  suggestedActions: RoleModelSuggestedAction[];
};

// ---------------------------------------------------------------------------
// Page-level pattern analysis (`/api/ai/role-model/patterns`)
// ---------------------------------------------------------------------------

export type SuggestedRoleModel = {
  archetype: string;
  reason: string;
  exampleNames?: string[];
};

export type RoleModelPatternResult = {
  summary: string;
  recurringTraits: string[];
  dominantArchetypes: string[];
  blindSpots: string[];
  missingArchetypes: string[];
  /** A short "building toward" banner line, e.g. "Institution Builder + Systems Thinker". */
  buildingToward: string;
  suggestedRoleModels: SuggestedRoleModel[];
};

// ---------------------------------------------------------------------------
// Neural Skill (persistent, Supabase-backed)
// ---------------------------------------------------------------------------

/** The distilled lens content produced by `/api/ai/role-model/distill-skill`. */
export type NeuralSkillContent = {
  lensTitle: string;
  lensSubtitle: string;
  systemPromptHint: string;
  thinkingStyle: string;
  decisionPrinciples: string[];
  communicationStyle: string;
  likelyQuestions: string[];
  bestFor: string[];
  avoidFor: string[];
  blindSpots: string[];
  starterPrompts: string[];
};

/** A persisted Role Model → Mind Council lens, as stored in `role_model_neural_skills`. */
export type RoleModelNeuralSkill = {
  id: string;
  user_id: string;
  role_model_id: string;
  /** The id used inside Mind Council `allSkills` (prefixed `custom-` so the
   *  existing chat route + SkillChatRoom treat it as a custom lens). */
  mind_skill_id: string;
  skill_json: NeuralSkillContent;
  avatar_gradient: [string, string];
  status: "ready" | "processing" | "failed";
  model_used: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Request payloads
// ---------------------------------------------------------------------------

/** Compact, privacy-aware slice of the user's Life OS sent to the analyze route. */
export type RoleModelInsightContextPayload = {
  locale?: AppLocale;
  /** The role model being analyzed (so the route doesn't refetch it). */
  roleModel: {
    id: string;
    name: string;
    category?: string | null;
    admiration_blurb?: string | null;
    bio?: string | null;
    tags?: string[];
    quotes?: string[];
    keyLessons?: string[];
  };
  linkedProjectIds?: string[];
  linkedGoalIds?: string[];
  linkedNoteIds?: string[];
  projects?: { id: string; title: string; status?: string; description?: string | null }[];
  goals?: { id: string; title: string; status?: string; description?: string | null }[];
  tasks?: { id: string; title: string; status?: string }[];
  notes?: { id: string; title: string; snippet?: string | null }[];
  ideas?: { id: string; title: string }[];
  aboutMe?: {
    mission?: string | null;
    coreValues?: string | null;
    personality?: string | null;
  } | null;
  /** Names of the user's other role models, for cross-reference. */
  otherRoleModels?: string[];
};
