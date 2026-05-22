import type { Topic } from "./constants";

export type TopicExtraField =
  | { type: "text"; key: string }
  | { type: "slider"; key: string; min: number; max: number }
  | { type: "array"; key: string };

export interface TopicConfig {
  /** Stable key used to look up localized copy. */
  copyKey: keyof TopicCopyMap;
  /** Whether `selfStory` is required by app logic for this topic. */
  selfStoryRequired: boolean;
  /** Cardinality of the `needs` selection for this topic. */
  needsCardinality: "exactly-one" | "one-to-two";
  /** Ordered list of topic-specific extra fields. */
  extras: TopicExtraField[];
}

export type TopicCopyMap = {
  "Work/Study": TopicCopy<["win", "friction", "focusBlock"]>;
  "People/Relationships": TopicCopy<["person", "boundary"]>;
  "Body/Health": TopicCopy<["sleep", "food", "movement", "symptom"]>;
  "Stress Event": TopicCopy<["likelyOutcome", "worstCase", "controlToday"]>;
  "Achievement/Confidence": TopicCopy<["skillShown", "repeatTomorrow"]>;
  "Creativity/Music": TopicCopy<["bottleneck", "microGoal"]>;
  "Big Decisions": TopicCopy<
    ["optionA", "optionB", "costA", "costB", "topValues", "nextExperiment"]
  >;
  "Quick Reset": TopicCopy<[]>;
};

type TopicCopy<TKeys extends readonly string[]> = {
  bulletLabel: string;
  selfStoryLabel: string;
  extras: { [K in TKeys[number]]: string };
};

export const TOPIC_CONFIG: Record<Topic, TopicConfig> = {
  "Work/Study": {
    copyKey: "Work/Study",
    selfStoryRequired: true,
    needsCardinality: "one-to-two",
    extras: [
      { type: "text", key: "win" },
      { type: "text", key: "friction" },
      { type: "text", key: "focusBlock" },
    ],
  },
  "People/Relationships": {
    copyKey: "People/Relationships",
    selfStoryRequired: true,
    needsCardinality: "one-to-two",
    extras: [
      { type: "text", key: "person" },
      { type: "text", key: "boundary" },
    ],
  },
  "Body/Health": {
    copyKey: "Body/Health",
    selfStoryRequired: false,
    needsCardinality: "one-to-two",
    extras: [
      { type: "slider", key: "sleep", min: 0, max: 10 },
      { type: "slider", key: "food", min: 0, max: 10 },
      { type: "slider", key: "movement", min: 0, max: 10 },
      { type: "text", key: "symptom" },
    ],
  },
  "Stress Event": {
    copyKey: "Stress Event",
    selfStoryRequired: true,
    needsCardinality: "one-to-two",
    extras: [
      { type: "text", key: "likelyOutcome" },
      { type: "text", key: "worstCase" },
      { type: "text", key: "controlToday" },
    ],
  },
  "Achievement/Confidence": {
    copyKey: "Achievement/Confidence",
    selfStoryRequired: true,
    needsCardinality: "one-to-two",
    extras: [
      { type: "text", key: "skillShown" },
      { type: "text", key: "repeatTomorrow" },
    ],
  },
  "Creativity/Music": {
    copyKey: "Creativity/Music",
    selfStoryRequired: false,
    needsCardinality: "one-to-two",
    extras: [
      { type: "text", key: "bottleneck" },
      { type: "text", key: "microGoal" },
    ],
  },
  "Big Decisions": {
    copyKey: "Big Decisions",
    selfStoryRequired: true,
    needsCardinality: "one-to-two",
    extras: [
      { type: "text", key: "optionA" },
      { type: "text", key: "optionB" },
      { type: "text", key: "costA" },
      { type: "text", key: "costB" },
      { type: "array", key: "topValues" },
      { type: "text", key: "nextExperiment" },
    ],
  },
  "Quick Reset": {
    copyKey: "Quick Reset",
    selfStoryRequired: false,
    needsCardinality: "exactly-one",
    extras: [],
  },
};
