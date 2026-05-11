/**
 * Health dashboard i18n copy.
 *
 * Follows the established pattern in grateful-things-ui.ts / tasks-ui.ts:
 * English is the base, per-locale overrides merge via `createLocaleCopyMap`,
 * missing keys fall back to English.
 *
 * This file starts minimal to unblock component development. Full coverage
 * for all 9 locales lands in Commit 13.
 */

import type { AppLocale } from "./app-locale";
import { DEFAULT_LOCALE } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";
import type { HealthTriggerKey } from "@/types/database";

export type HealthUiCopy = {
  pageTitle: string;
  pageTitleVitals: string;
  pageDescription: string;

  logTodayCta: string;
  previousDay: string;
  nextDay: string;
  notYetAvailable: string;
  notMedicalAdvice: string;
  ethosLine: string;

  readiness: {
    ringAriaLabel: string;
    excellent: string;
    good: string;
    fair: string;
    low: string;
    narrativeTemplate: (score: number, highlight: string) => string;
    narrativeGenericHigh: string;
    narrativeGenericMid: string;
    narrativeGenericLow: string;
    componentSleep: string;
    componentHrv: string;
    componentRhr: string;
    componentEnergy: string;
    componentStress: string;
    componentActivity: string;
  };

  pillars: {
    sleep: { label: string; quality: string; duration: string; debt: (hours: string) => string };
    energy: { label: string; promptLog: string; hrvSuffix: string };
    mood: { label: string; tapToLog: string };
    stress: { label: string; streak: (days: number) => string };
    deltaVsAverage: string;
    tapToExpand: string;
    logNow: string;
  };

  moodQuadrants: { tense: string; excited: string; calm: string; low: string };

  vitals: {
    sectionTitle: string;
    steps: string;
    rhr: string;
    hrv: string;
    spo2: string;
    activeEnergy: string;
    workouts: string;
    weight: string;
    mindful: string;
    todayLabel: string;
    baselineLabel: string;
    goalProgress: (pct: number) => string;
    addManual: string;
    expandDetail: string;
  };

  hydration: {
    sectionTitle: string;
    waterLabel: string;
    waterAdd: (ml: number) => string;
    waterGoal: (ml: number) => string;
    caffeineLabel: string;
    caffeineAdd: string;
    alcoholLabel: string;
    quickAddEspresso: string;
    quickAddCoffee: string;
    quickAddTea: string;
  };

  triggers: Record<HealthTriggerKey, string>;

  correlations: {
    sectionTitle: string;
    empty: string;
    template: (condition: string, metric: string, delta: string, direction: "higher" | "lower") => string;
    sampleSize: (n: number, r: number) => string;
    viewScatter: string;
    conditions: {
      sleepLt7h: string;
      stepsGt8k: string;
      highCaffeine: string;
      workoutDay: string;
      highStress: string;
      lowHrv: string;
    };
    metrics: {
      energy: string;
      mood: string;
      sleepQuality: string;
      stress: string;
    };
  };

  trends: {
    sectionTitle: string;
    range7d: string;
    range30d: string;
    range90d: string;
    range1y: string;
    seriesSleep: string;
    seriesEnergy: string;
    seriesMood: string;
    seriesStress: string;
    seriesHrv: string;
    seriesSteps: string;
    weekendLabel: string;
  };

  weeklyReport: {
    title: string;
    subtitle: (startDate: string, endDate: string) => string;
    avgSleep: string;
    totalSteps: string;
    workoutCount: string;
    highestMoodDay: string;
    lowestMoodDay: string;
    biggestWinLabel: string;
    biggestConcernLabel: string;
    exportPdf: string;
  };

  goals: {
    sectionTitle: string;
    empty: string;
    addGoal: string;
    streak: (days: number) => string;
    progressLabel: (current: number, target: number, unit: string) => string;
  };

  sync: {
    bannerAriaLabel: string;
    headingConnected: string;
    headingNotConnected: string;
    headingError: string;
    headingUnsupported: string;
    syncingBody: string;
    syncedBody: (lastSyncedAt: string | null, newCount: number) => string;
    notConnectedBody: string;
    errorBody: string;
    unsupportedBody: string;
    connect: string;
    syncNow: string;
    syncing: string;
    retry: string;
    dismiss: string;
    downloadShortcut: string;
    shortcutUrl: string;
  };

  logModal: {
    title: string;
    sleepSectionTitle: string;
    sleepDurationLabel: string;
    sleepQualityLabel: string;
    energyLabel: string;
    moodSectionTitle: string;
    moodValenceAxis: string;
    moodArousalAxis: string;
    stressLabel: string;
    triggersLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    saveAll: string;
    autosaveHint: (seconds: number) => string;
    loggedAgo: (mins: number) => string;
  };

  empty: {
    noData: string;
    logFirstPrompt: string;
    logFirstCta: string;
  };
};

const en: HealthUiCopy = {
  pageTitle: "Health",
  pageTitleVitals: "Vitals",
  pageDescription: "How your body and mind are doing today, and what to do about it.",

  logTodayCta: "Log today",
  previousDay: "Previous day",
  nextDay: "Next day",
  notYetAvailable: "Not yet",
  notMedicalAdvice: "This is not medical advice.",
  ethosLine: "突破限制，自由創造 / To Create Without Limitations — and to do so, take care of yourself first.",

  readiness: {
    ringAriaLabel: "Readiness score",
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    low: "Low",
    narrativeTemplate: (score, highlight) => `You're at ${score} today — ${highlight}`,
    narrativeGenericHigh: "everything lines up. Good day to go hard.",
    narrativeGenericMid: "holding steady. Normal load is fine.",
    narrativeGenericLow: "your body is asking for a lighter day.",
    componentSleep: "Sleep",
    componentHrv: "HRV",
    componentRhr: "RHR",
    componentEnergy: "Energy",
    componentStress: "Stress",
    componentActivity: "Activity",
  },

  pillars: {
    sleep: {
      label: "Sleep Quality",
      quality: "Quality",
      duration: "Duration",
      debt: (hours) => `${hours}h sleep debt`,
    },
    energy: {
      label: "Energy",
      promptLog: "Tap to rate",
      hrvSuffix: "vs avg",
    },
    mood: { label: "Mood", tapToLog: "Tap to map" },
    stress: { label: "Stress", streak: (d) => `High stress streak: ${d} days` },
    deltaVsAverage: "vs 7d avg",
    tapToExpand: "Tap for detail",
    logNow: "Log now",
  },

  moodQuadrants: {
    tense: "Tense",
    excited: "Excited",
    calm: "Calm",
    low: "Low",
  },

  vitals: {
    sectionTitle: "Vitals",
    steps: "Steps",
    rhr: "Resting HR",
    hrv: "HRV",
    spo2: "SpO₂",
    activeEnergy: "Active Energy",
    workouts: "Workouts",
    weight: "Weight",
    mindful: "Mindful",
    todayLabel: "Today",
    baselineLabel: "14d baseline",
    goalProgress: (pct) => `${pct}% of goal`,
    addManual: "Add",
    expandDetail: "See detail",
  },

  hydration: {
    sectionTitle: "Hydration & Nutrition",
    waterLabel: "Water",
    waterAdd: (ml) => `+${ml}ml`,
    waterGoal: (ml) => `Goal ${ml}ml`,
    caffeineLabel: "Caffeine",
    caffeineAdd: "Add",
    alcoholLabel: "Alcohol",
    quickAddEspresso: "Espresso",
    quickAddCoffee: "Coffee",
    quickAddTea: "Tea",
  },

  triggers: {
    work: "Work",
    coffee: "Coffee",
    exercise: "Exercise",
    social: "Social",
    family: "Family",
    poor_sleep: "Poor sleep",
    weather: "Weather",
    menstrual: "Menstrual",
    music_practice: "Music practice",
    performance: "Performance",
    other: "Other",
  },

  correlations: {
    sectionTitle: "Correlations",
    empty: "Log for 14 days to unlock correlations.",
    template: (condition, metric, delta, direction) =>
      `On days you ${condition}, your ${metric} is ${delta} ${direction}.`,
    sampleSize: (n, r) => `n=${n} · r=${r.toFixed(2)}`,
    viewScatter: "View scatter",
    conditions: {
      sleepLt7h: "sleep less than 7 hours",
      stepsGt8k: "walk more than 8,000 steps",
      highCaffeine: "have high caffeine",
      workoutDay: "work out",
      highStress: "report high stress",
      lowHrv: "have lower HRV",
    },
    metrics: {
      energy: "subjective energy",
      mood: "mood",
      sleepQuality: "sleep quality",
      stress: "stress",
    },
  },

  trends: {
    sectionTitle: "Trends",
    range7d: "7 days",
    range30d: "30 days",
    range90d: "90 days",
    range1y: "1 year",
    seriesSleep: "Sleep",
    seriesEnergy: "Energy",
    seriesMood: "Mood",
    seriesStress: "Stress",
    seriesHrv: "HRV",
    seriesSteps: "Steps",
    weekendLabel: "Weekend",
  },

  weeklyReport: {
    title: "Weekly report",
    subtitle: (start, end) => `${start} – ${end}`,
    avgSleep: "Avg sleep",
    totalSteps: "Total steps",
    workoutCount: "Workouts",
    highestMoodDay: "Highest mood",
    lowestMoodDay: "Lowest mood",
    biggestWinLabel: "Biggest win",
    biggestConcernLabel: "Biggest concern",
    exportPdf: "Export PDF",
  },

  goals: {
    sectionTitle: "Goals",
    empty: "No goals yet.",
    addGoal: "Add goal",
    streak: (d) => `${d}-day streak`,
    progressLabel: (current, target, unit) => `${current} / ${target} ${unit}`,
  },

  sync: {
    bannerAriaLabel: "Apple Health sync",
    headingConnected: "Apple Health",
    headingNotConnected: "Apple Health",
    headingError: "Sync failed",
    headingUnsupported: "Apple Health",
    syncingBody: "Syncing latest samples…",
    syncedBody: (lastSyncedAt, newCount) => {
      if (!lastSyncedAt) return "Synced";
      const mins = Math.max(0, Math.round((Date.now() - Date.parse(lastSyncedAt)) / 60000));
      const ago = mins < 1 ? "just now" : `${mins}m ago`;
      return `Last synced: ${ago} · ${newCount} new data points`;
    },
    notConnectedBody: "Connect to pull sleep, HRV, and steps automatically.",
    errorBody: "Something went wrong. Try again.",
    unsupportedBody: "Sync runs in the iOS app. On web, use the Apple Shortcut or manual entry.",
    connect: "Connect",
    syncNow: "Sync now",
    syncing: "Syncing",
    retry: "Retry",
    dismiss: "Dismiss",
    downloadShortcut: "Get Shortcut",
    // Placeholder — replace with the real iCloud Shortcuts share URL once
    // the shortcut is published.
    shortcutUrl: "https://www.icloud.com/shortcuts/",
  },

  logModal: {
    title: "Log today",
    sleepSectionTitle: "Sleep",
    sleepDurationLabel: "Hours slept",
    sleepQualityLabel: "Sleep quality",
    energyLabel: "Energy level",
    moodSectionTitle: "Mood",
    moodValenceAxis: "Sad ↔ Happy",
    moodArousalAxis: "Calm ↔ Energized",
    stressLabel: "Stress level",
    triggersLabel: "Triggers",
    notesLabel: "Notes",
    notesPlaceholder: "What happened today?",
    saveAll: "Save",
    autosaveHint: (s) => `Autosaving in ${s}s`,
    loggedAgo: (m) => `Logged ${m}m ago`,
  },

  empty: {
    noData: "No data yet",
    logFirstPrompt: "Log your first day to see trends and correlations.",
    logFirstCta: "Log today",
  },
};

