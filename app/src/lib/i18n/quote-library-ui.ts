import type { AppLocale } from "./app-locale";
import { DEFAULT_LOCALE } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";
import {
  QUOTE_CATEGORY_VALUES,
  QUOTE_EMOTION_TONES,
  type QuoteCategory,
  type QuoteEmotionTone,
} from "@/types/quote";
import type { QuoteCategoryGroupId } from "@/lib/quote-library/categories";

export type QuoteLibraryUiCopy = {
  // Page chrome
  pageTitle: string;
  pageDescription: string;
  addQuote: string;
  addQuoteAria: string;
  settingsAction: string;

  // Tabs
  tabAll: string;
  tabCollections: string;
  tabWisdom: string;

  // Search / filter bar
  searchPlaceholder: string;
  filterCategory: string;
  filterTone: string;
  filterSource: string;
  filterTags: string;
  filterFavorites: string;
  filterFavoritesOnly: string;
  filterClear: string;
  filterDateRange: string;
  filterAny: string;
  sortPlaceholder: string;
  sortNewest: string;
  sortOldest: string;
  sortAuthor: string;
  sortCategory: string;
  sortTone: string;

  // Empty / loading / error
  emptyAllTitle: string;
  emptyAllDescription: string;
  emptyAllAction: string;
  emptySearchTitle: string;
  emptySearchDescription: string;
  emptyCollectionsTitle: string;
  emptyCollectionsDescription: string;
  emptyCollectionsAction: string;
  emptyWisdomTitle: string;
  emptyWisdomDescription: (progress: number, target: number) => string;
  loadingLibrary: string;
  errorGeneric: string;

  // Add / edit quote sheet
  addSheetTitle: string;
  editSheetTitle: string;
  labelQuote: string;
  labelAuthor: string;
  labelContext: string;
  labelUrl: string;
  labelCategory: string;
  labelTags: string;
  labelTone: string;
  labelPersonalNote: string;
  labelLanguage: string;
  labelSourceType: string;
  labelMarkFavorite: string;
  placeholderQuote: string;
  placeholderAuthor: string;
  placeholderContext: string;
  placeholderUrl: string;
  placeholderPersonalNote: string;
  placeholderTags: string;
  helperTags: string;
  buttonCancel: string;
  buttonSave: string;
  buttonSaving: string;
  buttonUpdate: string;

  // Card
  cardFavoriteAria: string;
  cardUnfavoriteAria: string;
  cardOpenAria: string;
  cardEditAria: string;
  cardDeleteAria: string;
  cardAiEnriched: string;
  cardSourceUnverified: string;
  cardAuthorUnknown: string;
  cardAboutAuthor: string;
  cardRelatedQuotes: string;
  cardNoRelatedQuotes: string;
  cardLinkedGoal: string;

  // Delete confirm
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  buttonDelete: string;

  // Favorite toast
  toastFavorited: string;
  toastUnfavorited: string;
  toastSaved: string;
  toastUpdated: string;
  toastDeleted: string;
  toastSaveFailed: string;
  toastUpdateFailed: string;
  toastDeleteFailed: string;
  toastFavoriteFailed: string;
  toastTaggingInProgress: string;
  toastTaggingSucceeded: string;
  toastTaggingFailed: string;
  toastEnrichmentStarted: string;
  toastEnrichmentFailed: string;

  // Cinematic thumbnails
  thumbnailGenerating: string;
  thumbnailRegenerate: string;
  thumbnailRegenerating: string;
  thumbnailRetry: string;
  thumbnailFallbackBadge: string;
  thumbnailFailedHelper: string;
  thumbnailMetaTitle: string;
  thumbnailMetaMood: string;
  thumbnailMetaPalette: string;
  thumbnailMetaProvider: string;
  thumbnailMetaGeneratedAt: string;
  thumbnailMetaPrompt: string;
  thumbnailMetaError: string;
  toastThumbnailReady: string;
  toastThumbnailFallback: string;
  toastThumbnailRegenerating: string;
  toastThumbnailRegenerateFailed: string;

  // Quote of the Day
  qotdTitle: string;
  qotdDescription: string;
  qotdDismiss: string;

  // Collections
  collectionsHeading: string;
  newCollection: string;
  collectionNameLabel: string;
  collectionDescriptionLabel: string;
  collectionSave: string;
  collectionDelete: string;
  collectionRename: string;
  collectionMemberCount: (n: number) => string;
  collectionMembershipAdd: string;
  collectionMembershipRemove: string;
  collectionEmptyTitle: string;
  collectionEmptyDescription: string;

  // Wisdom Profile
  wisdomChartTitle: string;
  wisdomThemesTitle: string;
  wisdomInsightTitle: string;
  wisdomRefresh: string;
  wisdomRefreshing: string;
  wisdomLastComputed: string;
  wisdomExportJournal: string;

  // Settings within Quote Library surface
  settingsTitle: string;
  settingsShowAiBadge: string;
  settingsClearSeeds: string;
  settingsClearSeedsConfirm: string;

  // Sharing / export
  shareAsImage: string;
  exportCsv: string;
  exportPdf: string;

  // Language picker
  languageAuto: string;

  // Cross-module SDK surfaces
  resonantHeading: string;
  resonantSubhead: string;
  resonantEmpty: string;
  resonantLoading: string;
  resonantMatchPct: (percent: number) => string;
  resonantRefresh: string;
  sendToJournal: string;
  sendToJournalConfirm: string;
  sendToJournalSuccess: string;
  sendToJournalFailed: string;
  dashboardQuoteTitle: string;
  dashboardQuoteEmpty: string;
  dashboardInspireMe: string;
  dashboardInspireReason: string;
  dashboardInspireThinking: string;
  dashboardInspireEmpty: string;
  dashboardQuoteShuffle: string;
  mindClearExternalQuote: string;
  mindClearExternalQuoteHelper: string;
  mindClearAddToLibrary: string;
  mindClearAddedToast: string;
  mindClearAddFailed: string;
  mindClearGenerate: string;
  mindClearGenerating: string;
  mindClearNothingFound: string;
  goalLinkedQuotes: string;
  goalLinkedQuotesEmpty: string;
  goalLinkQuote: string;
  goalPickerTitle: string;
  goalPickerSearch: string;
  goalPickerNone: string;
  goalPickerAny: string;
  unlinkQuoteFromGoal: string;
  linkedQuoteToGoal: string;
  unlinkedQuoteFromGoal: string;

  // Category labels (all 30)
  categoryLabels: Record<QuoteCategory, string>;
  categoryGroupLabels: Record<QuoteCategoryGroupId, string>;
  toneLabels: Record<QuoteEmotionTone, string>;
};

