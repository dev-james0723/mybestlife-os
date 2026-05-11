/**
 * Wellbeing & meta normalizers — health goals, AI prompts, About Me.
 */

import type {
  AboutMe,
  HealthGoal,
  UserPromptRow,
} from "@/types/database";
import type { BrainNode } from "@/types/brain-graph";
import { composeBody, makeBrainNode, ownedBy, truncate } from "./_shared";

export function healthGoalsToBrainNodes(input: {
  rows: HealthGoal[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((g) =>
    makeBrainNode(
      {
        sourceId: g.id,
        type: "health_goal",
        userId: input.userId,
        title: truncate(`${g.metric_type}: ${g.target_value}${g.unit ? ` ${g.unit}` : ""}`),
        tags: ["health", g.metric_type as string],
        sourceType: "health_goals",
        createdAt: g.created_at,
        updatedAt: g.updated_at,
        importance: 0.55,
        metadata: {
          metric_type: g.metric_type,
          target_value: g.target_value,
          period: g.period,
        },
      },
      { sourceModule: "health_goal" },
    ),
  );
}

export function aiPromptsToBrainNodes(input: {
  rows: UserPromptRow[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((p) =>
    makeBrainNode(
      {
        sourceId: p.id,
        type: "ai_knowledge",
        userId: input.userId,
        title: truncate(p.title_i18n?.en ?? p.slug ?? "Untitled prompt"),
        summary: p.description_i18n?.en ?? undefined,
        bodyText: composeBody(p.description_i18n?.en, p.body),
        tags: p.tags ?? [],
        categories: p.top_category ? [p.top_category] : undefined,
        sourceType: "ai_user_prompts",
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        importance: 0.5,
        metadata: {
          sub_category: p.sub_category_slug,
          is_favorite: p.is_favorite,
          usage_count: p.usage_count,
        },
      },
      { sourceModule: "ai_knowledge" },
    ),
  );
}

export function aboutMeToBrainNodes(input: {
  row: AboutMe | null | undefined;
  userId: string;
}): BrainNode[] {
  const r = input.row;
  if (!r || r.user_id !== input.userId) return [];
  return [
    makeBrainNode(
      {
        sourceId: r.id,
        type: "about_me",
        userId: input.userId,
        title: "About Me",
        summary: r.mission ?? r.core_values ?? r.instruction_manual ?? undefined,
        bodyText: composeBody(
          r.mission,
          r.core_values,
          r.instruction_manual,
          r.personality_insights,
        ),
        sourceType: "about_me",
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        importance: 0.85,
      },
      { sourceModule: "about_me" },
    ),
  ];
}
