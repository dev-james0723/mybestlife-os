import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  Briefcase,
  CalendarClock,
  Clock,
  Coffee,
  Dog,
  Drama,
  Dumbbell,
  Footprints,
  GraduationCap,
  Heart,
  HeartPulse,
  House,
  Laptop,
  Mic,
  Moon,
  Music,
  NotebookPen,
  Paintbrush,
  Plane,
  Plus,
  ShowerHead,
  Soup,
  Sparkles,
  Stethoscope,
  Timer,
  Trees,
  UtensilsCrossed,
  Video,
  Volleyball,
  Wind,
} from "lucide-react";

/**
 * Serializable Lucide icon keys stored on `QuickTaskDef.icon` and resolved at render time.
 */
export const QUICK_TASK_ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  coffee: Coffee,
  utensils: UtensilsCrossed,
  soup: Soup,
  dumbbell: Dumbbell,
  wind: Wind,
  drama: Drama,
  "book-open": BookOpen,
  "notebook-pen": NotebookPen,
  timer: Timer,
  moon: Moon,
  sparkles: Sparkles,
  clock: Clock,
  plus: Plus,
  footprints: Footprints,
  dog: Dog,
  music: Music,
  mic: Mic,
  laptop: Laptop,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  house: House,
  trees: Trees,
  plane: Plane,
  video: Video,
  stethoscope: Stethoscope,
  "heart-pulse": HeartPulse,
  heart: Heart,
  paintbrush: Paintbrush,
  shower: ShowerHead,
  "calendar-clock": CalendarClock,
  volleyball: Volleyball,
};

type Rule = { re: RegExp; icon: keyof typeof QUICK_TASK_ICON_MAP };

/** Order matters: first match wins (keep more specific patterns first). */
const INFER_RULES: Rule[] = [
  {
    re: /sparkle|✨|星星|星\s*星/i,
    icon: "sparkles",
  },
  {
    re:
      /dog|puppy|walk\s*(the\s*)?dog|pet\s*(walk|time)|leash|遛狗|行狗|寵物|帶狗/i,
    icon: "dog",
  },
  {
    re: /walk|hike|stroll|hiking|footpath|徒步|行山|散步/i,
    icon: "footprints",
  },
  {
    re:
      /fitness|gym|workout|exercise|lift|cardio|weight|yoga|pilates|stretch|跑步|慢跑|健身|單車|踏單車|游水|游泳|喼鐵/i,
    icon: "dumbbell",
  },
  {
    re: /volleyball|排球|沙灘排球|沙滩排球/i,
    icon: "volleyball",
  },
  {
    re:
      /badminton|tennis|squash|racket|pickleball|ping\s*pong|table\s*tennis|羽毛球|網球|乒乓球|匹克球|壁球/i,
    icon: "activity",
  },
  {
    re:
      /soccer|football(?!\s*stadium)|basketball|rugby|hockey|baseball|高尔夫|高爾夫|棒球|足球|籃球|欖球/i,
    icon: "activity",
  },
  {
    re:
      /practice|rehearsal|piano|guitar|violin|drums|instrument|music|sing(ing)?|band|orchestra|jam|audition|練習|練琴|音樂|樂器|鋼琴|小提琴|吉他|排練/i,
    icon: "music",
  },
  {
    re:
      /study|stud(y|ies)|homework|exam|quiz|course|lecture|school|class|revision|學習|功課|考試|溫書|上課|學校/i,
    icon: "graduation-cap",
  },
  {
    re: /read(ing)?|book|novel|article|閱讀|看書|讀書/i,
    icon: "book-open",
  },
  {
    re:
      /journal|diary|writ(e|ing)|note(s)?|日記|筆記|寫作/i,
    icon: "notebook-pen",
  },
  {
    re:
      /meditat|mindful|breath|calm|zen|冥想|靜心|打坐/i,
    icon: "wind",
  },
  {
    re: /sleep|nap|rest|bed|睡覺|小睡|休息|瞓/i,
    icon: "moon",
  },
  {
    re:
      /break|pause|pomodoro|timer|休息|小休|鬆一鬆/i,
    icon: "timer",
  },
  {
    re:
      /code|dev|develop|program|debug|git|repo|軟件|程式|開發/i,
    icon: "laptop",
  },
  {
    re:
      /work|meeting|call\b|standup|email|slack|zoom|teams|開會|會議|返工|上班|工作(?!.*出)/i,
    icon: "briefcase",
  },
  {
    re: /film|movie|tv|show|episode|netflix|電影|劇/i,
    icon: "video",
  },
  {
    re: /podcast|listen|audio|播客|聽/i,
    icon: "mic",
  },
  {
    re: /paint|draw|sketch|art|design|畫畫|繪畫|設計/i,
    icon: "paintbrush",
  },
  {
    re: /theatre|theater|act(ing)?|improv|戲劇|話劇|表演/i,
    icon: "drama",
  },
  {
    re: /clean|laundry|chore|tidy|掃除|打掃|家務|洗衣/i,
    icon: "house",
  },
  {
    re: /shower|bath|洗熱水|沖涼|洗澡/i,
    icon: "shower",
  },
  {
    re: /doctor|dentist|clinic|therapy|醫生|診所|覆診|睇醫生/i,
    icon: "stethoscope",
  },
  {
    re: /health|vitamin|checkup|身體檢查|保健/i,
    icon: "heart-pulse",
  },
  {
    re: /date|romantic|love|anniversary|約會|拍拖/i,
    icon: "heart",
  },
  {
    re: /drive|commute|traffic|揸車|駕車|塞車|通勤/i,
    icon: "calendar-clock",
  },
  {
    re: /travel|trip|flight|hotel|旅游|旅行|出國|飛機/i,
    icon: "plane",
  },
  {
    re: /nature|park|outdoor|garden|郊野|公園|戶外/i,
    icon: "trees",
  },
  {
    re: /breakfast|brunch|coffee|morning\s*meal|早餐|早餐饮|早飲/i,
    icon: "coffee",
  },
  {
    re: /lunch|午(餐|膳)|午饭/i,
    icon: "utensils",
  },
  {
    re: /dinner|supper|晚(餐|膳)|晚饭/i,
    icon: "soup",
  },
  {
    re: /cook|meal|food|recipe|煮食|煮飯|做飯|烹飪/i,
    icon: "utensils",
  },
];

/**
 * Best-effort icon key from free-text task name (English + some 繁體 keywords).
 */
export function inferQuickTaskIconKey(name: string): keyof typeof QUICK_TASK_ICON_MAP {
  const s = name.trim();
  if (!s) return "sparkles";
  for (const { re, icon } of INFER_RULES) {
    if (re.test(s)) return icon;
  }
  return "sparkles";
}

/**
 * Uses stored icon when it is a non-generic, known key; otherwise infers from the name.
 * This upgrades legacy rows that were saved with `sparkles` for every custom task.
 */
export function resolveQuickTaskIconKey(
  name: string,
  stored: string | null | undefined,
): keyof typeof QUICK_TASK_ICON_MAP {
  const key = (stored ?? "").trim();
  if (key && key !== "sparkles" && QUICK_TASK_ICON_MAP[key]) {
    return key as keyof typeof QUICK_TASK_ICON_MAP;
  }
  return inferQuickTaskIconKey(name);
}

/** For persisting a built-in Lucide component back to a string key. */
export function lucideIconToQuickTaskKey(icon: LucideIcon): string {
  const found = Object.entries(QUICK_TASK_ICON_MAP).find(([, v]) => v === icon);
  return found?.[0] ?? "sparkles";
}
