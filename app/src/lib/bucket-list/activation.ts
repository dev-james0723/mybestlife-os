/**
 * Pure helpers for the Dream Activation Engine — activation modes, the
 * thoughtful status transition, and the post-activation checklist. No AI, no
 * side effects, so they're safe to unit test and reuse on client + server.
 */

import type {
  BucketActivationMode,
  BucketItem,
  BucketStatus,
} from "@/types/bucket-list";

export const ACTIVATION_MODE_ORDER: BucketActivationMode[] = [
  "gentle",
  "practical",
  "ambitious",
  "minimal",
];

/**
 * The next status a dream should advance to once it is activated. Conservative
 * and one step at a time — never skips ahead, never downgrades, never touches
 * completed/archived/paused dreams. Applied only after the user confirms.
 */
export function nextActivationStatus(current: BucketStatus): BucketStatus | null {
  switch (current) {
    case "dreaming":
      return "exploring";
    case "exploring":
      return "planning";
    case "planning":
      return "active";
    // active → funded/scheduled/booked depend on real-world milestones the
    // user reaches later; we don't auto-advance past "active".
    default:
      return null;
  }
}

export type ActivationChecklistItem = {
  key: string;
  label: string;
  /** Already satisfied by what the dream / plan already has. */
  done: boolean;
};

export type ActivationChecklistContext = {
  hasFirstAction: boolean;
  hasResearch: boolean;
  hasBudget: boolean;
  hasSchedule: boolean;
  hasPeople: boolean;
  hasSupplies: boolean;
};

/**
 * Build the activation checklist for a dream. Labels are provided by the caller
 * (i18n) so this stays presentation-agnostic; we only decide which steps apply
 * and which are already satisfied.
 */
export function buildActivationChecklist(
  item: BucketItem,
  labels: {
    firstAction: string;
    research: string;
    budget: string;
    schedule: string;
    people: string;
    supplies: string;
    booking: string;
    reflection: string;
  },
  ctx: ActivationChecklistContext,
): ActivationChecklistItem[] {
  const items: ActivationChecklistItem[] = [
    { key: "first_action", label: labels.firstAction, done: ctx.hasFirstAction },
    { key: "research", label: labels.research, done: ctx.hasResearch },
    {
      key: "budget",
      label: labels.budget,
      done:
        ctx.hasBudget ||
        Boolean(item.linked_savings_goal_id || item.linked_budget_id),
    },
    {
      key: "schedule",
      label: labels.schedule,
      done: ctx.hasSchedule || Boolean(item.target_date || item.target_month),
    },
    { key: "people", label: labels.people, done: ctx.hasPeople },
    { key: "supplies", label: labels.supplies, done: ctx.hasSupplies },
  ];

  if (item.type === "travel") {
    items.push({
      key: "booking",
      label: labels.booking,
      done: item.status === "booked",
    });
  }

  items.push({
    key: "reflection",
    label: labels.reflection,
    done: item.status === "completed",
  });

  return items;
}
