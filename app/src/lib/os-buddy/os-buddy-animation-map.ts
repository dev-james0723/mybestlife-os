import type {
  OSBuddyAnimationState,
  OSBuddyMood,
  OSBuddyPetId,
} from "@/types/os-buddy";

export const OS_BUDDY_MOOD_TO_ANIMATION: Record<
  OSBuddyMood,
  OSBuddyAnimationState
> = {
  idle: "idle",
  thinking: "waiting",
  creating: "running",
  reading: "review",
  success: "jumping",
  error: "failed",
  sleepy: "waiting",
  playful: "waving",
  focused: "review",
  celebrating: "jumping",
  "dragging-left": "running-left",
  "dragging-right": "running-right",
};

export function getOSBuddyAnimationState(params: {
  petId: OSBuddyPetId;
  mood: OSBuddyMood;
}): OSBuddyAnimationState {
  return OS_BUDDY_MOOD_TO_ANIMATION[params.mood] ?? "idle";
}