// ============================================================
// English (base — all 9 locales fall back here for missing keys)
// ============================================================

const en: QuoteLibraryUiCopy = {
  pageTitle: "Quote Library",
  pageDescription: "Capture the words that shape you, and let them find you when you need them.",
  addQuote: "Add quote",
  addQuoteAria: "Add a new quote",
  settingsAction: "Library settings",

  tabAll: "All quotes",
  tabCollections: "Collections",
  tabWisdom: "My Wisdom Profile",

  searchPlaceholder: "Search quotes, authors, tags…",
  filterCategory: "Category",
  filterTone: "Tone",
  filterSource: "Source",
  filterTags: "Tag",
  filterFavorites: "Favorites",
  filterFavoritesOnly: "Favorites only",
  filterClear: "Clear filters",
  filterDateRange: "Date added",
  filterAny: "Any",
  sortPlaceholder: "Sort by",
  sortNewest: "Newest first",
  sortOldest: "Oldest first",
  sortAuthor: "Author",
  sortCategory: "Category",
  sortTone: "Tone",

  emptyAllTitle: "Your library is waiting",
  emptyAllDescription:
    "Paste a line that moved you. I'll tag it, surface it, and make it easy to find again.",
  emptyAllAction: "Add your first quote",
  emptySearchTitle: "No matches",
  emptySearchDescription: "Try broader search terms, or clear some filters.",
  emptyCollectionsTitle: "No collections yet",
  emptyCollectionsDescription:
    "Group quotes by theme — e.g. Stoic reminders, Writing craft, Love letters.",
  emptyCollectionsAction: "New collection",
  emptyWisdomTitle: "Your Wisdom Profile is brewing",
  emptyWisdomDescription: (progress, target) =>
    `${progress} of ${target} quotes added — your Wisdom Profile unlocks at ${target}.`,
  loadingLibrary: "Loading your library…",
  errorGeneric: "Something broke. Reload the page or try again in a moment.",

  addSheetTitle: "Add a quote",
  editSheetTitle: "Edit quote",
  labelQuote: "Quote",
  labelAuthor: "Author",
  labelContext: "Source",
  labelUrl: "Link",
  labelCategory: "Category",
  labelTags: "Tags",
  labelTone: "Tone",
  labelPersonalNote: "Why this matters to me",
  labelLanguage: "Language",
  labelSourceType: "Source type",
  labelMarkFavorite: "Mark as favorite",
  placeholderQuote: "Paste or type the quote…",
  placeholderAuthor: "e.g. Marcus Aurelius",
  placeholderContext: "e.g. Meditations, Book VI",
  placeholderUrl: "https://…",
  placeholderPersonalNote: "Optional — a sentence about why you saved this.",
  placeholderTags: "Press enter to add",
  helperTags: "AI will suggest tags after you save. You can override any time.",
  buttonCancel: "Cancel",
  buttonSave: "Save quote",
  buttonSaving: "Saving…",
  buttonUpdate: "Update",

  cardFavoriteAria: "Mark as favorite",
  cardUnfavoriteAria: "Remove from favorites",
  cardOpenAria: "Open quote",
  cardEditAria: "Edit quote",
  cardDeleteAria: "Delete quote",
  cardAiEnriched: "AI-enriched",
  cardSourceUnverified: "Source unverified",
  cardAuthorUnknown: "Unknown",
  cardAboutAuthor: "About the author",
  cardRelatedQuotes: "More from this author",
  cardNoRelatedQuotes: "No related quotes yet.",
  cardLinkedGoal: "Linked goal",

  deleteConfirmTitle: "Delete this quote?",
  deleteConfirmDescription:
    "Removing it also unlinks it from any collections. This cannot be undone.",
  buttonDelete: "Delete",

  toastFavorited: "Added to favorites",
  toastUnfavorited: "Removed from favorites",
  toastSaved: "Quote saved",
  toastUpdated: "Quote updated",
  toastDeleted: "Quote deleted",
  toastSaveFailed: "Could not save quote",
  toastUpdateFailed: "Could not update quote",
  toastDeleteFailed: "Could not delete quote",
  toastFavoriteFailed: "Could not update favorite",
  toastTaggingInProgress: "Tagging with AI…",
  toastTaggingSucceeded: "Tags added",
  toastTaggingFailed: "Auto-tagging failed — your quote is still saved.",
  toastEnrichmentStarted: "Looking up the author…",
  toastEnrichmentFailed: "Couldn't verify the author. Saved without enrichment.",

  thumbnailGenerating: "Conjuring atmosphere…",
  thumbnailRegenerate: "Regenerate thumbnail",
  thumbnailRegenerating: "Regenerating…",
  thumbnailRetry: "Try again",
  thumbnailFallbackBadge: "Calm fallback",
  thumbnailFailedHelper: "Thumbnail couldn't be rendered — your quote is safe.",
  thumbnailMetaTitle: "Thumbnail diagnostics",
  thumbnailMetaMood: "Mood",
  thumbnailMetaPalette: "Palette",
  thumbnailMetaProvider: "Provider",
  thumbnailMetaGeneratedAt: "Generated",
  thumbnailMetaPrompt: "Image prompt",
  thumbnailMetaError: "Last error",
  toastThumbnailReady: "Thumbnail ready",
  toastThumbnailFallback: "Couldn't render image — using a calm fallback gradient.",
  toastThumbnailRegenerating: "Regenerating thumbnail…",
  toastThumbnailRegenerateFailed: "Couldn't regenerate thumbnail. Try again in a moment.",

  qotdTitle: "Quote of the day",
  qotdDescription: "A line from your library, picked for today.",
  qotdDismiss: "Dismiss",

  collectionsHeading: "Collections",
  newCollection: "New collection",
  collectionNameLabel: "Name",
  collectionDescriptionLabel: "Description (optional)",
  collectionSave: "Save",
  collectionDelete: "Delete collection",
  collectionRename: "Rename collection",
  collectionMemberCount: (n) => (n === 1 ? "1 quote" : `${n} quotes`),
  collectionMembershipAdd: "Add to collection",
  collectionMembershipRemove: "Remove from collection",
  collectionEmptyTitle: "No quotes in this collection",
  collectionEmptyDescription: "Open a quote and choose “Add to collection.”",

  wisdomChartTitle: "Where your attention lives",
  wisdomThemesTitle: "Recurring themes",
  wisdomInsightTitle: "This month's insight",
  wisdomRefresh: "Refresh insight",
  wisdomRefreshing: "Refreshing…",
  wisdomLastComputed: "Last computed",
  wisdomExportJournal: "Send to Journal",

  settingsTitle: "Library settings",
  settingsShowAiBadge: "Show AI-enriched badge on cards",
  settingsClearSeeds: "Clear seed quotes",
  settingsClearSeedsConfirm:
    "Remove the 30 example quotes? Your own saved quotes are unaffected.",

  shareAsImage: "Share as image",
  exportCsv: "Export CSV",
  exportPdf: "Export PDF",

  languageAuto: "Auto-detected",

  resonantHeading: "Quotes that resonate",
  resonantSubhead: "From your library, matched to this entry.",
  resonantEmpty: "Nothing in your library resonates with this entry yet.",
  resonantLoading: "Finding quotes that fit…",
  resonantMatchPct: (percent) => `${percent}% match`,
  resonantRefresh: "Find resonant quotes",
  sendToJournal: "Send to Journal",
  sendToJournalConfirm: "Save this insight as a new journal entry?",
  sendToJournalSuccess: "Saved to your Journal",
  sendToJournalFailed: "Could not save to Journal",
  dashboardQuoteTitle: "Inspiration from your library",
  dashboardQuoteEmpty: "Add a favorite quote to see it here each morning.",
  dashboardInspireMe: "Inspire me",
  dashboardInspireReason: "Why this quote",
  dashboardInspireThinking: "Looking…",
  dashboardInspireEmpty: "Your library is empty — add a quote that moved you.",
  dashboardQuoteShuffle: "Another quote",
  mindClearExternalQuote: "A quote for this moment",
  mindClearExternalQuoteHelper: "Real, attributed — surfaced via live search.",
  mindClearAddToLibrary: "Save to Quote Library",
  mindClearAddedToast: "Saved to your Quote Library",
  mindClearAddFailed: "Could not save the quote",
  mindClearGenerate: "Find a fitting quote",
  mindClearGenerating: "Searching…",
  mindClearNothingFound: "No confident match right now — try adding more to your sweep.",
  goalLinkedQuotes: "Linked quotes",
  goalLinkedQuotesEmpty: "No quotes linked yet.",
  goalLinkQuote: "Link a quote",
  goalPickerTitle: "Pick a quote",
  goalPickerSearch: "Search your library…",
  goalPickerNone: "None (unlink)",
  goalPickerAny: "Any",
  unlinkQuoteFromGoal: "Unlink from this goal",
  linkedQuoteToGoal: "Linked to the goal",
  unlinkedQuoteFromGoal: "Unlinked from the goal",

  categoryLabels: Object.fromEntries(
    QUOTE_CATEGORY_VALUES.map((c) => [c, c]),
  ) as Record<QuoteCategory, string>,
  categoryGroupLabels: {
    "inner-life": "Inner life",
    "purpose-direction": "Purpose & direction",
    relationships: "Relationships",
    "action-mastery": "Action & mastery",
    "mind-time": "Mind & time",
  },
  toneLabels: Object.fromEntries(
    QUOTE_EMOTION_TONES.map((t) => [t, t.charAt(0).toUpperCase() + t.slice(1)]),
  ) as Record<QuoteEmotionTone, string>,
};

