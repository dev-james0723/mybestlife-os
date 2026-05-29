/**
 * Signals — custom topics (user-defined follows).
 *
 * Pure helpers that turn a user's `CustomSignalTopic[]` into the term sets that
 * influence matching, ranking, source queries, and the honest "why". Muted
 * topics are excluded from interest/boost but their keywords are surfaced so the
 * filter layer can hard-drop matching items.
 *
 * MVP persistence is localStorage (see `preferences-store.ts`); the Supabase
 * `user_custom_topics` table is the drafted migration target.
 */

import type { CustomSignalTopic, SignalTopicPriority } from "./types";

function uid(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `ct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a new custom topic with privacy-safe defaults. */
export function createCustomTopic(
  name: string,
  patch: Partial<Omit<CustomSignalTopic, "id" | "createdAt" | "updatedAt">> = {},
): CustomSignalTopic {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: name.trim(),
    keywords: patch.keywords ?? keywordsFromName(name),
    sources: patch.sources,
    rssFeeds: patch.rssFeeds,
    priority: patch.priority ?? "normal",
    includeInTop3: patch.includeInTop3 ?? false,
    muted: patch.muted ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Derive sensible default keywords from a topic name (the name + its words). */
export function keywordsFromName(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const words = trimmed
    .toLowerCase()
    .split(/[\s,/]+/)
    .filter((w) => w.length >= 3);
  return Array.from(new Set([trimmed.toLowerCase(), ...words]));
}

const PRIORITY_WEIGHT: Record<SignalTopicPriority, number> = {
  low: 0.5,
  normal: 1,
  high: 1.5,
};

export function priorityWeight(priority: SignalTopicPriority): number {
  return PRIORITY_WEIGHT[priority];
}

/** Lowercased keywords of all NON-muted custom topics (drive personal-fit). */
export function customTopicInterestTerms(topics: CustomSignalTopic[]): string[] {
  const set = new Set<string>();
  for (const t of topics) {
    if (t.muted) continue;
    for (const k of t.keywords) {
      const v = k.trim().toLowerCase();
      if (v.length >= 2) set.add(v);
    }
  }
  return [...set];
}

/** Keywords of custom topics flagged for Top 3 or high priority (ranking boost). */
export function customTopicBoostedTerms(topics: CustomSignalTopic[]): string[] {
  const set = new Set<string>();
  for (const t of topics) {
    if (t.muted) continue;
    if (!t.includeInTop3 && t.priority !== "high") continue;
    for (const k of t.keywords) {
      const v = k.trim().toLowerCase();
      if (v.length >= 2) set.add(v);
    }
  }
  return [...set];
}

/** Keywords of MUTED custom topics — items matching are filtered out. */
export function customTopicMutedTerms(topics: CustomSignalTopic[]): string[] {
  const set = new Set<string>();
  for (const t of topics) {
    if (!t.muted) continue;
    for (const k of t.keywords) {
      const v = k.trim().toLowerCase();
      if (v.length >= 2) set.add(v);
    }
  }
  return [...set];
}

/** Topic-name search queries for source providers (non-muted). */
export function customTopicSourceQueries(topics: CustomSignalTopic[]): string[] {
  return topics.filter((t) => !t.muted).map((t) => t.name).filter(Boolean);
}

/** All RSS feed URLs across non-muted custom topics. */
export function customTopicRssFeeds(topics: CustomSignalTopic[]): string[] {
  const set = new Set<string>();
  for (const t of topics) {
    if (t.muted) continue;
    for (const f of t.rssFeeds ?? []) {
      if (/^https?:\/\//i.test(f)) set.add(f);
    }
  }
  return [...set];
}
