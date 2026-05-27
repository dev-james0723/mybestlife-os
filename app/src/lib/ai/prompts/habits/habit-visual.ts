import type { HabitType, TimeOfDay } from "@/lib/habits/types";

function visualSubjectForHabit(input: {
  habitName: string;
  description?: string | null;
  type?: HabitType;
  timeOfDay?: TimeOfDay;
  sourceContext?: string;
}): string {
  const name = input.habitName.toLowerCase();
  if (/read|book|閱讀|讀書|study|學習/.test(name)) {
    return "an open book on a quiet desk, a small pool of warm light, refined glass edges";
  }
  if (/run|walk|gym|workout|exercise|health|運動|跑|健身/.test(name)) {
    return "minimal training gear beside a softly lit path, calm momentum, no people";
  }
  if (/write|journal|note|寫|日記/.test(name)) {
    return "a notebook and pen on a dark walnut surface, subtle frosted glass reflections";
  }
  if (/music|piano|practice|rehearsal|violin|音樂|鋼琴|練習/.test(name)) {
    return "a polished music stand and instrument detail in warm studio light, no hands";
  }
  if (/sleep|wind|bed|夜|睡/.test(name)) {
    return "a calm bedside scene with a dim lamp and folded linen, cinematic quiet";
  }
  if (/focus|deep work|work|專注/.test(name)) {
    return "a clean desk with one focused light cone, glass timer, and dark premium workspace";
  }
  if (input.type === "negative") {
    return "a closed phone face down beside a calm glass token, restraint and clean space";
  }
  return `a symbolic still life for ${input.habitName}, ${input.description ?? ""}`.trim();
}

export function buildHabitVisualPrompt(input: {
  habitName: string;
  description?: string | null;
  type?: HabitType;
  timeOfDay?: TimeOfDay;
  sourceContext?: string;
}): string {
  const subject = visualSubjectForHabit(input);
  const timeHint =
    input.timeOfDay && input.timeOfDay !== "anytime"
      ? `Best time cue: ${input.timeOfDay}.`
      : "Best time cue: flexible.";

  return `Build a premium Liquid Glass habit card visual for the habit: "${input.habitName}".
Subject: ${subject}
${timeHint}
Mood: calm, focused, refined, personal productivity.
Style: frosted glass, dark warm base, subtle specular highlights, soft depth, premium app illustration, cinematic but minimal.
Composition: wide card header image, 16:9 landscape crop, safe space for a dark overlay gradient near the bottom, no text, no letters, no numbers, no logo, no watermark.
Avoid: generic stock photo, cartoonish gamification, childish icons, distorted hands, faces, UI text, bright neon flooding.
Technical: high detail, readable as a small card thumbnail, warm dark base compatible with glassmorphism.`;
}
