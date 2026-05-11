import type { AITool } from "@/types/ai-coach";

export interface AIToolMeta {
  id: AITool;
  name: string;
  /** Per-tool brand colour used for subtle accents (Tailwind class-safe). */
  brand: string;
  /**
   * Build the final URL. If this returns null when given a prompt, the tool
   * cannot prefill via URL (user must paste from clipboard after landing).
   */
  buildUrl: (prompt: string) => string;
  /** True if buildUrl puts the prompt text in the URL. */
  supportsUrlPrefill: boolean;
  /**
   * Safe character ceiling for URL-prefilled prompts. Most browsers/backends
   * start truncating or rejecting beyond ~6-8k characters; we aim lower to be
   * conservative. Only meaningful when supportsUrlPrefill is true.
   */
  urlPrefillCharLimit: number;
}

export const AI_TOOLS: ReadonlyArray<AIToolMeta> = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    brand: "#10a37f",
    buildUrl: (p) => `https://chat.openai.com/?q=${encodeURIComponent(p)}`,
    supportsUrlPrefill: true,
    urlPrefillCharLimit: 4000,
  },
  {
    id: "claude",
    name: "Claude",
    brand: "#cc785c",
    buildUrl: () => "https://claude.ai/new",
    supportsUrlPrefill: false,
    urlPrefillCharLimit: 0,
  },
  {
    id: "gemini",
    name: "Gemini",
    brand: "#4c8bf5",
    buildUrl: (p) => `https://gemini.google.com/app?q=${encodeURIComponent(p)}`,
    supportsUrlPrefill: true,
    urlPrefillCharLimit: 4000,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    brand: "#20808d",
    buildUrl: (p) =>
      `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}`,
    supportsUrlPrefill: true,
    urlPrefillCharLimit: 4000,
  },
  {
    id: "grok",
    name: "Grok",
    brand: "#121212",
    buildUrl: () => "https://grok.com",
    supportsUrlPrefill: false,
    urlPrefillCharLimit: 0,
  },
  {
    id: "custom",
    name: "Custom",
    brand: "#6b7280",
    buildUrl: () => "",
    supportsUrlPrefill: false,
    urlPrefillCharLimit: 0,
  },
] as const;

const toolMap = new Map<AITool, AIToolMeta>(
  AI_TOOLS.map((t) => [t.id, t] as const),
);

export function getAITool(id: AITool): AIToolMeta {
  const hit = toolMap.get(id);
  if (!hit) throw new Error(`Unknown AI tool: ${id}`);
  return hit;
}
