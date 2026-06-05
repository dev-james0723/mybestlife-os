import type { LifeAgentActionType } from "@/lib/life-agent/action-types";

export function buildCelebrationMessage(
  actionType: LifeAgentActionType,
  actionTitle: string,
): string {
  switch (actionType) {
    case "create_task":
      return `This is progress. You turned something unclear into a concrete task: “${actionTitle}”.`;
    case "create_note":
      return `You captured something in writing — “${actionTitle}”. That clarity counts.`;
    case "create_project":
      return `You gave shape to “${actionTitle}”. One container can hold a lot of scattered energy.`;
    case "update_relationship_next_action":
      return `You named a next step for someone who matters. That is thoughtful follow-through.`;
    case "save_journal_entry":
      return `You made space to reflect. That is care, not productivity theater.`;
    case "create_life_agent_memory":
      return `You chose what to remember. Future-you may thank you for that honesty.`;
    case "draft_message":
      return `You drafted “${actionTitle}” — still your words to send, when you are ready.`;
    default:
      return `You completed “${actionTitle}”. Small clear steps add up.`;
  }
}
