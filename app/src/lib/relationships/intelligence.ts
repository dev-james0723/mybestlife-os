/**
 * Deterministic, privacy-safe relationship intelligence.
 *
 * Everything here is computed locally from the user's own data — no AI, no
 * scoring of *people*. We measure "Context Health" (does the app have enough
 * memory to help the user interact well?) and "Relationship Weather" (the
 * status of the relationship *context*, e.g. an open loop), never a ranking
 * of the person's value. See spec §18 / §13.7 / §25.
 *
 * Kept pure + dependency-free (besides types) so it's trivially unit-testable
 * and reusable across the card, the intelligence modal, and the page dashboard.
 */

import type {
  Relationship,
  RelationshipPromise,
} from "@/types/database";
import type { RelationshipWeatherStatus } from "@/types/relationship-intelligence";

// ---------------------------------------------------------------------------
// Date math (all dates are ISO `YYYY-MM-DD`; we compare in UTC-naive terms)
// ---------------------------------------------------------------------------

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Whole days between two ISO dates (b - a). Null-safe → null. */
export function daysBetween(
  a: string | null | undefined,
  b: string | null | undefined,
): number | null {
  if (!a || !b) return null;
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round((db - da) / 86_400_000);
}

export function daysSince(
  date: string | null | undefined,
  now = todayIso(),
): number | null {
  return daysBetween(date, now);
}

export function isPastOrToday(
  date: string | null | undefined,
  now = todayIso(),
): boolean {
  if (!date) return false;
  return date <= now;
}

// ---------------------------------------------------------------------------
// Promise helpers
// ---------------------------------------------------------------------------

/** Open promises that are past their due date are "effectively overdue". */
export function isPromiseEffectivelyOverdue(
  p: Pick<RelationshipPromise, "status" | "due_date">,
  now = todayIso(),
): boolean {
  if (p.status === "overdue") return true;
  if (p.status !== "open") return false;
  return p.due_date != null && p.due_date < now;
}

export function countOpenPromises(
  promises: readonly RelationshipPromise[],
): number {
  return promises.filter((p) => p.status === "open").length;
}

// ---------------------------------------------------------------------------
// Context Health (§18)
// ---------------------------------------------------------------------------

export type ContextHealthFactor = {
  key: string;
  /** True when the factor is satisfied. */
  present: boolean;
  /** Relative weight in the score. */
  weight: number;
};

export type ContextHealthInput = {
  relationship: Relationship;
  promiseCount: number;
  interactionCount: number;
  imageCount: number;
};

export type ContextHealth = {
  /** 0–100. */
  score: number;
  factors: ContextHealthFactor[];
  /** Keys of missing factors, for "what to add" hints. */
  missing: string[];
};

const HEALTH_WEIGHTS: { key: string; weight: number }[] = [
  { key: "contact_info", weight: 1 },
  { key: "last_contact", weight: 1 },
  { key: "next_action", weight: 1 },
  { key: "next_action_date", weight: 1 },
  { key: "preferences", weight: 1 },
  { key: "commitments", weight: 1 },
  { key: "linked_project", weight: 1 },
  { key: "tags", weight: 1 },
  { key: "profile_photo", weight: 1 },
  { key: "memory_image", weight: 1 },
  { key: "recent_interaction", weight: 1 },
];

export function computeContextHealth(input: ContextHealthInput): ContextHealth {
  const r = input.relationship;
  const present: Record<string, boolean> = {
    contact_info: Boolean(r.email || r.phone),
    last_contact: Boolean(r.last_contact_date),
    next_action: Boolean(r.next_action),
    next_action_date: Boolean(r.next_action_date),
    preferences: Boolean(r.preferences_and_details),
    commitments: Boolean(r.commitments_made) || input.promiseCount > 0,
    linked_project: Boolean(r.linked_project_id),
    tags: r.tags.length > 0,
    profile_photo: Boolean(r.photo_url),
    memory_image: input.imageCount > 0,
    recent_interaction: input.interactionCount > 0,
  };

  const factors: ContextHealthFactor[] = HEALTH_WEIGHTS.map((w) => ({
    key: w.key,
    weight: w.weight,
    present: present[w.key] ?? false,
  }));

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const earned = factors.reduce((s, f) => s + (f.present ? f.weight : 0), 0);
  const score = totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100);

  return {
    score,
    factors,
    missing: factors.filter((f) => !f.present).map((f) => f.key),
  };
}

