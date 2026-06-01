export type OSBuddyPetId = "xiaoba" | "doge";

export type OSBuddyAnimationState =
  | "idle"
  | "waiting"
  | "waving"
  | "jumping"
  | "failed"
  | "review"
  | "running"
  | "running-left"
  | "running-right";

export type OSBuddyMood =
  | "idle"
  | "thinking"
  | "creating"
  | "reading"
  | "success"
  | "error"
  | "sleepy"
  | "playful"
  | "focused"
  | "celebrating"
  | "dragging-left"
  | "dragging-right";

export type OSBuddyPosition = {
  x: number | null;
  y: number | null;
  anchor: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "custom";
};

export type OSBuddyPetManifest = {
  id: OSBuddyPetId;
  displayName: string;
  defaultName: string;
  description: Record<"en" | "zh-TW", string>;
  namePool: string[];
  assetBasePath: string;
  availableStates: OSBuddyAnimationState[];
  fallbackEmoji: string;
};
