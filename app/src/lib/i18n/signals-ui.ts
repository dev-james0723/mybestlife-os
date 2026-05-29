import { DEFAULT_LOCALE, type AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";
import type {
  SignalContentType,
  SignalMediaType,
  SignalRegionFacet,
  SignalRelevanceBasis,
  SignalRelevanceFacet,
  SignalsFeedIntensity,
  SignalsGallerySpeed,
  SignalSourceFacet,
  SignalsTone,
  SignalsViewMode,
  SignalTimeFacet,
  SignalTopicPriority,
  SignalTypeFacet,
} from "@/lib/signals/types";
import type {
  SignalConsentKey,
  SignalPurposeId,
  SignalTopicId,
} from "@/lib/signals/constants";

/**
 * Signals page + onboarding + settings copy. English is canonical; zh-TW is
 * authored for the high-visibility strings, the rest fall back to English via
 * `createLocaleCopyMap`. Option labels are keyed by STABLE ids so preferences
 * survive language changes.
 */
export type SignalsUiCopy = {
  pageTitle: string;
  pageSubtitle: string;

  header: {
    refresh: string;
    refreshing: string;
    settings: string;
    lastUpdated: (time: string) => string;
    liveBadge: string;
    demoBadge: string;
    /** Two distinct refresh actions (§ refresh). */
    refreshSources: string;
    regenerateTop3: string;
    filters: string;
    view: string;
  };

  states: {
    loadingTitle: string;
    loadingHint: string;
    refreshingTitle: string;
    regeneratingTitle: string;
    emptyTitle: string;
    emptyHint: string;
    filteredEmptyTitle: string;
    filteredEmptyHint: string;
    errorTitle: string;
    errorHint: string;
    retry: string;
    demoBanner: string;
    caughtUpTitle: string;
    caughtUpSubtitle: string;
    showMore: string;
  };

  views: {
    label: string;
    modes: Record<SignalsViewMode, string>;
  };

  filters: {
    title: string;
    button: string;
    clearAll: string;
    apply: string;
    activeCount: (n: number) => string;
    showMoreFromTopic: (topic: string) => string;
    groups: {
      type: string;
      topic: string;
      media: string;
      region: string;
      source: string;
      time: string;
      relevance: string;
    };
    excludeMuted: string;
    type: Record<SignalTypeFacet, string>;
    media: Record<SignalMediaType, string>;
    region: Record<SignalRegionFacet, string>;
    source: Record<SignalSourceFacet, string>;
    time: Record<SignalTimeFacet, string>;
    relevance: Record<SignalRelevanceFacet, string>;
  };

  gallery: {
    title: string;
    enable: string;
    speed: string;
    speedLabels: Record<SignalsGallerySpeed, string>;
    play: string;
    pause: string;
    pausedHint: string;
    reducedMotionNote: string;
  };

  markets: {
    title: string;
    subtitle: string;
    empty: string;
    enable: string;
    disclaimer: string;
    whyItMatters: string;
  };

  video: {
    title: string;
    subtitle: string;
    empty: string;
    enable: string;
    watch: string;
    channelLabel: (name: string) => string;
    detailsLimited: string;
  };

  customTopics: {
    title: string;
    subtitle: string;
    add: string;
    namePlaceholder: string;
    keywords: string;
    keywordsPlaceholder: string;
    sources: string;
    sourcesPlaceholder: string;
    feeds: string;
    feedsPlaceholder: string;
    priority: string;
    priorityLabels: Record<SignalTopicPriority, string>;
    includeInTop3: string;
    follow: string;
    mute: string;
    unmute: string;
    remove: string;
    rename: string;
    empty: string;
    mutedBadge: string;
    save: string;
    cancel: string;
  };

  sections: {
    top3Title: string;
    top3Subtitle: string;
    worldTitle: string;
    worldSubtitle: string;
    localTitle: string;
    localSubtitle: string;
    localCity: (city: string) => string;
    localNoLocation: string;
    localChangeCity: string;
    localPrecisionNote: string;
    personalTitle: string;
    personalSubtitle: string;
    personalEmpty: string;
  };

  card: {
    whyItMatters: string;
    whyForYou: string;
    whyThisSignal: string;
    suggestedAction: string;
    save: string;
    saved: string;
    dismiss: string;
    moreLikeThis: string;
    lessLikeThis: string;
    openSource: string;
    checkedAgo: (label: string) => string;
    sourcesReporting: (count: number) => string;
    sampleNote: string;
    contentType: Record<SignalContentType, string>;
    expand: string;
    collapse: string;
    /** AI overview (source-grounded, §16). */
    overview: string;
    overviewLimited: string;
    overviewGroundedNote: string;
    /** Thumbnail fallback states. */
    imageUnavailable: string;
    /** Extra interactions. */
    muteSource: string;
    followTopic: string;
  };

  /** Honest "why this signal?" reasons, generated from the relevance basis. */
  relevanceReason: Record<SignalRelevanceBasis, (term?: string) => string>;

  onboarding: {
    skip: string;
    back: string;
    continue: string;
    finish: string;
    step: (current: number, total: number) => string;
    promiseTitle: string;
    promiseBody: string;
    purposeTitle: string;
    purposeSubtitle: string;
    purposePickHint: (max: number) => string;
    topicsTitle: string;
    topicsSubtitle: string;
    topicsPickHint: (min: number, max: number) => string;
    consentTitle: string;
    consentSubtitle: string;
    consentTopicOnly: string;
    selectedCount: (n: number) => string;
  };

  settings: {
    title: string;
    description: string;
    followedTopics: string;
    mutedSources: string;
    mutedSourcesEmpty: string;
    feedIntensity: string;
    tone: string;
    dataUsage: string;
    resetPersonalization: string;
    done: string;
  };

  feedIntensityLabels: Record<SignalsFeedIntensity, string>;
  toneLabels: Record<SignalsTone, string>;
  purposeLabels: Record<SignalPurposeId, string>;
  topicLabels: Record<SignalTopicId, string>;
  consentLabels: Record<SignalConsentKey, { label: string; hint: string }>;

  toast: {
    savedToBrain: string;
    savedToBrainNoEmbed: string;
    saveFailed: string;
    demoCannotSave: string;
    dismissed: string;
    moreAck: string;
    lessAck: string;
    sourceMuted: string;
    topicFollowed: string;
    locationDetected: (city: string) => string;
    locationDenied: string;
  };
};

const en: SignalsUiCopy = {
  pageTitle: "Signals",
  pageSubtitle: "What's worth your attention today.",
  header: {
    refresh: "Refresh",
    refreshing: "Refreshing…",
    settings: "Signals settings",
    lastUpdated: (time) => `Updated ${time}`,
    liveBadge: "Live sources",
    demoBadge: "Demo data",
    refreshSources: "Refresh latest sources",
    regenerateTop3: "Regenerate my Top 3",
    filters: "Filters",
    view: "View",
  },
  states: {
    loadingTitle: "Finding today's strongest signals…",
    loadingHint: "Scanning your sources and ranking by relevance.",
    refreshingTitle: "Refreshing world, local, and personal signals…",
    regeneratingTitle: "Regenerating your Top 3…",
    emptyTitle: "No strong signals found yet.",
    emptyHint: "Try adjusting your topics or source preferences.",
    filteredEmptyTitle: "No strong signals found for these filters.",
    filteredEmptyHint: "Try clearing filters or adding more topics.",
    errorTitle: "Signals could not be updated.",
    errorHint: "Try again later.",
    retry: "Try again",
    demoBanner: "Demo signals shown. Connect live sources to enable real-time updates.",
    caughtUpTitle: "That's your signal for today.",
    caughtUpSubtitle: "You're caught up.",
    showMore: "Show more",
  },
  views: {
    label: "View",
    modes: {
      editorial: "Editorial",
      grid: "Grid",
      table: "Table",
      compact: "Compact",
      gallery: "Gallery",
    },
  },
  filters: {
    title: "Filter signals",
    button: "Filters",
    clearAll: "Clear all",
    apply: "Apply",
    activeCount: (n) => `${n} active`,
    showMoreFromTopic: (topic) => `More from ${topic}`,
    groups: {
      type: "Type",
      topic: "Topic",
      media: "Media",
      region: "Region",
      source: "Source",
      time: "Time",
      relevance: "Sort by",
    },
    excludeMuted: "Hide muted sources",
    type: {
      all: "All",
      world: "World",
      local: "Local",
      personal: "Personal",
      markets: "Markets",
      tech: "Tech",
      video: "Video",
      saved: "Saved",
      hidden: "Hidden",
    },
    media: {
      article: "Articles",
      video: "Videos",
      audio: "Audio",
      market: "Market",
      alert: "Alerts",
    },
    region: {
      any: "Anywhere",
      global: "Global",
      local: "Local",
      selected: "My city",
      HK: "Hong Kong",
      US: "United States",
      JP: "Japan",
      EU: "Europe",
    },
    source: {
      any: "Any source",
      preferred: "Preferred",
      official: "Official",
      mainstream: "Mainstream",
      tech: "Tech",
      finance: "Finance",
      youtube: "YouTube",
    },
    time: {
      any: "Any time",
      today: "Today",
      "24h": "Last 24h",
      week: "This week",
      developing: "Developing",
    },
    relevance: {
      relevant: "Most relevant",
      important: "Most important",
      local: "Local first",
      recent: "Most recent",
      saved: "Saved first",
      blind_spot: "Blind spots",
    },
  },
  gallery: {
    title: "Auto-rotate gallery",
    enable: "Auto-rotate signals",
    speed: "Speed",
    speedLabels: {
      slow: "Slow (60s)",
      normal: "Normal (30s)",
      fast: "Fast (15s)",
    },
    play: "Play",
    pause: "Pause",
    pausedHint: "Paused",
    reducedMotionNote: "Auto-rotate respects your reduced-motion setting.",
  },
  markets: {
    title: "Markets",
    subtitle: "Source-grounded market news.",
    empty: "No market signals right now.",
    enable: "Show Markets",
    disclaimer: "News only — no live quotes, prices, or financial advice.",
    whyItMatters: "Why it matters",
  },
  video: {
    title: "Video Signals",
    subtitle: "Selected channels, grounded in real uploads.",
    empty: "No video signals right now.",
    enable: "Show Video",
    watch: "Watch",
    channelLabel: (name) => `${name}`,
    detailsLimited: "Video details limited. Open source for full context.",
  },
  customTopics: {
    title: "Custom topics",
    subtitle: "Follow your own topics with keywords, sources, and feeds.",
    add: "Add topic",
    namePlaceholder: "Topic name (e.g. Robotics)",
    keywords: "Keywords",
    keywordsPlaceholder: "Comma-separated keywords",
    sources: "Preferred sources",
    sourcesPlaceholder: "e.g. reuters.com, ft.com",
    feeds: "RSS/Atom feeds",
    feedsPlaceholder: "https://example.com/feed.xml",
    priority: "Priority",
    priorityLabels: { low: "Low", normal: "Normal", high: "High" },
    includeInTop3: "Eligible for Daily Top 3",
    follow: "Follow",
    mute: "Mute",
    unmute: "Unmute",
    remove: "Remove",
    rename: "Rename",
    empty: "No custom topics yet. Add one to sharpen your signals.",
    mutedBadge: "Muted",
    save: "Save",
    cancel: "Cancel",
  },
  sections: {
    top3Title: "Daily Top 3",
    top3Subtitle: "The few things worth your attention today.",
    worldTitle: "World Signals",
    worldSubtitle: "High-signal global stories.",
    localTitle: "Local Signals",
    localSubtitle: "Close to where you are.",
    localCity: (city) => `Local — ${city}`,
    localNoLocation: "Turn on location, or pick a city, to see local signals.",
    localChangeCity: "Change city",
    localPrecisionNote: "City/region level — not district-precise.",
    personalTitle: "Personal Signals",
    personalSubtitle: "Connected to your projects, topics, and notes.",
    personalEmpty:
      "Enable Life OS data in settings, or follow more topics, to surface personal signals.",
  },
  card: {
    whyItMatters: "Why it matters",
    whyForYou: "Why it's for you",
    whyThisSignal: "Why this signal?",
    suggestedAction: "Suggested action",
    save: "Save to Brain",
    saved: "Saved",
    dismiss: "Dismiss",
    moreLikeThis: "More like this",
    lessLikeThis: "Less like this",
    openSource: "Open source",
    checkedAgo: (label) => `checked ${label}`,
    sourcesReporting: (count) => `${count} sources reporting`,
    sampleNote: "Sample signal — connect a source to personalize.",
    contentType: {
      breaking: "Breaking",
      developing: "Developing",
      analysis: "Analysis",
      opinion: "Opinion",
      local: "Local",
      global: "Global",
      personal: "Personal",
    },
    expand: "Expand",
    collapse: "Collapse",
    overview: "Overview",
    overviewLimited: "Overview limited — open source for full details.",
    overviewGroundedNote: "Summarized from the source.",
    imageUnavailable: "Image unavailable",
    muteSource: "Mute source",
    followTopic: "Follow topic",
  },
  relevanceReason: {
    topic_match: (term) => `Matches a topic you follow: ${term ?? "your topics"}.`,
    brain_similarity: (term) =>
      term ? `Connects to your Brain topic: ${term}.` : "Connects to your Brain.",
    project_match: (term) =>
      term ? `Relevant to your project: ${term}.` : "Relevant to one of your projects.",
    calendar_proximity: (term) =>
      term ? `Related to something on your calendar: ${term}.` : "Related to your calendar.",
    task_match: (term) =>
      term ? `Matches one of your tasks: ${term}.` : "Matches one of your tasks.",
    location_match: (term) =>
      term ? `Local to your selected city: ${term}.` : "Local to where you are.",
    behavior: () => "Based on what you've been reading in Signals.",
    global_importance: () => "A major story today.",
    blind_spot: (term) =>
      term
        ? `Outside your usual topics (${term}) — a deliberate broadening signal.`
        : "Outside your usual topics — a deliberate broadening signal.",
    demo: () => "Sample signal — connect a source to personalize.",
  },
  onboarding: {
    skip: "Skip for now",
    back: "Back",
    continue: "Continue",
    finish: "Show my signals",
    step: (current, total) => `Step ${current} of ${total}`,
    promiseTitle: "Better signal, not more news.",
    promiseBody:
      "Signals finds the few things worth your attention each day — from the world, your city, and your own projects. Never random, always from real sources.",
    purposeTitle: "What are you here for?",
    purposeSubtitle: "Pick what matters most — this shapes what we emphasize.",
    purposePickHint: (max) => `Pick up to ${max}.`,
    topicsTitle: "Choose your topics",
    topicsSubtitle: "We pre-selected a few based on your purpose. Adjust freely.",
    topicsPickHint: (min, max) => `Pick ${min}–${max}.`,
    consentTitle: "What can Signals use?",
    consentSubtitle:
      "Everything is off by default. Turn on only what you're comfortable with — it stays in your OS.",
    consentTopicOnly:
      "You can use Signals with topics only. Personal data is never used unless you turn it on here.",
    selectedCount: (n) => `${n} selected`,
  },
  settings: {
    title: "Signals settings",
    description: "Tune what you follow and what Signals may use.",
    followedTopics: "Followed topics",
    mutedSources: "Muted sources",
    mutedSourcesEmpty: "No muted sources yet.",
    feedIntensity: "Feed intensity",
    tone: "Reading tone",
    dataUsage: "Life OS data usage",
    resetPersonalization: "Reset Signals preferences",
    done: "Done",
  },
  feedIntensityLabels: {
    top3: "Top 3 only",
    light: "Light briefing",
    balanced: "Balanced",
    deep: "Deep",
  },
  toneLabels: {
    calm: "Calm",
    executive: "Executive",
    analytical: "Analytical",
    "local-first": "Local-first",
    "global-first": "Global-first",
    "career-focused": "Career-focused",
    "learning-focused": "Learning-focused",
  },
  purposeLabels: {
    understand_world: "Understand the world",
    track_ai_tech: "Track AI & technology",
    career_awareness: "Career awareness",
    finance_markets: "Finance & markets",
    arts_culture: "Arts & culture",
    law_policy: "Law & policy",
    education: "Education",
    personal_projects: "Personal projects",
    discover_ideas: "Discover new ideas",
    avoid_overload: "Avoid overload",
  },
  topicLabels: {
    AI: "AI",
    Technology: "Technology",
    Business: "Business",
    Startups: "Startups",
    Finance: "Finance",
    "World affairs": "World affairs",
    Law: "Law",
    Education: "Education",
    Music: "Music",
    Arts: "Arts",
    Design: "Design",
    Culture: "Culture",
    Science: "Science",
    Climate: "Climate",
    Health: "Health",
    Travel: "Travel",
    Local: "Local",
  },
  consentLabels: {
    useBrainContext: {
      label: "Use my Brain topics & notes",
      hint: "Match signals to themes in your notes and ideas.",
    },
    useProjects: {
      label: "Use my active Projects & Goals",
      hint: "Surface stories relevant to what you're building.",
    },
    useCalendar: {
      label: "Use my Calendar",
      hint: "Upcoming events make event-adjacent stories timely.",
    },
    useTasks: { label: "Use my Tasks", hint: "Match signals to your task keywords." },
    useLocation: {
      label: "Use my Location",
      hint: "Detects your current city; override to any city anytime.",
    },
    useReadingBehavior: {
      label: "Learn from my reading behavior",
      hint: "Improve ranking from what you save and dismiss.",
    },
  },
  toast: {
    savedToBrain: "Saved to Brain.",
    savedToBrainNoEmbed: "Saved to Brain (indexing will catch up shortly).",
    saveFailed: "Could not save to Brain.",
    demoCannotSave: "This is a demo signal — connect a live source before saving.",
    dismissed: "Dismissed.",
    moreAck: "We'll show more like this.",
    lessAck: "We'll show less like this.",
    sourceMuted: "Source muted.",
    topicFollowed: "Topic followed.",
    locationDetected: (city) => `Showing local signals for ${city}.`,
    locationDenied: "Location unavailable — pick a city instead.",
  },
};

const zhTW: DeepPartial<SignalsUiCopy> = {
  pageTitle: "訊號",
  pageSubtitle: "今天值得你關注的事。",
  header: {
    refresh: "重新整理",
    refreshing: "更新中…",
    settings: "訊號設定",
    lastUpdated: (time) => `更新於 ${time}`,
    liveBadge: "即時來源",
    demoBadge: "示範資料",
    refreshSources: "重新整理最新來源",
    regenerateTop3: "重新產生精選 3 則",
    filters: "篩選",
    view: "檢視",
  },
  states: {
    loadingTitle: "正在尋找今天最重要的訊號…",
    loadingHint: "掃描來源並依相關性排序。",
    refreshingTitle: "正在更新世界、在地與個人訊號…",
    regeneratingTitle: "正在重新產生你的精選 3 則…",
    emptyTitle: "尚未找到強訊號。",
    emptyHint: "試試調整你的主題或來源偏好。",
    filteredEmptyTitle: "這些篩選條件下沒有強訊號。",
    filteredEmptyHint: "試試清除篩選或新增更多主題。",
    errorTitle: "無法更新訊號。",
    errorHint: "請稍後再試。",
    retry: "重試",
    demoBanner: "顯示示範訊號。連接即時來源以啟用實時更新。",
    caughtUpTitle: "這就是你今天的訊號。",
    caughtUpSubtitle: "你已看完了。",
    showMore: "顯示更多",
  },
  sections: {
    top3Title: "每日精選 3 則",
    top3Subtitle: "今天少數值得你關注的事。",
    worldTitle: "世界訊號",
    worldSubtitle: "高價值的全球新聞。",
    localTitle: "在地訊號",
    localSubtitle: "靠近你所在的地方。",
    localCity: (city) => `在地 — ${city}`,
    localNoLocation: "開啟定位或選擇城市，以查看在地訊號。",
    localChangeCity: "更改城市",
    localPrecisionNote: "城市／地區層級 — 非精確到區。",
    personalTitle: "個人訊號",
    personalSubtitle: "與你的專案、主題與筆記相關。",
    personalEmpty: "在設定中啟用 Life OS 資料，或追蹤更多主題，以顯示個人訊號。",
  },
  card: {
    whyItMatters: "為何重要",
    whyForYou: "為何與你有關",
    whyThisSignal: "為何是這則訊號？",
    suggestedAction: "建議行動",
    save: "存到 Brain",
    saved: "已儲存",
    dismiss: "略過",
    moreLikeThis: "多一些這類",
    lessLikeThis: "少一些這類",
    openSource: "開啟來源",
    checkedAgo: (label) => `${label}前檢查`,
    sourcesReporting: (count) => `${count} 個來源報導中`,
    sampleNote: "示範訊號 — 連接來源以個人化。",
    expand: "展開",
    collapse: "收合",
    overview: "概要",
    overviewLimited: "概要有限 — 開啟來源以了解完整內容。",
    overviewGroundedNote: "摘自來源內容。",
    imageUnavailable: "圖片無法顯示",
    muteSource: "靜音來源",
    followTopic: "追蹤主題",
  },
  onboarding: {
    skip: "暫時略過",
    back: "上一步",
    continue: "繼續",
    finish: "顯示我的訊號",
    promiseTitle: "更好的訊號，而非更多新聞。",
    promiseBody:
      "Signals 每天為你找出少數值得關注的事 — 來自世界、你的城市，以及你自己的專案。絕不隨機，永遠來自真實來源。",
    purposeTitle: "你來這裡的目的是？",
    purposeSubtitle: "選出最重要的 — 這會影響我們強調的內容。",
    topicsTitle: "選擇你的主題",
    topicsSubtitle: "我們已依你的目的預選了幾個，可自由調整。",
    consentTitle: "Signals 可以使用什麼？",
    consentSubtitle: "預設全部關閉。只開啟你願意的 — 資料只留在你的 OS 內。",
    consentTopicOnly: "你可以只用主題模式。除非你在此開啟，否則不會使用個人資料。",
  },
  settings: {
    title: "訊號設定",
    description: "調整你追蹤的內容，以及 Signals 可使用的資料。",
    followedTopics: "追蹤的主題",
    mutedSources: "已靜音的來源",
    feedIntensity: "資訊量",
    tone: "閱讀風格",
    dataUsage: "Life OS 資料使用",
    resetPersonalization: "重設 Signals 偏好",
    done: "完成",
  },
  views: {
    label: "檢視",
    modes: {
      editorial: "編輯式",
      grid: "網格",
      table: "表格",
      compact: "精簡",
      gallery: "輪播",
    },
  },
  filters: {
    title: "篩選訊號",
    button: "篩選",
    clearAll: "全部清除",
    apply: "套用",
    activeCount: (n) => `${n} 項啟用`,
    showMoreFromTopic: (topic) => `更多 ${topic}`,
    groups: {
      type: "類型",
      topic: "主題",
      media: "媒體",
      region: "地區",
      source: "來源",
      time: "時間",
      relevance: "排序",
    },
    excludeMuted: "隱藏已靜音來源",
    type: {
      all: "全部",
      world: "世界",
      local: "在地",
      personal: "個人",
      markets: "市場",
      tech: "科技",
      video: "影片",
      saved: "已儲存",
      hidden: "已隱藏",
    },
    media: {
      article: "文章",
      video: "影片",
      audio: "音訊",
      market: "市場",
      alert: "警示",
    },
    region: {
      any: "不限",
      global: "全球",
      local: "在地",
      selected: "我的城市",
      HK: "香港",
      US: "美國",
      JP: "日本",
      EU: "歐洲",
    },
    source: {
      any: "任何來源",
      preferred: "偏好",
      official: "官方",
      mainstream: "主流",
      tech: "科技",
      finance: "財經",
      youtube: "YouTube",
    },
    time: {
      any: "不限時間",
      today: "今天",
      "24h": "近 24 小時",
      week: "本週",
      developing: "發展中",
    },
    relevance: {
      relevant: "最相關",
      important: "最重要",
      local: "在地優先",
      recent: "最新",
      saved: "已儲存優先",
      blind_spot: "盲點",
    },
  },
  gallery: {
    title: "自動輪播",
    enable: "自動輪播訊號",
    speed: "速度",
    speedLabels: {
      slow: "慢（60 秒）",
      normal: "正常（30 秒）",
      fast: "快（15 秒）",
    },
    play: "播放",
    pause: "暫停",
    pausedHint: "已暫停",
    reducedMotionNote: "自動輪播會遵循你的減少動態設定。",
  },
  markets: {
    title: "市場",
    subtitle: "有來源依據的市場新聞。",
    empty: "目前沒有市場訊號。",
    enable: "顯示市場",
    disclaimer: "僅新聞 — 不提供即時報價、價格或投資建議。",
    whyItMatters: "為何重要",
  },
  video: {
    title: "影片訊號",
    subtitle: "精選頻道，皆來自真實上傳。",
    empty: "目前沒有影片訊號。",
    enable: "顯示影片",
    watch: "觀看",
    channelLabel: (name) => `${name}`,
    detailsLimited: "影片資訊有限。開啟來源以了解完整內容。",
  },
  customTopics: {
    title: "自訂主題",
    subtitle: "用關鍵字、來源與訂閱來追蹤你自己的主題。",
    add: "新增主題",
    namePlaceholder: "主題名稱（例如 機器人）",
    keywords: "關鍵字",
    keywordsPlaceholder: "以逗號分隔的關鍵字",
    sources: "偏好來源",
    sourcesPlaceholder: "例如 reuters.com, ft.com",
    feeds: "RSS/Atom 訂閱",
    feedsPlaceholder: "https://example.com/feed.xml",
    priority: "優先度",
    priorityLabels: { low: "低", normal: "一般", high: "高" },
    includeInTop3: "可進入每日精選 3 則",
    follow: "追蹤",
    mute: "靜音",
    unmute: "取消靜音",
    remove: "移除",
    rename: "重新命名",
    empty: "尚無自訂主題。新增一個讓訊號更精準。",
    mutedBadge: "已靜音",
    save: "儲存",
    cancel: "取消",
  },
};

const localized = createLocaleCopyMap<SignalsUiCopy>(en, { "zh-TW": zhTW });

export function getSignalsUiCopy(locale: AppLocale): SignalsUiCopy {
  return localized[locale] ?? localized[DEFAULT_LOCALE];
}
