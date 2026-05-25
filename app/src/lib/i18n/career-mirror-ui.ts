import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";

/**
 * AI Career Mirror — wizard chrome + profile UI strings (WS2).
 * Question / option / section copy lives in career-mirror-questions-ui.ts.
 */
export type CareerMirrorUiCopy = {
  hero: {
    title: string;
    subtitle: string;
    startCta: string;
    resumeCta: string;
    progressLabel: (percent: number) => string;
  };
  buttons: {
    next: string;
    back: string;
    skip: string;
    saveAndExit: string;
    finish: string;
    finishing: string;
  };
  controls: {
    other: string;
    otherPlaceholder: string;
    notSure: string;
    skipForNow: string;
    typeMyOwn: string;
    typeMyOwnPlaceholder: string;
  };
  states: {
    loading: string;
    saving: string;
    saved: string;
    error: string;
    retry: string;
    emptyTitle: string;
    emptyDescription: string;
    successTitle: string;
    successDescription: string;
  };
  completion: {
    widgetTitle: string;
    scoreLabel: (percent: number) => string;
    missingTitle: string;
    missingEmpty: string;
    keepGoing: string;
  };
  aiSuggestion: {
    badge: string;
    helper: string;
    accept: string;
    edit: string;
    reject: string;
    accepted: string;
    rejected: string;
  };
  banner: {
    pickerTitle: string;
    pickerSubtitle: string;
    generate: string;
    generating: string;
    regenerate: string;
    useThis: string;
    skip: string;
  };
  panels: {
    scenarioSimulator: string;
    weeklyReview: string;
    realityCheck: string;
    promptPack: string;
    assetGapAudit: string;
    careerIdentityMap: string;
  };
  profileSections: {
    aiDiagnosis: string;
    mainTension: string;
    mainRisk: string;
    reframedProblem: string;
    workStyle: string;
    personalityType: string;
    energyPattern: string;
    decisionStyle: string;
    feedbackPreference: string;
    idealEnvironment: string;
    motivationDrivers: string;
    nextActions: string;
    manualDetails: string;
    generateMissingWithAi: string;
  };
  trust: {
    privacyNote: string;
    aiNote: string;
    mbtiDisclaimer: string;
  };
};

const en: CareerMirrorUiCopy = {
  hero: {
    title: "AI Career Mirror",
    subtitle:
      "A few honest choices, then a clear picture of who you are at work and where you're actually stuck.",
    startCta: "Start the mirror",
    resumeCta: "Continue where you left off",
    progressLabel: (percent) => `${percent}% complete`,
  },
  buttons: {
    next: "Next",
    back: "Back",
    skip: "Skip",
    saveAndExit: "Save & exit",
    finish: "See my mirror",
    finishing: "Building your mirror…",
  },
  controls: {
    other: "Something else",
    otherPlaceholder: "Tell us in your own words",
    notSure: "Not sure yet",
    skipForNow: "Skip for now",
    typeMyOwn: "Type my own",
    typeMyOwnPlaceholder: "Write your answer",
  },
  states: {
    loading: "Loading…",
    saving: "Saving…",
    saved: "Saved",
    error: "Something went wrong. Your answers are safe.",
    retry: "Try again",
    emptyTitle: "Nothing here yet",
    emptyDescription: "Answer a few questions to start your career mirror.",
    successTitle: "Your mirror is ready",
    successDescription:
      "Here's the picture you just drew of yourself. Edit anything that doesn't ring true.",
  },
  completion: {
    widgetTitle: "Profile strength",
    scoreLabel: (percent) => `${percent}% complete`,
    missingTitle: "Still worth adding",
    missingEmpty: "You've covered the essentials.",
    keepGoing: "Keep going",
  },
  aiSuggestion: {
    badge: "AI draft",
    helper: "A starting point — keep it, tweak it, or throw it out.",
    accept: "Use this",
    edit: "Edit",
    reject: "Discard",
    accepted: "Added",
    rejected: "Discarded",
  },
  banner: {
    pickerTitle: "Pick a look for your career banner",
    pickerSubtitle: "We'll generate a banner that matches how you want to be seen.",
    generate: "Generate banner",
    generating: "Generating…",
    regenerate: "Try another",
    useThis: "Use this banner",
    skip: "Skip the banner",
  },
  panels: {
    scenarioSimulator: "Scenario simulator",
    weeklyReview: "Weekly review",
    realityCheck: "Reality check",
    promptPack: "Prompt pack",
    assetGapAudit: "Asset gap audit",
    careerIdentityMap: "Career identity map",
  },
  profileSections: {
    aiDiagnosis: "AI diagnosis",
    mainTension: "Main tension",
    mainRisk: "Main risk",
    reframedProblem: "Reframed problem",
    workStyle: "Work style",
    personalityType: "Personality type",
    energyPattern: "Energy pattern",
    decisionStyle: "Decision style",
    feedbackPreference: "Feedback preference",
    idealEnvironment: "Ideal environment",
    motivationDrivers: "Motivation drivers",
    nextActions: "Recommended next actions",
    manualDetails: "Manual details",
    generateMissingWithAi: "Generate missing fields with AI",
  },
  trust: {
    privacyNote:
      "Your answers stay in your account. You decide what gets used and when.",
    aiNote:
      "AI suggestions are drafts based on what you tell us — always yours to change.",
    mbtiDisclaimer:
      "This isn't a clinical personality test. It just helps us speak your language and tailor suggestions — skip it freely.",
  },
};

