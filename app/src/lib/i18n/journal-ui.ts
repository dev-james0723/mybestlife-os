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
// (Phase 5 will fill in non-English translations. For now every
// non-English locale falls back to English via createLocaleCopyMap.)
// ============================================================

const zhTW: DeepPartial<JournalUiCopy> = {
  pageTitle: "日記",
  pageSubtitle: "結構化情緒處理",
  navGrateful: "感恩日記",
  newEntryTitle: "新增日誌",
  newEntryDescription: "記錄你的情緒體驗",
  labelDate: "日期",
  labelTopic: "主題",
  topicPlaceholder: "選擇主題",
  saveButton: "儲存日誌",
  savingButton: "儲存中…",
  savingSummaryButton: "正在產生摘要…",
  savedButton: "已儲存 ✓",
  startNewEntryButton: "開始新日誌",
  recentEntriesTitle: "最近的日誌",
  recentEntriesDescription: "你最近的 10 則日誌",
  recentEntriesEmpty: "尚無日誌 — 請在上方填寫並按下「儲存」。",
  recentEntriesSearchPlaceholder: "依內容搜尋…",
  trendsTitle: "每週情緒趨勢",
  unsavedTitle: "尚有未儲存的變更",
  unsavedDescription: "離開將遺失目前內容，確定嗎？",
  unsavedStay: "留下",
  unsavedLeave: "離開",
};

// ============================================================
// Export
// ============================================================

const localizedCopy = createLocaleCopyMap<JournalUiCopy>(en, {
  "zh-TW": zhTW,
});

export function getJournalUiCopy(locale: AppLocale): JournalUiCopy {
  return localizedCopy[locale] ?? localizedCopy[DEFAULT_LOCALE];
}
