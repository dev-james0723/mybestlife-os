import type { AITool } from "@/types/ai-coach";

export type AIKnowledgeChatTool =
  | "chatgpt"
  | "gemini"
  | "claude"
  | "grok"
  | "deepseek";

export type DispatchableAITool = AITool | AIKnowledgeChatTool;

export interface AIToolMeta<TId extends string = AITool> {
  id: TId;
  name: string;
  /** Per-tool brand colour used for subtle accents (Tailwind class-safe). */
  brand: string;
  /**
   * Build the final destination. Tools without a documented prefill contract
   * return their clean chat URL and rely on the clipboard hand-off.
   */
  buildUrl: (prompt: string) => string;
  /** True if buildUrl puts the prompt text in the URL. */
  supportsUrlPrefill: boolean;
  /**
   * Safe encoded-query ceiling for URL-prefilled prompts. Non-ASCII text can
   * expand substantially once encoded, so the dispatcher measures the encoded
   * length against this value. Only meaningful for tools with prefill enabled.
   */
  urlPrefillCharLimit: number;
}

const CHATGPT_TOOL = {
  id: "chatgpt",
  name: "ChatGPT",
  brand: "#10a37f",
  buildUrl: (p) =>
    p
      ? `https://chatgpt.com/?q=${encodeURIComponent(p)}`
      : "https://chatgpt.com/",
  supportsUrlPrefill: true,
  urlPrefillCharLimit: 4000,
} satisfies AIToolMeta<"chatgpt">;

const CLAUDE_TOOL = {
  id: "claude",
  name: "Claude",
  brand: "#cc785c",
  buildUrl: (p) =>
    p
      ? `https://claude.ai/new?q=${encodeURIComponent(p)}`
      : "https://claude.ai/new",
  supportsUrlPrefill: true,
  urlPrefillCharLimit: 4000,
} satisfies AIToolMeta<"claude">;

const GEMINI_TOOL = {
  id: "gemini",
  name: "Gemini",
  brand: "#4c8bf5",
  buildUrl: (p) =>
    p
      ? `https://gemini.google.com/app?q=${encodeURIComponent(p)}`
      : "https://gemini.google.com/app",
  supportsUrlPrefill: true,
  urlPrefillCharLimit: 4000,
} satisfies AIToolMeta<"gemini">;

const PERPLEXITY_TOOL = {
  id: "perplexity",
  name: "Perplexity",
  brand: "#20808d",
  buildUrl: (p) =>
    p
      ? `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}`
      : "https://www.perplexity.ai/",
  supportsUrlPrefill: true,
  urlPrefillCharLimit: 4000,
} satisfies AIToolMeta<"perplexity">;

const GROK_TOOL = {
  id: "grok",
  name: "Grok",
  brand: "#121212",
  buildUrl: (p) =>
    p ? `https://grok.com/?q=${encodeURIComponent(p)}` : "https://grok.com/",
  supportsUrlPrefill: true,
  urlPrefillCharLimit: 4000,
} satisfies AIToolMeta<"grok">;

const CUSTOM_TOOL = {
  id: "custom",
  name: "Custom",
  brand: "#6b7280",
  buildUrl: () => "",
  supportsUrlPrefill: false,
  urlPrefillCharLimit: 0,
} satisfies AIToolMeta<"custom">;

const DEEPSEEK_TOOL = {
  id: "deepseek",
  name: "DeepSeek",
  brand: "#4d6bfe",
  // DeepSeek documents its web-chat destination, but not a public URL
  // contract for inserting prompt text. Clipboard transport is the reliable
  // hand-off until that changes.
  buildUrl: () => "https://chat.deepseek.com/",
  supportsUrlPrefill: false,
  urlPrefillCharLimit: 0,
} satisfies AIToolMeta<"deepseek">;

/** Career AI tool set. Kept aligned with the persisted preference schema. */
export const AI_TOOLS: ReadonlyArray<AIToolMeta<AITool>> = [
  CHATGPT_TOOL,
  CLAUDE_TOOL,
  GEMINI_TOOL,
  PERPLEXITY_TOOL,
  GROK_TOOL,
  CUSTOM_TOOL,
];

/** The five direct hand-off choices requested on AI Knowledge prompt details. */
export const AI_KNOWLEDGE_CHAT_TOOLS: ReadonlyArray<
  AIToolMeta<AIKnowledgeChatTool>
> = [CHATGPT_TOOL, GEMINI_TOOL, CLAUDE_TOOL, GROK_TOOL, DEEPSEEK_TOOL];

const DISPATCHABLE_TOOLS: ReadonlyArray<AIToolMeta<DispatchableAITool>> = [
  ...AI_TOOLS,
  DEEPSEEK_TOOL,
];

const toolMap = new Map<DispatchableAITool, AIToolMeta<DispatchableAITool>>(
  DISPATCHABLE_TOOLS.map((tool) => [tool.id, tool] as const),
);

export function getAITool(
  id: DispatchableAITool,
): AIToolMeta<DispatchableAITool> {
  const hit = toolMap.get(id);
  if (!hit) throw new Error(`Unknown AI tool: ${id}`);
  return hit;
}
