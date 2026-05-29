"use client";

import { useMemo } from "react";

import { buildAIAnalyticsContext, buildLocalAIAnalyticsInsight } from "@/lib/analytics/build-ai-analytics-context";
import { computeDomainRadar } from "@/lib/analytics/compute-domain-radar";
import { computeEmotionExecution } from "@/lib/analytics/compute-emotion-execution";
import { computeLifePulse } from "@/lib/analytics/compute-life-pulse";
import { computeProjectMomentumMap } from "@/lib/analytics/compute-project-momentum";
import { getAnalyticsDateRange } from "@/lib/analytics/date-range";
import { buildBrainDataRich } from "@/lib/brain/buildBrainData";
import { useAuth } from "@/hooks/use-auth";
import { useBrainQueries } from "@/hooks/use-brain-queries";
import { useDailyPlansInRange } from "@/hooks/use-daily-plans";
import { useGoals } from "@/hooks/use-goals";
import { useJapaneseStudySessions } from "@/hooks/use-japanese-study";
import { useJournalEntries } from "@/hooks/use-journal";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import type { AnalyticsRangeKey, LifeAnalytics } from "@/lib/analytics/types";

export function useLifeAnalytics(rangeKey: AnalyticsRangeKey) {
  const range = useMemo(() => getAnalyticsDateRange(rangeKey), [rangeKey]);
  const { user, isLoading: authLoading } = useAuth();
  const tasks = useTasks();
  const projects = useProjects();
  const goals = useGoals();
  const journalEntries = useJournalEntries();
  const studySessions = useJapaneseStudySessions();
  const dailyPlans = useDailyPlansInRange(range.startISO, range.endISO);
  const brain = useBrainQueries();
  const userId = user?.id ?? null;

  const brainGraph = useMemo(() => {
    if (!userId) return null;
    const knowledge = brain.queries.knowledge.data;
    return buildBrainDataRich({
      userId,
      knowledgeItems: knowledge?.items,
      knowledgeCollections: knowledge?.collections,
      knowledgeConnections: knowledge?.connections,
      goals: brain.queries.goals.data,
      habits: brain.queries.habits.data,
      habitLinks: brain.queries.habitLinks.data,
      quotes: brain.queries.quotes.data,
      roleModels: brain.queries.roleModels.data,
      projects: brain.queries.projects.data,
      tasks: brain.queries.tasks.data,
      ideas: brain.queries.ideas.data,
      journalEntries: brain.queries.journalEntries.data,
      careerEvents: brain.queries.careerEvents.data,
      healthGoals: brain.queries.healthGoals.data,
      financeGoals: brain.queries.financeGoals.data,
      bucketItems: brain.queries.bucketItems.data,
      relationships: brain.queries.relationships.data,
      aboutMe: brain.queries.aboutMe.data ?? null,
      gratefulThings: brain.queries.gratefulThings.data,
      assets: brain.queries.assets.data,
      aiPrompts: brain.queries.aiPrompts.data,
      software: brain.queries.software.data,
      dailyPlans: brain.queries.dailyPlans.data,
      brainRelations: brain.queries.brainRelations.data,
      brainEdges: brain.queries.brainEdges.data,
      documents: brain.queries.documents.data,
      notes: brain.queries.notes.data,
      careerDecisions: brain.queries.careerDecisions.data,
      careerNetworkNodes: brain.queries.careerNetworkNodes.data,
      financeAccounts: brain.queries.financeAccounts.data,
      financeCategories: brain.queries.financeCategories.data,
      options: {
        maxNodes: 4500,
        hideOrphanNodes: false,
      },
    });
  }, [
    userId,
    brain.queries.knowledge.data,
    brain.queries.goals.data,
    brain.queries.habits.data,
    brain.queries.habitLinks.data,
    brain.queries.quotes.data,
    brain.queries.roleModels.data,
    brain.queries.projects.data,
    brain.queries.tasks.data,
    brain.queries.ideas.data,
    brain.queries.journalEntries.data,
    brain.queries.careerEvents.data,
    brain.queries.healthGoals.data,
    brain.queries.financeGoals.data,
    brain.queries.bucketItems.data,
    brain.queries.relationships.data,
    brain.queries.aboutMe.data,
    brain.queries.gratefulThings.data,
    brain.queries.assets.data,
    brain.queries.aiPrompts.data,
    brain.queries.software.data,
    brain.queries.dailyPlans.data,
    brain.queries.brainRelations.data,
    brain.queries.brainEdges.data,
    brain.queries.documents.data,
    brain.queries.notes.data,
    brain.queries.careerDecisions.data,
    brain.queries.careerNetworkNodes.data,
    brain.queries.financeAccounts.data,
    brain.queries.financeCategories.data,
  ]);

  const analytics = useMemo<LifeAnalytics | null>(() => {
    const core = computeLifePulse({
      range,
      tasks: tasks.data ?? [],
      projects: projects.data ?? [],
      goals: goals.data ?? [],
      journalEntries: journalEntries.data ?? [],
      studySessions: studySessions.data ?? [],
      dailyPlans: dailyPlans.data ?? [],
      brainGraph,
    });
    const domainRadar = computeDomainRadar({
      range,
      tasks: tasks.data ?? [],
      projects: projects.data ?? [],
      goals: goals.data ?? [],
      journalEntries: journalEntries.data ?? [],
      studySessions: studySessions.data ?? [],
      brainGraph,
    });
    const projectMomentum = computeProjectMomentumMap({
      range,
      projects: projects.data ?? [],
      tasks: tasks.data ?? [],
      dailyPlans: dailyPlans.data ?? [],
    });
    const emotionExecution = computeEmotionExecution({
      range,
      tasks: tasks.data ?? [],
      journalEntries: journalEntries.data ?? [],
      dailyPlans: dailyPlans.data ?? [],
    });
    const aiContext = buildAIAnalyticsContext({
      range,
      pulseScores: core.pulseScores,
      totals: core.totals,
      projectMomentum,
      brainHealth: core.brainHealth,
      domainRadar,
      emotionExecution: {
        hasJournalData: emotionExecution.hasJournalData,
        hasExecutionData: emotionExecution.hasExecutionData,
        interpretation: emotionExecution.interpretation,
      },
    });

    return {
      range,
      generatedAt: new Date().toISOString(),
      statusSummary: core.statusSummary,
      pulseScores: core.pulseScores,
      totals: core.totals,
      momentumWave: core.momentumWave,
      domainRadar,
      projectMomentum,
      emotionExecution,
      brainHealth: core.brainHealth,
      aiInsight: buildLocalAIAnalyticsInsight(aiContext),
    };
  }, [
    range,
    tasks.data,
    projects.data,
    goals.data,
    journalEntries.data,
    studySessions.data,
    dailyPlans.data,
    brainGraph,
  ]);

  const isLoading =
    authLoading ||
    tasks.isLoading ||
    projects.isLoading ||
    goals.isLoading ||
    journalEntries.isLoading ||
    studySessions.isLoading ||
    dailyPlans.isLoading ||
    brain.isInitialLoading;

  return {
    analytics,
    range,
    isLoading,
    failedBrainSlices: brain.failedCount,
  };
}