// ============================================================
// Traditional Chinese (zh-TW) — full translation
// ============================================================

const zhTW: QuoteLibraryUiCopy = {
  pageTitle: "語錄庫",
  pageDescription: "收藏打動你的文字，在需要時讓它們重新回來找你。",
  addQuote: "新增語錄",
  addQuoteAria: "新增一則語錄",
  settingsAction: "語錄庫設定",

  tabAll: "全部語錄",
  tabCollections: "收藏集",
  tabWisdom: "我的智慧檔案",

  searchPlaceholder: "搜尋語錄、作者、標籤…",
  filterCategory: "分類",
  filterTone: "語氣",
  filterSource: "來源",
  filterTags: "標籤",
  filterFavorites: "最愛",
  filterFavoritesOnly: "只看最愛",
  filterClear: "清除篩選",
  filterDateRange: "加入日期",
  filterAny: "不限",
  sortPlaceholder: "排序",
  sortNewest: "最新優先",
  sortOldest: "最舊優先",
  sortAuthor: "作者",
  sortCategory: "分類",
  sortTone: "語氣",

  emptyAllTitle: "你的語錄庫正在等你",
  emptyAllDescription: "貼上一句打動你的話，我會自動分類、整理，並在你需要時浮現。",
  emptyAllAction: "新增第一則語錄",
  emptySearchTitle: "找不到符合的語錄",
  emptySearchDescription: "試試更寬的搜尋字，或清除部分篩選條件。",
  emptyCollectionsTitle: "尚無收藏集",
  emptyCollectionsDescription:
    "依主題歸類你的語錄 —— 例如：斯多葛提醒、寫作心法、愛的書信。",
  emptyCollectionsAction: "新增收藏集",
  emptyWisdomTitle: "你的智慧檔案醞釀中",
  emptyWisdomDescription: (progress, target) =>
    `已收藏 ${progress} / ${target} 則 —— 累積 ${target} 則後即可解鎖智慧檔案。`,
  loadingLibrary: "載入你的語錄庫…",
  errorGeneric: "有點卡住了。請重新整理或稍後再試。",

  addSheetTitle: "新增語錄",
  editSheetTitle: "編輯語錄",
  labelQuote: "語錄",
  labelAuthor: "作者",
  labelContext: "出處",
  labelUrl: "連結",
  labelCategory: "分類",
  labelTags: "標籤",
  labelTone: "語氣",
  labelPersonalNote: "為什麼這對我有意義",
  labelLanguage: "語言",
  labelSourceType: "來源類型",
  labelMarkFavorite: "加入最愛",
  placeholderQuote: "貼上或輸入語錄…",
  placeholderAuthor: "例：馬可.奧理略",
  placeholderContext: "例：《沉思錄》卷六",
  placeholderUrl: "https://…",
  placeholderPersonalNote: "可選 —— 用一句話說明你為什麼保留這段文字。",
  placeholderTags: "按 Enter 新增",
  helperTags: "儲存後 AI 會自動建議標籤，你可以隨時覆蓋。",
  buttonCancel: "取消",
  buttonSave: "儲存語錄",
  buttonSaving: "儲存中…",
  buttonUpdate: "更新",

  cardFavoriteAria: "加入最愛",
  cardUnfavoriteAria: "移除最愛",
  cardOpenAria: "開啟語錄",
  cardEditAria: "編輯語錄",
  cardDeleteAria: "刪除語錄",
  cardAiEnriched: "AI 補充資料",
  cardSourceUnverified: "來源待驗證",
  cardAuthorUnknown: "佚名",
  cardAboutAuthor: "關於作者",
  cardRelatedQuotes: "這位作者的其他語錄",
  cardNoRelatedQuotes: "暫無相關語錄。",
  cardLinkedGoal: "連結目標",

  deleteConfirmTitle: "要刪除這則語錄嗎？",
  deleteConfirmDescription: "刪除後也會從所有收藏集移除，此操作無法復原。",
  buttonDelete: "刪除",

  toastFavorited: "已加入最愛",
  toastUnfavorited: "已移除最愛",
  toastSaved: "語錄已儲存",
  toastUpdated: "語錄已更新",
  toastDeleted: "語錄已刪除",
  toastSaveFailed: "儲存失敗",
  toastUpdateFailed: "更新失敗",
  toastDeleteFailed: "刪除失敗",
  toastFavoriteFailed: "更新最愛狀態失敗",
  toastTaggingInProgress: "AI 標籤分析中…",
  toastTaggingSucceeded: "已新增標籤",
  toastTaggingFailed: "自動標籤失敗 —— 語錄已儲存。",
  toastEnrichmentStarted: "正在查詢作者資料…",
  toastEnrichmentFailed: "無法驗證作者資料，已不補充儲存。",

  thumbnailGenerating: "正在描繪意境…",
  thumbnailRegenerate: "重新生成背景",
  thumbnailRegenerating: "重新生成中…",
  thumbnailRetry: "再試一次",
  thumbnailFallbackBadge: "靜謐備援",
  thumbnailFailedHelper: "背景圖無法生成，但語錄已安全儲存。",
  thumbnailMetaTitle: "背景診斷",
  thumbnailMetaMood: "情緒",
  thumbnailMetaPalette: "色盤",
  thumbnailMetaProvider: "來源",
  thumbnailMetaGeneratedAt: "生成時間",
  thumbnailMetaPrompt: "圖像提示",
  thumbnailMetaError: "上次錯誤",
  toastThumbnailReady: "背景已生成",
  toastThumbnailFallback: "圖像生成失敗，已套用靜謐漸層背景。",
  toastThumbnailRegenerating: "正在重新生成背景…",
  toastThumbnailRegenerateFailed: "重新生成失敗，稍後再試。",

  qotdTitle: "今日語錄",
  qotdDescription: "來自你語錄庫的一句話，為今天精選。",
  qotdDismiss: "關閉",

  collectionsHeading: "收藏集",
  newCollection: "新增收藏集",
  collectionNameLabel: "名稱",
  collectionDescriptionLabel: "描述（可選）",
  collectionSave: "儲存",
  collectionDelete: "刪除收藏集",
  collectionRename: "重新命名",
  collectionMemberCount: (n) => `${n} 則語錄`,
  collectionMembershipAdd: "加入收藏集",
  collectionMembershipRemove: "從收藏集移除",
  collectionEmptyTitle: "這個收藏集還沒有語錄",
  collectionEmptyDescription: "開啟一則語錄並選擇「加入收藏集」。",

  wisdomChartTitle: "你的注意力停在哪裡",
  wisdomThemesTitle: "反覆出現的主題",
  wisdomInsightTitle: "本月洞察",
  wisdomRefresh: "重新計算",
  wisdomRefreshing: "計算中…",
  wisdomLastComputed: "上次更新",
  wisdomExportJournal: "送到日記",

  settingsTitle: "語錄庫設定",
  settingsShowAiBadge: "在卡片上顯示 AI 補充資料標記",
  settingsClearSeeds: "清除示範語錄",
  settingsClearSeedsConfirm:
    "要移除 30 則示範語錄嗎？你自己儲存的語錄不會受影響。",

  shareAsImage: "產生分享圖",
  exportCsv: "匯出 CSV",
  exportPdf: "匯出 PDF",

  languageAuto: "自動判斷",

  resonantHeading: "與此刻共鳴的語錄",
  resonantSubhead: "從你的語錄庫中，挑選與這則日記相呼應的段落。",
  resonantEmpty: "目前語錄庫裡沒有與此則日記共鳴的段落。",
  resonantLoading: "搜尋共鳴的語錄…",
  resonantMatchPct: (percent) => `契合度 ${percent}%`,
  resonantRefresh: "尋找共鳴語錄",
  sendToJournal: "送到日記",
  sendToJournalConfirm: "要把這段洞察儲存為新的日記嗎？",
  sendToJournalSuccess: "已存入日記",
  sendToJournalFailed: "無法存入日記",
  dashboardQuoteTitle: "今日來自語錄庫的靈感",
  dashboardQuoteEmpty: "把一則最愛的語錄加到庫中，就能在早晨看到它。",
  dashboardInspireMe: "給我靈感",
  dashboardInspireReason: "為什麼挑這句",
  dashboardInspireThinking: "思考中…",
  dashboardInspireEmpty: "語錄庫還是空的 —— 加入一段打動你的文字吧。",
  dashboardQuoteShuffle: "換一句",
  mindClearExternalQuote: "此刻適合的一句話",
  mindClearExternalQuoteHelper: "經實際搜尋驗證的真實語錄。",
  mindClearAddToLibrary: "存入語錄庫",
  mindClearAddedToast: "已存入語錄庫",
  mindClearAddFailed: "存入語錄失敗",
  mindClearGenerate: "找一句貼合此刻的語錄",
  mindClearGenerating: "搜尋中…",
  mindClearNothingFound: "目前找不到明確匹配，試著多寫幾項看看。",
  goalLinkedQuotes: "連結語錄",
  goalLinkedQuotesEmpty: "尚未連結任何語錄。",
  goalLinkQuote: "連結一則語錄",
  goalPickerTitle: "選擇語錄",
  goalPickerSearch: "搜尋你的語錄庫…",
  goalPickerNone: "不連結（解除）",
  goalPickerAny: "不限",
  unlinkQuoteFromGoal: "從此目標解除連結",
  linkedQuoteToGoal: "已連結到目標",
  unlinkedQuoteFromGoal: "已解除與目標的連結",

  categoryLabels: {
    Resilience: "韌性",
    "Self-Awareness": "自我覺察",
    Mindfulness: "正念",
    Courage: "勇氣",
    Acceptance: "接納",
    Gratitude: "感恩",
    Purpose: "使命",
    Vision: "願景",
    Discipline: "自律",
    Growth: "成長",
    Learning: "學習",
    Creativity: "創造",
    Love: "愛",
    Friendship: "友誼",
    Kindness: "善意",
    Family: "家人",
    Community: "社群",
    Forgiveness: "寬恕",
    Action: "行動",
    Leadership: "領導",
    Craft: "手藝",
    Excellence: "精進",
    Simplicity: "簡約",
    Focus: "專注",
    Wisdom: "智慧",
    Perspective: "視角",
    Time: "時間",
    Change: "變化",
    "Death & Impermanence": "無常",
    Wonder: "驚奇",
  },
  categoryGroupLabels: {
    "inner-life": "內在生命",
    "purpose-direction": "使命與方向",
    relationships: "關係",
    "action-mastery": "行動與精熟",
    "mind-time": "心智與時間",
  },
  toneLabels: {
    uplifting: "鼓舞",
    contemplative: "沉思",
    challenging: "挑戰",
    grounding: "落地",
    bittersweet: "苦甜",
    playful: "俏皮",
    fierce: "剛烈",
    tender: "溫柔",
    curious: "好奇",
    resolute: "堅定",
  },
};