// zh-TW (Traditional Chinese) — primary Chinese locale of the app.
// Keeps the "突破限制，自由創造" framing; uses natural Taiwan phrasing.
const zhTW: DeepPartial<HealthUiCopy> = {
  pageTitle: "健康",
  pageTitleVitals: "生命體徵",
  pageDescription: "今天身心狀態如何，以及應該怎麼做。",
  logTodayCta: "記錄今天",
  previousDay: "前一天",
  nextDay: "後一天",
  notYetAvailable: "尚無資料",
  notMedicalAdvice: "本內容不構成醫療建議。",
  ethosLine: "突破限制，自由創造 — 先照顧好自己，才能走得遠。",
  readiness: {
    ringAriaLabel: "身心準備度",
    excellent: "極佳",
    good: "良好",
    fair: "普通",
    low: "偏低",
    narrativeTemplate: (score, highlight) => `今天 ${score} 分，${highlight}`,
    narrativeGenericHigh: "狀態齊備，適合全力衝刺。",
    narrativeGenericMid: "狀態平穩，維持正常節奏即可。",
    narrativeGenericLow: "身體需要放慢一點，今天輕一點吧。",
    componentSleep: "睡眠",
    componentHrv: "HRV",
    componentRhr: "靜態心率",
    componentEnergy: "精力",
    componentStress: "壓力",
    componentActivity: "活動",
  },
  pillars: {
    sleep: { label: "睡眠品質", quality: "品質", duration: "時長", debt: (h) => `睡眠債 ${h} 小時` },
    energy: { label: "精力", promptLog: "點擊評分", hrvSuffix: "對比平均" },
    mood: { label: "情緒", tapToLog: "點擊定位" },
    stress: { label: "壓力", streak: (d) => `高壓已持續 ${d} 天` },
    deltaVsAverage: "對比 7 日平均",
    tapToExpand: "查看詳情",
    logNow: "立即記錄",
  },
  moodQuadrants: { tense: "緊張", excited: "興奮", calm: "平靜", low: "低落" },
  vitals: {
    sectionTitle: "生理指標",
    steps: "步數",
    rhr: "靜態心率",
    hrv: "HRV",
    spo2: "血氧",
    activeEnergy: "活動熱量",
    workouts: "運動時長",
    weight: "體重",
    mindful: "冥想",
    todayLabel: "今天",
    baselineLabel: "14 日基準",
    goalProgress: (pct) => `目標完成 ${pct}%`,
    addManual: "新增",
    expandDetail: "查看詳情",
  },
  hydration: {
    sectionTitle: "水分與營養",
    waterLabel: "飲水",
    waterAdd: (ml) => `+${ml}ml`,
    waterGoal: (ml) => `目標 ${ml}ml`,
    caffeineLabel: "咖啡因",
    caffeineAdd: "新增",
    alcoholLabel: "酒精",
    quickAddEspresso: "濃縮",
    quickAddCoffee: "咖啡",
    quickAddTea: "茶",
  },
  triggers: {
    work: "工作",
    coffee: "咖啡",
    exercise: "運動",
    social: "社交",
    family: "家庭",
    poor_sleep: "睡眠不足",
    weather: "天氣",
    menstrual: "生理期",
    music_practice: "音樂練習",
    performance: "表演",
    other: "其他",
  },
  correlations: {
    sectionTitle: "關聯分析",
    empty: "連續記錄 14 天後即可解鎖關聯洞察。",
    template: (condition, metric, delta, direction) =>
      `在你${condition}的日子,${metric}${direction === "higher" ? "高" : "低"} ${delta}。`,
    sampleSize: (n, r) => `n=${n}・r=${r.toFixed(2)}`,
    viewScatter: "查看散點圖",
    conditions: {
      sleepLt7h: "睡不到 7 小時",
      stepsGt8k: "步數超過 8000",
      highCaffeine: "攝取大量咖啡因",
      workoutDay: "有做運動",
      highStress: "壓力較大",
      lowHrv: "HRV 偏低",
    },
    metrics: { energy: "主觀精力", mood: "情緒", sleepQuality: "睡眠品質", stress: "壓力" },
  },
  trends: {
    sectionTitle: "趨勢",
    range7d: "7 天",
    range30d: "30 天",
    range90d: "90 天",
    range1y: "1 年",
    seriesSleep: "睡眠",
    seriesEnergy: "精力",
    seriesMood: "情緒",
    seriesStress: "壓力",
    seriesHrv: "HRV",
    seriesSteps: "步數",
    weekendLabel: "週末",
  },
  weeklyReport: {
    title: "週報",
    subtitle: (s, e) => `${s} – ${e}`,
    avgSleep: "平均睡眠",
    totalSteps: "總步數",
    workoutCount: "運動次數",
    highestMoodDay: "情緒最高",
    lowestMoodDay: "情緒最低",
    biggestWinLabel: "最大亮點",
    biggestConcernLabel: "需要注意",
    exportPdf: "輸出 PDF",
  },
  goals: {
    sectionTitle: "目標",
    empty: "尚未設定目標。",
    addGoal: "新增目標",
    streak: (d) => `連續達標 ${d} 天`,
    progressLabel: (c, t, u) => `${c} / ${t} ${u}`,
  },
  sync: {
    bannerAriaLabel: "Apple 健康同步",
    headingConnected: "Apple 健康",
    headingNotConnected: "Apple 健康",
    headingError: "同步失敗",
    headingUnsupported: "Apple 健康",
    syncingBody: "正在同步最新資料…",
    syncedBody: (lastSyncedAt, newCount) => {
      if (!lastSyncedAt) return "已同步";
      const mins = Math.max(0, Math.round((Date.now() - Date.parse(lastSyncedAt)) / 60000));
      const ago = mins < 1 ? "剛剛" : `${mins} 分鐘前`;
      return `上次同步:${ago}・新增 ${newCount} 筆資料`;
    },
    notConnectedBody: "連接後可自動匯入睡眠、HRV、步數。",
    errorBody: "發生錯誤,請重試。",
    unsupportedBody: "同步功能需在 iOS 原生 App 使用。在網頁版可使用 Apple 捷徑或手動輸入。",
    connect: "連接",
    syncNow: "立即同步",
    syncing: "同步中",
    retry: "重試",
    dismiss: "略過",
    downloadShortcut: "取得捷徑",
    shortcutUrl: "https://www.icloud.com/shortcuts/",
  },
  logModal: {
    title: "記錄今天",
    sleepSectionTitle: "睡眠",
    sleepDurationLabel: "睡眠時數",
    sleepQualityLabel: "睡眠品質",
    energyLabel: "精力等級",
    moodSectionTitle: "情緒",
    moodValenceAxis: "難過 ↔ 開心",
    moodArousalAxis: "平靜 ↔ 興奮",
    stressLabel: "壓力等級",
    triggersLabel: "觸發因素",
    notesLabel: "備註",
    notesPlaceholder: "今天發生了什麼?",
    saveAll: "儲存",
    autosaveHint: (s) => `${s} 秒後自動儲存`,
    loggedAgo: (m) => `${m} 分鐘前已記錄`,
  },
  empty: {
    noData: "尚無資料",
    logFirstPrompt: "記錄第一天,即可看見趨勢與關聯。",
    logFirstCta: "記錄今天",
  },
};