const zhTW: CareerMirrorUiCopy = {
  hero: {
    title: "AI 職涯之鏡",
    subtitle: "先用幾個誠實的選擇，照出你在工作裡是誰、又真正卡在哪裡。",
    startCta: "開始照鏡",
    resumeCta: "從上次的地方繼續",
    progressLabel: (percent) => `已完成 ${percent}%`,
  },
  buttons: {
    next: "下一步",
    back: "上一步",
    skip: "略過",
    saveAndExit: "儲存並離開",
    finish: "看我的鏡像",
    finishing: "正在生成你的鏡像…",
  },
  controls: {
    other: "其他",
    otherPlaceholder: "用你自己的話說說看",
    notSure: "還不確定",
    skipForNow: "先略過",
    typeMyOwn: "自己寫",
    typeMyOwnPlaceholder: "寫下你的答案",
  },
  states: {
    loading: "載入中…",
    saving: "儲存中…",
    saved: "已儲存",
    error: "出了點問題，但你的答案都還在。",
    retry: "再試一次",
    emptyTitle: "這裡還是空的",
    emptyDescription: "先回答幾題，開始描繪你的職涯鏡像。",
    successTitle: "你的鏡像完成了",
    successDescription: "這是你剛剛畫出的自己。哪裡感覺不對，隨時可以改。",
  },
  completion: {
    widgetTitle: "檔案完整度",
    scoreLabel: (percent) => `已完成 ${percent}%`,
    missingTitle: "還值得補上的",
    missingEmpty: "重點你都填好了。",
    keepGoing: "繼續",
  },
  aiSuggestion: {
    badge: "AI 草稿",
    helper: "一個起點——可以留著、調整，或直接丟掉。",
    accept: "採用",
    edit: "編輯",
    reject: "捨棄",
    accepted: "已加入",
    rejected: "已捨棄",
  },
  banner: {
    pickerTitle: "為你的職涯橫幅選一種風格",
    pickerSubtitle: "我們會依你想被看見的方式，生成相符的橫幅。",
    generate: "生成橫幅",
    generating: "生成中…",
    regenerate: "換一張",
    useThis: "使用這張橫幅",
    skip: "略過橫幅",
  },
  panels: {
    scenarioSimulator: "情境模擬器",
    weeklyReview: "每週回顧",
    realityCheck: "現實檢核",
    promptPack: "提示語包",
    assetGapAudit: "素材缺口盤點",
    careerIdentityMap: "職涯身分地圖",
  },
  profileSections: {
    aiDiagnosis: "AI 診斷",
    mainTension: "主要張力",
    mainRisk: "主要風險",
    reframedProblem: "重新定義你的問題",
    workStyle: "工作風格",
    personalityType: "性格類型",
    energyPattern: "能量模式",
    decisionStyle: "決策風格",
    feedbackPreference: "回饋偏好",
    idealEnvironment: "理想環境",
    motivationDrivers: "驅動力",
    nextActions: "建議的下一步",
    manualDetails: "手動編輯所有欄位",
    generateMissingWithAi: "用 AI 補齊缺少的欄位",
  },
  trust: {
    privacyNote: "你的答案只留在你的帳號裡，用不用、何時用，都由你決定。",
    aiNote: "AI 建議只是根據你說的內容生成的草稿，最終都由你定。",
    mbtiDisclaimer:
      "這不是臨床心理測驗，只是幫我們用你的語言溝通、調整建議——想略過隨時都行。",
  },
};

const overrides: Partial<Record<AppLocale, DeepPartial<CareerMirrorUiCopy>>> = {
  "zh-TW": zhTW,
};

const COPY_MAP = createLocaleCopyMap<CareerMirrorUiCopy>(en, overrides);

export function getCareerMirrorUiCopy(locale: AppLocale): CareerMirrorUiCopy {
  return COPY_MAP[locale];
}