// ============================================================
// Simplified Chinese (zh-CN)
// ============================================================

const zhCN: QuoteLibraryUiCopy = {
  ...zhTW,
  pageTitle: "语录库",
  pageDescription: "收藏打动你的文字，在需要时让它们重新回来找你。",
  addQuote: "新增语录",
  addQuoteAria: "新增一条语录",
  settingsAction: "语录库设置",

  tabAll: "全部语录",
  tabCollections: "合集",
  tabWisdom: "我的智慧档案",

  searchPlaceholder: "搜索语录、作者、标签…",
  filterCategory: "分类",
  filterTone: "语气",
  filterSource: "来源",
  filterTags: "标签",
  filterFavorites: "收藏",
  filterFavoritesOnly: "只看收藏",
  filterClear: "清除筛选",
  filterDateRange: "添加日期",
  filterAny: "不限",
  sortPlaceholder: "排序",
  sortNewest: "最新优先",
  sortOldest: "最早优先",
  sortAuthor: "作者",
  sortCategory: "分类",
  sortTone: "语气",

  emptyAllTitle: "你的语录库正在等你",
  emptyAllDescription: "粘贴一句打动你的话，我会自动分类、整理，并在你需要时浮现。",
  emptyAllAction: "添加第一条语录",
  emptySearchTitle: "找不到匹配的语录",
  emptySearchDescription: "试试更宽泛的搜索关键字，或清除部分筛选。",
  emptyCollectionsTitle: "暂无合集",
  emptyCollectionsDescription: "按主题归类你的语录 —— 例如：斯多葛提醒、写作心法、爱的书信。",
  emptyCollectionsAction: "新增合集",
  emptyWisdomTitle: "你的智慧档案酝酿中",
  emptyWisdomDescription: (progress, target) =>
    `已收藏 ${progress} / ${target} 条 —— 积累 ${target} 条即可解锁智慧档案。`,
  loadingLibrary: "载入你的语录库…",
  errorGeneric: "有点卡住了。请刷新或稍后再试。",

  addSheetTitle: "新增语录",
  editSheetTitle: "编辑语录",
  labelPersonalNote: "为什么这对我有意义",
  labelMarkFavorite: "加入收藏",
  placeholderQuote: "粘贴或输入语录…",
  placeholderContext: "例：《沉思录》卷六",
  placeholderPersonalNote: "可选 —— 用一句话说明你为什么保留这段文字。",
  placeholderTags: "按回车添加",
  helperTags: "保存后 AI 会自动建议标签，你随时可以修改。",
  buttonCancel: "取消",
  buttonSave: "保存语录",
  buttonSaving: "保存中…",
  buttonUpdate: "更新",

  cardAiEnriched: "AI 补充资料",
  cardSourceUnverified: "来源待验证",
  cardAuthorUnknown: "佚名",
  cardAboutAuthor: "关于作者",
  cardRelatedQuotes: "这位作者的其他语录",
  cardNoRelatedQuotes: "暂无相关语录。",
  cardLinkedGoal: "关联目标",

  deleteConfirmTitle: "要删除这条语录吗？",
  deleteConfirmDescription: "删除后也会从所有合集移除，此操作无法撤销。",
  buttonDelete: "删除",

  toastFavorited: "已加入收藏",
  toastUnfavorited: "已移除收藏",
  toastSaved: "语录已保存",
  toastUpdated: "语录已更新",
  toastDeleted: "语录已删除",
  toastSaveFailed: "保存失败",
  toastUpdateFailed: "更新失败",
  toastDeleteFailed: "删除失败",
  toastFavoriteFailed: "更新收藏状态失败",
  toastTaggingInProgress: "AI 标签分析中…",
  toastTaggingSucceeded: "已添加标签",
  toastTaggingFailed: "自动标签失败 —— 语录已保存。",
  toastEnrichmentStarted: "正在查询作者资料…",
  toastEnrichmentFailed: "无法验证作者资料，已不补充保存。",

  thumbnailGenerating: "正在描绘意境…",
  thumbnailRegenerate: "重新生成背景",
  thumbnailRegenerating: "重新生成中…",
  thumbnailRetry: "再试一次",
  thumbnailFallbackBadge: "静谧备用",
  thumbnailFailedHelper: "背景图无法生成，但语录已安全保存。",
  thumbnailMetaTitle: "背景诊断",
  thumbnailMetaMood: "情绪",
  thumbnailMetaPalette: "色盘",
  thumbnailMetaProvider: "来源",
  thumbnailMetaGeneratedAt: "生成时间",
  thumbnailMetaPrompt: "图像提示",
  thumbnailMetaError: "上次错误",
  toastThumbnailReady: "背景已生成",
  toastThumbnailFallback: "图像生成失败，已套用静谧渐变背景。",
  toastThumbnailRegenerating: "正在重新生成背景…",
  toastThumbnailRegenerateFailed: "重新生成失败，稍后再试。",

  qotdTitle: "今日语录",
  qotdDescription: "来自你语录库的一句话，为今天精选。",
  qotdDismiss: "关闭",

  collectionsHeading: "合集",
  newCollection: "新增合集",
  collectionNameLabel: "名称",
  collectionDescriptionLabel: "描述（可选）",
  collectionSave: "保存",
  collectionDelete: "删除合集",
  collectionRename: "重命名",
  collectionMemberCount: (n) => `${n} 条语录`,
  collectionMembershipAdd: "加入合集",
  collectionMembershipRemove: "从合集移除",
  collectionEmptyTitle: "这个合集还没有语录",
  collectionEmptyDescription: "打开一条语录并选择「加入合集」。",

  wisdomChartTitle: "你的注意力停在哪里",
  wisdomThemesTitle: "反复出现的主题",
  wisdomInsightTitle: "本月洞察",
  wisdomRefresh: "重新计算",
  wisdomRefreshing: "计算中…",
  wisdomLastComputed: "上次更新",
  wisdomExportJournal: "发送到日记",

  settingsTitle: "语录库设置",
  settingsShowAiBadge: "在卡片上显示 AI 补充资料标签",
  settingsClearSeeds: "清除示例语录",
  settingsClearSeedsConfirm: "要移除 30 条示例语录吗？你自己保存的语录不会受影响。",

  shareAsImage: "生成分享图",
  exportCsv: "导出 CSV",
  exportPdf: "导出 PDF",

  languageAuto: "自动识别",

  resonantHeading: "与此刻共鸣的语录",
  resonantSubhead: "从你的语录库里，挑选与这则日记呼应的段落。",
  resonantEmpty: "目前语录库里没有与此则日记共鸣的段落。",
  resonantLoading: "搜索共鸣的语录…",
  resonantMatchPct: (percent) => `契合度 ${percent}%`,
  resonantRefresh: "寻找共鸣语录",
  sendToJournal: "发送到日记",
  sendToJournalConfirm: "要把这段洞察保存为新的日记吗？",
  sendToJournalSuccess: "已存入日记",
  sendToJournalFailed: "无法存入日记",
  dashboardQuoteTitle: "今日来自语录库的灵感",
  dashboardQuoteEmpty: "把一条最喜欢的语录加到库中，就能在每天早晨看到它。",
  dashboardInspireMe: "给我灵感",
  dashboardInspireReason: "为什么挑这句",
  dashboardInspireThinking: "思考中…",
  dashboardInspireEmpty: "语录库还是空的 —— 加入一段打动你的文字吧。",
  dashboardQuoteShuffle: "换一句",
  mindClearExternalQuote: "此刻适合的一句话",
  mindClearExternalQuoteHelper: "经实际搜索验证的真实语录。",
  mindClearAddToLibrary: "存入语录库",
  mindClearAddedToast: "已存入语录库",
  mindClearAddFailed: "存入语录失败",
  mindClearGenerate: "找一句贴合此刻的语录",
  mindClearGenerating: "搜索中…",
  mindClearNothingFound: "目前找不到明确匹配，试着多写几项看看。",
  goalLinkedQuotes: "关联语录",
  goalLinkedQuotesEmpty: "尚未关联任何语录。",
  goalLinkQuote: "关联一条语录",
  goalPickerTitle: "选择语录",
  goalPickerSearch: "搜索你的语录库…",
  goalPickerNone: "不关联（解除）",
  goalPickerAny: "不限",
  unlinkQuoteFromGoal: "从此目标解除关联",
  linkedQuoteToGoal: "已关联到目标",
  unlinkedQuoteFromGoal: "已解除与目标的关联",

  categoryLabels: {
    Resilience: "韧性",
    "Self-Awareness": "自我觉察",
    Mindfulness: "正念",
    Courage: "勇气",
    Acceptance: "接纳",
    Gratitude: "感恩",
    Purpose: "使命",
    Vision: "愿景",
    Discipline: "自律",
    Growth: "成长",
    Learning: "学习",
    Creativity: "创造",
    Love: "爱",
    Friendship: "友谊",
    Kindness: "善意",
    Family: "家人",
    Community: "社群",
    Forgiveness: "宽恕",
    Action: "行动",
    Leadership: "领导",
    Craft: "手艺",
    Excellence: "精进",
    Simplicity: "简约",
    Focus: "专注",
    Wisdom: "智慧",
    Perspective: "视角",
    Time: "时间",
    Change: "变化",
    "Death & Impermanence": "无常",
    Wonder: "惊奇",
  },
  categoryGroupLabels: {
    "inner-life": "内在生命",
    "purpose-direction": "使命与方向",
    relationships: "关系",
    "action-mastery": "行动与精进",
    "mind-time": "心智与时间",
  },
};