// zh-CN (Simplified Chinese)
const zhCN: DeepPartial<HealthUiCopy> = {
  pageTitle: "健康",
  pageTitleVitals: "生命体征",
  pageDescription: "今天身心状态如何,以及应该怎么做。",
  logTodayCta: "记录今天",
  previousDay: "前一天",
  nextDay: "后一天",
  notYetAvailable: "暂无数据",
  notMedicalAdvice: "本内容不构成医疗建议。",
  ethosLine: "突破限制,自由创造 — 先照顾好自己,才能走得远。",
  readiness: {
    ringAriaLabel: "身心状态评分",
    excellent: "极佳",
    good: "良好",
    fair: "一般",
    low: "偏低",
    narrativeTemplate: (score, highlight) => `今天 ${score} 分,${highlight}`,
    narrativeGenericHigh: "状态齐备,适合全力冲刺。",
    narrativeGenericMid: "状态平稳,维持正常节奏即可。",
    narrativeGenericLow: "身体需要慢一点,今天轻松一下。",
    componentSleep: "睡眠",
    componentHrv: "HRV",
    componentRhr: "静息心率",
    componentEnergy: "精力",
    componentStress: "压力",
    componentActivity: "活动",
  },
  pillars: {
    sleep: { label: "睡眠质量", quality: "质量", duration: "时长", debt: (h) => `睡眠债 ${h} 小时` },
    energy: { label: "精力", promptLog: "点击评分", hrvSuffix: "对比平均" },
    mood: { label: "情绪", tapToLog: "点击定位" },
    stress: { label: "压力", streak: (d) => `高压已持续 ${d} 天` },
    deltaVsAverage: "对比 7 日平均",
    tapToExpand: "查看详情",
    logNow: "立即记录",
  },
  moodQuadrants: { tense: "紧张", excited: "兴奋", calm: "平静", low: "低落" },
  vitals: {
    sectionTitle: "生理指标",
    steps: "步数",
    rhr: "静息心率",
    hrv: "HRV",
    spo2: "血氧",
    activeEnergy: "活动热量",
    workouts: "运动时长",
    weight: "体重",
    mindful: "冥想",
    todayLabel: "今天",
    baselineLabel: "14 日基准",
    goalProgress: (pct) => `目标完成 ${pct}%`,
    addManual: "新增",
    expandDetail: "查看详情",
  },
  hydration: {
    sectionTitle: "水分与营养",
    waterLabel: "饮水",
    waterAdd: (ml) => `+${ml}ml`,
    waterGoal: (ml) => `目标 ${ml}ml`,
    caffeineLabel: "咖啡因",
    caffeineAdd: "新增",
    alcoholLabel: "酒精",
    quickAddEspresso: "浓缩",
    quickAddCoffee: "咖啡",
    quickAddTea: "茶",
  },
  triggers: {
    work: "工作",
    coffee: "咖啡",
    exercise: "运动",
    social: "社交",
    family: "家庭",
    poor_sleep: "睡眠不足",
    weather: "天气",
    menstrual: "生理期",
    music_practice: "音乐练习",
    performance: "表演",
    other: "其他",
  },
  correlations: {
    sectionTitle: "关联分析",
    empty: "连续记录 14 天后可解锁关联洞察。",
    template: (condition, metric, delta, direction) =>
      `在你${condition}的日子,${metric}${direction === "higher" ? "更高" : "更低"} ${delta}。`,
    sampleSize: (n, r) => `n=${n}・r=${r.toFixed(2)}`,
    viewScatter: "查看散点图",
    conditions: {
      sleepLt7h: "睡不到 7 小时",
      stepsGt8k: "步数超过 8000",
      highCaffeine: "摄入大量咖啡因",
      workoutDay: "有运动",
      highStress: "压力较大",
      lowHrv: "HRV 偏低",
    },
    metrics: { energy: "主观精力", mood: "情绪", sleepQuality: "睡眠质量", stress: "压力" },
  },
  trends: {
    sectionTitle: "趋势",
    range7d: "7 天",
    range30d: "30 天",
    range90d: "90 天",
    range1y: "1 年",
    seriesSleep: "睡眠",
    seriesEnergy: "精力",
    seriesMood: "情绪",
    seriesStress: "压力",
    seriesHrv: "HRV",
    seriesSteps: "步数",
    weekendLabel: "周末",
  },
  weeklyReport: {
    title: "周报",
    subtitle: (s, e) => `${s} – ${e}`,
    avgSleep: "平均睡眠",
    totalSteps: "总步数",
    workoutCount: "运动次数",
    highestMoodDay: "情绪最高",
    lowestMoodDay: "情绪最低",
    biggestWinLabel: "最大亮点",
    biggestConcernLabel: "需要注意",
    exportPdf: "导出 PDF",
  },
  goals: {
    sectionTitle: "目标",
    empty: "尚未设置目标。",
    addGoal: "新增目标",
    streak: (d) => `连续达标 ${d} 天`,
    progressLabel: (c, t, u) => `${c} / ${t} ${u}`,
  },
  sync: {
    bannerAriaLabel: "Apple 健康同步",
    headingConnected: "Apple 健康",
    headingNotConnected: "Apple 健康",
    headingError: "同步失败",
    headingUnsupported: "Apple 健康",
    syncingBody: "正在同步最新数据…",
    syncedBody: (lastSyncedAt, newCount) => {
      if (!lastSyncedAt) return "已同步";
      const mins = Math.max(0, Math.round((Date.now() - Date.parse(lastSyncedAt)) / 60000));
      const ago = mins < 1 ? "刚刚" : `${mins} 分钟前`;
      return `上次同步:${ago}・新增 ${newCount} 条数据`;
    },
    notConnectedBody: "连接后可自动导入睡眠、HRV、步数。",
    errorBody: "发生错误,请重试。",
    unsupportedBody: "同步功能需在 iOS 原生 App 使用。网页版可使用 Apple 快捷指令或手动输入。",
    connect: "连接",
    syncNow: "立即同步",
    syncing: "同步中",
    retry: "重试",
    dismiss: "忽略",
    downloadShortcut: "获取快捷指令",
    shortcutUrl: "https://www.icloud.com/shortcuts/",
  },
  logModal: {
    title: "记录今天",
    sleepSectionTitle: "睡眠",
    sleepDurationLabel: "睡眠时长",
    sleepQualityLabel: "睡眠质量",
    energyLabel: "精力等级",
    moodSectionTitle: "情绪",
    moodValenceAxis: "难过 ↔ 开心",
    moodArousalAxis: "平静 ↔ 兴奋",
    stressLabel: "压力等级",
    triggersLabel: "触发因素",
    notesLabel: "备注",
    notesPlaceholder: "今天发生了什么?",
    saveAll: "保存",
    autosaveHint: (s) => `${s} 秒后自动保存`,
    loggedAgo: (m) => `${m} 分钟前已记录`,
  },
  empty: {
    noData: "暂无数据",
    logFirstPrompt: "记录第一天,即可看见趋势与关联。",
    logFirstCta: "记录今天",
  },
};

