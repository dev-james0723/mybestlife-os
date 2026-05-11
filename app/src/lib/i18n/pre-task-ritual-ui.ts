import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";

export type PreTaskRitualUiCopy = {
  phaseBreathingTitle: string;
  phaseAnchorTitle: string;
  phaseVisualizationTitle: string;
  focusRitualFor: string;
  breathInhale: string;
  breathHold: string;
  breathExhale: string;
  cycleLabel: (current: number, total: number) => string;
  skip: string;
  continue: string;
  beginTask: string;
  anchorQuote: string;
  visualizationQuote: string;
};

const en: PreTaskRitualUiCopy = {
  phaseBreathingTitle: "Breathe & Center",
  phaseAnchorTitle: "Set Your Anchor",
  phaseVisualizationTitle: "Visualize Success",
  focusRitualFor: "Focus ritual for:",
  breathInhale: "Inhale",
  breathHold: "Hold",
  breathExhale: "Exhale",
  cycleLabel: (current, total) => `Cycle ${current} of ${total}`,
  skip: "Skip",
  continue: "Continue",
  beginTask: "Begin Task",
  anchorQuote:
    "I am fully present. My attention belongs to this one task. Every focused minute is a gift I give my future self.",
  visualizationQuote:
    "Imagine yourself completing this task with calm mastery. See the satisfaction of checking it off—feel the momentum carry you forward.",
};

const zhTW: PreTaskRitualUiCopy = {
  phaseBreathingTitle: "呼吸與靜心",
  phaseAnchorTitle: "設定心錨",
  phaseVisualizationTitle: "想像成功",
  focusRitualFor: "專注儀式：",
  breathInhale: "吸氣",
  breathHold: "屏息",
  breathExhale: "吐氣",
  cycleLabel: (current, total) => `第 ${current} / ${total} 輪`,
  skip: "略過",
  continue: "繼續",
  beginTask: "開始任務",
  anchorQuote:
    "我全然在此刻。我的注意力只屬於眼前這一件事。每一個專注的分鐘，都是送給未來自己的禮物。",
  visualizationQuote:
    "想像自己從容地完成這項任務。看見打勾那一刻的滿足——讓那股動力帶著你往前。",
};

const zhCN: PreTaskRitualUiCopy = {
  phaseBreathingTitle: "呼吸与静心",
  phaseAnchorTitle: "设定心锚",
  phaseVisualizationTitle: "想象成功",
  focusRitualFor: "专注仪式：",
  breathInhale: "吸气",
  breathHold: "屏息",
  breathExhale: "呼气",
  cycleLabel: (current, total) => `第 ${current} / ${total} 轮`,
  skip: "跳过",
  continue: "继续",
  beginTask: "开始任务",
  anchorQuote:
    "我全然在此刻。我的注意力只属于眼前这一件事。每一个专注的分钟，都是送给未来自己的礼物。",
  visualizationQuote:
    "想象自己从容地完成这项任务。看见打勾那一刻的满足——让那股动力带着你往前。",
};

const localizedCopy = createLocaleCopyMap<PreTaskRitualUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
});

export function getPreTaskRitualUiCopy(locale: AppLocale): PreTaskRitualUiCopy {
  return localizedCopy[locale] ?? localizedCopy.en;
}
