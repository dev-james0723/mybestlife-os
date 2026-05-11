/**
 * AI Prompts adapter — emits `ai_prompt` nodes from `ai_user_prompts` (the
 * user's personal prompt library). The system prompt library is not
 * emitted because it's shared / not user-scoped.
 */

import type { UserPromptRow } from "@/types/database";
import type { ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, nodeId, ownedBy, truncate } from "./_shared";

export function aiPromptsToGraph(input: {
  rows: UserPromptRow[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = rows.map((p): ConstellationNode => ({
    id: nodeId("ai_prompt", p.id),
    userId: input.userId,
    label: truncate(p.title_i18n?.en ?? p.slug ?? "Untitled prompt"),
    type: "ai_prompt",
    aiPromptId: p.id,
    description: p.description_i18n?.en ?? undefined,
    tags: p.tags ?? [],
    category: p.top_category,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    metadata: {
      sub_category: p.sub_category_slug,
      is_favorite: p.is_favorite,
      usage_count: p.usage_count,
    },
  }));
  return { nodes, edges: [] };
}