// ja
const ja: DeepPartial<HealthUiCopy> = {
  pageTitle: "ヘルス",
  pageTitleVitals: "バイタル",
  pageDescription: "今日の身体と心の状態、そして何をすべきか。",
  logTodayCta: "今日を記録",
  previousDay: "前の日",
  nextDay: "次の日",
  notYetAvailable: "データなし",
  notMedicalAdvice: "医療アドバイスではありません。",
  ethosLine: "限界を超えて自由に創造する — そのためにまず自分を大切に。",
  readiness: {
    ringAriaLabel: "レディネススコア",
    excellent: "最高",
    good: "良好",
    fair: "普通",
    low: "低め",
    narrativeTemplate: (score, highlight) => `今日は${score}点。${highlight}`,
    narrativeGenericHigh: "すべてが整っています。全力で行きましょう。",
    narrativeGenericMid: "安定しています。通常のペースで大丈夫。",
    narrativeGenericLow: "体が軽めの一日を求めています。",
    componentSleep: "睡眠",
    componentHrv: "HRV",
    componentRhr: "安静時心拍",
    componentEnergy: "エネルギー",
    componentStress: "ストレス",
    componentActivity: "活動",
  },
  pillars: {
    sleep: { label: "睡眠の質", quality: "質", duration: "時間", debt: (h) => `睡眠負債 ${h} 時間` },
    energy: { label: "エネルギー", promptLog: "タップで評価", hrvSuffix: "平均比" },
    mood: { label: "気分", tapToLog: "タップでマップ" },
    stress: { label: "ストレス", streak: (d) => `高ストレスが${d}日連続` },
    deltaVsAverage: "7日平均比",
    tapToExpand: "詳細を見る",
    logNow: "記録する",
  },
  moodQuadrants: { tense: "緊張", excited: "興奮", calm: "穏やか", low: "低調" },
  vitals: {
    sectionTitle: "バイタル",
    steps: "歩数",
    rhr: "安静時心拍",
    hrv: "HRV",
    spo2: "血中酸素",
    activeEnergy: "アクティブエネルギー",
    workouts: "運動",
    weight: "体重",
    mindful: "マインドフル",
    todayLabel: "今日",
    baselineLabel: "14日基準",
    goalProgress: (pct) => `目標の${pct}%`,
    addManual: "追加",
    expandDetail: "詳細",
  },
  hydration: {
    sectionTitle: "水分・栄養",
    waterLabel: "水分",
    waterAdd: (ml) => `+${ml}ml`,
    waterGoal: (ml) => `目標 ${ml}ml`,
    caffeineLabel: "カフェイン",
    caffeineAdd: "追加",
    alcoholLabel: "アルコール",
    quickAddEspresso: "エスプレッソ",
    quickAddCoffee: "コーヒー",
    quickAddTea: "お茶",
  },
  triggers: {
    work: "仕事",
    coffee: "コーヒー",
    exercise: "運動",
    social: "社交",
    family: "家族",
    poor_sleep: "睡眠不足",
    weather: "天気",
    menstrual: "生理",
    music_practice: "音楽練習",
    performance: "本番",
    other: "その他",
  },
  correlations: {
    sectionTitle: "相関分析",
    empty: "14日連続で記録すると相関が見えます。",
    template: (condition, metric, delta, direction) =>
      `${condition}日は、${metric}が${delta}${direction === "higher" ? "高い" : "低い"}。`,
    sampleSize: (n, r) => `n=${n}・r=${r.toFixed(2)}`,
    viewScatter: "散布図を見る",
    conditions: {
      sleepLt7h: "睡眠が7時間未満の",
      stepsGt8k: "8,000歩以上歩いた",
      highCaffeine: "カフェイン摂取量が多い",
      workoutDay: "運動した",
      highStress: "ストレスが高い",
      lowHrv: "HRVが低い",
    },
    metrics: { energy: "主観的エネルギー", mood: "気分", sleepQuality: "睡眠の質", stress: "ストレス" },
  },
  trends: {
    sectionTitle: "トレンド",
    range7d: "7日",
    range30d: "30日",
    range90d: "90日",
    range1y: "1年",
    seriesSleep: "睡眠",
    seriesEnergy: "エネルギー",
    seriesMood: "気分",
    seriesStress: "ストレス",
    seriesHrv: "HRV",
    seriesSteps: "歩数",
    weekendLabel: "週末",
  },
  weeklyReport: {
    title: "週次レポート",
    subtitle: (s, e) => `${s} – ${e}`,
    avgSleep: "平均睡眠",
    totalSteps: "合計歩数",
    workoutCount: "運動回数",
    highestMoodDay: "気分最高日",
    lowestMoodDay: "気分最低日",
    biggestWinLabel: "最大の成果",
    biggestConcernLabel: "要注意",
    exportPdf: "PDFで出力",
  },
  goals: {
    sectionTitle: "目標",
    empty: "目標はまだありません。",
    addGoal: "目標を追加",
    streak: (d) => `${d}日連続達成`,
    progressLabel: (c, t, u) => `${c} / ${t} ${u}`,
  },
  sync: {
    bannerAriaLabel: "Apple ヘルスケア同期",
    headingConnected: "Apple ヘルスケア",
    headingNotConnected: "Apple ヘルスケア",
    headingError: "同期失敗",
    headingUnsupported: "Apple ヘルスケア",
    syncingBody: "最新データを同期中…",
    syncedBody: (lastSyncedAt, newCount) => {
      if (!lastSyncedAt) return "同期済み";
      const mins = Math.max(0, Math.round((Date.now() - Date.parse(lastSyncedAt)) / 60000));
      const ago = mins < 1 ? "たった今" : `${mins}分前`;
      return `最終同期:${ago}・新規${newCount}件`;
    },
    notConnectedBody: "接続すると睡眠・HRV・歩数を自動同期します。",
    errorBody: "エラーが発生しました。もう一度お試しください。",
    unsupportedBody: "同期はiOSアプリでのみ利用可能。Webではショートカットか手動入力をご利用ください。",
    connect: "接続",
    syncNow: "今すぐ同期",
    syncing: "同期中",
    retry: "再試行",
    dismiss: "閉じる",
    downloadShortcut: "ショートカットを取得",
    shortcutUrl: "https://www.icloud.com/shortcuts/",
  },
  logModal: {
    title: "今日を記録",
    sleepSectionTitle: "睡眠",
    sleepDurationLabel: "睡眠時間",
    sleepQualityLabel: "睡眠の質",
    energyLabel: "エネルギーレベル",
    moodSectionTitle: "気分",
    moodValenceAxis: "悲しい ↔ 楽しい",
    moodArousalAxis: "穏やか ↔ 興奮",
    stressLabel: "ストレス度",
    triggersLabel: "きっかけ",
    notesLabel: "メモ",
    notesPlaceholder: "今日はどうでしたか?",
    saveAll: "保存",
    autosaveHint: (s) => `${s}秒後に自動保存`,
    loggedAgo: (m) => `${m}分前に記録`,
  },
  empty: {
    noData: "データなし",
    logFirstPrompt: "初日を記録してトレンドと相関を確認しましょう。",
    logFirstCta: "今日を記録",
  },
};