// ============================================================
// Japanese (ja) — full translation
// ============================================================

const ja: QuoteLibraryUiCopy = {
  ...en,
  pageTitle: "名言ライブラリ",
  pageDescription: "あなたを形づくる言葉を集め、必要な時に再び呼び戻しましょう。",
  addQuote: "名言を追加",
  addQuoteAria: "新しい名言を追加",
  settingsAction: "ライブラリ設定",
  tabAll: "すべての名言",
  tabCollections: "コレクション",
  tabWisdom: "知恵プロフィール",
  searchPlaceholder: "名言・著者・タグで検索…",
  filterCategory: "カテゴリ",
  filterTone: "トーン",
  filterSource: "ソース",
  filterTags: "タグ",
  filterFavorites: "お気に入り",
  filterFavoritesOnly: "お気に入りのみ",
  filterClear: "フィルター解除",
  filterDateRange: "追加日",
  filterAny: "指定なし",
  sortNewest: "新しい順",
  sortOldest: "古い順",
  sortAuthor: "著者",
  sortCategory: "カテゴリ",
  sortTone: "トーン",
  emptyAllTitle: "ライブラリはあなたを待っています",
  emptyAllDescription: "心に響いた一文を貼り付けてください。AI が整理し、必要な時に届けます。",
  emptyAllAction: "最初の名言を追加",
  emptySearchTitle: "一致する名言がありません",
  emptySearchDescription: "検索語を広げるか、フィルターを解除してみてください。",
  emptyCollectionsTitle: "コレクションはまだありません",
  emptyCollectionsDescription: "テーマ別に名言をまとめましょう — 例：ストイック、創作、愛の手紙。",
  emptyCollectionsAction: "新規コレクション",
  emptyWisdomTitle: "知恵プロフィール準備中",
  emptyWisdomDescription: (progress, target) =>
    `${progress} / ${target} 件 — ${target} 件で知恵プロフィールがロック解除されます。`,
  addSheetTitle: "名言を追加",
  editSheetTitle: "名言を編集",
  labelQuote: "名言",
  labelAuthor: "著者",
  labelContext: "出典",
  labelUrl: "リンク",
  labelCategory: "カテゴリ",
  labelTags: "タグ",
  labelTone: "トーン",
  labelPersonalNote: "この一文が私に意味するもの",
  labelLanguage: "言語",
  labelSourceType: "ソースタイプ",
  labelMarkFavorite: "お気に入りに追加",
  placeholderQuote: "名言を貼り付け・入力…",
  placeholderAuthor: "例：マルクス・アウレリウス",
  placeholderContext: "例：『自省録』第六巻",
  placeholderPersonalNote: "任意 — なぜ残したかを一文で。",
  placeholderTags: "Enter で追加",
  helperTags: "保存後、AI がタグを提案します。いつでも編集できます。",
  buttonCancel: "キャンセル",
  buttonSave: "保存",
  buttonSaving: "保存中…",
  buttonUpdate: "更新",
  cardAiEnriched: "AI 補完",
  cardSourceUnverified: "ソース未確認",
  cardAuthorUnknown: "不明",
  cardAboutAuthor: "著者について",
  cardRelatedQuotes: "同じ著者の他の名言",
  cardNoRelatedQuotes: "関連する名言はまだありません。",
  cardLinkedGoal: "関連する目標",
  deleteConfirmTitle: "この名言を削除しますか？",
  deleteConfirmDescription: "コレクションからも外れます。この操作は取り消せません。",
  buttonDelete: "削除",
  toastFavorited: "お気に入りに追加しました",
  toastUnfavorited: "お気に入りから外しました",
  toastSaved: "名言を保存しました",
  toastUpdated: "名言を更新しました",
  toastDeleted: "名言を削除しました",
  qotdTitle: "今日の名言",
  qotdDescription: "ライブラリから選ばれた、今日の一言。",
  collectionsHeading: "コレクション",
  newCollection: "新規コレクション",
  wisdomChartTitle: "あなたの注意の行き先",
  wisdomThemesTitle: "繰り返される主題",
  wisdomInsightTitle: "今月の気づき",
  wisdomRefresh: "再計算",
  settingsTitle: "ライブラリ設定",
  settingsClearSeeds: "サンプルを削除",
  shareAsImage: "画像で共有",
  exportCsv: "CSV で書き出し",
  exportPdf: "PDF で書き出し",
  languageAuto: "自動判定",
  categoryLabels: {
    Resilience: "レジリエンス",
    "Self-Awareness": "自己認識",
    Mindfulness: "マインドフルネス",
    Courage: "勇気",
    Acceptance: "受容",
    Gratitude: "感謝",
    Purpose: "目的",
    Vision: "ビジョン",
    Discipline: "規律",
    Growth: "成長",
    Learning: "学び",
    Creativity: "創造性",
    Love: "愛",
    Friendship: "友情",
    Kindness: "親切",
    Family: "家族",
    Community: "共同体",
    Forgiveness: "赦し",
    Action: "行動",
    Leadership: "リーダーシップ",
    Craft: "職人技",
    Excellence: "卓越",
    Simplicity: "簡素",
    Focus: "集中",
    Wisdom: "知恵",
    Perspective: "視座",
    Time: "時",
    Change: "変化",
    "Death & Impermanence": "無常",
    Wonder: "驚き",
  },
  categoryGroupLabels: {
    "inner-life": "内面の生",
    "purpose-direction": "目的と方向",
    relationships: "関係性",
    "action-mastery": "行動と熟達",
    "mind-time": "心と時間",
  },
  toneLabels: {
    uplifting: "励まし",
    contemplative: "瞑想的",
    challenging: "挑戦的",
    grounding: "地に足のついた",
    bittersweet: "ほろ苦い",
    playful: "遊び心",
    fierce: "激しい",
    tender: "優しい",
    curious: "好奇心",
    resolute: "毅然",
  },
};

