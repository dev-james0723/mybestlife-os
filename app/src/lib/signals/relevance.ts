/**
 * Signals — honest "Why this signal?" derivation (§11).
 *
 * The cardinal rule: the displayed reason is generated FROM a machine-derived
 * `relevanceBasis` — never invented. This module decides the basis + the
 * literal matched term deterministically; the i18n layer only phrases it.
 *
 * If the only thing true about an item is "it matches a topic you follow",
 * that is exactly what it will say — it will not pretend a project connection.
 */

import type {
  LifeOsContext,
  SignalItem,
  SignalRelevanceBasis,
  SignalSectionKey,
  SignalsPreferences,
} from "./types";
import { bestTermMatch } from "./matching";

export type RelevanceExplanation = {
  basis: SignalRelevanceBasis;
  /** The literal matched term (topic name, project name, city…), if any. */
  term?: string;
};

function searchText(signal: SignalItem): string {
  return `${signal.headline} ${signal.summary} ${signal.tags.join(" ")} ${signal.topic}`;
}

/**
 * Strongest *personal* tie, checked in priority order. Returns null when the
 * item has no honest personal connection (→ it should fall back to topic or
 * global importance, never a fabricated personal reason).
 */
export function derivePersonalRelevance(
  signal: SignalItem,
  ctx: LifeOsContext,
): RelevanceExplanation | null {
  const text = searchText(signal);

  const projectTerm = bestTermMatch(text, ctx.projectTerms);
  if (projectTerm) return { basis: "project_match", term: projectTerm };

  const calendarTerm = bestTermMatch(text, ctx.calendarTerms);
  if (calendarTerm) return { basis: "calendar_proximity", term: calendarTerm };

  const taskTerm = bestTermMatch(text, ctx.taskTerms);
  if (taskTerm) return { basis: "task_match", term: taskTerm };

  const brainTerm = bestTermMatch(text, ctx.brainTerms);
  if (brainTerm) return { basis: "brain_similarity", term: brainTerm };

  const topicTerm = bestTermMatch(text, ctx.followedTopics);
  if (topicTerm) return { basis: "topic_match", term: topicTerm };

  return null;
}

/**
 * Section-aware relevance. The basis is honest to *why the item is in this
 * section*: Local = location, World = global importance (unless a strong
 * personal tie exists), Personal = the strongest personal tie.
 */
export function deriveRelevance(
  signal: SignalItem,
  prefs: SignalsPreferences,
  ctx: LifeOsContext,
  section: SignalSectionKey,
): RelevanceExplanation {
  if (signal.isDemo) return { basis: "demo" };

  // A blind-spot pick is tagged during selection — preserve it.
  if (signal.relevanceBasis === "blind_spot") {
    return { basis: "blind_spot", term: signal.topic };
  }

  if (section === "local") {
    const term = ctx.location?.city ?? signal.region ?? ctx.location?.region;
    return { basis: "location_match", term: term ?? undefined };
  }

  if (section === "personal") {
    return (
      derivePersonalRelevance(signal, ctx) ?? {
        basis: "topic_match",
        term: signal.topic,
      }
    );
  }

  // top3 + world: personal tie wins when it genuinely exists, else importance.
  const personal = derivePersonalRelevance(signal, ctx);
  if (personal) return personal;
  return { basis: "global_importance", term: signal.topic };
}