// ko
const ko: DeepPartial<HealthUiCopy> = {
  pageTitle: "건강",
  pageTitleVitals: "바이탈",
  pageDescription: "오늘 몸과 마음의 상태, 그리고 무엇을 해야 하는지.",
  logTodayCta: "오늘 기록",
  previousDay: "이전 날",
  nextDay: "다음 날",
  notYetAvailable: "데이터 없음",
  notMedicalAdvice: "의료 조언이 아닙니다.",
  ethosLine: "한계를 넘어 자유롭게 창조하기 — 먼저 자신을 돌보세요.",
  readiness: {
    ringAriaLabel: "준비도 점수",
    excellent: "최상",
    good: "양호",
    fair: "보통",
    low: "낮음",
    narrativeTemplate: (score, highlight) => `오늘 ${score}점. ${highlight}`,
    narrativeGenericHigh: "모든 것이 준비됐어요. 전력 질주하기 좋은 날입니다.",
    narrativeGenericMid: "안정적이에요. 평소 페이스로 진행하세요.",
    narrativeGenericLow: "몸이 가벼운 하루를 원하고 있어요.",
    componentSleep: "수면",
    componentHrv: "HRV",
    componentRhr: "안정 심박수",
    componentEnergy: "에너지",
    componentStress: "스트레스",
    componentActivity: "활동",
  },
  pillars: {
    sleep: { label: "수면 품질", quality: "품질", duration: "시간", debt: (h) => `수면 부채 ${h}시간` },
    energy: { label: "에너지", promptLog: "탭하여 평가", hrvSuffix: "평균 대비" },
    mood: { label: "기분", tapToLog: "탭하여 매핑" },
    stress: { label: "스트레스", streak: (d) => `높은 스트레스가 ${d}일 연속` },
    deltaVsAverage: "7일 평균 대비",
    tapToExpand: "자세히",
    logNow: "기록하기",
  },
  moodQuadrants: { tense: "긴장", excited: "흥분", calm: "평온", low: "저조" },
  vitals: {
    sectionTitle: "바이탈",
    steps: "걸음",
    rhr: "안정 심박수",
    hrv: "HRV",
    spo2: "산소 포화도",
    activeEnergy: "활동 에너지",
    workouts: "운동",
    weight: "체중",
    mindful: "마음챙김",
    todayLabel: "오늘",
    baselineLabel: "14일 기준",
    goalProgress: (pct) => `목표의 ${pct}%`,
    addManual: "추가",
    expandDetail: "자세히 보기",
  },
  hydration: {
    sectionTitle: "수분 & 영양",
    waterLabel: "물",
    waterAdd: (ml) => `+${ml}ml`,
    waterGoal: (ml) => `목표 ${ml}ml`,
    caffeineLabel: "카페인",
    caffeineAdd: "추가",
    alcoholLabel: "알코올",
    quickAddEspresso: "에스프레소",
    quickAddCoffee: "커피",
    quickAddTea: "차",
  },
  triggers: {
    work: "업무",
    coffee: "커피",
    exercise: "운동",
    social: "사교",
    family: "가족",
    poor_sleep: "수면 부족",
    weather: "날씨",
    menstrual: "생리",
    music_practice: "음악 연습",
    performance: "공연",
    other: "기타",
  },
  correlations: {
    sectionTitle: "상관관계",
    empty: "14일 연속 기록하면 상관관계가 표시됩니다.",
    template: (condition, metric, delta, direction) =>
      `${condition} 날, ${metric}이(가) ${delta} ${direction === "higher" ? "높" : "낮"}습니다.`,
    sampleSize: (n, r) => `n=${n}·r=${r.toFixed(2)}`,
    viewScatter: "분산도 보기",
    conditions: {
      sleepLt7h: "7시간 미만 자는",
      stepsGt8k: "8000보 이상 걷는",
      highCaffeine: "카페인을 많이 섭취한",
      workoutDay: "운동한",
      highStress: "스트레스가 높은",
      lowHrv: "HRV가 낮은",
    },
    metrics: { energy: "주관적 에너지", mood: "기분", sleepQuality: "수면 품질", stress: "스트레스" },
  },
  trends: {
    sectionTitle: "트렌드",
    range7d: "7일",
    range30d: "30일",
    range90d: "90일",
    range1y: "1년",
    seriesSleep: "수면",
    seriesEnergy: "에너지",
    seriesMood: "기분",
    seriesStress: "스트레스",
    seriesHrv: "HRV",
    seriesSteps: "걸음",
    weekendLabel: "주말",
  },
  weeklyReport: {
    title: "주간 리포트",
    subtitle: (s, e) => `${s} – ${e}`,
    avgSleep: "평균 수면",
    totalSteps: "총 걸음",
    workoutCount: "운동 횟수",
    highestMoodDay: "최고 기분 날",
    lowestMoodDay: "최저 기분 날",
    biggestWinLabel: "최고의 성과",
    biggestConcernLabel: "주의 사항",
    exportPdf: "PDF 내보내기",
  },
  goals: {
    sectionTitle: "목표",
    empty: "목표가 없습니다.",
    addGoal: "목표 추가",
    streak: (d) => `${d}일 연속 달성`,
    progressLabel: (c, t, u) => `${c} / ${t} ${u}`,
  },
  sync: {
    bannerAriaLabel: "Apple 건강 동기화",
    headingConnected: "Apple 건강",
    headingNotConnected: "Apple 건강",
    headingError: "동기화 실패",
    headingUnsupported: "Apple 건강",
    syncingBody: "최신 데이터 동기화 중…",
    syncedBody: (lastSyncedAt, newCount) => {
      if (!lastSyncedAt) return "동기화됨";
      const mins = Math.max(0, Math.round((Date.now() - Date.parse(lastSyncedAt)) / 60000));
      const ago = mins < 1 ? "방금" : `${mins}분 전`;
      return `마지막 동기화: ${ago}·신규 ${newCount}개`;
    },
    notConnectedBody: "연결 시 수면, HRV, 걸음을 자동으로 가져옵니다.",
    errorBody: "오류가 발생했습니다. 다시 시도해 주세요.",
    unsupportedBody: "동기화는 iOS 앱에서만 가능합니다. 웹에서는 Apple 단축어 또는 수동 입력을 사용하세요.",
    connect: "연결",
    syncNow: "지금 동기화",
    syncing: "동기화 중",
    retry: "재시도",
    dismiss: "닫기",
    downloadShortcut: "단축어 받기",
    shortcutUrl: "https://www.icloud.com/shortcuts/",
  },
  logModal: {
    title: "오늘 기록",
    sleepSectionTitle: "수면",
    sleepDurationLabel: "수면 시간",
    sleepQualityLabel: "수면 품질",
    energyLabel: "에너지 수준",
    moodSectionTitle: "기분",
    moodValenceAxis: "슬픔 ↔ 행복",
    moodArousalAxis: "평온 ↔ 흥분",
    stressLabel: "스트레스 수준",
    triggersLabel: "요인",
    notesLabel: "메모",
    notesPlaceholder: "오늘 어땠나요?",
    saveAll: "저장",
    autosaveHint: (s) => `${s}초 후 자동 저장`,
    loggedAgo: (m) => `${m}분 전 기록됨`,
  },
  empty: {
    noData: "데이터 없음",
    logFirstPrompt: "첫 날을 기록하여 트렌드와 상관관계를 확인하세요.",
    logFirstCta: "오늘 기록",
  },
};

// fr
const fr: DeepPartial<HealthUiCopy> = {
  pageTitle: "Santé",
  pageTitleVitals: "Constantes",
  pageDescription: "Comment votre corps et votre esprit vont aujourd'hui, et quoi en faire.",
  logTodayCta: "Consigner aujourd'hui",
  previousDay: "Jour précédent",
  nextDay: "Jour suivant",
  notYetAvailable: "Aucune donnée",
  notMedicalAdvice: "Ceci n'est pas un avis médical.",
  ethosLine: "Créer sans limites — et pour cela, prenez d'abord soin de vous.",
  readiness: {
    ringAriaLabel: "Score de préparation",
    excellent: "Excellent",
    good: "Bien",
    fair: "Moyen",
    low: "Faible",
    narrativeTemplate: (score, highlight) => `Aujourd'hui : ${score}. ${highlight}`,
    narrativeGenericHigh: "tout s'aligne. Bonne journée pour pousser fort.",
    narrativeGenericMid: "tout va bien. Rythme normal.",
    narrativeGenericLow: "votre corps demande une journée plus légère.",
    componentSleep: "Sommeil",
    componentHrv: "VRC",
    componentRhr: "FC repos",
    componentEnergy: "Énergie",
    componentStress: "Stress",
    componentActivity: "Activité",
  },
  pillars: {
    sleep: { label: "Qualité du sommeil", quality: "Qualité", duration: "Durée", debt: (h) => `Dette : ${h}h` },
    energy: { label: "Énergie", promptLog: "Appuyez pour noter", hrvSuffix: "vs moy." },
    mood: { label: "Humeur", tapToLog: "Appuyez pour situer" },
    stress: { label: "Stress", streak: (d) => `${d} jours de stress élevé` },
    deltaVsAverage: "vs moy. 7j",
    tapToExpand: "Détails",
    logNow: "Consigner",
  },
  moodQuadrants: { tense: "Tendu", excited: "Enthousiaste", calm: "Calme", low: "Bas" },
  vitals: {
    sectionTitle: "Constantes",
    steps: "Pas",
    rhr: "FC au repos",
    hrv: "VRC",
    spo2: "SpO₂",
    activeEnergy: "Énergie active",
    workouts: "Entraînement",
    weight: "Poids",
    mindful: "Méditation",
    todayLabel: "Aujourd'hui",
    baselineLabel: "Base 14j",
    goalProgress: (pct) => `${pct}% de l'objectif`,
    addManual: "Ajouter",
    expandDetail: "Détails",
  },
  hydration: {
    sectionTitle: "Hydratation & Nutrition",
    waterLabel: "Eau",
    waterAdd: (ml) => `+${ml}ml`,
    waterGoal: (ml) => `Objectif ${ml}ml`,
    caffeineLabel: "Caféine",
    caffeineAdd: "Ajouter",
    alcoholLabel: "Alcool",
    quickAddEspresso: "Expresso",
    quickAddCoffee: "Café",
    quickAddTea: "Thé",
  },
  triggers: {
    work: "Travail",
    coffee: "Café",
    exercise: "Sport",
    social: "Social",
    family: "Famille",
    poor_sleep: "Mauvais sommeil",
    weather: "Météo",
    menstrual: "Règles",
    music_practice: "Musique",
    performance: "Performance",
    other: "Autre",
  },
  correlations: {
    sectionTitle: "Corrélations",
    empty: "Consignez 14 jours pour débloquer les corrélations.",
    template: (condition, metric, delta, direction) =>
      `Les jours où vous ${condition}, votre ${metric} est ${delta} ${direction === "higher" ? "plus élevé" : "plus bas"}.`,
    sampleSize: (n, r) => `n=${n} · r=${r.toFixed(2)}`,
    viewScatter: "Voir le nuage",
    conditions: {
      sleepLt7h: "dormez moins de 7h",
      stepsGt8k: "marchez plus de 8 000 pas",
      highCaffeine: "consommez beaucoup de caféine",
      workoutDay: "faites du sport",
      highStress: "avez un stress élevé",
      lowHrv: "avez une VRC basse",
    },
    metrics: { energy: "énergie subjective", mood: "humeur", sleepQuality: "qualité du sommeil", stress: "stress" },
  },
  trends: {
    sectionTitle: "Tendances",
    range7d: "7 jours",
    range30d: "30 jours",
    range90d: "90 jours",
    range1y: "1 an",
    seriesSleep: "Sommeil",
    seriesEnergy: "Énergie",
    seriesMood: "Humeur",
    seriesStress: "Stress",
    seriesHrv: "VRC",
    seriesSteps: "Pas",
    weekendLabel: "Weekend",
  },
  weeklyReport: {
    title: "Rapport hebdo",
    subtitle: (s, e) => `${s} – ${e}`,
    avgSleep: "Sommeil moyen",
    totalSteps: "Pas totaux",
    workoutCount: "Entraînements",
    highestMoodDay: "Humeur au top",
    lowestMoodDay: "Humeur au plus bas",
    biggestWinLabel: "Meilleure réussite",
    biggestConcernLabel: "À surveiller",
    exportPdf: "Exporter PDF",
  },
  goals: {
    sectionTitle: "Objectifs",
    empty: "Aucun objectif.",
    addGoal: "Ajouter un objectif",
    streak: (d) => `Série de ${d} jours`,
    progressLabel: (c, t, u) => `${c} / ${t} ${u}`,
  },
  sync: {
    bannerAriaLabel: "Synchronisation Apple Santé",
    headingConnected: "Apple Santé",
    headingNotConnected: "Apple Santé",
    headingError: "Échec de synchronisation",
    headingUnsupported: "Apple Santé",
    syncingBody: "Synchronisation des derniers échantillons…",
    syncedBody: (lastSyncedAt, newCount) => {
      if (!lastSyncedAt) return "Synchronisé";
      const mins = Math.max(0, Math.round((Date.now() - Date.parse(lastSyncedAt)) / 60000));
      const ago = mins < 1 ? "à l'instant" : `il y a ${mins} min`;
      return `Dernière synchro : ${ago} · ${newCount} nouveaux points`;
    },
    notConnectedBody: "Connectez-vous pour importer sommeil, VRC et pas automatiquement.",
    errorBody: "Une erreur est survenue. Réessayez.",
    unsupportedBody: "La synchro n'est disponible que sur l'app iOS. Sur le web, utilisez le raccourci ou la saisie manuelle.",
    connect: "Connecter",
    syncNow: "Synchroniser",
    syncing: "Synchronisation",
    retry: "Réessayer",
    dismiss: "Fermer",
    downloadShortcut: "Obtenir le raccourci",
    shortcutUrl: "https://www.icloud.com/shortcuts/",
  },
  logModal: {
    title: "Consigner aujourd'hui",
    sleepSectionTitle: "Sommeil",
    sleepDurationLabel: "Heures de sommeil",
    sleepQualityLabel: "Qualité du sommeil",
    energyLabel: "Niveau d'énergie",
    moodSectionTitle: "Humeur",
    moodValenceAxis: "Triste ↔ Heureux",
    moodArousalAxis: "Calme ↔ Énergique",
    stressLabel: "Niveau de stress",
    triggersLabel: "Déclencheurs",
    notesLabel: "Notes",
    notesPlaceholder: "Que s'est-il passé aujourd'hui ?",
    saveAll: "Enregistrer",
    autosaveHint: (s) => `Enregistrement dans ${s}s`,
    loggedAgo: (m) => `Consigné il y a ${m} min`,
  },
  empty: {
    noData: "Aucune donnée",
    logFirstPrompt: "Consignez votre premier jour pour voir tendances et corrélations.",
    logFirstCta: "Consigner aujourd'hui",
  },
};

