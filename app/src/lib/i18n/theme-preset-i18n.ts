import type { AppLocale } from "./app-locale";
import type { UiTheme } from "@/types/database";
import { createLocaleCopyMap } from "./copy-helpers";

export type ThemePresetStrings = { name: string; description: string };

type PresetRow = Record<UiTheme, ThemePresetStrings>;

const en: PresetRow = {
  default: { name: "Default", description: "Clean & minimal" },
  astronaut: { name: "Astronaut", description: "Deep space exploration" },
  academia: { name: "Academia", description: "Scholarly warmth" },
  forest: { name: "Forest", description: "Organic growth" },
};

const zhTW: PresetRow = {
  default: { name: "預設", description: "簡潔俐落" },
  astronaut: { name: "太空人", description: "深空探索" },
  academia: { name: "學院派", description: "學術質感" },
  forest: { name: "森林", description: "有機生長" },
};

const zhCN: PresetRow = {
  default: { name: "默认", description: "简洁清爽" },
  astronaut: { name: "宇航员", description: "深空探索" },
  academia: { name: "学院", description: "书卷气息" },
  forest: { name: "森林", description: "自然生长" },
};

const ja: PresetRow = {
  default: { name: "デフォルト", description: "クリーンでミニマル" },
  astronaut: { name: "宇宙飛行士", description: "深宇宙の探索" },
  academia: { name: "アカデミア", description: "学びの温かみ" },
  forest: { name: "フォレスト", description: "自然な成長" },
};

const ko: PresetRow = {
  default: { name: "기본", description: "깔끔하고 미니멀" },
  astronaut: { name: "우주비행사", description: "심우주 탐험" },
  academia: { name: "아카데미아", description: "학문적인 따뜻함" },
  forest: { name: "포레스트", description: "자연스러운 성장" },
};

const fr: PresetRow = {
  default: { name: "Par défaut", description: "Épuré et minimal" },
  astronaut: { name: "Astronaute", description: "Exploration de l’espace profond" },
  academia: { name: "Académia", description: "Chaleur savante" },
  forest: { name: "Forêt", description: "Croissance organique" },
};

const it: PresetRow = {
  default: { name: "Predefinito", description: "Pulito e minimale" },
  astronaut: { name: "Astronauta", description: "Esplorazione dello spazio profondo" },
  academia: { name: "Accademia", description: "Calore da studio" },
  forest: { name: "Foresta", description: "Crescita organica" },
};

const es: PresetRow = {
  default: { name: "Predeterminado", description: "Limpio y minimalista" },
  astronaut: { name: "Astronauta", description: "Exploración del espacio profundo" },
  academia: { name: "Academia", description: "Calidez académica" },
  forest: { name: "Bosque", description: "Crecimiento orgánico" },
};

const vi: PresetRow = {
  default: { name: "Mặc định", description: "Tối giản và gọn gàng" },
  astronaut: { name: "Phi hành gia", description: "Khám phá không gian sâu" },
  academia: { name: "Học viện", description: "Ấm áp học thuật" },
  forest: { name: "Rừng", description: "Phát triển hữu cơ" },
};

const localized = createLocaleCopyMap<PresetRow>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
});

export function getThemePresetRow(locale: AppLocale): PresetRow {
  return localized[locale] ?? localized.en;
}
