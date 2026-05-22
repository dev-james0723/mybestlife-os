// ============ TOPICS ============
export const TOPICS = [
  "Work/Study",
  "People/Relationships",
  "Body/Health",
  "Stress Event",
  "Achievement/Confidence",
  "Creativity/Music",
  "Big Decisions",
  "Quick Reset",
] as const;
export type Topic = (typeof TOPICS)[number];

// ============ QUADRANTS ============
export const QUADRANTS = ["RED", "YELLOW", "BLUE", "GREEN"] as const;
export type Quadrant = (typeof QUADRANTS)[number];

export const QUADRANT_META: Record<
  Quadrant,
  {
    subtitleKey: "highEnergyUnpleasant" | "highEnergyPleasant" | "lowEnergyUnpleasant" | "lowEnergyPleasant";
    bgClass: string;
    bgSelectedClass: string;
    borderClass: string;
    textClass: string;
    sliceColor: string;
  }
> = {
  RED: {
    subtitleKey: "highEnergyUnpleasant",
    bgClass: "bg-red-500/10",
    bgSelectedClass: "bg-red-500/20",
    borderClass: "border-red-500",
    textClass: "text-red-700 dark:text-red-300",
    sliceColor: "#ef4444",
  },
  YELLOW: {
    subtitleKey: "highEnergyPleasant",
    bgClass: "bg-yellow-500/10",
    bgSelectedClass: "bg-yellow-500/20",
    borderClass: "border-yellow-500",
    textClass: "text-yellow-700 dark:text-yellow-300",
    sliceColor: "#eab308",
  },
  BLUE: {
    subtitleKey: "lowEnergyUnpleasant",
    bgClass: "bg-blue-500/10",
    bgSelectedClass: "bg-blue-500/20",
    borderClass: "border-blue-500",
    textClass: "text-blue-700 dark:text-blue-300",
    sliceColor: "#3b82f6",
  },
  GREEN: {
    subtitleKey: "lowEnergyPleasant",
    bgClass: "bg-green-500/10",
    bgSelectedClass: "bg-green-500/20",
    borderClass: "border-green-500",
    textClass: "text-green-700 dark:text-green-300",
    sliceColor: "#22c55e",
  },
};

// ============ EMOTIONS (4 × 25 RULER framework) ============
export const EMOTION_LISTS = {
  RED: [
    "Enraged", "Panicked", "Stressed", "Jittery", "Shocked",
    "Livid", "Furious", "Frustrated", "Tense", "Stunned",
    "Fuming", "Frightened", "Angry", "Nervous", "Restless",
    "Anxious", "Apprehensive", "Worried", "Irritated", "Annoyed",
    "Repulsed", "Troubled", "Concerned", "Uneasy", "Peeved",
  ],
  YELLOW: [
    "Surprised", "Upbeat", "Festive", "Exhilarated", "Ecstatic",
    "Hyper", "Cheerful", "Motivated", "Inspired", "Elated",
    "Energized", "Lively", "Excited", "Optimistic", "Enthusiastic",
    "Pleased", "Focused", "Happy", "Proud", "Thrilled",
    "Pleasant", "Joyful", "Hopeful", "Playful", "Blissful",
  ],
  BLUE: [
    "Disgusted", "Glum", "Disappointed", "Down", "Apathetic",
    "Pessimistic", "Morose", "Discouraged", "Sad", "Bored",
    "Alienated", "Miserable", "Lonely", "Disheartened", "Tired",
    "Despondent", "Depressed", "Sullen", "Exhausted", "Fatigued",
    "Despairing", "Hopeless", "Desolate", "Spent", "Drained",
  ],
  GREEN: [
    "At Ease", "Easygoing", "Content", "Loving", "Fulfilled",
    "Calm", "Secure", "Satisfied", "Grateful", "Touched",
    "Relaxed", "Chill", "Restful", "Blessed", "Balanced",
    "Mellow", "Thoughtful", "Peaceful", "Comfortable", "Carefree",
    "Sleepy", "Complacent", "Tranquil", "Cozy", "Serene",
  ],
} as const satisfies Record<Quadrant, readonly string[]>;

export const ALL_EMOTIONS = [
  ...EMOTION_LISTS.RED,
  ...EMOTION_LISTS.YELLOW,
  ...EMOTION_LISTS.BLUE,
  ...EMOTION_LISTS.GREEN,
] as const;
export type Emotion = (typeof ALL_EMOTIONS)[number];

export function emotionQuadrantOf(emotion: string): Quadrant | null {
  for (const q of QUADRANTS) {
    if ((EMOTION_LISTS[q] as readonly string[]).includes(emotion)) return q;
  }
  return null;
}

// ============ TARGET ============
export const TARGETS = ["Myself", "Someone", "Situation", "Future", "Body"] as const;
export type Target = (typeof TARGETS)[number];

// ============ NEEDS ============
export const NEEDS = [
  "Rest", "Structure", "Reassurance", "Progress", "Connection",
  "Respect", "Autonomy", "Clarity", "Fun", "Safety",
] as const;
export type Need = (typeof NEEDS)[number];

// ============ CONTEXT FACTOR OPTIONS ============
export const PHYSICAL_STATE_OPTIONS = [
  "Caffeinated", "Hungry", "Hydrated", "Sore", "Sleepy", "Energized",
] as const;
export const ENVIRONMENT_OPTIONS = [
  "At home", "Outside", "At work", "Travel", "Cafe", "Library", "Noisy", "Quiet",
] as const;
export const SUBSTANCE_OPTIONS = [
  "None", "Coffee", "Tea", "Alcohol", "Nicotine", "Cannabis", "Medication",
] as const;

// ============ AI MEDIA CONFIG ============
export const ILLUSTRATION_STYLE_PRESETS = [
  "Symbolic cinematic illustration",
  "Soft watercolor",
  "Minimalist editorial",
  "Anime-inspired",
  "Photoreal",
] as const;
export type IllustrationStylePreset = (typeof ILLUSTRATION_STYLE_PRESETS)[number];

export const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:5"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

// Underlying provider is Gemini TTS; these are the actual Gemini voice names.
export const TTS_VOICES = ["Kore", "Charon", "Puck", "Aoede", "Zephyr", "Fenrir"] as const;
export type TTSVoice = (typeof TTS_VOICES)[number];

export const DEFAULT_AI_DEFAULTS = {
  stylePreset: "Symbolic cinematic illustration" as IllustrationStylePreset,
  aspectRatio: "1:1" as AspectRatio,
  voice: "Kore" as TTSVoice,
  speed: 1,
  // 0 = fully literal, 100 = fully symbolic
  literalVsSymbolicSlider: 70,
};

// ============ STORAGE BUCKETS ============
export const JOURNAL_ILLUSTRATIONS_BUCKET = "journal-illustrations";
export const JOURNAL_AUDIO_BUCKET = "journal-audio";

// Signed-URL TTL: 7 days (per spec).
export const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;