// it
const it: DeepPartial<HealthUiCopy> = {
  pageTitle: "Salute",
  pageTitleVitals: "Parametri",
  pageDescription: "Come stanno corpo e mente oggi, e cosa farne.",
  logTodayCta: "Registra oggi",
  previousDay: "Giorno precedente",
  nextDay: "Giorno successivo",
  notYetAvailable: "Nessun dato",
  notMedicalAdvice: "Questo non è un consiglio medico.",
  ethosLine: "Creare senza limiti — e per farlo, prenditi cura di te prima.",
  readiness: {
    ringAriaLabel: "Punteggio di prontezza",
    excellent: "Eccellente",
    good: "Buono",
    fair: "Discreto",
    low: "Basso",
    narrativeTemplate: (score, highlight) => `Oggi: ${score}. ${highlight}`,
    narrativeGenericHigh: "tutto è al suo posto. Buona giornata per spingere.",
    narrativeGenericMid: "tutto stabile. Ritmo normale.",
    narrativeGenericLow: "il corpo chiede una giornata più leggera.",
    componentSleep: "Sonno",
    componentHrv: "VFC",
    componentRhr: "FC a riposo",
    componentEnergy: "Energia",
    componentStress: "Stress",
    componentActivity: "Attività",
  },
  pillars: {
    sleep: { label: "Qualità del sonno", quality: "Qualità", duration: "Durata", debt: (h) => `Debito di sonno: ${h}h` },
    energy: { label: "Energia", promptLog: "Tocca per valutare", hrvSuffix: "vs media" },
    mood: { label: "Umore", tapToLog: "Tocca per mappare" },
    stress: { label: "Stress", streak: (d) => `${d} giorni di stress elevato` },
    deltaVsAverage: "vs media 7g",
    tapToExpand: "Dettagli",
    logNow: "Registra",
  },
  moodQuadrants: { tense: "Teso", excited: "Eccitato", calm: "Calmo", low: "Basso" },
  vitals: {
    sectionTitle: "Parametri",
    steps: "Passi",
    rhr: "FC a riposo",
    hrv: "VFC",
    spo2: "SpO₂",
    activeEnergy: "Energia attiva",
    workouts: "Allenamenti",
    weight: "Peso",
    mindful: "Mindful",
    todayLabel: "Oggi",
    baselineLabel: "Baseline 14g",
    goalProgress: (pct) => `${pct}% dell'obiettivo`,
    addManual: "Aggiungi",
    expandDetail: "Dettagli",
  },
  hydration: {
    sectionTitle: "Idratazione & Nutrizione",
    waterLabel: "Acqua",
    waterAdd: (ml) => `+${ml}ml`,
    waterGoal: (ml) => `Obiettivo ${ml}ml`,
    caffeineLabel: "Caffeina",
    caffeineAdd: "Aggiungi",
    alcoholLabel: "Alcol",
    quickAddEspresso: "Espresso",
    quickAddCoffee: "Caffè",
    quickAddTea: "Tè",
  },
  triggers: {
    work: "Lavoro",
    coffee: "Caffè",
    exercise: "Esercizio",
    social: "Sociale",
    family: "Famiglia",
    poor_sleep: "Sonno scarso",
    weather: "Meteo",
    menstrual: "Mestruazioni",
    music_practice: "Pratica musicale",
    performance: "Performance",
    other: "Altro",
  },
  correlations: {
    sectionTitle: "Correlazioni",
    empty: "Registra 14 giorni per sbloccare le correlazioni.",
    template: (condition, metric, delta, direction) =>
      `Nei giorni in cui ${condition}, ${metric} è ${delta} ${direction === "higher" ? "più alto" : "più basso"}.`,
    sampleSize: (n, r) => `n=${n} · r=${r.toFixed(2)}`,
    viewScatter: "Mostra dispersione",
    conditions: {
      sleepLt7h: "dormi meno di 7 ore",
      stepsGt8k: "cammini più di 8.000 passi",
      highCaffeine: "assumi molta caffeina",
      workoutDay: "ti alleni",
      highStress: "hai stress elevato",
      lowHrv: "hai VFC bassa",
    },
    metrics: { energy: "energia soggettiva", mood: "umore", sleepQuality: "qualità del sonno", stress: "stress" },
  },
  trends: {
    sectionTitle: "Tendenze",
    range7d: "7 giorni",
    range30d: "30 giorni",
    range90d: "90 giorni",
    range1y: "1 anno",
    seriesSleep: "Sonno",
    seriesEnergy: "Energia",
    seriesMood: "Umore",
    seriesStress: "Stress",
    seriesHrv: "VFC",
    seriesSteps: "Passi",
    weekendLabel: "Weekend",
  },
  weeklyReport: {
    title: "Report settimanale",
    subtitle: (s, e) => `${s} – ${e}`,
    avgSleep: "Sonno medio",
    totalSteps: "Passi totali",
    workoutCount: "Allenamenti",
    highestMoodDay: "Umore più alto",
    lowestMoodDay: "Umore più basso",
    biggestWinLabel: "Vittoria più grande",
    biggestConcernLabel: "Da monitorare",
    exportPdf: "Esporta PDF",
  },
  goals: {
    sectionTitle: "Obiettivi",
    empty: "Nessun obiettivo.",
    addGoal: "Aggiungi obiettivo",
    streak: (d) => `${d} giorni di fila`,
    progressLabel: (c, t, u) => `${c} / ${t} ${u}`,
  },
  sync: {
    bannerAriaLabel: "Sincronizzazione Apple Salute",
    headingConnected: "Apple Salute",
    headingNotConnected: "Apple Salute",
    headingError: "Sincronizzazione fallita",
    headingUnsupported: "Apple Salute",
    syncingBody: "Sincronizzazione in corso…",
    syncedBody: (lastSyncedAt, newCount) => {
      if (!lastSyncedAt) return "Sincronizzato";
      const mins = Math.max(0, Math.round((Date.now() - Date.parse(lastSyncedAt)) / 60000));
      const ago = mins < 1 ? "adesso" : `${mins} min fa`;
      return `Ultima sincro: ${ago} · ${newCount} nuovi dati`;
    },
    notConnectedBody: "Connetti per importare automaticamente sonno, VFC e passi.",
    errorBody: "Errore. Riprova.",
    unsupportedBody: "La sincro è disponibile solo nell'app iOS. Sul web usa il collegamento Apple o l'inserimento manuale.",
    connect: "Connetti",
    syncNow: "Sincronizza",
    syncing: "Sincronizzazione",
    retry: "Riprova",
    dismiss: "Chiudi",
    downloadShortcut: "Ottieni collegamento",
    shortcutUrl: "https://www.icloud.com/shortcuts/",
  },
  logModal: {
    title: "Registra oggi",
    sleepSectionTitle: "Sonno",
    sleepDurationLabel: "Ore di sonno",
    sleepQualityLabel: "Qualità del sonno",
    energyLabel: "Livello di energia",
    moodSectionTitle: "Umore",
    moodValenceAxis: "Triste ↔ Felice",
    moodArousalAxis: "Calmo ↔ Energico",
    stressLabel: "Livello di stress",
    triggersLabel: "Fattori scatenanti",
    notesLabel: "Note",
    notesPlaceholder: "Com'è andata oggi?",
    saveAll: "Salva",
    autosaveHint: (s) => `Salvataggio automatico tra ${s}s`,
    loggedAgo: (m) => `Registrato ${m} min fa`,
  },
  empty: {
    noData: "Nessun dato",
    logFirstPrompt: "Registra il primo giorno per vedere tendenze e correlazioni.",
    logFirstCta: "Registra oggi",
  },
};

