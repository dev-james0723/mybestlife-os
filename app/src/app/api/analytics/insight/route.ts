import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthedContext } from "@/app/api/ai/habits/_shared";
import { buildLocalAIAnalyticsInsight } from "@/lib/analytics/build-ai-analytics-context";
import type { AIAnalyticsContext } from "@/lib/analytics/types";

export const runtime = "nodejs";

const pulseScoreSchema = z.object({
  key: z.enum([
    "completion_momentum",
    "focus_consistency",
    "emotional_load",
    "system_coherence",
  ]),
  label: z.string(),
  score: z.number(),
  trend: z.enum(["up", "down", "steady"]),
  trendValue: z.number(),
  trendLabel: z.string(),
  interpretation: z.string(),
  signal: z.string(),
  tone: z.enum(["positive", "watch", "neutral", "load"]),
});

const requestSchema = z.object({
  metrics: z.object({
    range: z.object({
      key: z.string(),
      label: z.string(),
      startISO: z.string(),
      endISO: z.string(),
      days: z.number(),
    }),
    pulseScores: z.array(pulseScoreSchema),
    totals: z.object({
      completedTasks: z.number(),
      completedTasksPrevious: z.number(),
      plannedItems: z.number(),
      overdueTasks: z.number(),
      studyMinutes: z.number(),
      journalEntries: z.number(),
      activeProjects: z.number(),
      activeGoals: z.number(),
      linkedTaskRatio: z.number(),
      projectGoalLinkRatio: z.number(),
    }),
    projectMomentum: z.object({
      stateCounts: z.record(z.string(), z.number()),
      stuckProjects: z.number(),
      overloadedProjects: z.number(),
      movingProjects: z.number(),
    }),
    emotionExecution: z.object({
      hasJournalData: z.boolean(),
      hasExecutionData: z.boolean(),
      interpretation: z.string(),
    }),
    brainHealth: z.object({
      totalNodes: z.number(),
      totalEdges: z.number(),
      orphanRate: z.number(),
      orphanCount: z.number(),
      averageDegree: z.number(),
      isolatedDomains: z.array(z.string()),
      topConnectedDomains: z.array(
        z.object({
          domain: z.string(),
          nodes: z.number(),
          degree: z.number(),
        }),
      ),
      suggestedMissingConnections: z.array(z.string()),
      interpretation: z.string(),
      hasBrainData: z.boolean(),
    }),
    domainRadar: z.object({
      points: z.array(
        z.object({
          key: z.string(),
          domain: z.string(),
          score: z.number(),
          confidence: z.enum(["low", "medium", "high"]),
          signal: z.string(),
        }),
      ),
      interpretation: z.string(),
    }),
  }),
});

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;

  const parsed = requestSchema.safeParse(auth.bodyJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_analytics_metrics", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const insight = buildLocalAIAnalyticsInsight(
    parsed.data.metrics as AIAnalyticsContext,
  );

  return NextResponse.json(insight);
}