// ============================================================
// Korean (ko)
// ============================================================

const ko: QuoteLibraryUiCopy = {
  ...en,
  pageTitle: "문장 보관함",
  pageDescription: "당신을 빚어가는 문장을 모으고, 필요할 때 다시 만나세요.",
  addQuote: "문장 추가",
  tabAll: "모든 문장",
  tabCollections: "컬렉션",
  tabWisdom: "나의 지혜 프로필",
  searchPlaceholder: "문장·저자·태그 검색…",
  filterCategory: "분류",
  filterTone: "톤",
  filterSource: "출처",
  filterTags: "태그",
  filterFavorites: "즐겨찾기",
  filterFavoritesOnly: "즐겨찾기만 보기",
  filterClear: "필터 해제",
  filterDateRange: "추가일",
  emptyAllTitle: "당신의 보관함이 기다립니다",
  emptyAllDescription: "마음에 남은 문장을 붙여 넣으세요. AI가 분류하고 정리해드립니다.",
  emptyAllAction: "첫 문장 추가",
  emptyWisdomDescription: (progress, target) =>
    `${progress} / ${target} — ${target}개를 모으면 지혜 프로필이 열립니다.`,
  addSheetTitle: "문장 추가",
  editSheetTitle: "문장 편집",
  labelQuote: "문장",
  labelAuthor: "저자",
  labelContext: "출처",
  labelUrl: "링크",
  labelCategory: "분류",
  labelTags: "태그",
  labelTone: "톤",
  labelPersonalNote: "이 문장이 내게 의미하는 것",
  buttonCancel: "취소",
  buttonSave: "저장",
  buttonSaving: "저장 중…",
  buttonUpdate: "업데이트",
  cardAiEnriched: "AI 보강",
  cardSourceUnverified: "출처 미검증",
  cardAuthorUnknown: "미상",
  cardAboutAuthor: "저자 소개",
  cardRelatedQuotes: "이 저자의 다른 문장",
  deleteConfirmTitle: "이 문장을 삭제할까요?",
  buttonDelete: "삭제",
  toastSaved: "문장을 저장했습니다",
  toastUpdated: "문장을 업데이트했습니다",
  toastDeleted: "문장을 삭제했습니다",
  qotdTitle: "오늘의 문장",
  qotdDescription: "보관함에서 오늘을 위해 고른 한 마디.",
  wisdomChartTitle: "당신의 관심은 어디에",
  wisdomThemesTitle: "반복되는 주제",
  wisdomInsightTitle: "이번 달의 통찰",
  wisdomRefresh: "다시 계산",
  shareAsImage: "이미지로 공유",
  exportCsv: "CSV 내보내기",
  exportPdf: "PDF 내보내기",
  languageAuto: "자동 감지",
  categoryLabels: {
    Resilience: "회복력",
    "Self-Awareness": "자기 인식",
    Mindfulness: "마음챙김",
    Courage: "용기",
    Acceptance: "수용",
    Gratitude: "감사",
    Purpose: "목적",
    Vision: "비전",
    Discipline: "규율",
    Growth: "성장",
    Learning: "학습",
    Creativity: "창의",
    Love: "사랑",
    Friendship: "우정",
    Kindness: "친절",
    Family: "가족",
    Community: "공동체",
    Forgiveness: "용서",
    Action: "행동",
    Leadership: "리더십",
    Craft: "장인정신",
    Excellence: "탁월함",
    Simplicity: "단순함",
    Focus: "집중",
    Wisdom: "지혜",
    Perspective: "관점",
    Time: "시간",
    Change: "변화",
    "Death & Impermanence": "무상",
    Wonder: "경이",
  },
};

