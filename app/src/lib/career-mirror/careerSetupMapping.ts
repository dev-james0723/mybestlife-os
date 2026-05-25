/**
 * AI Career Mirror — deterministic projection of setup answers onto the
 * career profile (WS2).
 *
 * Nothing here throws on missing answers. Enum-ish single answers become a
 * short human string in their target column; multi/ranking answers append
 * (deduped) into string[] columns.
 */

import type { CareerProfileUpsertInput } from "@/lib/repositories/career-profile";
import { CAREER_SETUP_QUESTIONS } from "./careerSetupQuestionBank";
import type { OptionId, SetupAnswer, SetupAnswers } from "./careerSetupTypes";

/** How a single mapping target receives the answer value. */
export type FieldMapping = {
  /** A column on the career profile. Kept as a loose string so WS1's in-flight
   * column additions don't break this module's compile. */
  column: string;
  mode: "set-enum" | "append-array" | "free-text" | "set-text";
};

/**
 * Turn a stable option id into a short, human-readable label. We intentionally
 * keep this independent of the i18n copy so the persisted value is stable and
 * locale-agnostic ("English-ish enum"). The UI re-localizes via the option id
 * when rendering; this is the value we store for AI prompts and reports.
 */
function humanizeOptionId(optionId: OptionId): string {
  return optionId
    .split("-")
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part))
    .join(" ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Resolve the "string-ish" representation of an answer (option / free text). */
function resolveScalar(answer: SetupAnswer): string | null {
  if (answer.status !== "answered") return null;
  const { value, freeText } = answer;
  if (typeof value === "string" && value.length > 0) {
    return humanizeOptionId(value);
  }
  if (typeof value === "number") return String(value);
  if (freeText && freeText.trim().length > 0) return freeText.trim();
  return null;
}

/** Resolve the array-ish representation (multi / ranking + optional free text). */
function resolveList(answer: SetupAnswer): string[] {
  if (answer.status !== "answered") return [];
  const out: string[] = [];
  if (Array.isArray(answer.value)) {
    for (const v of answer.value) {
      if (typeof v === "string" && v.length > 0) out.push(humanizeOptionId(v));
    }
  } else if (typeof answer.value === "string" && answer.value.length > 0) {
    out.push(humanizeOptionId(answer.value));
  }
  if (answer.freeText && answer.freeText.trim().length > 0) {
    out.push(answer.freeText.trim());
  }
  return out;
}

function dedupePush(target: Record<string, unknown>, column: string, values: string[]) {
  if (values.length === 0) return;
  const existing = Array.isArray(target[column]) ? (target[column] as string[]) : [];
  const merged = [...existing];
  for (const v of values) {
    if (!merged.includes(v)) merged.push(v);
  }
  target[column] = merged;
}

/**
 * Build the (partial) career-profile patch from the collected setup answers.
 * Deterministic and side-effect free.
 */
export function buildProfilePatchFromAnswers(
  answers: SetupAnswers,
): CareerProfileUpsertInput {
  const patch: Record<string, unknown> = {};

  for (const question of CAREER_SETUP_QUESTIONS) {
    const answer = answers[question.id];
    if (!answer || answer.status !== "answered") continue;
    if (question.mapsTo.length === 0) continue;

    const scalar = resolveScalar(answer);
    const list = resolveList(answer);

    for (const mapping of question.mapsTo) {
      switch (mapping.mode) {
        case "append-array":
          dedupePush(patch, mapping.column, list.length > 0 ? list : scalar ? [scalar] : []);
          break;
        case "set-enum":
        case "set-text":
        case "free-text": {
          if (scalar && patch[mapping.column] == null) {
            patch[mapping.column] = scalar;
          }
          break;
        }
      }
    }
  }

  return patch as CareerProfileUpsertInput;
}

/**
 * 0..100 completion score, weighted by how many non-optional questions have an
 * actual answer (skipped / not-sure do not count toward completion).
 */
export function computeSetupCompletionScore(answers: SetupAnswers): number {
  const required = CAREER_SETUP_QUESTIONS.filter((q) => !q.optional);
  if (required.length === 0) return 100;
  const answered = required.filter((q) => {
    const a = answers[q.id];
    return a != null && a.status === "answered";
  }).length;
  return Math.round((answered / required.length) * 100);
}

/** Important columns we expect the Career Mirror to populate over time. */
const IMPORTANT_COLUMNS = [
  // existing
  "current_role",
  "industry",
  "top_skills",
  "career_goals",
  "dream_scenario",
  "target_roles",
  // career-mirror extensions (WS1)
  "career_stage",
  "current_status_summary",
  "motivation_drivers",
  "ambition_style",
  "visibility_goal",
  "desired_reputation",
  "work_energy_pattern",
  "ideal_work_environment",
  "decision_style",
  "feedback_preference",
  "preferred_mentor_style",
  "culture_fit",
  "organizational_triggers",
  "blocker_category",
  "risk_factors",
  "transition_type",
  "transition_timeline",
  "self_reported_personality_type",
  "career_banner_style",
] as const;

/**
 * Returns the column keys still considered "empty" on the profile. Kept
 * deliberately separate from the legacy `computeProfileCompleteness`.
 */
export function computeMissingFields(
  profile: Record<string, unknown> | null | undefined,
): string[] {
  if (!profile) return [...IMPORTANT_COLUMNS];
  const missing: string[] = [];
  for (const column of IMPORTANT_COLUMNS) {
    const value = profile[column];
    const empty =
      value == null ||
      (typeof value === "string" && value.trim().length === 0) ||
      (Array.isArray(value) && value.length === 0);
    if (empty) missing.push(column);
  }
  return missing;
}
