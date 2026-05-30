/**
 * Signals — reading-behavior derivation (§11, §17, §21).
 *
 * Pure, deterministic functions that turn the local action log into:
 *   - a {@link SignalBehavior} ranking signal (topic/source affinity, content
 *     sensitivities, hard-suppressed ids) — applied to scoring ONLY with consent,
 *   - a {@link SignalMemorySummary} read model for the inspectable Signal Memory
 *     control surface,
 *   - a {@link SignalWeeklyReflection} calm digest.
 *
 * No IO here (that lives in `memory-store.ts`) so this is trivially testable and
 * never sends anything to an LLM (§11: ranking is deterministic, not generated).
 */

import {
  BEHAVIOR_AFFINITY_HALF_LIFE_DAYS,
  BEHAVIOR_SENSITIVITY_SCALE,
  BEHAVIOR_TOPIC_WEIGHTS,
} from "./constants";
import type {
  SignalAction,
  SignalActionKind,
  SignalBehavior,
  SignalMemorySummary,
  SignalsPreferences,
  SignalWeeklyReflection,
} from "./types";

const DAY_MS = 86_400_000;

/** Recency weight in (0, 1]; recent actions count fully, old ones fade. */
function recencyWeight(createdAt: string, now: number): number {
  const ageMs = now - Date.parse(createdAt);
  if (!Number.isFinite(ageMs) || ageMs <= 0) return 1;
  const ageDays = ageMs / DAY_MS;
  return Math.exp((-Math.LN2 * ageDays) / BEHAVIOR_AFFINITY_HALF_LIFE_DAYS);
}

