import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";
import type { LiquidGlassScene } from "@/components/liquid-glass/liquid-glass-store";

/** Copy for the Liquid Glass animated wallpaper picker (topbar + Settings). */
export type WallpaperUiCopy = {
  title: string;
  description: string;
  pickerAria: string;
  sceneNames: Record<LiquidGlassScene, string>;
};

const en: WallpaperUiCopy = {
  title: "Animated background",
  description:
    "A living backdrop that the Liquid Glass surfaces blur and refract. Pick the scene that fits your mood.",
  pickerAria: "Choose animated background",
  sceneNames: {
    aurora: "Aurora Flow",
    ocean: "Ocean Caustics",
    nebula: "Cosmic Nebula",
    bokeh: "Bokeh Garden",
    butterflies: "Butterflies",
  },
};

const zhTW: WallpaperUiCopy = {
  title: "動態背景",
  description: "流動的背景光影，讓液態玻璃介面折射出真實質感。挑一個合心情的場景。",
  pickerAria: "選擇動態背景",
  sceneNames: {
    aurora: "極光流動",
    ocean: "海洋光影",
    nebula: "宇宙星雲",
    bokeh: "光斑花園",
    butterflies: "蝴蝶飛舞",
  },
};

const zhCN: WallpaperUiCopy = {
  title: "动态背景",
  description: "流动的背景光影，让液态玻璃界面折射出真实质感。挑一个合心情的场景。",
  pickerAria: "选择动态背景",
  sceneNames: {
    aurora: "极光流动",
    ocean: "海洋光影",
    nebula: "宇宙星云",
    bokeh: "光斑花园",
    butterflies: "蝴蝶飞舞",
  },
};

const ja: WallpaperUiCopy = {
  title: "アニメーション背景",
  description:
    "リキッドガラスが光をぼかし屈折させる、生きた背景。気分に合うシーンを選びましょう。",
  pickerAria: "アニメーション背景を選択",
  sceneNames: {
    aurora: "オーロラ",
    ocean: "海中の光",
    nebula: "星雲",
    bokeh: "ボケガーデン",
    butterflies: "蝶の舞",
  },
};

const ko: WallpaperUiCopy = {
  title: "움직이는 배경",
  description:
    "리퀴드 글래스가 빛을 흐리고 굴절시키는 살아있는 배경. 기분에 맞는 장면을 골라보세요.",
  pickerAria: "움직이는 배경 선택",
  sceneNames: {
    aurora: "오로라",
    ocean: "바닷속 빛",
    nebula: "우주 성운",
    bokeh: "보케 가든",
    butterflies: "나비의 춤",
  },
};

const fr: WallpaperUiCopy = {
  title: "Fond animé",
  description:
    "Un arrière-plan vivant que les surfaces Liquid Glass floutent et réfractent. Choisissez la scène qui vous ressemble.",
  pickerAria: "Choisir le fond animé",
  sceneNames: {
    aurora: "Aurore boréale",
    ocean: "Reflets marins",
    nebula: "Nébuleuse",
    bokeh: "Jardin bokeh",
    butterflies: "Papillons",
  },
};

const it: WallpaperUiCopy = {
  title: "Sfondo animato",
  description:
    "Uno sfondo vivo che le superfici Liquid Glass sfocano e rifrangono. Scegli la scena adatta al tuo umore.",
  pickerAria: "Scegli lo sfondo animato",
  sceneNames: {
    aurora: "Aurora boreale",
    ocean: "Riflessi marini",
    nebula: "Nebulosa",
    bokeh: "Giardino bokeh",
    butterflies: "Farfalle",
  },
};

const es: WallpaperUiCopy = {
  title: "Fondo animado",
  description:
    "Un fondo vivo que las superficies Liquid Glass difuminan y refractan. Elige la escena que va contigo.",
  pickerAria: "Elegir fondo animado",
  sceneNames: {
    aurora: "Aurora boreal",
    ocean: "Reflejos marinos",
    nebula: "Nebulosa",
    bokeh: "Jardín bokeh",
    butterflies: "Mariposas",
  },
};

const vi: WallpaperUiCopy = {
  title: "Hình nền động",
  description:
    "Phông nền sống động được các bề mặt Liquid Glass làm mờ và khúc xạ. Chọn khung cảnh hợp tâm trạng của bạn.",
  pickerAria: "Chọn hình nền động",
  sceneNames: {
    aurora: "Cực quang",
    ocean: "Ánh sáng đại dương",
    nebula: "Tinh vân",
    bokeh: "Vườn bokeh",
    butterflies: "Bươm bướm",
  },
};

const localizedWallpaperUi = createLocaleCopyMap<WallpaperUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
});

export function getWallpaperUiCopy(locale: AppLocale): WallpaperUiCopy {
  return localizedWallpaperUi[locale] ?? en;
}
