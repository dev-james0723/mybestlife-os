"use client";

import { useMemo } from "react";

import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useNotes } from "@/hooks/use-notes";
import { useGoals } from "@/hooks/use-goals";
import { useIdeas } from "@/hooks/use-ideas";
import { useCalendarItems } from "@/hooks/use-calendar";
import { localLocationToWeatherLocation } from "@/lib/signals/location";
import { tokenize } from "@/lib/signals/matching";
import {
  customTopicBoostedTerms,
  customTopicInterestTerms,
} from "@/lib/signals/custom-topics";
import type { LifeOsContext, SignalsPreferences } from "@/lib/signals/types";

/** Add a phrase as a whole term plus its longer tokens (recall without noise). */
function pushTerms(set: Set<string>, value: string | null | undefined): void {
  if (!value) return;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length >= 3) set.add(trimmed);
  for (const token of tokenize(value)) {
    if (token.length >= 5) set.add(token);
  }
}

function pushTags(set: Set<string>, tags: string[] | null | undefined): void {
  if (!tags) return;
  for (const tag of tags) {
    const t = tag.trim().toLowerCase();
    if (t.length >= 2) set.add(t);
  }
}

/**
 * Build the deterministic personalization context from existing Life OS hooks.
 *
 * Each source is included ONLY when its consent toggle is on (§6, §18). Hooks
 * are always called (React rule) but their data is gated before it influences
 * anything. Nothing here is sent to an LLM or leaves the OS.
 */
export function useLifeOsContext(prefs: SignalsPreferences): LifeOsContext {
  const { data: tasks } = useTasks();
  const { data: projects } = useProjects();
  const { data: notes } = useNotes();
  const { data: goals } = useGoals();
  const { data: ideas } = useIdeas();
  const { data: calendarItems } = useCalendarItems();

  return useMemo(() => {
    const followedTopics = prefs.followedTopics.map((t) => t.toLowerCase());

    const projectSet = new Set<string>();
    const goalSet = new Set<string>();
    const taskSet = new Set<string>();
    const brainSet = new Set<string>();
    const calendarSet = new Set<string>();

    if (prefs.useProjects) {
      for (const p of projects ?? []) {
        if (p.status === "active" || p.status === "planning") {
          pushTerms(projectSet, p.name);
          pushTags(projectSet, p.tags);
        }
      }
      for (const g of goals ?? []) {
        if (g.status === "active") {
          pushTerms(goalSet, g.name);
          pushTerms(goalSet, g.category);
        }
      }
    }

    if (prefs.useTasks) {
      for (const t of tasks ?? []) {
        if (t.status === "todo" || t.status === "in-progress") {
          pushTerms(taskSet, t.title);
          pushTags(taskSet, t.tags);
        }
      }
    }

    if (prefs.useBrainContext) {
      for (const n of notes ?? []) {
        pushTerms(brainSet, n.title);
        pushTerms(brainSet, n.category);
        pushTags(brainSet, n.tags);
      }
      for (const i of ideas ?? []) {
        pushTerms(brainSet, i.title);
        pushTags(brainSet, i.ai_tags);
        pushTags(brainSet, i.manual_tags);
      }
    }

    if (prefs.useCalendar) {
      for (const item of (calendarItems ?? []).slice(0, 60)) {
        pushTerms(calendarSet, item.title);
      }
    }

    // Custom topics are an explicit user follow → always count as interest
    // (no separate consent toggle needed; the user typed them in).
    const customTopicTerms = customTopicInterestTerms(prefs.customTopics);
    const boostedTerms = customTopicBoostedTerms(prefs.customTopics);

    const interest = new Set<string>(followedTopics);
    for (const s of [projectSet, goalSet, taskSet, brainSet, calendarSet]) {
      for (const term of s) interest.add(term);
    }
    for (const term of customTopicTerms) interest.add(term);

    const location = prefs.localLocation
      ? localLocationToWeatherLocation(prefs.localLocation)
      : null;

    return {
      followedTopics,
      projectTerms: [...projectSet],
      goalTerms: [...goalSet],
      brainTerms: [...brainSet, ...goalSet],
      taskTerms: [...taskSet],
      calendarTerms: [...calendarSet],
      customTopicTerms,
      boostedTerms,
      interestTerms: [...interest].filter((t) => t.length >= 2),
      location,
    } satisfies LifeOsContext;
  }, [
    prefs.followedTopics,
    prefs.useProjects,
    prefs.useTasks,
    prefs.useBrainContext,
    prefs.useCalendar,
    prefs.localLocation,
    prefs.customTopics,
    tasks,
    projects,
    notes,
    goals,
    ideas,
    calendarItems,
  ]);
}