// ============================================================
// French / Spanish / Italian / Vietnamese — chrome-level overrides.
// Category labels intentionally fall back to English for now (still editable
// via the repository, and the copy-helpers merge surfaces any missing keys
// without runtime TODO markers).
// ============================================================

const fr: QuoteLibraryUiCopy = {
  ...en,
  pageTitle: "Bibliothèque de citations",
  pageDescription: "Recueillez les phrases qui vous façonnent, et laissez-les vous retrouver.",
  addQuote: "Ajouter une citation",
  tabAll: "Toutes les citations",
  tabCollections: "Collections",
  tabWisdom: "Mon profil de sagesse",
  searchPlaceholder: "Rechercher citations, auteurs, tags…",
  filterCategory: "Catégorie",
  filterTone: "Ton",
  filterFavoritesOnly: "Favoris uniquement",
  filterClear: "Effacer les filtres",
  addSheetTitle: "Ajouter une citation",
  editSheetTitle: "Modifier la citation",
  labelQuote: "Citation",
  labelAuthor: "Auteur",
  labelContext: "Source",
  labelPersonalNote: "Pourquoi cela compte pour moi",
  buttonCancel: "Annuler",
  buttonSave: "Enregistrer",
  buttonSaving: "Enregistrement…",
  buttonUpdate: "Mettre à jour",
  buttonDelete: "Supprimer",
  qotdTitle: "Citation du jour",
  wisdomChartTitle: "Là où se pose votre attention",
  wisdomInsightTitle: "L'insight du mois",
  shareAsImage: "Partager en image",
  exportCsv: "Exporter en CSV",
  exportPdf: "Exporter en PDF",
};

