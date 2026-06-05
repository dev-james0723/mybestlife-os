import type { ContinuityCardData } from "@/lib/life-agent/companion-presence-types";
import type { LifeAgentMemory } from "@/types/life-agent";

const SCATTER_PATTERN = /\b(scatter|scattered|overwhelm|too much)\b/i;
const OPEN_LOOP_PATTERN = /\b(open loop|unfinished|hanging)\b/i;
const PRESSURE_PATTERN = /\b(vague pressure|unclear|foggy)\b/i;

/**
 * Build at most one continuity line from user-confirmed companion memories only.
 * Returns null when no safe match exists (no invention).
 */
export function buildContinuityFromMemories(
  memories: LifeAgentMemory[],
): ContinuityCardData | null {
  const confirmed = memories
    .filter((m) => m.user_confirmed && m.visibility !== "archived")
    .sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

  for (const memory of confirmed) {
    const text = memory.content.trim();
    if (!text) continue;

    if (SCATTER_PATTERN.test(text)) {
      return {
        id: `memory-${memory.id}-scatter`,
        message:
          "Last time, we were trying to make your week less scattered. Continue from there?",
        memorySourceId: memory.id,
        suggestedPrompt:
          "Help me continue where we left off — making this week less scattered.",
      };
    }

    if (OPEN_LOOP_PATTERN.test(text)) {
      return {
        id: `memory-${memory.id}-loops`,
        message:
          "You were working on naming open loops without pressure. Want to pick that up gently?",
        memorySourceId: memory.id,
        suggestedPrompt: "Let's continue clearing open loops at a calm pace.",
      };
    }

    if (PRESSURE_PATTERN.test(text)) {
      return {
        id: `memory-${memory.id}-pressure`,
        message:
          "You often feel better when we turn vague pressure into a short list. Want me to do that now?",
        memorySourceId: memory.id,
        suggestedPrompt:
          "Help me turn vague pressure into a short, kind list of next steps.",
      };
    }

    if (memory.memory_type === "working_style" && text.length > 20) {
      return {
        id: `memory-${memory.id}-style`,
        message: `From what you saved: “${truncate(text, 80)}” — want to continue from there?`,
        memorySourceId: memory.id,
      };
    }
  }

  return null;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}