// es
const es: DeepPartial<HealthUiCopy> = {
  pageTitle: "Salud",
  pageTitleVitals: "Constantes",
  pageDescription: "Cómo están tu cuerpo y tu mente hoy, y qué hacer al respecto.",
  logTodayCta: "Registrar hoy",
  previousDay: "Día anterior",
  nextDay: "Día siguiente",
  notYetAvailable: "Sin datos",
  notMedicalAdvice: "Esto no es un consejo médico.",
  ethosLine: "Crear sin límites — y para lograrlo, cuídate primero.",
  readiness: {
    ringAriaLabel: "Puntuación de preparación",
    excellent: "Excelente",
    good: "Bueno",
    fair: "Regular",
    low: "Bajo",
    narrativeTemplate: (score, highlight) => `Hoy: ${score}. ${highlight}`,
    narrativeGenericHigh: "todo está alineado. Buen día para darlo todo.",
    narrativeGenericMid: "estable. Mantén el ritmo habitual.",
    narrativeGenericLow: "tu cuerpo pide un día más ligero.",
    componentSleep: "Sueño",
    componentHrv: "VFC",
    componentRhr: "FC en reposo",
    componentEnergy: "Energía",
    componentStress: "Estrés",
    componentActivity: "Actividad",
  },
  pillars: {
    sleep: { label: "Calidad del sueño", quality: "Calidad", duration: "Duración", debt: (h) => `Deuda de sueño: ${h}h` },
    energy: { label: "Energía", promptLog: "Toca para puntuar", hrvSuffix: "vs promedio" },
    mood: { label: "Ánimo", tapToLog: "Toca para ubicar" },
    stress: { label: "Estrés", streak: (d) => `${d} días de estrés alto` },
    deltaVsAverage: "vs prom. 7d",
    tapToExpand: "Detalle",
    logNow: "Registrar",
  },
  moodQuadrants: { tense: "Tenso", excited: "Emocionado", calm: "Calma", low: "Bajo" },
  vitals: {
    sectionTitle: "Constantes",
    steps: "Pasos",
    rhr: "FC en reposo",
    hrv: "VFC",
    spo2: "SpO₂",
    activeEnergy: "Energía activa",
    workouts: "Entrenamientos",
    weight: "Peso",
    mindful: "Mindful",
    todayLabel: "Hoy",
    baselineLabel: "Base 14d",
    goalProgress: (pct) => `${pct}% del objetivo`,
    addManual: "Añadir",
    expandDetail: "Detalle",
  },
  hydration: {
    sectionTitle: "Hidratación y nutrición",
    waterLabel: "Agua",
    waterAdd: (ml) => `+${ml}ml`,
    waterGoal: (ml) => `Objetivo ${ml}ml`,
    caffeineLabel: "Cafeína",
    caffeineAdd: "Añadir",
    alcoholLabel: "Alcohol",
    quickAddEspresso: "Espresso",
    quickAddCoffee: "Café",
    quickAddTea: "Té",
  },
  triggers: {
    work: "Trabajo",
    coffee: "Café",
    exercise: "Ejercicio",
    social: "Social",
    family: "Familia",
    poor_sleep: "Mal sueño",
    weather: "Clima",
    menstrual: "Menstrual",
    music_practice: "Práctica musical",
    performance: "Actuación",
    other: "Otro",
  },
  correlations: {
    sectionTitle: "Correlaciones",
    empty: "Registra 14 días para desbloquear las correlaciones.",
    template: (condition, metric, delta, direction) =>
      `Los días que ${condition}, tu ${metric} está ${delta} ${direction === "higher" ? "más alto" : "más bajo"}.`,
    sampleSize: (n, r) => `n=${n} · r=${r.toFixed(2)}`,
    viewScatter: "Ver dispersión",
    conditions: {
      sleepLt7h: "duermes menos de 7h",
      stepsGt8k: "caminas más de 8.000 pasos",
      highCaffeine: "consumes mucha cafeína",
      workoutDay: "entrenas",
      highStress: "tienes estrés alto",
      lowHrv: "tienes VFC baja",
    },
    metrics: { energy: "energía subjetiva", mood: "ánimo", sleepQuality: "calidad del sueño", stress: "estrés" },
  },
  trends: {
    sectionTitle: "Tendencias",
    range7d: "7 días",
    range30d: "30 días",
    range90d: "90 días",
    range1y: "1 año",
    seriesSleep: "Sueño",
    seriesEnergy: "Energía",
    seriesMood: "Ánimo",
    seriesStress: "Estrés",
    seriesHrv: "VFC",
    seriesSteps: "Pasos",
    weekendLabel: "Fin de semana",
  },
  weeklyReport: {
    title: "Reporte semanal",
    subtitle: (s, e) => `${s} – ${e}`,
    avgSleep: "Sueño promedio",
    totalSteps: "Pasos totales",
    workoutCount: "Entrenamientos",
    highestMoodDay: "Mejor día de ánimo",
    lowestMoodDay: "Peor día de ánimo",
    biggestWinLabel: "Mayor logro",
    biggestConcernLabel: "A vigilar",
    exportPdf: "Exportar PDF",
  },
  goals: {
    sectionTitle: "Objetivos",
    empty: "Sin objetivos.",
    addGoal: "Añadir objetivo",
    streak: (d) => `${d} días seguidos`,
    progressLabel: (c, t, u) => `${c} / ${t} ${u}`,
  },
  sync: {
    bannerAriaLabel: "Sincronización con Apple Salud",
    headingConnected: "Apple Salud",
    headingNotConnected: "Apple Salud",
    headingError: "Error de sincronización",
    headingUnsupported: "Apple Salud",
    syncingBody: "Sincronizando datos…",
    syncedBody: (lastSyncedAt, newCount) => {
      if (!lastSyncedAt) return "Sincronizado";
      const mins = Math.max(0, Math.round((Date.now() - Date.parse(lastSyncedAt)) / 60000));
      const ago = mins < 1 ? "ahora mismo" : `hace ${mins} min`;
      return `Última sincro: ${ago} · ${newCount} nuevos datos`;
    },
    notConnectedBody: "Conecta para importar sueño, VFC y pasos automáticamente.",
    errorBody: "Ha ocurrido un error. Inténtalo otra vez.",
    unsupportedBody: "La sincronización solo funciona en la app de iOS. En web, usa el atajo de Apple o entrada manual.",
    connect: "Conectar",
    syncNow: "Sincronizar",
    syncing: "Sincronizando",
    retry: "Reintentar",
    dismiss: "Cerrar",
    downloadShortcut: "Obtener atajo",
    shortcutUrl: "https://www.icloud.com/shortcuts/",
  },
  logModal: {
    title: "Registrar hoy",
    sleepSectionTitle: "Sueño",
    sleepDurationLabel: "Horas de sueño",
    sleepQualityLabel: "Calidad del sueño",
    energyLabel: "Nivel de energía",
    moodSectionTitle: "Ánimo",
    moodValenceAxis: "Triste ↔ Feliz",
    moodArousalAxis: "Calma ↔ Energizado",
    stressLabel: "Nivel de estrés",
    triggersLabel: "Desencadenantes",
    notesLabel: "Notas",
    notesPlaceholder: "¿Qué pasó hoy?",
    saveAll: "Guardar",
    autosaveHint: (s) => `Autoguardado en ${s}s`,
    loggedAgo: (m) => `Registrado hace ${m} min`,
  },
  empty: {
    noData: "Sin datos",
    logFirstPrompt: "Registra tu primer día para ver tendencias y correlaciones.",
    logFirstCta: "Registrar hoy",
  },
};

