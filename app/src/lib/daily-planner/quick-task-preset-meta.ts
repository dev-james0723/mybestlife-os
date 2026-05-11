/**
 * Built-in quick tasks map to stable preset keys for shared Liquid Glass icon assets
 * (`/public/quick-task-icons/preset-{key}.png`) and AI prompts.
 */
export type QuickTaskPresetKey =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "gym"
  | "meditate"
  | "improvise"
  | "read"
  | "journal"
  | "break"
  | "rest";

export const QUICK_TASK_PRESET_KEYS: QuickTaskPresetKey[] = [
  "breakfast",
  "lunch",
  "dinner",
  "gym",
  "meditate",
  "improvise",
  "read",
  "journal",
  "break",
  "rest",
];

/** English visual subject for Gemini / image prompts (avoid copying brand marks). */
export const QUICK_TASK_PRESET_VISUAL_SUBJECT: Record<QuickTaskPresetKey, string> = {
  breakfast: "a steaming coffee cup and croissant, morning breakfast",
  lunch: "a lunch bowl with utensils, midday meal",
  dinner: "a dinner plate with soup or warm meal, evening",
  gym: "a dumbbell and fitness training",
  meditate: "calm meditation breath or zen pebble, mindfulness",
  improvise: "theater masks or stage spotlight, improvisation drama",
  read: "an open book, reading",
  journal: "notebook and pen, journaling",
  break: "a simple timer or pause symbol, short break",
  rest: "crescent moon and sleep, rest",
};

const LABEL_MATCHERS: { re: RegExp; key: QuickTaskPresetKey }[] = [
  { re: /breakfast|早餐|早飲/i, key: "breakfast" },
  { re: /lunch|午餐|午膳/i, key: "lunch" },
  { re: /dinner|supper|晚餐|晚膳|晚飯/i, key: "dinner" },
  { re: /gym|健身|喼鐵/i, key: "gym" },
  { re: /meditat|冥想|靜心/i, key: "meditate" },
  { re: /improv|即兴|即興|戲劇/i, key: "improvise" },
  { re: /\bread(?:ing)?\b|閱讀|看書|讀書/i, key: "read" },
  { re: /journal|日記|筆記本/i, key: "journal" },
  { re: /\bbreak\b|小休/i, key: "break" },
  { re: /\brest\b|睡眠|睡覺|小睡/i, key: "rest" },
];

export function guessPresetKeyFromTaskLabel(label: string): QuickTaskPresetKey | null {
  for (const { re, key } of LABEL_MATCHERS) {
    if (re.test(label)) return key;
  }
  return null;
}

export function quickTaskPresetPublicCandidates(key: QuickTaskPresetKey): readonly string[] {
  return [`/quick-task-icons/preset-${key}.png`, `/quick-task-icons/preset-${key}.webp`];
}

export function resolveQuickTaskRaster(row: {
  name: string;
  iconUrl?: string | null;
  presetKey?: string | null;
}): { primary?: string; fallback?: string } {
  const u = row.iconUrl?.trim();
  if (u) return { primary: u };
  const pk =
    (row.presetKey && QUICK_TASK_PRESET_KEYS.includes(row.presetKey as QuickTaskPresetKey)
      ? (row.presetKey as QuickTaskPresetKey)
      : null) ?? guessPresetKeyFromTaskLabel(row.name);
  if (pk) {
    const c = quickTaskPresetPublicCandidates(pk);
    return { primary: c[0], fallback: c[1] };
  }
  return {};
}

export function resolveQuickTaskIconSrc(row: {
  name: string;
  iconUrl?: string | null;
  presetKey?: string | null;
}): string | undefined {
  return resolveQuickTaskRaster(row).primary;
}
