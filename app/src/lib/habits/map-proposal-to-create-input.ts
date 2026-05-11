import type { CreateHabitInput } from "@/lib/repositories/habits";
import type { HabitProposal } from "@/lib/ai/schemas/habits/habit-builder";
import type { HabitFrequency, Weekday } from "@/lib/habits/types";

function asHabitFrequency(f: HabitProposal["frequency"]): HabitFrequency {
  if (f.kind === "weekdays") {
    return { kind: "weekdays", days: [...f.days] as Weekday[] };
  }
  return f;
}

/** Maps an AI habit proposal into the repository create shape. */
export function habitProposalToCreateInput(
  proposal: HabitProposal,
): CreateHabitInput {
  return {
    name: proposal.name,
    description: proposal.description ?? null,
    type: proposal.type,
    target_value:
      proposal.type === "counter" || proposal.type === "duration"
        ? (proposal.targetValue ?? null)
        : null,
    frequency: asHabitFrequency(proposal.frequency),
    time_of_day: proposal.timeOfDay,
  };
}