/** Saturating 0–1 sensitivity from a count of flags (diminishing returns). */
function saturate(count: number): number {
  if (count <= 0) return 0;
  return 1 - Math.exp(-count / BEHAVIOR_SENSITIVITY_SCALE);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const POSITIVE_KINDS: ReadonlySet<SignalActionKind> = new Set([
  "save",
  "to_brain",
  "to_task",
  "more_like_this",
  "follow_topic",
  "track",
  "open",
]);

/**
 * Derive the ranking-facing behavior signal from the (recency-decayed) action
 * log. Deterministic + reproducible for a given log + clock.
 */
export function deriveBehavior(
  actions: SignalAction[],
  now: number = Date.now(),
): SignalBehavior {
  const topicRaw: Record<string, number> = {};
  const sourceRaw: Record<string, number> = {};
  const savedTopics = new Set<string>();
  const suppressed = new Set<string>();
  let negativeFlags = 0;
  let politicalFlags = 0;
  let shallowFlags = 0;

  for (const action of actions) {
    const decay = recencyWeight(action.createdAt, now);
    const topic = action.topic?.trim().toLowerCase();
    const domain = action.domain?.trim().toLowerCase();

    const topicDelta = BEHAVIOR_TOPIC_WEIGHTS[action.kind];
    if (topic && typeof topicDelta === "number") {
      topicRaw[topic] = (topicRaw[topic] ?? 0) + topicDelta * decay;
    }

    if (domain) {
      if (action.kind === "mute_source") sourceRaw[domain] = -1;
      else if (action.kind === "dismiss" || action.kind === "not_relevant") {
        sourceRaw[domain] = (sourceRaw[domain] ?? 0) - 0.12 * decay;
      }
    }

    switch (action.kind) {
      case "save":
      case "to_brain":
        if (topic) savedTopics.add(topic);
        break;
      case "too_negative":
        negativeFlags += decay;
        break;
      case "too_political":
        politicalFlags += decay;
        break;
      case "too_shallow":
        shallowFlags += decay;
        break;
      case "already_known":
      case "not_relevant":
        suppressed.add(action.signalId);
        break;
      default:
        break;
    }
  }

  const topicAffinity: Record<string, number> = {};
  for (const [topic, value] of Object.entries(topicRaw)) {
    topicAffinity[topic] = clamp(value, -1, 1);
  }

  const sourceAffinity: Record<string, number> = {};
  for (const [domain, value] of Object.entries(sourceRaw)) {
    sourceAffinity[domain] = clamp(value, -1, 0);
  }

  // Topics with genuine positive pull double as interest terms for matching.
  const savedTerms = [
    ...new Set([
      ...savedTopics,
      ...Object.entries(topicAffinity)
        .filter(([, v]) => v >= 0.3)
        .map(([t]) => t),
    ]),
  ];

  return {
    topicAffinity,
    sourceAffinity,
    negativitySensitivity: saturate(negativeFlags),
    politicalSensitivity: saturate(politicalFlags),
    shallowSensitivity: saturate(shallowFlags),
    suppressedIds: [...suppressed],
    savedTerms,
  };
}

/** True once behavior carries enough signal to be worth applying / showing. */
export function hasMeaningfulBehavior(behavior: SignalBehavior | undefined): boolean {
  if (!behavior) return false;
  return (
    behavior.savedTerms.length > 0 ||
    behavior.suppressedIds.length > 0 ||
    Object.keys(behavior.topicAffinity).length > 0 ||
    behavior.negativitySensitivity > 0 ||
    behavior.politicalSensitivity > 0 ||
    behavior.shallowSensitivity > 0
  );
}

function countByKind(actions: SignalAction[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of actions) counts[a.kind] = (counts[a.kind] ?? 0) + 1;
  return counts;
}

/**
 * Build the inspectable Signal Memory read model. Combines explicit prefs
 * (muted sources) with the derived behavior so the user sees exactly what is
 * up/down-weighted — and can reset it (§17/§18).
 */
export function summarizeMemory(
  actions: SignalAction[],
  prefs: Pick<SignalsPreferences, "mutedSources">,
  now: number = Date.now(),
): SignalMemorySummary {
  const behavior = deriveBehavior(actions, now);
  const counts = countByKind(actions);

  const entries = Object.entries(behavior.topicAffinity);
  const likedTopics = entries
    .filter(([, w]) => w > 0.05)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, weight]) => ({ topic, weight }));
  const cooledTopics = entries
    .filter(([, w]) => w < -0.05)
    .sort((a, b) => a[1] - b[1])
    .map(([topic, weight]) => ({ topic, weight }));

  return {
    totalActions: actions.length,
    likedTopics,
    cooledTopics,
    mutedSources: [...prefs.mutedSources],
    savedCount: counts["save"] ?? 0,
    dismissedCount: (counts["dismiss"] ?? 0) + (counts["not_relevant"] ?? 0),
    trackedCount: counts["track"] ?? 0,
    negativitySensitivity: behavior.negativitySensitivity,
    politicalSensitivity: behavior.politicalSensitivity,
    shallowSensitivity: behavior.shallowSensitivity,
  };
}

/** Monday 00:00 (local) of the week containing `now`. */
export function startOfWeek(now: number = Date.now()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d;
}

/**
 * Calm weekly digest of what the user tracked/saved/ignored this week — fits
 * the existing Weekly Review rhythm (§21). Purely descriptive; no value judgment.
 */
export function computeWeeklyReflection(
  actions: SignalAction[],
  now: number = Date.now(),
): SignalWeeklyReflection {
  const weekStart = startOfWeek(now);
  const startMs = weekStart.getTime();
  const recent = actions.filter((a) => {
    const t = Date.parse(a.createdAt);
    return Number.isFinite(t) && t >= startMs;
  });
  const counts = countByKind(recent);

  const topicCounts: Record<string, number> = {};
  for (const a of recent) {
    if (!a.topic) continue;
    if (!POSITIVE_KINDS.has(a.kind)) continue;
    topicCounts[a.topic] = (topicCounts[a.topic] ?? 0) + 1;
  }
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic, count]) => ({ topic, count }));

  return {
    weekStart: weekStart.toISOString(),
    saved: counts["save"] ?? 0,
    dismissed: (counts["dismiss"] ?? 0) + (counts["not_relevant"] ?? 0),
    tracked: counts["track"] ?? 0,
    opened: counts["open"] ?? 0,
    toBrain: counts["to_brain"] ?? 0,
    toTask: counts["to_task"] ?? 0,
    topTopics,
    hasActivity: recent.length > 0,
  };
}
