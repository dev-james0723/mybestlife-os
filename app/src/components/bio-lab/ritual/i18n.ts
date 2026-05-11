import type { AppLocale } from "@/lib/i18n/app-locale";
import { createLocaleCopyMap, type DeepPartial } from "@/lib/i18n/copy-helpers";

export type SceneId = "trash" | "ocean" | "forest" | "space";

export type RitualCopy = {
  crumpleHint: string;
  chooseTitle: (n: number) => string;
  chooseLead: string;
  scenes: Record<SceneId, { name: string; tagline: string }>;
  swipeHint: string;
  launchHint: string;
  cleared: string;
  skip: string;
  cancel: string;
};

const ENGLISH: RitualCopy = {
  crumpleHint: "Folding your thoughts into a paper ball…",
  chooseTitle: (n) =>
    n === 1 ? "Where will you release this thought?" : `Where will you release these ${n} thoughts?`,
  chooseLead: "Pick a place to let it go.",
  scenes: {
    trash: { name: "Trash heap", tagline: "Out of sight, out of mind." },
    ocean: { name: "Open sea", tagline: "Let the tide carry it away." },
    forest: { name: "Deep forest", tagline: "Let the leaves swallow it whole." },
    space: { name: "Outer space", tagline: "Send it to the stars." },
  },
  swipeHint: "Swipe to release",
  launchHint: "Releasing…",
  cleared: "Mind cleared.",
  skip: "Skip",
  cancel: "Cancel",
};

export const RITUAL_COPY: Record<AppLocale, RitualCopy> = createLocaleCopyMap<RitualCopy>(
  ENGLISH,
  {
    "zh-TW": {
      crumpleHint: "將你的思緒摺成一個紙團⋯⋯",
      chooseTitle: (n) =>
        n === 1 ? "想將呢個念頭放喺邊度？" : `想將呢 ${n} 個念頭放喺邊度？`,
      chooseLead: "揀一個地方，將佢放低。",
      scenes: {
        trash: { name: "垃圾堆", tagline: "眼不見為淨。" },
        ocean: { name: "大海", tagline: "等海浪帶走佢。" },
        forest: { name: "森林深處", tagline: "等樹葉吞沒佢。" },
        space: { name: "外太空", tagline: "送去星海之中。" },
      },
      swipeHint: "向任何方向掃，放低思緒",
      launchHint: "釋放緊⋯⋯",
      cleared: "心輕鬆咗。",
      skip: "跳過",
      cancel: "取消",
    },
    "zh-CN": {
      crumpleHint: "把你的思绪揉成一个纸团……",
      chooseTitle: (n) =>
        n === 1 ? "想把这个念头放在哪里？" : `想把这 ${n} 个念头放在哪里？`,
      chooseLead: "选一个地方，把它放下。",
      scenes: {
        trash: { name: "垃圾堆", tagline: "眼不见为净。" },
        ocean: { name: "大海", tagline: "让海浪带走它。" },
        forest: { name: "森林深处", tagline: "让树叶吞没它。" },
        space: { name: "外太空", tagline: "送往星海之中。" },
      },
      swipeHint: "向任何方向滑动，放下思绪",
      launchHint: "正在释放……",
      cleared: "心轻松了。",
      skip: "跳过",
      cancel: "取消",
    },
    ja: {
      crumpleHint: "思考を紙くずに丸めています…",
      chooseTitle: (n) =>
        n === 1 ? "この思いをどこへ放しますか？" : `この${n}つの思いをどこへ放しますか？`,
      chooseLead: "手放す場所を選んでください。",
      scenes: {
        trash: { name: "ゴミの山", tagline: "見えないところへ。" },
        ocean: { name: "大海", tagline: "波にさらわれて。" },
        forest: { name: "森の奥", tagline: "葉に飲まれていく。" },
        space: { name: "宇宙", tagline: "星々のもとへ。" },
      },
      swipeHint: "スワイプして手放す",
      launchHint: "解放中…",
      cleared: "心が軽くなりました。",
      skip: "スキップ",
      cancel: "キャンセル",
    },
  } satisfies Partial<Record<AppLocale, DeepPartial<RitualCopy>>>,
);

export function getRitualCopy(locale: AppLocale): RitualCopy {
  return RITUAL_COPY[locale] ?? ENGLISH;
}