// ---------------------------------------------------------------------------
// Relationship Weather (§13.7) — status of the *context*, not the person
// ---------------------------------------------------------------------------

export type RelationshipWeather = {
  status: RelationshipWeatherStatus;
  /** True for statuses that warrant a gentle visual nudge (subtle pulse). */
  urgent: boolean;
};

export type WeatherInput = {
  relationship: Relationship;
  openPromiseCount: number;
  overduePromiseCount: number;
};

/**
 * Picks a single weather status by priority. Intentionally conservative — we
 * favor "clear" unless there's a concrete reason for attention, to avoid
 * guilt-tripping the user (§25).
 */
export function computeRelationshipWeather(
  input: WeatherInput,
  now = todayIso(),
): RelationshipWeather {
  const r = input.relationship;

  if (input.overduePromiseCount > 0) {
    return { status: "promise_pending", urgent: true };
  }

  // A meeting/next action that's due today or in the past → needs attention.
  if (r.next_action && isPastOrToday(r.next_action_date, now)) {
    return { status: "needs_attention", urgent: true };
  }

  if (input.openPromiseCount > 0) {
    return { status: "promise_pending", urgent: false };
  }

  // Stated next action but no logged follow-through and no due date → open loop.
  if (r.next_action && !r.next_action_date) {
    return { status: "open_loop", urgent: false };
  }

  const since = daysSince(r.last_contact_date, now);
  if (since != null && since > 90) {
    return { status: "quiet_recently", urgent: false };
  }

  return { status: "clear", urgent: false };
}

// ---------------------------------------------------------------------------
// "Who needs me this week?" (§14.1) — a gentle, deterministic timing signal
// ---------------------------------------------------------------------------

export type AttentionReasonKey =
  | "overdue_promise"
  | "next_action_due"
  | "open_promise"
  | "favorite_quiet";

export type AttentionItem = {
  relationship: Relationship;
  /** Higher = more worth surfacing. */
  priority: number;
  reasonKeys: AttentionReasonKey[];
};

export type AttentionInput = {
  relationship: Relationship;
  openPromiseCount: number;
  overduePromiseCount: number;
};

/**
 * Returns an attention item when a relationship plausibly warrants a touch
 * this week, or null. Never invents urgency — only reflects the user's own
 * promises, due dates, and long quiet stretches on favorited people.
 */
export function computeAttention(
  input: AttentionInput,
  now = todayIso(),
): AttentionItem | null {
  const r = input.relationship;
  const reasonKeys: AttentionReasonKey[] = [];
  let priority = 0;

  if (input.overduePromiseCount > 0) {
    reasonKeys.push("overdue_promise");
    priority += 100 + input.overduePromiseCount;
  }

  // Next action due within the next 7 days (or already past).
  const daysToAction = daysBetween(now, r.next_action_date);
  if (r.next_action && daysToAction != null && daysToAction <= 7) {
    reasonKeys.push("next_action_due");
    priority += daysToAction <= 0 ? 80 : 60 - daysToAction;
  }

  if (input.openPromiseCount > 0 && input.overduePromiseCount === 0) {
    reasonKeys.push("open_promise");
    priority += 40;
  }

  const since = daysSince(r.last_contact_date, now);
  if (r.is_favorite && (since == null || since > 60)) {
    reasonKeys.push("favorite_quiet");
    priority += 20;
  }

  if (reasonKeys.length === 0) return null;
  return { relationship: r, priority, reasonKeys };
}
