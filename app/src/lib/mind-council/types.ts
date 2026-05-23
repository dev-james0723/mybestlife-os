/**
 * Mind Council — typed contracts for preset lenses, chat, and council sessions.
 * "Lens" framing: creative interpretation, not impersonation of real people.
 */

export type SkillProvider = "nuwa" | "internal" | "custom";

export type MindSkillStatus = "ready" | "processing" | "failed";

export type MindSkillCategory =
  | "builders"
  | "investors"
  | "artists"
  | "athletes"
  | "leaders"
  | "scientists"
  | "philosophy";

export type MindSkillSource = {
  repo: string;
  url: string;
  license?: string;
  note?: string;
};

export type MindSkill = {
  skillId: string;
  agentId: string;
  skillProvider: SkillProvider;
  status: MindSkillStatus;
  category: MindSkillCategory;
  /** e.g. "Steve Jobs–inspired Lens" */
  lensTitle: string;
  /** Short framing line shown in cards */
  lensSubtitle: string;
  /** Seeds internal system instructions (style, heuristics, boundaries) */
  systemPromptHint: string;
  /** Upstream Agent Skill package (vendored under bundled-skills/) */
  skillSource?: MindSkillSource;
  /** Shown in the featured row on the dashboard */
  featured?: boolean;
  /** CSS color tokens for abstract avatar gradient */
  avatarGradient: [string, string];
};

export type ChatMessageRole = "user" | "assistant";

export type MindCouncilChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
};

export type MindCouncilRecommendRequest = {
  query: string;
  locale?: string;
};

export type MindCouncilRecommendResponse = {
  recommendedSkillIds: string[];
  rationaleKey: "default" | "empty" | "matched";
  /** Short rule-based explanation (English); UI may localize keys */
  rationale: string;
};

export type MindCouncilSingleChatRequest = {
  skillId: string;
  locale?: string;
  messages: { role: ChatMessageRole; content: string }[];
};

export type MindCouncilSingleChatResponse = {
  reply: string;
  modelUsed?: string;
  source: "nuwa" | "internal" | "placeholder";
  disclaimer: string;
};

export type MindCouncilGroupAdvisorReply = {
  skillId: string;
  lensTitle: string;
  reply: string;
  modelUsed?: string;
  source: "nuwa" | "internal" | "placeholder";
};

export type MindCouncilGroupRequest = {
  skillIds: string[];
  locale?: string;
  userMessage: string;
};

export type MindCouncilGroupResponse = {
  replies: MindCouncilGroupAdvisorReply[];
  synthesis: string;
  synthesisModelUsed?: string;
  disclaimer: string;
};
