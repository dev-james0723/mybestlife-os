/** Per-message cap in chat history sent to the model. */
export const MAX_HISTORY_MESSAGE_CHARS = 2_000;

/** Max characters for the formatted Life OS context block in the system prompt. */
export const MAX_CONTEXT_BLOCK_CHARS = 12_000;

/** Max total characters for system instruction before send (soft guard). */
export const MAX_SYSTEM_PROMPT_CHARS = 18_000;

export function clampMessageContent(content: string, max = MAX_HISTORY_MESSAGE_CHARS): string {
  const trimmed = content.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}… [truncated]`;
}

export function truncateContextText(text: string, max = MAX_CONTEXT_BLOCK_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[Context truncated for length — lower-priority sections omitted.]`;
}

export function clampSystemPrompt(systemInstruction: string, max = MAX_SYSTEM_PROMPT_CHARS): string {
  if (systemInstruction.length <= max) return systemInstruction;
  return `${systemInstruction.slice(0, max)}\n\n[System prompt truncated for safety.]`;
}

export type ChatHistoryTurn = { role: "user" | "assistant"; content: string };

export function clampChatHistory(
  history: ChatHistoryTurn[],
  maxPerMessage = MAX_HISTORY_MESSAGE_CHARS,
): ChatHistoryTurn[] {
  return history.map((turn) => ({
    role: turn.role,
    content: clampMessageContent(turn.content, maxPerMessage),
  }));
}
