import { DEFAULT_LOCALE, type AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";
import type {
  AspectRatio,
  IllustrationStylePreset,
  Need,
  Quadrant,
  Target,
  Topic,
  TTSVoice,
} from "@/lib/journal/constants";

// ============================================================
// Type
// ============================================================

export type JournalUiCopy = {
  pageTitle: string;
  pageSubtitle: string;
  navGrateful: string;

  // Form card
  newEntryTitle: string;
  newEntryDescription: string;
  labelDate: string;
  labelTopic: string;
  topicPlaceholder: string;
  labelEmotionPicker: string;
  labelPrimaryEmotion: string;
  primaryEmotionPlaceholder: string;
  labelSecondaryEmotion: string;
  labelTarget: string;
  targetPlaceholder: string;
  labelIntensity: string;
  intensityBadge: (n: number) => string;

  labelBullets: string;
  addBulletButton: string;
  removeBulletAria: string;

  labelSelfStory: string;

  labelNeedsExactlyOne: string;
  labelNeedsOneToTwo: string;

  labelNextTinyStep: string;
  nextTinyStepHint: string;
  charCounter: (n: number, max: number) => string;
  nextTinyStepOverLimit: string;

  labelAppreciation: string;
  appreciationPlaceholder: string;

  saveButton: string;
  savingButton: string;
  savingSummaryButton: string;
  savedButton: string;
  startNewEntryButton: string;

  requiredMark: string;
  optionalLabel: string;

  // Collapsibles
  contextFactorsTitle: string;
  metadataTitle: string;
  metadataComingSoon: string;

  // Past AI Summary
  pastSummaryTitle: string;
  pastSummaryEmpty: string;
  pastSummaryFailed: string;
  pastSummaryJournalEntry: string;
  pastSummaryEmotionalRead: string;
  pastSummarySuggestions: string;
  pastSummaryCoping: string;
  pastSummaryPractical: string;
  pastSummaryReframe: string;
  pastSummaryAppreciation: string;

  // AI Add-ons
  addonsTitle: string;
  addonsDescription: string;
  illustrationTitle: string;
  illustrationEmpty: string;
  illustrationGenerate: string;
  illustrationGenerating: string;
  illustrationRegenerate: string;
  illustrationRegenerating: string;
  illustrationDownload: string;
  illustrationSave: string;
  audioTitle: string;
  audioEmpty: string;
  audioGenerate: string;
  audioGenerating: string;
  audioRegenerate: string;
  audioCopyTranscript: string;
  audioSave: string;
  audioTranscriptLabel: string;
  addonsSaveFirstHint: string;

  // Recent entries
  recentEntriesTitle: string;
  recentEntriesDescription: string;
  recentEntriesEmpty: string;
  recentEntriesSearchPlaceholder: string;

  // Mood trends
  trendsTitle: string;
  trendsDescription: string;
  trendsRange7: string;
  trendsRange14: string;
  trendsIntensityHeading: string;
  trendsQuadrantHeading: string;
  trendsEmpty: string;

  // Unsaved guard
  unsavedTitle: string;
  unsavedDescription: string;
  unsavedStay: string;
  unsavedLeave: string;

  // Detail modal
  detailTitle: string;
  detailSectionTopic: string;
  detailSectionEmotions: string;
  detailSectionWhatHappened: string;
  detailSectionSelfStory: string;
  detailSectionNeeds: string;
  detailSectionNextTinyStep: string;
  detailSectionAISummary: string;

  // Toasts
  toastSaveSuccess: string;
  toastSaveFailed: string;
  toastIllustrationSuccess: string;
  toastIllustrationFailed: string;
  toastAudioSuccess: string;
  toastAudioFailed: string;
  toastImageSaved: string;
  toastAudioSaved: string;
  toastImageDownloaded: string;
  toastTranscriptCopied: string;

  // Quadrant subtitles
  quadrantSubtitle: Record<Quadrant, string>;

  // Quadrant short names
  quadrantName: Record<Quadrant, string>;

  // Topic display names
  topicName: Record<Topic, string>;

  // Topic-specific labels (bulletLabel, selfStoryLabel, extras.*)
  topicCopy: {
    "Work/Study": {
      bulletLabel: string;
      selfStoryLabel: string;
      win: string;
      friction: string;
      focusBlock: string;
    };
    "People/Relationships": {
      bulletLabel: string;
      selfStoryLabel: string;
      person: string;
      boundary: string;
    };
    "Body/Health": {
      bulletLabel: string;
      selfStoryLabel: string;
      sleep: string;
      food: string;
      movement: string;
      symptom: string;
    };
    "Stress Event": {
      bulletLabel: string;
      selfStoryLabel: string;
      likelyOutcome: string;
      worstCase: string;
      controlToday: string;
    };
    "Achievement/Confidence": {
      bulletLabel: string;
      selfStoryLabel: string;
      skillShown: string;
      repeatTomorrow: string;
    };
    "Creativity/Music": {
      bulletLabel: string;
      selfStoryLabel: string;
      bottleneck: string;
      microGoal: string;
    };
    "Big Decisions": {
      bulletLabel: string;
      selfStoryLabel: string;
      optionA: string;
      optionB: string;
      costA: string;
      costB: string;
      topValues: string;
      nextExperiment: string;
    };
    "Quick Reset": {
      bulletLabel: string;
      selfStoryLabel: string;
    };
  };

  // Target display names
  targetName: Record<Target, string>;

  // Need display names
  needName: Record<Need, string>;

  // Style preset display names
  stylePresetName: Record<IllustrationStylePreset, string>;
  aspectRatioName: Record<AspectRatio, string>;
  ttsVoiceName: Record<TTSVoice, string>;

  // Context Factors labels
  contextFactors: {
    sleepQuality: string;
    physicalState: string;
    socialLoad: string;
    workLoad: string;
    environment: string;
    substances: string;
    note: string;
  };
};

// ============================================================
// English (canonical source)
// ============================================================

const en: JournalUiCopy = {
  pageTitle: "Journal",
  pageSubtitle: "Structured emotional processing",
  navGrateful: "My Grateful Things",

  newEntryTitle: "New Entry",
  newEntryDescription: "Capture your emotional experience",
  labelDate: "Date",
  labelTopic: "Topic",
  topicPlaceholder: "Select topic",
  labelEmotionPicker: "Emotion Picker",
  labelPrimaryEmotion: "Primary Emotion",
  primaryEmotionPlaceholder: "Select emotion",
  labelSecondaryEmotion: "Secondary Emotion (optional)",
  labelTarget: "Target (optional)",
  targetPlaceholder: "Select target",
  labelIntensity: "Intensity",
  intensityBadge: (n) => `${n}/10`,

  labelBullets: "What happened (facts only)",
  addBulletButton: "Add bullet",
  removeBulletAria: "Remove bullet",

  labelSelfStory: "Self Story",

  labelNeedsExactlyOne: "Needs (choose exactly 1)",
  labelNeedsOneToTwo: "Needs (choose 1-2)",

  labelNextTinyStep: "Next Tiny Step",
  nextTinyStepHint: "<10 minutes",
  charCounter: (n, max) => `${n}/${max}`,
  nextTinyStepOverLimit: "Must be 140 characters or less",

  labelAppreciation: "Appreciation (optional)",
  appreciationPlaceholder: "What are you grateful for?",

  saveButton: "Save Entry",
  savingButton: "Saving...",
  savingSummaryButton: "Generating summary...",
  savedButton: "Saved ✓",
  startNewEntryButton: "Start new entry",

  requiredMark: "*",
  optionalLabel: "(optional)",

  contextFactorsTitle: "Context Factors",
  metadataTitle: "Linked Projects & Tasks",
  metadataComingSoon: "Linking comes online once projects & tasks integrations land.",

  pastSummaryTitle: "Past AI Summary",
  pastSummaryEmpty: "Generate summary by saving your entry",
  pastSummaryFailed: "Entry saved, but the AI summary could not be generated.",
  pastSummaryJournalEntry: "Journal Entry",
  pastSummaryEmotionalRead: "Emotional Read",
  pastSummarySuggestions: "Suggestions",
  pastSummaryCoping: "Coping Strategy:",
  pastSummaryPractical: "Practical Action:",
  pastSummaryReframe: "Reframe Question:",
  pastSummaryAppreciation: "Earned Appreciation",

  addonsTitle: "AI Add-ons",
  addonsDescription: "Generate visual and audio enhancements using your AI summary",
  illustrationTitle: "Daily Illustration",
  illustrationEmpty: "Generate a symbolic illustration representing your journal entry",
  illustrationGenerate: "Generate Illustration",
  illustrationGenerating: "Generating illustration...",
  illustrationRegenerate: "Regenerate",
  illustrationRegenerating: "Regenerating...",
  illustrationDownload: "Download",
  illustrationSave: "Save Image",
  audioTitle: "Audio Comment",
  audioEmpty: "Generate a 2-minute reflective audio companion for your entry",
  audioGenerate: "Generate Audio",
  audioGenerating: "Generating audio...",
  audioRegenerate: "Regenerate",
  audioCopyTranscript: "Copy Transcript",
  audioSave: "Save Audio",
  audioTranscriptLabel: "Transcript",
  addonsSaveFirstHint: "Save your entry first to generate media",

  recentEntriesTitle: "Recent Entries",
  recentEntriesDescription: "Your last 10 journal entries",
  recentEntriesEmpty: "No entries yet — fill in the form above and hit Save.",
  recentEntriesSearchPlaceholder: "Search by content…",

  trendsTitle: "Weekly Mood Trends",
  trendsDescription: "Your emotional patterns over time",
  trendsRange7: "Last 7 days",
  trendsRange14: "Last 14 days",
  trendsIntensityHeading: "Intensity Over Time",
  trendsQuadrantHeading: "Quadrant Distribution",
  trendsEmpty: "Not enough data yet. Keep journaling!",

  unsavedTitle: "You have unsaved changes",
  unsavedDescription: "Leave without saving? Your current entry will be lost.",
  unsavedStay: "Stay",
  unsavedLeave: "Leave",

  detailTitle: "Journal Entry",
  detailSectionTopic: "Topic",
  detailSectionEmotions: "Emotions",
  detailSectionWhatHappened: "What Happened",
  detailSectionSelfStory: "Self Story",
  detailSectionNeeds: "Needs",
  detailSectionNextTinyStep: "Next Tiny Step",
  detailSectionAISummary: "AI Summary",

  toastSaveSuccess: "Journal entry saved with AI summary!",
  toastSaveFailed: "Failed to save entry",
  toastIllustrationSuccess: "Illustration generated!",
  toastIllustrationFailed: "Failed to generate illustration",
  toastAudioSuccess: "Audio comment generated!",
  toastAudioFailed: "Failed to generate audio comment",
  toastImageSaved: "Image saved to journal entry!",
  toastAudioSaved: "Audio saved to journal entry!",
  toastImageDownloaded: "Image downloaded!",
  toastTranscriptCopied: "Transcript copied to clipboard!",

  quadrantSubtitle: {
    RED: "High energy unpleasant",
    YELLOW: "High energy pleasant",
    BLUE: "Low energy unpleasant",
    GREEN: "Low energy pleasant",
  },
  quadrantName: {
    RED: "Red",
    YELLOW: "Yellow",
    BLUE: "Blue",
    GREEN: "Green",
  },

  topicName: {
    "Work/Study": "Work / Study",
    "People/Relationships": "People / Relationships",
    "Body/Health": "Body / Health",
    "Stress Event": "Stress Event",
    "Achievement/Confidence": "Achievement / Confidence",
    "Creativity/Music": "Creativity / Music",
    "Big Decisions": "Big Decisions",
    "Quick Reset": "Quick Reset",
  },

  topicCopy: {
    "Work/Study": {
      bulletLabel: "What did you work on today? (facts only)",
      selfStoryLabel:
        "What story are you telling yourself about your performance or progress?",
      win: "One win",
      friction: "One friction",
      focusBlock: "What would make tomorrow easier?",
    },
    "People/Relationships": {
      bulletLabel: "What happened (facts only)?",
      selfStoryLabel: "What meaning are you attaching to this?",
      person: "Who is this about? (optional name/role)",
      boundary: "Any boundary you want to set? (optional)",
    },
    "Body/Health": {
      bulletLabel: "What did you notice in your body today?",
      selfStoryLabel: "What are you worried this might mean? (optional)",
      sleep: "Sleep (0-10)",
      food: "Food (0-10)",
      movement: "Movement (0-10)",
      symptom: "Main symptom/sensation",
    },
    "Stress Event": {
      bulletLabel: "Trigger (facts only)",
      selfStoryLabel: "Threat story your brain is telling",
      likelyOutcome: "Most likely outcome",
      worstCase: "Worst case fear",
      controlToday: "What's in your control today?",
    },
    "Achievement/Confidence": {
      bulletLabel: "What did you do well today?",
      selfStoryLabel: "What does this show about your skills/values?",
      skillShown: "Skill/value you showed",
      repeatTomorrow: "1% repeat tomorrow",
    },
    "Creativity/Music": {
      bulletLabel: "What did you practice/create today?",
      selfStoryLabel: "What's the bottleneck or frustration? (optional)",
      bottleneck: "Main bottleneck",
      microGoal: "Micro-goal for next session",
    },
    "Big Decisions": {
      bulletLabel: "Decision + options (bullets)",
      selfStoryLabel: "What fear or belief is driving this?",
      optionA: "Option A",
      optionB: "Option B",
      costA: "Cost of A",
      costB: "Cost of B",
      topValues: "Top 1-3 values at stake",
      nextExperiment: "Next experiment (reversible step)",
    },
    "Quick Reset": {
      bulletLabel: "What happened? (1-2 bullets)",
      selfStoryLabel: "What meaning are you attaching? (optional)",
    },
  },

  targetName: {
    Myself: "Myself",
    Someone: "Someone",
    Situation: "Situation",
    Future: "Future",
    Body: "Body",
  },

  needName: {
    Rest: "Rest",
    Structure: "Structure",
    Reassurance: "Reassurance",
    Progress: "Progress",
    Connection: "Connection",
    Respect: "Respect",
    Autonomy: "Autonomy",
    Clarity: "Clarity",
    Fun: "Fun",
    Safety: "Safety",
  },

  stylePresetName: {
    "Symbolic cinematic illustration": "Symbolic cinematic",
    "Soft watercolor": "Soft watercolor",
    "Minimalist editorial": "Minimalist editorial",
    "Anime-inspired": "Anime-inspired",
    Photoreal: "Photoreal",
  },
  aspectRatioName: {
    "1:1": "Square (1:1)",
    "16:9": "Landscape (16:9)",
    "9:16": "Portrait (9:16)",
    "4:5": "Tall (4:5)",
  },
  ttsVoiceName: {
    Kore: "Kore (warm)",
    Charon: "Charon (deep)",
    Puck: "Puck (bright)",
    Aoede: "Aoede (gentle)",
    Zephyr: "Zephyr (airy)",
    Fenrir: "Fenrir (grounded)",
  },

  contextFactors: {
    sleepQuality: "Sleep quality (0-10)",
    physicalState: "Physical state",
    socialLoad: "Social load (0-10)",
    workLoad: "Work load (0-10)",
    environment: "Environment",
    substances: "Substances",
    note: "Note",
  },
};

// ============================================================
// Locale overrides
// English (the canonical `en` above) is reviewed manually. Traditional
// Chinese (zh-TW) is reviewed manually. The remaining seven locales are
// translated against the canonical English keys; missing keys fall back
// via createLocaleCopyMap. The shape repeats across locales so the file
// stays scannable: high-visibility chrome first, then form labels, then
// data dictionaries (quadrants / topics / targets / needs).
// ============================================================

const zhTW: DeepPartial<JournalUiCopy> = {
  pageTitle: "日記",
  pageSubtitle: "結構化情緒處理",
  navGrateful: "我的感恩日記",
  newEntryTitle: "新增日誌",
  newEntryDescription: "記錄你的情緒體驗",
  labelDate: "日期",
  labelTopic: "主題",
  topicPlaceholder: "選擇主題",
  labelEmotionPicker: "情緒選擇器",
  labelPrimaryEmotion: "主要情緒",
  primaryEmotionPlaceholder: "選擇情緒",
  labelSecondaryEmotion: "次要情緒（可選）",
  labelTarget: "對象（可選）",
  targetPlaceholder: "選擇對象",
  labelIntensity: "強度",
  labelBullets: "發生了什麼（僅事實）",
  addBulletButton: "新增一項",
  removeBulletAria: "移除此項",
  labelSelfStory: "自我敘事",
  labelNeedsExactlyOne: "需求（恰好選 1 項）",
  labelNeedsOneToTwo: "需求（選 1-2 項）",
  labelNextTinyStep: "下一個小步驟",
  nextTinyStepHint: "<10 分鐘",
  nextTinyStepOverLimit: "字數不能超過 140",
  labelAppreciation: "感激（可選）",
  appreciationPlaceholder: "你今天感激什麼？",
  saveButton: "儲存日誌",
  savingButton: "儲存中…",
  savingSummaryButton: "正在產生摘要…",
  savedButton: "已儲存 ✓",
  startNewEntryButton: "開始新日誌",
  optionalLabel: "（可選）",
  contextFactorsTitle: "情境因素",
  metadataTitle: "關聯的專案與任務",
  metadataComingSoon: "等專案與任務整合上線後，連結功能將可使用。",
  pastSummaryTitle: "過往 AI 摘要",
  pastSummaryEmpty: "儲存日誌後將自動產生摘要",
  pastSummaryFailed: "日誌已儲存，但未能產生 AI 摘要。",
  pastSummaryJournalEntry: "日誌敘述",
  pastSummaryEmotionalRead: "情緒解讀",
  pastSummarySuggestions: "建議",
  pastSummaryCoping: "因應策略：",
  pastSummaryPractical: "具體行動：",
  pastSummaryReframe: "重構問題：",
  pastSummaryAppreciation: "值得肯定之處",
  addonsTitle: "AI 增強",
  addonsDescription: "根據 AI 摘要產生視覺與語音增強內容",
  illustrationTitle: "每日插畫",
  illustrationEmpty: "產生一張代表本則日誌的象徵插畫",
  illustrationGenerate: "產生插畫",
  illustrationGenerating: "正在產生插畫…",
  illustrationRegenerate: "重新產生",
  illustrationRegenerating: "重新產生中…",
  illustrationDownload: "下載",
  illustrationSave: "儲存圖片",
  audioTitle: "語音陪伴",
  audioEmpty: "產生一段約 2 分鐘的反思語音陪伴",
  audioGenerate: "產生語音",
  audioGenerating: "正在產生語音…",
  audioRegenerate: "重新產生",
  audioCopyTranscript: "複製逐字稿",
  audioSave: "儲存語音",
  audioTranscriptLabel: "逐字稿",
  addonsSaveFirstHint: "請先儲存日誌再產生媒體",
  recentEntriesTitle: "最近的日誌",
  recentEntriesDescription: "你最近的 10 則日誌",
  recentEntriesEmpty: "尚無日誌 — 請在上方填寫並按下「儲存」。",
  recentEntriesSearchPlaceholder: "依內容搜尋…",
  trendsTitle: "每週情緒趨勢",
  trendsDescription: "你的情緒變化模式",
  trendsRange7: "過去 7 天",
  trendsRange14: "過去 14 天",
  trendsIntensityHeading: "強度變化",
  trendsQuadrantHeading: "象限分布",
  trendsEmpty: "資料尚不足，繼續寫日誌吧！",
  unsavedTitle: "尚有未儲存的變更",
  unsavedDescription: "離開將遺失目前內容，確定嗎？",
  unsavedStay: "留下",
  unsavedLeave: "離開",
  detailTitle: "日誌內容",
  detailSectionTopic: "主題",
  detailSectionEmotions: "情緒",
  detailSectionWhatHappened: "發生了什麼",
  detailSectionSelfStory: "自我敘事",
  detailSectionNeeds: "需求",
  detailSectionNextTinyStep: "下一個小步驟",
  detailSectionAISummary: "AI 摘要",
  toastSaveSuccess: "日誌已儲存，並產生 AI 摘要！",
  toastSaveFailed: "儲存失敗",
  toastIllustrationSuccess: "插畫已產生！",
  toastIllustrationFailed: "產生插畫失敗",
  toastAudioSuccess: "語音陪伴已產生！",
  toastAudioFailed: "產生語音失敗",
  toastImageSaved: "圖片已儲存至日誌！",
  toastAudioSaved: "語音已儲存至日誌！",
  toastImageDownloaded: "圖片已下載！",
  toastTranscriptCopied: "逐字稿已複製到剪貼簿！",
  quadrantSubtitle: {
    RED: "高能量不愉悅",
    YELLOW: "高能量愉悅",
    BLUE: "低能量不愉悅",
    GREEN: "低能量愉悅",
  },
  quadrantName: { RED: "紅", YELLOW: "黃", BLUE: "藍", GREEN: "綠" },
  topicName: {
    "Work/Study": "工作 / 學業",
    "People/Relationships": "人際 / 關係",
    "Body/Health": "身體 / 健康",
    "Stress Event": "壓力事件",
    "Achievement/Confidence": "成就 / 自信",
    "Creativity/Music": "創作 / 音樂",
    "Big Decisions": "重大決定",
    "Quick Reset": "快速重整",
  },
  targetName: {
    Myself: "自己",
    Someone: "某人",
    Situation: "情境",
    Future: "未來",
    Body: "身體",
  },
  needName: {
    Rest: "休息",
    Structure: "結構",
    Reassurance: "安心",
    Progress: "進展",
    Connection: "連結",
    Respect: "尊重",
    Autonomy: "自主",
    Clarity: "清晰",
    Fun: "樂趣",
    Safety: "安全",
  },
  contextFactors: {
    sleepQuality: "睡眠品質（0-10）",
    physicalState: "身體狀態",
    socialLoad: "社交負荷（0-10）",
    workLoad: "工作負荷（0-10）",
    environment: "環境",
    substances: "飲食 / 物質",
    note: "備註",
  },
};

const zhCN: DeepPartial<JournalUiCopy> = {
  pageTitle: "日记",
  pageSubtitle: "结构化情绪处理",
  navGrateful: "我的感恩日记",
  newEntryTitle: "新增日志",
  newEntryDescription: "记录你的情绪体验",
  labelDate: "日期",
  labelTopic: "主题",
  topicPlaceholder: "选择主题",
  labelEmotionPicker: "情绪选择器",
  labelPrimaryEmotion: "主要情绪",
  primaryEmotionPlaceholder: "选择情绪",
  labelSecondaryEmotion: "次要情绪（可选）",
  labelTarget: "对象（可选）",
  targetPlaceholder: "选择对象",
  labelIntensity: "强度",
  labelBullets: "发生了什么（仅事实）",
  addBulletButton: "新增一项",
  removeBulletAria: "移除此项",
  labelSelfStory: "自我叙事",
  labelNeedsExactlyOne: "需求（恰好选 1 项）",
  labelNeedsOneToTwo: "需求（选 1-2 项）",
  labelNextTinyStep: "下一个小步骤",
  nextTinyStepHint: "<10 分钟",
  nextTinyStepOverLimit: "字数不能超过 140",
  labelAppreciation: "感激（可选）",
  appreciationPlaceholder: "你今天感激什么？",
  saveButton: "保存日志",
  savingButton: "保存中…",
  savingSummaryButton: "正在生成摘要…",
  savedButton: "已保存 ✓",
  startNewEntryButton: "开始新日志",
  optionalLabel: "（可选）",
  contextFactorsTitle: "情境因素",
  metadataTitle: "关联的项目与任务",
  metadataComingSoon: "等项目与任务整合上线后，连接功能将可用。",
  pastSummaryTitle: "历史 AI 摘要",
  pastSummaryEmpty: "保存日志后将自动生成摘要",
  pastSummaryFailed: "日志已保存，但无法生成 AI 摘要。",
  pastSummaryJournalEntry: "日志叙述",
  pastSummaryEmotionalRead: "情绪解读",
  pastSummarySuggestions: "建议",
  pastSummaryCoping: "应对策略：",
  pastSummaryPractical: "具体行动：",
  pastSummaryReframe: "重构问题：",
  pastSummaryAppreciation: "值得肯定之处",
  addonsTitle: "AI 增强",
  addonsDescription: "基于 AI 摘要生成视觉与语音增强内容",
  illustrationTitle: "每日插画",
  illustrationEmpty: "生成一张代表本则日志的象征插画",
  illustrationGenerate: "生成插画",
  illustrationGenerating: "正在生成插画…",
  illustrationRegenerate: "重新生成",
  illustrationRegenerating: "重新生成中…",
  illustrationDownload: "下载",
  illustrationSave: "保存图片",
  audioTitle: "语音陪伴",
  audioEmpty: "生成一段约 2 分钟的反思语音陪伴",
  audioGenerate: "生成语音",
  audioGenerating: "正在生成语音…",
  audioRegenerate: "重新生成",
  audioCopyTranscript: "复制字幕",
  audioSave: "保存语音",
  audioTranscriptLabel: "字幕",
  addonsSaveFirstHint: "请先保存日志再生成媒体",
  recentEntriesTitle: "最近的日志",
  recentEntriesDescription: "你最近的 10 则日志",
  recentEntriesEmpty: "暂无日志 — 请在上方填写并点击「保存」。",
  recentEntriesSearchPlaceholder: "按内容搜索…",
  trendsTitle: "每周情绪趋势",
  trendsDescription: "你的情绪变化模式",
  trendsRange7: "过去 7 天",
  trendsRange14: "过去 14 天",
  trendsIntensityHeading: "强度变化",
  trendsQuadrantHeading: "象限分布",
  trendsEmpty: "数据还不够，继续写日志吧！",
  unsavedTitle: "尚有未保存的修改",
  unsavedDescription: "离开将丢失当前内容，确定吗？",
  unsavedStay: "留下",
  unsavedLeave: "离开",
  detailTitle: "日志内容",
  detailSectionTopic: "主题",
  detailSectionEmotions: "情绪",
  detailSectionWhatHappened: "发生了什么",
  detailSectionSelfStory: "自我叙事",
  detailSectionNeeds: "需求",
  detailSectionNextTinyStep: "下一个小步骤",
  detailSectionAISummary: "AI 摘要",
  toastSaveSuccess: "日志已保存，并生成 AI 摘要！",
  toastSaveFailed: "保存失败",
  toastIllustrationSuccess: "插画已生成！",
  toastIllustrationFailed: "生成插画失败",
  toastAudioSuccess: "语音陪伴已生成！",
  toastAudioFailed: "生成语音失败",
  toastImageSaved: "图片已保存至日志！",
  toastAudioSaved: "语音已保存至日志！",
  toastImageDownloaded: "图片已下载！",
  toastTranscriptCopied: "字幕已复制到剪贴板！",
  quadrantSubtitle: {
    RED: "高能量不愉悦",
    YELLOW: "高能量愉悦",
    BLUE: "低能量不愉悦",
    GREEN: "低能量愉悦",
  },
  quadrantName: { RED: "红", YELLOW: "黄", BLUE: "蓝", GREEN: "绿" },
  topicName: {
    "Work/Study": "工作 / 学业",
    "People/Relationships": "人际 / 关系",
    "Body/Health": "身体 / 健康",
    "Stress Event": "压力事件",
    "Achievement/Confidence": "成就 / 自信",
    "Creativity/Music": "创作 / 音乐",
    "Big Decisions": "重大决定",
    "Quick Reset": "快速重整",
  },
  targetName: {
    Myself: "自己",
    Someone: "某人",
    Situation: "情境",
    Future: "未来",
    Body: "身体",
  },
  needName: {
    Rest: "休息",
    Structure: "结构",
    Reassurance: "安心",
    Progress: "进展",
    Connection: "连接",
    Respect: "尊重",
    Autonomy: "自主",
    Clarity: "清晰",
    Fun: "乐趣",
    Safety: "安全",
  },
  contextFactors: {
    sleepQuality: "睡眠质量（0-10）",
    physicalState: "身体状态",
    socialLoad: "社交负荷（0-10）",
    workLoad: "工作负荷（0-10）",
    environment: "环境",
    substances: "饮食 / 物质",
    note: "备注",
  },
};

const ja: DeepPartial<JournalUiCopy> = {
  pageTitle: "ジャーナル",
  pageSubtitle: "構造化された感情の整理",
  navGrateful: "感謝日記",
  newEntryTitle: "新規エントリー",
  newEntryDescription: "あなたの感情体験を記録します",
  labelDate: "日付",
  labelTopic: "テーマ",
  topicPlaceholder: "テーマを選択",
  labelEmotionPicker: "感情ピッカー",
  labelPrimaryEmotion: "主要な感情",
  primaryEmotionPlaceholder: "感情を選択",
  labelSecondaryEmotion: "副次的な感情（任意）",
  labelTarget: "対象（任意）",
  targetPlaceholder: "対象を選択",
  labelIntensity: "強度",
  labelBullets: "起きたこと（事実のみ）",
  addBulletButton: "項目を追加",
  removeBulletAria: "この項目を削除",
  labelSelfStory: "自己語り",
  labelNeedsExactlyOne: "ニーズ（ちょうど 1 つ選択）",
  labelNeedsOneToTwo: "ニーズ（1-2 つ選択）",
  labelNextTinyStep: "次の小さな一歩",
  nextTinyStepHint: "<10 分",
  nextTinyStepOverLimit: "140 文字以内にしてください",
  labelAppreciation: "感謝（任意）",
  appreciationPlaceholder: "今日、何に感謝していますか？",
  saveButton: "保存",
  savingButton: "保存中…",
  savingSummaryButton: "要約を生成中…",
  savedButton: "保存済み ✓",
  startNewEntryButton: "新しいエントリーを始める",
  optionalLabel: "（任意）",
  contextFactorsTitle: "状況要因",
  metadataTitle: "関連するプロジェクトとタスク",
  metadataComingSoon: "プロジェクトとタスクの統合が完成次第、リンク機能が使えます。",
  pastSummaryTitle: "過去の AI 要約",
  pastSummaryEmpty: "エントリーを保存すると要約が生成されます",
  pastSummaryFailed: "ジャーナルは保存されましたが、AI 要約を生成できませんでした。",
  pastSummaryJournalEntry: "ジャーナル本文",
  pastSummaryEmotionalRead: "感情の読み解き",
  pastSummarySuggestions: "提案",
  pastSummaryCoping: "対処戦略：",
  pastSummaryPractical: "具体的な行動：",
  pastSummaryReframe: "リフレーミングの問い：",
  pastSummaryAppreciation: "認められる点",
  addonsTitle: "AI アドオン",
  addonsDescription: "AI 要約をもとにビジュアルとオーディオを生成",
  illustrationTitle: "今日のイラスト",
  illustrationEmpty: "エントリーを象徴するイラストを生成",
  illustrationGenerate: "イラストを生成",
  illustrationGenerating: "イラストを生成中…",
  illustrationRegenerate: "再生成",
  illustrationRegenerating: "再生成中…",
  illustrationDownload: "ダウンロード",
  illustrationSave: "画像を保存",
  audioTitle: "音声コメント",
  audioEmpty: "約 2 分間のリフレクション音声を生成",
  audioGenerate: "音声を生成",
  audioGenerating: "音声を生成中…",
  audioRegenerate: "再生成",
  audioCopyTranscript: "文字起こしをコピー",
  audioSave: "音声を保存",
  audioTranscriptLabel: "文字起こし",
  addonsSaveFirstHint: "メディアを生成するにはまずエントリーを保存してください",
  recentEntriesTitle: "最近のエントリー",
  recentEntriesDescription: "直近 10 件のジャーナル",
  recentEntriesEmpty: "まだエントリーがありません — 上のフォームに入力して保存してください。",
  recentEntriesSearchPlaceholder: "内容で検索…",
  trendsTitle: "週間ムードの傾向",
  trendsDescription: "あなたの感情パターン",
  trendsRange7: "過去 7 日間",
  trendsRange14: "過去 14 日間",
  trendsIntensityHeading: "強度の推移",
  trendsQuadrantHeading: "象限の分布",
  trendsEmpty: "データが不足しています。記録を続けてください！",
  unsavedTitle: "未保存の変更があります",
  unsavedDescription: "保存せずに移動しますか？現在の内容は失われます。",
  unsavedStay: "とどまる",
  unsavedLeave: "離れる",
  detailTitle: "ジャーナルエントリー",
  detailSectionTopic: "テーマ",
  detailSectionEmotions: "感情",
  detailSectionWhatHappened: "起きたこと",
  detailSectionSelfStory: "自己語り",
  detailSectionNeeds: "ニーズ",
  detailSectionNextTinyStep: "次の小さな一歩",
  detailSectionAISummary: "AI 要約",
  toastSaveSuccess: "ジャーナルを保存し、AI 要約を生成しました！",
  toastSaveFailed: "保存に失敗しました",
  toastIllustrationSuccess: "イラストが生成されました！",
  toastIllustrationFailed: "イラストの生成に失敗しました",
  toastAudioSuccess: "音声コメントが生成されました！",
  toastAudioFailed: "音声の生成に失敗しました",
  toastImageSaved: "画像をジャーナルに保存しました！",
  toastAudioSaved: "音声をジャーナルに保存しました！",
  toastImageDownloaded: "画像をダウンロードしました！",
  toastTranscriptCopied: "文字起こしをクリップボードにコピーしました！",
  quadrantSubtitle: {
    RED: "高エネルギー・不快",
    YELLOW: "高エネルギー・快",
    BLUE: "低エネルギー・不快",
    GREEN: "低エネルギー・快",
  },
  quadrantName: { RED: "レッド", YELLOW: "イエロー", BLUE: "ブルー", GREEN: "グリーン" },
  topicName: {
    "Work/Study": "仕事 / 学習",
    "People/Relationships": "人間関係",
    "Body/Health": "身体 / 健康",
    "Stress Event": "ストレス出来事",
    "Achievement/Confidence": "達成 / 自信",
    "Creativity/Music": "創造 / 音楽",
    "Big Decisions": "重要な決断",
    "Quick Reset": "クイックリセット",
  },
  targetName: {
    Myself: "自分自身",
    Someone: "誰か",
    Situation: "状況",
    Future: "未来",
    Body: "身体",
  },
  needName: {
    Rest: "休息",
    Structure: "構造",
    Reassurance: "安心",
    Progress: "前進",
    Connection: "つながり",
    Respect: "尊重",
    Autonomy: "自律",
    Clarity: "明確さ",
    Fun: "楽しさ",
    Safety: "安全",
  },
  contextFactors: {
    sleepQuality: "睡眠の質（0-10）",
    physicalState: "身体の状態",
    socialLoad: "社会的負荷（0-10）",
    workLoad: "仕事の負荷（0-10）",
    environment: "環境",
    substances: "飲食 / 物質",
    note: "メモ",
  },
};

const ko: DeepPartial<JournalUiCopy> = {
  pageTitle: "저널",
  pageSubtitle: "구조화된 감정 정리",
  navGrateful: "감사 일기",
  newEntryTitle: "새 항목",
  newEntryDescription: "감정 경험을 기록하세요",
  labelDate: "날짜",
  labelTopic: "주제",
  topicPlaceholder: "주제 선택",
  labelEmotionPicker: "감정 선택기",
  labelPrimaryEmotion: "주요 감정",
  primaryEmotionPlaceholder: "감정 선택",
  labelSecondaryEmotion: "보조 감정 (선택)",
  labelTarget: "대상 (선택)",
  targetPlaceholder: "대상 선택",
  labelIntensity: "강도",
  labelBullets: "무슨 일이 있었나요 (사실만)",
  addBulletButton: "항목 추가",
  removeBulletAria: "이 항목 제거",
  labelSelfStory: "자기 서사",
  labelNeedsExactlyOne: "필요 (정확히 1개 선택)",
  labelNeedsOneToTwo: "필요 (1-2개 선택)",
  labelNextTinyStep: "다음 작은 걸음",
  nextTinyStepHint: "<10 분",
  nextTinyStepOverLimit: "140자 이내여야 합니다",
  labelAppreciation: "감사 (선택)",
  appreciationPlaceholder: "오늘 무엇에 감사하나요?",
  saveButton: "저장",
  savingButton: "저장 중…",
  savingSummaryButton: "요약 생성 중…",
  savedButton: "저장됨 ✓",
  startNewEntryButton: "새 항목 시작",
  optionalLabel: "(선택)",
  contextFactorsTitle: "맥락 요인",
  metadataTitle: "연결된 프로젝트와 작업",
  metadataComingSoon: "프로젝트 및 작업 통합이 완료되면 사용 가능합니다.",
  pastSummaryTitle: "지난 AI 요약",
  pastSummaryEmpty: "항목을 저장하면 요약이 생성됩니다",
  pastSummaryFailed: "저널은 저장되었지만 AI 요약을 생성하지 못했습니다.",
  pastSummaryJournalEntry: "저널 내용",
  pastSummaryEmotionalRead: "감정 해석",
  pastSummarySuggestions: "제안",
  pastSummaryCoping: "대처 전략:",
  pastSummaryPractical: "구체적인 행동:",
  pastSummaryReframe: "재구성 질문:",
  pastSummaryAppreciation: "얻은 인정",
  addonsTitle: "AI 부가 기능",
  addonsDescription: "AI 요약을 바탕으로 시각·음성 콘텐츠 생성",
  illustrationTitle: "오늘의 일러스트",
  illustrationEmpty: "저널을 상징하는 일러스트 생성",
  illustrationGenerate: "일러스트 생성",
  illustrationGenerating: "일러스트 생성 중…",
  illustrationRegenerate: "다시 생성",
  illustrationRegenerating: "다시 생성 중…",
  illustrationDownload: "다운로드",
  illustrationSave: "이미지 저장",
  audioTitle: "음성 코멘트",
  audioEmpty: "약 2분 분량의 성찰 음성을 생성",
  audioGenerate: "음성 생성",
  audioGenerating: "음성 생성 중…",
  audioRegenerate: "다시 생성",
  audioCopyTranscript: "전사본 복사",
  audioSave: "음성 저장",
  audioTranscriptLabel: "전사본",
  addonsSaveFirstHint: "미디어를 생성하려면 먼저 항목을 저장하세요",
  recentEntriesTitle: "최근 항목",
  recentEntriesDescription: "최근 10개 저널",
  recentEntriesEmpty: "아직 항목이 없습니다 — 위 양식을 작성하고 저장하세요.",
  recentEntriesSearchPlaceholder: "내용 검색…",
  trendsTitle: "주간 기분 추세",
  trendsDescription: "당신의 감정 패턴",
  trendsRange7: "최근 7일",
  trendsRange14: "최근 14일",
  trendsIntensityHeading: "강도 변화",
  trendsQuadrantHeading: "사분면 분포",
  trendsEmpty: "데이터가 부족합니다. 계속 기록하세요!",
  unsavedTitle: "저장되지 않은 변경 사항이 있습니다",
  unsavedDescription: "저장하지 않고 떠나시겠습니까? 현재 내용은 사라집니다.",
  unsavedStay: "머무르기",
  unsavedLeave: "떠나기",
  detailTitle: "저널 항목",
  detailSectionTopic: "주제",
  detailSectionEmotions: "감정",
  detailSectionWhatHappened: "무슨 일이 있었나",
  detailSectionSelfStory: "자기 서사",
  detailSectionNeeds: "필요",
  detailSectionNextTinyStep: "다음 작은 걸음",
  detailSectionAISummary: "AI 요약",
  toastSaveSuccess: "저널이 저장되고 AI 요약이 생성되었습니다!",
  toastSaveFailed: "저장 실패",
  toastIllustrationSuccess: "일러스트가 생성되었습니다!",
  toastIllustrationFailed: "일러스트 생성 실패",
  toastAudioSuccess: "음성 코멘트가 생성되었습니다!",
  toastAudioFailed: "음성 생성 실패",
  toastImageSaved: "이미지가 저널에 저장되었습니다!",
  toastAudioSaved: "음성이 저널에 저장되었습니다!",
  toastImageDownloaded: "이미지가 다운로드되었습니다!",
  toastTranscriptCopied: "전사본이 클립보드에 복사되었습니다!",
  quadrantSubtitle: {
    RED: "고에너지 불쾌",
    YELLOW: "고에너지 쾌",
    BLUE: "저에너지 불쾌",
    GREEN: "저에너지 쾌",
  },
  quadrantName: { RED: "레드", YELLOW: "옐로", BLUE: "블루", GREEN: "그린" },
  topicName: {
    "Work/Study": "업무 / 학업",
    "People/Relationships": "인간관계",
    "Body/Health": "몸 / 건강",
    "Stress Event": "스트레스 사건",
    "Achievement/Confidence": "성취 / 자신감",
    "Creativity/Music": "창작 / 음악",
    "Big Decisions": "중요한 결정",
    "Quick Reset": "빠른 리셋",
  },
  targetName: {
    Myself: "나 자신",
    Someone: "누군가",
    Situation: "상황",
    Future: "미래",
    Body: "몸",
  },
  needName: {
    Rest: "휴식",
    Structure: "구조",
    Reassurance: "안심",
    Progress: "진전",
    Connection: "연결",
    Respect: "존중",
    Autonomy: "자율",
    Clarity: "명료함",
    Fun: "재미",
    Safety: "안전",
  },
  contextFactors: {
    sleepQuality: "수면의 질 (0-10)",
    physicalState: "신체 상태",
    socialLoad: "사회적 부담 (0-10)",
    workLoad: "업무 부담 (0-10)",
    environment: "환경",
    substances: "음식 / 물질",
    note: "메모",
  },
};

const fr: DeepPartial<JournalUiCopy> = {
  pageTitle: "Journal",
  pageSubtitle: "Traitement émotionnel structuré",
  navGrateful: "Mes gratitudes",
  newEntryTitle: "Nouvelle entrée",
  newEntryDescription: "Capturez votre expérience émotionnelle",
  labelDate: "Date",
  labelTopic: "Thème",
  topicPlaceholder: "Sélectionner un thème",
  labelEmotionPicker: "Sélecteur d'émotion",
  labelPrimaryEmotion: "Émotion principale",
  primaryEmotionPlaceholder: "Sélectionner une émotion",
  labelSecondaryEmotion: "Émotion secondaire (optionnel)",
  labelTarget: "Cible (optionnel)",
  targetPlaceholder: "Sélectionner une cible",
  labelIntensity: "Intensité",
  labelBullets: "Ce qui s'est passé (faits uniquement)",
  addBulletButton: "Ajouter un point",
  removeBulletAria: "Supprimer ce point",
  labelSelfStory: "Récit personnel",
  labelNeedsExactlyOne: "Besoins (choisir exactement 1)",
  labelNeedsOneToTwo: "Besoins (choisir 1-2)",
  labelNextTinyStep: "Prochain petit pas",
  nextTinyStepHint: "<10 minutes",
  nextTinyStepOverLimit: "140 caractères maximum",
  labelAppreciation: "Gratitude (optionnel)",
  appreciationPlaceholder: "Pour quoi êtes-vous reconnaissant ?",
  saveButton: "Enregistrer",
  savingButton: "Enregistrement…",
  savingSummaryButton: "Génération du résumé…",
  savedButton: "Enregistré ✓",
  startNewEntryButton: "Nouvelle entrée",
  optionalLabel: "(optionnel)",
  contextFactorsTitle: "Facteurs contextuels",
  metadataTitle: "Projets et tâches liés",
  metadataComingSoon: "La liaison sera disponible une fois l'intégration des projets et tâches en place.",
  pastSummaryTitle: "Résumé IA précédent",
  pastSummaryEmpty: "Enregistrez votre entrée pour générer un résumé",
  pastSummaryFailed: "L’entrée a été enregistrée, mais le résumé IA n’a pas pu être généré.",
  pastSummaryJournalEntry: "Entrée de journal",
  pastSummaryEmotionalRead: "Lecture émotionnelle",
  pastSummarySuggestions: "Suggestions",
  pastSummaryCoping: "Stratégie d'adaptation :",
  pastSummaryPractical: "Action concrète :",
  pastSummaryReframe: "Question de recadrage :",
  pastSummaryAppreciation: "Reconnaissance méritée",
  addonsTitle: "Compléments IA",
  addonsDescription: "Générez des contenus visuels et audio à partir du résumé",
  illustrationTitle: "Illustration du jour",
  illustrationEmpty: "Générez une illustration symbolique de votre entrée",
  illustrationGenerate: "Générer l'illustration",
  illustrationGenerating: "Génération en cours…",
  illustrationRegenerate: "Régénérer",
  illustrationRegenerating: "Régénération…",
  illustrationDownload: "Télécharger",
  illustrationSave: "Enregistrer l'image",
  audioTitle: "Commentaire audio",
  audioEmpty: "Générez un commentaire audio réflexif de 2 minutes",
  audioGenerate: "Générer l'audio",
  audioGenerating: "Génération en cours…",
  audioRegenerate: "Régénérer",
  audioCopyTranscript: "Copier la transcription",
  audioSave: "Enregistrer l'audio",
  audioTranscriptLabel: "Transcription",
  addonsSaveFirstHint: "Enregistrez d'abord votre entrée pour générer du contenu",
  recentEntriesTitle: "Entrées récentes",
  recentEntriesDescription: "Vos 10 dernières entrées",
  recentEntriesEmpty: "Aucune entrée — remplissez le formulaire ci-dessus et enregistrez.",
  recentEntriesSearchPlaceholder: "Rechercher dans le contenu…",
  trendsTitle: "Tendances hebdomadaires",
  trendsDescription: "Vos schémas émotionnels",
  trendsRange7: "7 derniers jours",
  trendsRange14: "14 derniers jours",
  trendsIntensityHeading: "Intensité dans le temps",
  trendsQuadrantHeading: "Distribution des quadrants",
  trendsEmpty: "Pas assez de données. Continuez à écrire !",
  unsavedTitle: "Modifications non enregistrées",
  unsavedDescription: "Quitter sans enregistrer ? Votre saisie sera perdue.",
  unsavedStay: "Rester",
  unsavedLeave: "Quitter",
  detailTitle: "Entrée de journal",
  detailSectionTopic: "Thème",
  detailSectionEmotions: "Émotions",
  detailSectionWhatHappened: "Ce qui s'est passé",
  detailSectionSelfStory: "Récit personnel",
  detailSectionNeeds: "Besoins",
  detailSectionNextTinyStep: "Prochain petit pas",
  detailSectionAISummary: "Résumé IA",
  toastSaveSuccess: "Entrée enregistrée avec son résumé IA !",
  toastSaveFailed: "Échec de l'enregistrement",
  toastIllustrationSuccess: "Illustration générée !",
  toastIllustrationFailed: "Échec de la génération de l'illustration",
  toastAudioSuccess: "Commentaire audio généré !",
  toastAudioFailed: "Échec de la génération audio",
  toastImageSaved: "Image enregistrée dans le journal !",
  toastAudioSaved: "Audio enregistré dans le journal !",
  toastImageDownloaded: "Image téléchargée !",
  toastTranscriptCopied: "Transcription copiée dans le presse-papiers !",
  quadrantSubtitle: {
    RED: "Énergie élevée, déplaisant",
    YELLOW: "Énergie élevée, plaisant",
    BLUE: "Énergie faible, déplaisant",
    GREEN: "Énergie faible, plaisant",
  },
  quadrantName: { RED: "Rouge", YELLOW: "Jaune", BLUE: "Bleu", GREEN: "Vert" },
  topicName: {
    "Work/Study": "Travail / Études",
    "People/Relationships": "Relations",
    "Body/Health": "Corps / Santé",
    "Stress Event": "Événement stressant",
    "Achievement/Confidence": "Réussite / Confiance",
    "Creativity/Music": "Créativité / Musique",
    "Big Decisions": "Grandes décisions",
    "Quick Reset": "Reset rapide",
  },
  targetName: {
    Myself: "Moi-même",
    Someone: "Quelqu'un",
    Situation: "Situation",
    Future: "Avenir",
    Body: "Corps",
  },
  needName: {
    Rest: "Repos",
    Structure: "Structure",
    Reassurance: "Réassurance",
    Progress: "Progrès",
    Connection: "Connexion",
    Respect: "Respect",
    Autonomy: "Autonomie",
    Clarity: "Clarté",
    Fun: "Plaisir",
    Safety: "Sécurité",
  },
  contextFactors: {
    sleepQuality: "Qualité du sommeil (0-10)",
    physicalState: "État physique",
    socialLoad: "Charge sociale (0-10)",
    workLoad: "Charge de travail (0-10)",
    environment: "Environnement",
    substances: "Alimentation / Substances",
    note: "Note",
  },
};

const it: DeepPartial<JournalUiCopy> = {
  pageTitle: "Diario",
  pageSubtitle: "Elaborazione emotiva strutturata",
  navGrateful: "I miei ringraziamenti",
  newEntryTitle: "Nuova voce",
  newEntryDescription: "Cattura la tua esperienza emotiva",
  labelDate: "Data",
  labelTopic: "Tema",
  topicPlaceholder: "Seleziona un tema",
  labelEmotionPicker: "Selettore di emozione",
  labelPrimaryEmotion: "Emozione principale",
  primaryEmotionPlaceholder: "Seleziona un'emozione",
  labelSecondaryEmotion: "Emozione secondaria (opzionale)",
  labelTarget: "Bersaglio (opzionale)",
  targetPlaceholder: "Seleziona un bersaglio",
  labelIntensity: "Intensità",
  labelBullets: "Cosa è successo (solo fatti)",
  addBulletButton: "Aggiungi punto",
  removeBulletAria: "Rimuovi questo punto",
  labelSelfStory: "Narrazione personale",
  labelNeedsExactlyOne: "Bisogni (scegli esattamente 1)",
  labelNeedsOneToTwo: "Bisogni (scegli 1-2)",
  labelNextTinyStep: "Prossimo piccolo passo",
  nextTinyStepHint: "<10 minuti",
  nextTinyStepOverLimit: "Massimo 140 caratteri",
  labelAppreciation: "Gratitudine (opzionale)",
  appreciationPlaceholder: "Per cosa sei grato?",
  saveButton: "Salva",
  savingButton: "Salvataggio…",
  savingSummaryButton: "Generazione riassunto…",
  savedButton: "Salvato ✓",
  startNewEntryButton: "Nuova voce",
  optionalLabel: "(opzionale)",
  contextFactorsTitle: "Fattori contestuali",
  metadataTitle: "Progetti e attività collegati",
  metadataComingSoon: "Disponibile dopo l'integrazione di progetti e attività.",
  pastSummaryTitle: "Riassunto IA precedente",
  pastSummaryEmpty: "Salva la voce per generare un riassunto",
  pastSummaryFailed: "La voce è stata salvata, ma non è stato possibile generare il riassunto IA.",
  pastSummaryJournalEntry: "Voce di diario",
  pastSummaryEmotionalRead: "Lettura emotiva",
  pastSummarySuggestions: "Suggerimenti",
  pastSummaryCoping: "Strategia di coping:",
  pastSummaryPractical: "Azione concreta:",
  pastSummaryReframe: "Domanda di riformulazione:",
  pastSummaryAppreciation: "Riconoscimento meritato",
  addonsTitle: "Componenti aggiuntivi IA",
  addonsDescription: "Genera contenuti visivi e audio dal riassunto",
  illustrationTitle: "Illustrazione quotidiana",
  illustrationEmpty: "Genera un'illustrazione simbolica della voce",
  illustrationGenerate: "Genera illustrazione",
  illustrationGenerating: "Generazione in corso…",
  illustrationRegenerate: "Rigenera",
  illustrationRegenerating: "Rigenerazione…",
  illustrationDownload: "Scarica",
  illustrationSave: "Salva immagine",
  audioTitle: "Commento audio",
  audioEmpty: "Genera un audio riflessivo di 2 minuti",
  audioGenerate: "Genera audio",
  audioGenerating: "Generazione audio…",
  audioRegenerate: "Rigenera",
  audioCopyTranscript: "Copia trascrizione",
  audioSave: "Salva audio",
  audioTranscriptLabel: "Trascrizione",
  addonsSaveFirstHint: "Salva la voce prima per generare media",
  recentEntriesTitle: "Voci recenti",
  recentEntriesDescription: "Le tue ultime 10 voci",
  recentEntriesEmpty: "Nessuna voce — compila il modulo e salva.",
  recentEntriesSearchPlaceholder: "Cerca per contenuto…",
  trendsTitle: "Andamento settimanale",
  trendsDescription: "I tuoi schemi emotivi",
  trendsRange7: "Ultimi 7 giorni",
  trendsRange14: "Ultimi 14 giorni",
  trendsIntensityHeading: "Intensità nel tempo",
  trendsQuadrantHeading: "Distribuzione dei quadranti",
  trendsEmpty: "Dati insufficienti. Continua a scrivere!",
  unsavedTitle: "Modifiche non salvate",
  unsavedDescription: "Uscire senza salvare? Perderai la voce attuale.",
  unsavedStay: "Resta",
  unsavedLeave: "Esci",
  detailTitle: "Voce di diario",
  detailSectionTopic: "Tema",
  detailSectionEmotions: "Emozioni",
  detailSectionWhatHappened: "Cosa è successo",
  detailSectionSelfStory: "Narrazione personale",
  detailSectionNeeds: "Bisogni",
  detailSectionNextTinyStep: "Prossimo piccolo passo",
  detailSectionAISummary: "Riassunto IA",
  toastSaveSuccess: "Voce salvata con riassunto IA!",
  toastSaveFailed: "Salvataggio non riuscito",
  toastIllustrationSuccess: "Illustrazione generata!",
  toastIllustrationFailed: "Generazione illustrazione non riuscita",
  toastAudioSuccess: "Commento audio generato!",
  toastAudioFailed: "Generazione audio non riuscita",
  toastImageSaved: "Immagine salvata nel diario!",
  toastAudioSaved: "Audio salvato nel diario!",
  toastImageDownloaded: "Immagine scaricata!",
  toastTranscriptCopied: "Trascrizione copiata negli appunti!",
  quadrantSubtitle: {
    RED: "Energia alta, sgradevole",
    YELLOW: "Energia alta, piacevole",
    BLUE: "Energia bassa, sgradevole",
    GREEN: "Energia bassa, piacevole",
  },
  quadrantName: { RED: "Rosso", YELLOW: "Giallo", BLUE: "Blu", GREEN: "Verde" },
  topicName: {
    "Work/Study": "Lavoro / Studio",
    "People/Relationships": "Relazioni",
    "Body/Health": "Corpo / Salute",
    "Stress Event": "Evento stressante",
    "Achievement/Confidence": "Successo / Fiducia",
    "Creativity/Music": "Creatività / Musica",
    "Big Decisions": "Grandi decisioni",
    "Quick Reset": "Reset rapido",
  },
  targetName: {
    Myself: "Me stesso",
    Someone: "Qualcuno",
    Situation: "Situazione",
    Future: "Futuro",
    Body: "Corpo",
  },
  needName: {
    Rest: "Riposo",
    Structure: "Struttura",
    Reassurance: "Rassicurazione",
    Progress: "Progresso",
    Connection: "Connessione",
    Respect: "Rispetto",
    Autonomy: "Autonomia",
    Clarity: "Chiarezza",
    Fun: "Divertimento",
    Safety: "Sicurezza",
  },
  contextFactors: {
    sleepQuality: "Qualità del sonno (0-10)",
    physicalState: "Stato fisico",
    socialLoad: "Carico sociale (0-10)",
    workLoad: "Carico di lavoro (0-10)",
    environment: "Ambiente",
    substances: "Alimentazione / Sostanze",
    note: "Nota",
  },
};

const es: DeepPartial<JournalUiCopy> = {
  pageTitle: "Diario",
  pageSubtitle: "Procesamiento emocional estructurado",
  navGrateful: "Mis gratitudes",
  newEntryTitle: "Nueva entrada",
  newEntryDescription: "Captura tu experiencia emocional",
  labelDate: "Fecha",
  labelTopic: "Tema",
  topicPlaceholder: "Selecciona un tema",
  labelEmotionPicker: "Selector de emoción",
  labelPrimaryEmotion: "Emoción principal",
  primaryEmotionPlaceholder: "Selecciona una emoción",
  labelSecondaryEmotion: "Emoción secundaria (opcional)",
  labelTarget: "Objetivo (opcional)",
  targetPlaceholder: "Selecciona un objetivo",
  labelIntensity: "Intensidad",
  labelBullets: "Qué pasó (solo hechos)",
  addBulletButton: "Añadir punto",
  removeBulletAria: "Eliminar este punto",
  labelSelfStory: "Narrativa personal",
  labelNeedsExactlyOne: "Necesidades (elige exactamente 1)",
  labelNeedsOneToTwo: "Necesidades (elige 1-2)",
  labelNextTinyStep: "Próximo pequeño paso",
  nextTinyStepHint: "<10 minutos",
  nextTinyStepOverLimit: "Máximo 140 caracteres",
  labelAppreciation: "Gratitud (opcional)",
  appreciationPlaceholder: "¿Por qué estás agradecido?",
  saveButton: "Guardar",
  savingButton: "Guardando…",
  savingSummaryButton: "Generando resumen…",
  savedButton: "Guardado ✓",
  startNewEntryButton: "Nueva entrada",
  optionalLabel: "(opcional)",
  contextFactorsTitle: "Factores contextuales",
  metadataTitle: "Proyectos y tareas vinculados",
  metadataComingSoon: "Disponible cuando se integren proyectos y tareas.",
  pastSummaryTitle: "Resumen IA anterior",
  pastSummaryEmpty: "Guarda la entrada para generar un resumen",
  pastSummaryFailed: "La entrada se guardó, pero no se pudo generar el resumen de IA.",
  pastSummaryJournalEntry: "Entrada de diario",
  pastSummaryEmotionalRead: "Lectura emocional",
  pastSummarySuggestions: "Sugerencias",
  pastSummaryCoping: "Estrategia de afrontamiento:",
  pastSummaryPractical: "Acción concreta:",
  pastSummaryReframe: "Pregunta de replanteamiento:",
  pastSummaryAppreciation: "Reconocimiento merecido",
  addonsTitle: "Complementos IA",
  addonsDescription: "Genera contenido visual y de audio desde el resumen",
  illustrationTitle: "Ilustración del día",
  illustrationEmpty: "Genera una ilustración simbólica de tu entrada",
  illustrationGenerate: "Generar ilustración",
  illustrationGenerating: "Generando ilustración…",
  illustrationRegenerate: "Regenerar",
  illustrationRegenerating: "Regenerando…",
  illustrationDownload: "Descargar",
  illustrationSave: "Guardar imagen",
  audioTitle: "Comentario de audio",
  audioEmpty: "Genera un audio reflexivo de 2 minutos",
  audioGenerate: "Generar audio",
  audioGenerating: "Generando audio…",
  audioRegenerate: "Regenerar",
  audioCopyTranscript: "Copiar transcripción",
  audioSave: "Guardar audio",
  audioTranscriptLabel: "Transcripción",
  addonsSaveFirstHint: "Guarda la entrada primero para generar medios",
  recentEntriesTitle: "Entradas recientes",
  recentEntriesDescription: "Tus últimas 10 entradas",
  recentEntriesEmpty: "Aún no hay entradas — completa el formulario y guarda.",
  recentEntriesSearchPlaceholder: "Buscar por contenido…",
  trendsTitle: "Tendencias semanales",
  trendsDescription: "Tus patrones emocionales",
  trendsRange7: "Últimos 7 días",
  trendsRange14: "Últimos 14 días",
  trendsIntensityHeading: "Intensidad en el tiempo",
  trendsQuadrantHeading: "Distribución de cuadrantes",
  trendsEmpty: "Datos insuficientes. ¡Sigue escribiendo!",
  unsavedTitle: "Cambios sin guardar",
  unsavedDescription: "¿Salir sin guardar? Perderás la entrada actual.",
  unsavedStay: "Quedarse",
  unsavedLeave: "Salir",
  detailTitle: "Entrada de diario",
  detailSectionTopic: "Tema",
  detailSectionEmotions: "Emociones",
  detailSectionWhatHappened: "Qué pasó",
  detailSectionSelfStory: "Narrativa personal",
  detailSectionNeeds: "Necesidades",
  detailSectionNextTinyStep: "Próximo pequeño paso",
  detailSectionAISummary: "Resumen IA",
  toastSaveSuccess: "¡Entrada guardada con resumen IA!",
  toastSaveFailed: "Error al guardar",
  toastIllustrationSuccess: "¡Ilustración generada!",
  toastIllustrationFailed: "Error al generar la ilustración",
  toastAudioSuccess: "¡Comentario de audio generado!",
  toastAudioFailed: "Error al generar el audio",
  toastImageSaved: "¡Imagen guardada en el diario!",
  toastAudioSaved: "¡Audio guardado en el diario!",
  toastImageDownloaded: "¡Imagen descargada!",
  toastTranscriptCopied: "¡Transcripción copiada al portapapeles!",
  quadrantSubtitle: {
    RED: "Energía alta, desagradable",
    YELLOW: "Energía alta, agradable",
    BLUE: "Energía baja, desagradable",
    GREEN: "Energía baja, agradable",
  },
  quadrantName: { RED: "Rojo", YELLOW: "Amarillo", BLUE: "Azul", GREEN: "Verde" },
  topicName: {
    "Work/Study": "Trabajo / Estudio",
    "People/Relationships": "Relaciones",
    "Body/Health": "Cuerpo / Salud",
    "Stress Event": "Evento estresante",
    "Achievement/Confidence": "Logro / Confianza",
    "Creativity/Music": "Creatividad / Música",
    "Big Decisions": "Grandes decisiones",
    "Quick Reset": "Reset rápido",
  },
  targetName: {
    Myself: "Yo mismo",
    Someone: "Alguien",
    Situation: "Situación",
    Future: "Futuro",
    Body: "Cuerpo",
  },
  needName: {
    Rest: "Descanso",
    Structure: "Estructura",
    Reassurance: "Tranquilidad",
    Progress: "Progreso",
    Connection: "Conexión",
    Respect: "Respeto",
    Autonomy: "Autonomía",
    Clarity: "Claridad",
    Fun: "Diversión",
    Safety: "Seguridad",
  },
  contextFactors: {
    sleepQuality: "Calidad del sueño (0-10)",
    physicalState: "Estado físico",
    socialLoad: "Carga social (0-10)",
    workLoad: "Carga de trabajo (0-10)",
    environment: "Entorno",
    substances: "Alimentación / Sustancias",
    note: "Nota",
  },
};

const vi: DeepPartial<JournalUiCopy> = {
  pageTitle: "Nhật ký",
  pageSubtitle: "Xử lý cảm xúc có cấu trúc",
  navGrateful: "Lòng biết ơn",
  newEntryTitle: "Mục mới",
  newEntryDescription: "Ghi lại trải nghiệm cảm xúc của bạn",
  labelDate: "Ngày",
  labelTopic: "Chủ đề",
  topicPlaceholder: "Chọn chủ đề",
  labelEmotionPicker: "Bộ chọn cảm xúc",
  labelPrimaryEmotion: "Cảm xúc chính",
  primaryEmotionPlaceholder: "Chọn cảm xúc",
  labelSecondaryEmotion: "Cảm xúc phụ (tùy chọn)",
  labelTarget: "Đối tượng (tùy chọn)",
  targetPlaceholder: "Chọn đối tượng",
  labelIntensity: "Cường độ",
  labelBullets: "Điều gì đã xảy ra (chỉ sự thật)",
  addBulletButton: "Thêm mục",
  removeBulletAria: "Xóa mục này",
  labelSelfStory: "Tự sự của bản thân",
  labelNeedsExactlyOne: "Nhu cầu (chọn đúng 1)",
  labelNeedsOneToTwo: "Nhu cầu (chọn 1-2)",
  labelNextTinyStep: "Bước nhỏ tiếp theo",
  nextTinyStepHint: "<10 phút",
  nextTinyStepOverLimit: "Tối đa 140 ký tự",
  labelAppreciation: "Lòng biết ơn (tùy chọn)",
  appreciationPlaceholder: "Bạn biết ơn điều gì hôm nay?",
  saveButton: "Lưu",
  savingButton: "Đang lưu…",
  savingSummaryButton: "Đang tạo tóm tắt…",
  savedButton: "Đã lưu ✓",
  startNewEntryButton: "Mục mới",
  optionalLabel: "(tùy chọn)",
  contextFactorsTitle: "Yếu tố hoàn cảnh",
  metadataTitle: "Dự án và nhiệm vụ liên quan",
  metadataComingSoon: "Sẽ hoạt động sau khi tích hợp Dự án và Nhiệm vụ.",
  pastSummaryTitle: "Tóm tắt AI trước",
  pastSummaryEmpty: "Lưu mục để tạo tóm tắt",
  pastSummaryFailed: "Đã lưu nhật ký nhưng không thể tạo bản tóm tắt AI.",
  pastSummaryJournalEntry: "Nội dung nhật ký",
  pastSummaryEmotionalRead: "Phân tích cảm xúc",
  pastSummarySuggestions: "Gợi ý",
  pastSummaryCoping: "Chiến lược ứng phó:",
  pastSummaryPractical: "Hành động cụ thể:",
  pastSummaryReframe: "Câu hỏi tái khung:",
  pastSummaryAppreciation: "Sự công nhận xứng đáng",
  addonsTitle: "Tiện ích AI",
  addonsDescription: "Tạo hình ảnh và âm thanh từ bản tóm tắt",
  illustrationTitle: "Hình minh họa hôm nay",
  illustrationEmpty: "Tạo một hình minh họa biểu tượng cho mục nhật ký",
  illustrationGenerate: "Tạo hình minh họa",
  illustrationGenerating: "Đang tạo hình minh họa…",
  illustrationRegenerate: "Tạo lại",
  illustrationRegenerating: "Đang tạo lại…",
  illustrationDownload: "Tải xuống",
  illustrationSave: "Lưu hình",
  audioTitle: "Bình luận âm thanh",
  audioEmpty: "Tạo một đoạn âm thanh suy ngẫm 2 phút",
  audioGenerate: "Tạo âm thanh",
  audioGenerating: "Đang tạo âm thanh…",
  audioRegenerate: "Tạo lại",
  audioCopyTranscript: "Sao chép văn bản",
  audioSave: "Lưu âm thanh",
  audioTranscriptLabel: "Văn bản",
  addonsSaveFirstHint: "Hãy lưu mục trước để tạo nội dung",
  recentEntriesTitle: "Mục gần đây",
  recentEntriesDescription: "10 mục nhật ký gần nhất",
  recentEntriesEmpty: "Chưa có mục — hãy điền biểu mẫu phía trên và Lưu.",
  recentEntriesSearchPlaceholder: "Tìm theo nội dung…",
  trendsTitle: "Xu hướng cảm xúc tuần",
  trendsDescription: "Mẫu hình cảm xúc của bạn",
  trendsRange7: "7 ngày gần nhất",
  trendsRange14: "14 ngày gần nhất",
  trendsIntensityHeading: "Cường độ theo thời gian",
  trendsQuadrantHeading: "Phân bố góc phần tư",
  trendsEmpty: "Chưa đủ dữ liệu. Tiếp tục ghi nhật ký!",
  unsavedTitle: "Có thay đổi chưa lưu",
  unsavedDescription: "Rời đi mà không lưu? Nội dung hiện tại sẽ mất.",
  unsavedStay: "Ở lại",
  unsavedLeave: "Rời đi",
  detailTitle: "Mục nhật ký",
  detailSectionTopic: "Chủ đề",
  detailSectionEmotions: "Cảm xúc",
  detailSectionWhatHappened: "Điều đã xảy ra",
  detailSectionSelfStory: "Tự sự",
  detailSectionNeeds: "Nhu cầu",
  detailSectionNextTinyStep: "Bước nhỏ tiếp theo",
  detailSectionAISummary: "Tóm tắt AI",
  toastSaveSuccess: "Đã lưu nhật ký kèm tóm tắt AI!",
  toastSaveFailed: "Lưu thất bại",
  toastIllustrationSuccess: "Đã tạo hình minh họa!",
  toastIllustrationFailed: "Không tạo được hình minh họa",
  toastAudioSuccess: "Đã tạo bình luận âm thanh!",
  toastAudioFailed: "Không tạo được âm thanh",
  toastImageSaved: "Đã lưu hình vào nhật ký!",
  toastAudioSaved: "Đã lưu âm thanh vào nhật ký!",
  toastImageDownloaded: "Đã tải hình xuống!",
  toastTranscriptCopied: "Đã sao chép văn bản vào bộ nhớ tạm!",
  quadrantSubtitle: {
    RED: "Năng lượng cao, khó chịu",
    YELLOW: "Năng lượng cao, dễ chịu",
    BLUE: "Năng lượng thấp, khó chịu",
    GREEN: "Năng lượng thấp, dễ chịu",
  },
  quadrantName: { RED: "Đỏ", YELLOW: "Vàng", BLUE: "Xanh dương", GREEN: "Xanh lá" },
  topicName: {
    "Work/Study": "Công việc / Học tập",
    "People/Relationships": "Mối quan hệ",
    "Body/Health": "Cơ thể / Sức khỏe",
    "Stress Event": "Sự kiện căng thẳng",
    "Achievement/Confidence": "Thành tựu / Tự tin",
    "Creativity/Music": "Sáng tạo / Âm nhạc",
    "Big Decisions": "Quyết định lớn",
    "Quick Reset": "Tái thiết nhanh",
  },
  targetName: {
    Myself: "Bản thân",
    Someone: "Ai đó",
    Situation: "Tình huống",
    Future: "Tương lai",
    Body: "Cơ thể",
  },
  needName: {
    Rest: "Nghỉ ngơi",
    Structure: "Cấu trúc",
    Reassurance: "Trấn an",
    Progress: "Tiến bộ",
    Connection: "Kết nối",
    Respect: "Tôn trọng",
    Autonomy: "Tự chủ",
    Clarity: "Sự rõ ràng",
    Fun: "Niềm vui",
    Safety: "An toàn",
  },
  contextFactors: {
    sleepQuality: "Chất lượng giấc ngủ (0-10)",
    physicalState: "Trạng thái thể chất",
    socialLoad: "Tải xã hội (0-10)",
    workLoad: "Tải công việc (0-10)",
    environment: "Môi trường",
    substances: "Ăn uống / Chất kích thích",
    note: "Ghi chú",
  },
};

// ============================================================
// Export
// ============================================================

const localizedCopy = createLocaleCopyMap<JournalUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
});

export function getJournalUiCopy(locale: AppLocale): JournalUiCopy {
  return localizedCopy[locale] ?? localizedCopy[DEFAULT_LOCALE];
}