// vi
const vi: DeepPartial<HealthUiCopy> = {
  pageTitle: "Sức khỏe",
  pageTitleVitals: "Chỉ số",
  pageDescription: "Cơ thể và tinh thần hôm nay thế nào, và bạn nên làm gì.",
  logTodayCta: "Ghi nhận hôm nay",
  previousDay: "Ngày trước",
  nextDay: "Ngày sau",
  notYetAvailable: "Chưa có dữ liệu",
  notMedicalAdvice: "Đây không phải lời khuyên y tế.",
  ethosLine: "Sáng tạo không giới hạn — và để làm được, hãy chăm sóc bản thân trước.",
  readiness: {
    ringAriaLabel: "Điểm sẵn sàng",
    excellent: "Xuất sắc",
    good: "Tốt",
    fair: "Trung bình",
    low: "Thấp",
    narrativeTemplate: (score, highlight) => `Hôm nay: ${score}. ${highlight}`,
    narrativeGenericHigh: "mọi thứ đã sẵn sàng. Hôm nay nên dốc sức.",
    narrativeGenericMid: "ổn định. Giữ nhịp độ bình thường.",
    narrativeGenericLow: "cơ thể cần một ngày nhẹ nhàng hơn.",
    componentSleep: "Giấc ngủ",
    componentHrv: "HRV",
    componentRhr: "Nhịp tim nghỉ",
    componentEnergy: "Năng lượng",
    componentStress: "Căng thẳng",
    componentActivity: "Hoạt động",
  },
  pillars: {
    sleep: { label: "Chất lượng giấc ngủ", quality: "Chất lượng", duration: "Thời lượng", debt: (h) => `Nợ ngủ ${h}h` },
    energy: { label: "Năng lượng", promptLog: "Chạm để đánh giá", hrvSuffix: "so với TB" },
    mood: { label: "Tâm trạng", tapToLog: "Chạm để định vị" },
    stress: { label: "Căng thẳng", streak: (d) => `${d} ngày căng thẳng cao` },
    deltaVsAverage: "so với TB 7 ngày",
    tapToExpand: "Chi tiết",
    logNow: "Ghi nhận",
  },
  moodQuadrants: { tense: "Căng thẳng", excited: "Phấn khích", calm: "Bình an", low: "Trầm" },
  vitals: {
    sectionTitle: "Chỉ số",
    steps: "Số bước",
    rhr: "Nhịp tim nghỉ",
    hrv: "HRV",
    spo2: "SpO₂",
    activeEnergy: "Năng lượng",
    workouts: "Tập luyện",
    weight: "Cân nặng",
    mindful: "Tỉnh thức",
    todayLabel: "Hôm nay",
    baselineLabel: "Mốc 14 ngày",
    goalProgress: (pct) => `${pct}% mục tiêu`,
    addManual: "Thêm",
    expandDetail: "Chi tiết",
  },
  hydration: {
    sectionTitle: "Nước & Dinh dưỡng",
    waterLabel: "Nước",
    waterAdd: (ml) => `+${ml}ml`,
    waterGoal: (ml) => `Mục tiêu ${ml}ml`,
    caffeineLabel: "Caffeine",
    caffeineAdd: "Thêm",
    alcoholLabel: "Rượu",
    quickAddEspresso: "Espresso",
    quickAddCoffee: "Cà phê",
    quickAddTea: "Trà",
  },
  triggers: {
    work: "Công việc",
    coffee: "Cà phê",
    exercise: "Tập luyện",
    social: "Xã giao",
    family: "Gia đình",
    poor_sleep: "Ngủ không ngon",
    weather: "Thời tiết",
    menstrual: "Kinh nguyệt",
    music_practice: "Tập nhạc",
    performance: "Biểu diễn",
    other: "Khác",
  },
  correlations: {
    sectionTitle: "Tương quan",
    empty: "Ghi nhận 14 ngày để mở khóa tương quan.",
    template: (condition, metric, delta, direction) =>
      `Những ngày bạn ${condition}, ${metric} ${direction === "higher" ? "cao" : "thấp"} hơn ${delta}.`,
    sampleSize: (n, r) => `n=${n} · r=${r.toFixed(2)}`,
    viewScatter: "Xem biểu đồ phân tán",
    conditions: {
      sleepLt7h: "ngủ dưới 7 tiếng",
      stepsGt8k: "đi hơn 8.000 bước",
      highCaffeine: "nạp nhiều caffeine",
      workoutDay: "tập luyện",
      highStress: "căng thẳng cao",
      lowHrv: "HRV thấp",
    },
    metrics: { energy: "năng lượng chủ quan", mood: "tâm trạng", sleepQuality: "chất lượng giấc ngủ", stress: "căng thẳng" },
  },
  trends: {
    sectionTitle: "Xu hướng",
    range7d: "7 ngày",
    range30d: "30 ngày",
    range90d: "90 ngày",
    range1y: "1 năm",
    seriesSleep: "Giấc ngủ",
    seriesEnergy: "Năng lượng",
    seriesMood: "Tâm trạng",
    seriesStress: "Căng thẳng",
    seriesHrv: "HRV",
    seriesSteps: "Số bước",
    weekendLabel: "Cuối tuần",
  },
  weeklyReport: {
    title: "Báo cáo tuần",
    subtitle: (s, e) => `${s} – ${e}`,
    avgSleep: "Ngủ TB",
    totalSteps: "Tổng số bước",
    workoutCount: "Lần tập",
    highestMoodDay: "Ngày tâm trạng cao nhất",
    lowestMoodDay: "Ngày tâm trạng thấp nhất",
    biggestWinLabel: "Thành tích lớn",
    biggestConcernLabel: "Cần lưu ý",
    exportPdf: "Xuất PDF",
  },
  goals: {
    sectionTitle: "Mục tiêu",
    empty: "Chưa có mục tiêu.",
    addGoal: "Thêm mục tiêu",
    streak: (d) => `${d} ngày liên tiếp`,
    progressLabel: (c, t, u) => `${c} / ${t} ${u}`,
  },
  sync: {
    bannerAriaLabel: "Đồng bộ Apple Health",
    headingConnected: "Apple Health",
    headingNotConnected: "Apple Health",
    headingError: "Đồng bộ thất bại",
    headingUnsupported: "Apple Health",
    syncingBody: "Đang đồng bộ dữ liệu mới…",
    syncedBody: (lastSyncedAt, newCount) => {
      if (!lastSyncedAt) return "Đã đồng bộ";
      const mins = Math.max(0, Math.round((Date.now() - Date.parse(lastSyncedAt)) / 60000));
      const ago = mins < 1 ? "vừa xong" : `${mins} phút trước`;
      return `Lần cuối: ${ago} · ${newCount} mục mới`;
    },
    notConnectedBody: "Kết nối để tự động đồng bộ giấc ngủ, HRV, số bước.",
    errorBody: "Đã xảy ra lỗi. Hãy thử lại.",
    unsupportedBody: "Đồng bộ chỉ hoạt động trong ứng dụng iOS. Trên web, hãy dùng Shortcut hoặc nhập tay.",
    connect: "Kết nối",
    syncNow: "Đồng bộ ngay",
    syncing: "Đang đồng bộ",
    retry: "Thử lại",
    dismiss: "Đóng",
    downloadShortcut: "Tải Shortcut",
    shortcutUrl: "https://www.icloud.com/shortcuts/",
  },
  logModal: {
    title: "Ghi nhận hôm nay",
    sleepSectionTitle: "Giấc ngủ",
    sleepDurationLabel: "Thời lượng ngủ",
    sleepQualityLabel: "Chất lượng giấc ngủ",
    energyLabel: "Mức năng lượng",
    moodSectionTitle: "Tâm trạng",
    moodValenceAxis: "Buồn ↔ Vui",
    moodArousalAxis: "Bình an ↔ Hăng hái",
    stressLabel: "Mức căng thẳng",
    triggersLabel: "Yếu tố tác động",
    notesLabel: "Ghi chú",
    notesPlaceholder: "Hôm nay có gì xảy ra?",
    saveAll: "Lưu",
    autosaveHint: (s) => `Tự lưu sau ${s}s`,
    loggedAgo: (m) => `Đã ghi nhận ${m} phút trước`,
  },
  empty: {
    noData: "Chưa có dữ liệu",
    logFirstPrompt: "Ghi nhận ngày đầu tiên để thấy xu hướng và tương quan.",
    logFirstCta: "Ghi nhận hôm nay",
  },
};

const overrides: Partial<Record<AppLocale, DeepPartial<HealthUiCopy>>> = {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
};

const localizedCopy = createLocaleCopyMap<HealthUiCopy>(en, overrides);

export function getHealthUiCopy(locale: AppLocale): HealthUiCopy {
  return localizedCopy[locale] ?? localizedCopy[DEFAULT_LOCALE];
}
