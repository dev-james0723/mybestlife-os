import type { AppLocale } from "@/lib/i18n/app-locale";

const DRAG_END_FIXED_LINES_EN = [
  "A good spot.",
  "Excellent spot.",
  "Fantastic.",
  "You got me.",
  "I like this place.",
  "Perfect landing.",
  "This works.",
  "I am settled.",
  "Great call.",
  "Strong placement.",
  "New favorite spot.",
  "Good view from here.",
  "This place suits me.",
  "Placed with style.",
  "Locked in.",
  "Drop accepted.",
  "Now we are talking.",
  "I can see everything from here.",
  "This is home base.",
  "That feels right.",
] as const;

const DRAG_END_STARTS_EN = [
  "A good",
  "An excellent",
  "A fantastic",
  "A perfect",
  "A cozy",
  "A sharp",
  "A prime",
  "A solid",
  "A comfy",
  "A pixel-perfect",
  "A top-tier",
  "A tiny",
] as const;

const DRAG_END_PLACES_EN = [
  "spot",
  "landing",
  "corner",
  "perch",
  "home base",
  "lookout",
] as const;

const DRAG_END_FIXED_LINES_ZH_TW = [
  "好位置。",
  "我喜歡這裡。",
  "這裡剛剛好。",
  "落點完美。",
  "我安頓好了。",
  "這裡很適合我。",
  "這裡視野很好。",
  "這個角落很舒服。",
  "新的基地。",
  "放得很有品味。",
  "收到，我在這裡。",
  "今天就停這裡。",
  "好，我守這裡。",
  "這裡有安全感。",
  "我們找到地方了。",
  "這裡有感覺。",
] as const;

const DRAG_END_STARTS_ZH_TW = [
  "好",
  "完美",
  "舒服",
  "穩穩的",
  "漂亮的",
  "很有感覺的",
  "剛剛好的",
  "小小的",
] as const;

const DRAG_END_PLACES_ZH_TW = [
  "位置",
  "落點",
  "角落",
  "基地",
  "小窩",
] as const;

const lastDragEndLineIndexByLocale: Partial<Record<AppLocale, number>> = {};

function uniqueLines(lines: readonly string[]): string[] {
  return Array.from(new Set(lines));
}

function combineEnglishLines(): string[] {
  return DRAG_END_STARTS_EN.flatMap((start) =>
    DRAG_END_PLACES_EN.map((place) => `${start} ${place}.`),
  );
}

function combineZhTWLines(): string[] {
  return DRAG_END_STARTS_ZH_TW.flatMap((start) =>
    DRAG_END_PLACES_ZH_TW.map((place) => `${start}${place}。`),
  );
}

const DRAG_END_LINES_EN = uniqueLines([
  ...DRAG_END_FIXED_LINES_EN,
  ...combineEnglishLines(),
]);

const DRAG_END_LINES_ZH_TW = uniqueLines([
  ...DRAG_END_FIXED_LINES_ZH_TW,
  ...combineZhTWLines(),
]);

function getDragEndLines(locale: AppLocale): readonly string[] {
  return locale === "zh-TW" ? DRAG_END_LINES_ZH_TW : DRAG_END_LINES_EN;
}

function randomIndex(length: number, random: number): number {
  if (length <= 1) return 0;
  const safeRandom = Number.isFinite(random) ? random : Math.random();
  return Math.min(length - 1, Math.floor(Math.max(0, Math.min(0.999999, safeRandom)) * length));
}

export function pickOSBuddyDragEndLine(
  locale: AppLocale,
  random = Math.random(),
): string {
  const lines = getDragEndLines(locale);
  const rawIndex = randomIndex(lines.length, random);
  const previousIndex = lastDragEndLineIndexByLocale[locale];
  const index = lines.length > 1 && rawIndex === previousIndex
    ? (rawIndex + 1) % lines.length
    : rawIndex;

  lastDragEndLineIndexByLocale[locale] = index;
  return lines[index] ?? lines[0] ?? "A good spot.";
}