const es: QuoteLibraryUiCopy = {
  ...en,
  pageTitle: "Biblioteca de citas",
  pageDescription: "Reúne las frases que te forman y deja que vuelvan a ti cuando las necesites.",
  addQuote: "Añadir cita",
  tabAll: "Todas las citas",
  tabCollections: "Colecciones",
  tabWisdom: "Mi perfil de sabiduría",
  searchPlaceholder: "Buscar citas, autores, etiquetas…",
  filterCategory: "Categoría",
  filterTone: "Tono",
  filterFavoritesOnly: "Solo favoritos",
  filterClear: "Limpiar filtros",
  addSheetTitle: "Añadir cita",
  editSheetTitle: "Editar cita",
  labelQuote: "Cita",
  labelAuthor: "Autor",
  labelContext: "Fuente",
  labelPersonalNote: "Por qué esto importa para mí",
  buttonCancel: "Cancelar",
  buttonSave: "Guardar",
  buttonSaving: "Guardando…",
  buttonUpdate: "Actualizar",
  buttonDelete: "Eliminar",
  qotdTitle: "Cita del día",
  wisdomChartTitle: "Dónde vive tu atención",
  wisdomInsightTitle: "Mirada del mes",
  shareAsImage: "Compartir como imagen",
  exportCsv: "Exportar CSV",
  exportPdf: "Exportar PDF",
};

const it: QuoteLibraryUiCopy = {
  ...en,
  pageTitle: "Libreria delle citazioni",
  pageDescription: "Raccogli le frasi che ti plasmano e lasciale tornare quando servono.",
  addQuote: "Aggiungi citazione",
  tabAll: "Tutte le citazioni",
  tabCollections: "Raccolte",
  tabWisdom: "Il mio profilo di saggezza",
  searchPlaceholder: "Cerca citazioni, autori, tag…",
  filterCategory: "Categoria",
  filterTone: "Tono",
  filterFavoritesOnly: "Solo preferiti",
  filterClear: "Pulisci filtri",
  addSheetTitle: "Aggiungi citazione",
  editSheetTitle: "Modifica citazione",
  labelQuote: "Citazione",
  labelAuthor: "Autore",
  labelContext: "Fonte",
  labelPersonalNote: "Perché questo conta per me",
  buttonCancel: "Annulla",
  buttonSave: "Salva",
  buttonSaving: "Salvataggio…",
  buttonUpdate: "Aggiorna",
  buttonDelete: "Elimina",
  qotdTitle: "Citazione del giorno",
  wisdomChartTitle: "Dove vive la tua attenzione",
  wisdomInsightTitle: "L'osservazione del mese",
  shareAsImage: "Condividi come immagine",
  exportCsv: "Esporta CSV",
  exportPdf: "Esporta PDF",
};

const vi: QuoteLibraryUiCopy = {
  ...en,
  pageTitle: "Thư viện trích dẫn",
  pageDescription: "Lưu lại những câu chữ định hình bạn, để chúng tìm về khi bạn cần.",
  addQuote: "Thêm trích dẫn",
  tabAll: "Tất cả trích dẫn",
  tabCollections: "Bộ sưu tập",
  tabWisdom: "Hồ sơ trí tuệ của tôi",
  searchPlaceholder: "Tìm trích dẫn, tác giả, thẻ…",
  filterCategory: "Phân loại",
  filterTone: "Giọng điệu",
  filterFavoritesOnly: "Chỉ yêu thích",
  filterClear: "Xoá bộ lọc",
  addSheetTitle: "Thêm trích dẫn",
  editSheetTitle: "Chỉnh sửa trích dẫn",
  labelQuote: "Trích dẫn",
  labelAuthor: "Tác giả",
  labelContext: "Nguồn",
  labelPersonalNote: "Vì sao điều này quan trọng với tôi",
  buttonCancel: "Huỷ",
  buttonSave: "Lưu",
  buttonSaving: "Đang lưu…",
  buttonUpdate: "Cập nhật",
  buttonDelete: "Xoá",
  qotdTitle: "Trích dẫn hôm nay",
  wisdomChartTitle: "Nơi sự chú ý của bạn đọng lại",
  wisdomInsightTitle: "Thông điệp tháng này",
  shareAsImage: "Chia sẻ dưới dạng ảnh",
  exportCsv: "Xuất CSV",
  exportPdf: "Xuất PDF",
};

const localizedCopy = createLocaleCopyMap<QuoteLibraryUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
});

export function getQuoteLibraryUiCopy(
  locale: AppLocale,
): QuoteLibraryUiCopy {
  return localizedCopy[locale] ?? localizedCopy[DEFAULT_LOCALE];
}

export function getQuoteCategoryLabel(
  locale: AppLocale,
  category: QuoteCategory,
): string {
  return getQuoteLibraryUiCopy(locale).categoryLabels[category] ?? category;
}

export function getQuoteToneLabel(
  locale: AppLocale,
  tone: QuoteEmotionTone,
): string {
  return getQuoteLibraryUiCopy(locale).toneLabels[tone] ?? tone;
}
