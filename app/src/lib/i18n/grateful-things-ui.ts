import type { AppLocale } from "./app-locale";
import { DEFAULT_LOCALE } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";

/** Canonical category values stored / used as option values (English keys). */
export const GRATITUDE_CATEGORY_VALUES = [
  "Family & Home",
  "Friends & Community",
  "Love & Partnership",
  "Health & Vitality",
  "Rest & Recovery",
  "Work & Purpose",
  "Money & Resources",
  "Learning & Curiosity",
  "Creativity & Play",
  "Nature & Outdoors",
  "Food & Daily Comfort",
  "Body & Movement",
  "Mind & Inner Peace",
  "Travel & Discovery",
  "Technology & Tools",
  "Pets & Companions",
  "Acts of Kindness",
  "Past & Memories",
  "Future & Possibility",
  "Other",
] as const;

export type GratitudeCategoryValue = (typeof GRATITUDE_CATEGORY_VALUES)[number];

export type GratefulThingsUiCopy = {
  pageTitle: string;
  pageDescription: string;
  newEntry: string;
  searchPlaceholder: string;
  sortEntryDate: string;
  sortDateAdded: string;
  sortPlaceholder: string;
  viewList: string;
  viewGrid: string;
  viewHeart: string;
  viewListAria: string;
  viewGridAria: string;
  viewHeartAria: string;
  emptyTitle: string;
  emptyDescNoEntries: string;
  emptyDescSearch: string;
  emptyAction: string;
  subtitleHasImage: string;
  detailEditTitle: string;
  detailViewTitle: string;
  labelDate: string;
  labelCategory: string;
  labelContent: string;
  labelPhotoUrl: string;
  categoryPlaceholder: string;
  contentPlaceholder: string;
  photoUrlPlaceholder: string;
  markFavorite: string;
  favoriteBadge: string;
  cancel: string;
  saving: string;
  save: string;
  createdAt: string;
  emptyContentReadonly: string;
  editEntryAria: string;
  deleteEntryAria: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  delete: string;
  createDialogTitle: string;
  createCloseAria: string;
  editorPlaceholder: string;
  generatePhotoAi: string;
  enhanceAi: string;
  labelDateShort: string;
  labelCategoryShort: string;
  selectCategoryPlaceholder: string;
  photoSectionLabel: string;
  uploadPhotoHint: string;
  removePhoto: string;
  regeneratePhoto: string;
  createMarkFavorite: string;
  saveEntry: string;
  photoOnlyFallbackContent: string;
  toastPhotoTooLarge: string;
  toastAiPhotoTitle: string;
  toastAiEnhanceTitle: string;
  toastAiEnhanceSuccess: string;
  toastAiPhotoSuccess: string;
  toastAiNeedContent: string;
  toastAiFailed: string;
  toastEntrySaved: string;
  toastEntrySaveFailed: string;
  toastEntryUpdated: string;
  toastEntryUpdateFailed: string;
  toastEntryDeleted: string;
  toastEntryDeleteFailed: string;
  categoryLabels: Record<GratitudeCategoryValue, string>;
};

const en: GratefulThingsUiCopy = {
  pageTitle: "Grateful things",
  pageDescription: "A running log of what you are thankful for",
  newEntry: "New entry",
  searchPlaceholder: "Search entries…",
  sortEntryDate: "Entry date",
  sortDateAdded: "Date added",
  sortPlaceholder: "Sort by",
  viewList: "List",
  viewGrid: "Grid",
  viewHeart: "Heart",
  viewListAria: "List view",
  viewGridAria: "Grid view",
  viewHeartAria: "Heart view",
  emptyTitle: "No entries yet",
  emptyDescNoEntries: "Write down one thing you are grateful for today",
  emptyDescSearch: "Nothing matches your search",
  emptyAction: "Write entry",
  subtitleHasImage: "Includes an image",
  detailEditTitle: "Edit entry",
  detailViewTitle: "Gratitude entry",
  labelDate: "Date",
  labelCategory: "Category",
  labelContent: "Content *",
  labelPhotoUrl: "Photo URL (optional)",
  categoryPlaceholder: "e.g. Family, Health…",
  contentPlaceholder: "Write something…",
  photoUrlPlaceholder: "Paste image URL or leave empty",
  markFavorite: "Mark as favorite",
  favoriteBadge: "Favorite",
  cancel: "Cancel",
  saving: "Saving…",
  save: "Save",
  createdAt: "Created",
  emptyContentReadonly: "No content yet.",
  editEntryAria: "Edit entry",
  deleteEntryAria: "Delete entry",
  deleteConfirmTitle: "Delete entry",
  deleteConfirmDescription: "Remove this gratitude entry? This cannot be undone.",
  delete: "Delete",
  createDialogTitle: "Create Gratitude Entry",
  createCloseAria: "Close",
  editorPlaceholder: "Write something…",
  generatePhotoAi: "Generate Photo with AI",
  enhanceAi: "Enhance with AI",
  labelDateShort: "Date",
  labelCategoryShort: "Category",
  selectCategoryPlaceholder: "Select category",
  photoSectionLabel: "Photo (optional)",
  uploadPhotoHint: "Click to upload a photo",
  removePhoto: "Remove photo",
  regeneratePhoto: "Regenerate",
  createMarkFavorite: "Mark as favorite",
  saveEntry: "Save Entry",
  photoOnlyFallbackContent: "Grateful moment",
  toastPhotoTooLarge: "Photo must be under 5 MB.",
  toastAiPhotoTitle: "Generate Photo with AI",
  toastAiEnhanceTitle: "Enhance with AI",
  toastAiEnhanceSuccess: "Entry polished with Gemini.",
  toastAiPhotoSuccess: "Image generated with Gemini.",
  toastAiNeedContent: "Write something in the journal first.",
  toastAiFailed: "AI request failed. Check GEMINI_API_KEY and try again.",
  toastEntrySaved: "Gratitude entry saved",
  toastEntrySaveFailed: "Failed to save entry",
  toastEntryUpdated: "Entry updated",
  toastEntryUpdateFailed: "Failed to update entry",
  toastEntryDeleted: "Entry deleted",
  toastEntryDeleteFailed: "Failed to delete entry",
  categoryLabels: {
    "Family & Home": "Family & Home",
    "Friends & Community": "Friends & Community",
    "Love & Partnership": "Love & Partnership",
    "Health & Vitality": "Health & Vitality",
    "Rest & Recovery": "Rest & Recovery",
    "Work & Purpose": "Work & Purpose",
    "Money & Resources": "Money & Resources",
    "Learning & Curiosity": "Learning & Curiosity",
    "Creativity & Play": "Creativity & Play",
    "Nature & Outdoors": "Nature & Outdoors",
    "Food & Daily Comfort": "Food & Daily Comfort",
    "Body & Movement": "Body & Movement",
    "Mind & Inner Peace": "Mind & Inner Peace",
    "Travel & Discovery": "Travel & Discovery",
    "Technology & Tools": "Technology & Tools",
    "Pets & Companions": "Pets & Companions",
    "Acts of Kindness": "Acts of Kindness",
    "Past & Memories": "Past & Memories",
    "Future & Possibility": "Future & Possibility",
    Other: "Other",
  },
};

const zhTW: GratefulThingsUiCopy = {
  pageTitle: "感恩日記",
  pageDescription: "記錄你感激的人事物",
  newEntry: "新增一則",
  searchPlaceholder: "搜尋條目…",
  sortEntryDate: "條目日期",
  sortDateAdded: "新增日期",
  sortPlaceholder: "排序",
  viewList: "列表",
  viewGrid: "網格",
  viewHeart: "愛心",
  viewListAria: "列表檢視",
  viewGridAria: "網格檢視",
  viewHeartAria: "愛心檢視",
  emptyTitle: "尚無條目",
  emptyDescNoEntries: "寫下今天一件值得感恩的事",
  emptyDescSearch: "沒有符合搜尋的內容",
  emptyAction: "寫一則",
  subtitleHasImage: "包含圖片",
  detailEditTitle: "編輯條目",
  detailViewTitle: "感恩條目",
  labelDate: "日期",
  labelCategory: "分類",
  labelContent: "內容 *",
  labelPhotoUrl: "圖片網址（選填）",
  categoryPlaceholder: "例如：家人、健康…",
  contentPlaceholder: "寫下你的感受…",
  photoUrlPlaceholder: "貼上圖片網址，或留空",
  markFavorite: "標為最愛",
  favoriteBadge: "最愛",
  cancel: "取消",
  saving: "儲存中…",
  save: "儲存",
  createdAt: "建立於",
  emptyContentReadonly: "尚無內容。",
  editEntryAria: "編輯條目",
  deleteEntryAria: "刪除條目",
  deleteConfirmTitle: "刪除條目",
  deleteConfirmDescription: "確定要刪除此則感恩條目？此操作無法復原。",
  delete: "刪除",
  createDialogTitle: "新增感恩條目",
  createCloseAria: "關閉",
  editorPlaceholder: "寫下你的感受…",
  generatePhotoAi: "用 AI 產生圖片",
  enhanceAi: "用 AI 潤飾文字",
  labelDateShort: "日期",
  labelCategoryShort: "分類",
  selectCategoryPlaceholder: "選擇分類",
  photoSectionLabel: "照片（選填）",
  uploadPhotoHint: "點此上傳照片",
  removePhoto: "移除照片",
  regeneratePhoto: "重新生成",
  createMarkFavorite: "標為最愛",
  saveEntry: "儲存條目",
  photoOnlyFallbackContent: "感恩時刻",
  toastPhotoTooLarge: "照片需小於 5 MB。",
  toastAiPhotoTitle: "用 AI 產生圖片",
  toastAiEnhanceTitle: "用 AI 潤飾文字",
  toastAiEnhanceSuccess: "已用 Gemini 潤飾文字。",
  toastAiPhotoSuccess: "已用 Gemini 產生圖片。",
  toastAiNeedContent: "請先在日記中寫一些內容。",
  toastAiFailed: "AI 請求失敗。請確認 GEMINI_API_KEY 後再試。",
  toastEntrySaved: "感恩條目已儲存",
  toastEntrySaveFailed: "儲存失敗",
  toastEntryUpdated: "條目已更新",
  toastEntryUpdateFailed: "更新失敗",
  toastEntryDeleted: "條目已刪除",
  toastEntryDeleteFailed: "刪除失敗",
  categoryLabels: {
    "Family & Home": "家人與家庭",
    "Friends & Community": "朋友與社群",
    "Love & Partnership": "愛與伴侶",
    "Health & Vitality": "健康與活力",
    "Rest & Recovery": "休息與恢復",
    "Work & Purpose": "工作與意義",
    "Money & Resources": "金錢與資源",
    "Learning & Curiosity": "學習與好奇",
    "Creativity & Play": "創意與玩樂",
    "Nature & Outdoors": "大自然與戶外",
    "Food & Daily Comfort": "食物與日常舒心",
    "Body & Movement": "身體與活動",
    "Mind & Inner Peace": "心靈與平靜",
    "Travel & Discovery": "旅行與探索",
    "Technology & Tools": "科技與工具",
    "Pets & Companions": "寵物與陪伴",
    "Acts of Kindness": "善意與付出",
    "Past & Memories": "過去與回憶",
    "Future & Possibility": "未來與可能",
    Other: "其他",
  },
};

const zhCN: GratefulThingsUiCopy = {
  pageTitle: "感恩日记",
  pageDescription: "记录你感激的人与事",
  newEntry: "新建一条",
  searchPlaceholder: "搜索条目…",
  sortEntryDate: "条目日期",
  sortDateAdded: "添加日期",
  sortPlaceholder: "排序",
  viewList: "列表",
  viewGrid: "网格",
  viewHeart: "爱心",
  viewListAria: "列表视图",
  viewGridAria: "网格视图",
  viewHeartAria: "爱心视图",
  emptyTitle: "暂无条目",
  emptyDescNoEntries: "写下今天一件值得感恩的事",
  emptyDescSearch: "没有符合搜索的内容",
  emptyAction: "写一条",
  subtitleHasImage: "包含图片",
  detailEditTitle: "编辑条目",
  detailViewTitle: "感恩条目",
  labelDate: "日期",
  labelCategory: "分类",
  labelContent: "内容 *",
  labelPhotoUrl: "图片链接（可选）",
  categoryPlaceholder: "例如：家人、健康…",
  contentPlaceholder: "写下你的感受…",
  photoUrlPlaceholder: "粘贴图片链接，或留空",
  markFavorite: "标为收藏",
  favoriteBadge: "收藏",
  cancel: "取消",
  saving: "保存中…",
  save: "保存",
  createdAt: "创建于",
  emptyContentReadonly: "尚无内容。",
  editEntryAria: "编辑条目",
  deleteEntryAria: "删除条目",
  deleteConfirmTitle: "删除条目",
  deleteConfirmDescription: "确定要删除这条感恩记录？此操作无法撤销。",
  delete: "删除",
  createDialogTitle: "新建感恩条目",
  createCloseAria: "关闭",
  editorPlaceholder: "写下你的感受…",
  generatePhotoAi: "用 AI 生成图片",
  enhanceAi: "用 AI 润色文字",
  labelDateShort: "日期",
  labelCategoryShort: "分类",
  selectCategoryPlaceholder: "选择分类",
  photoSectionLabel: "照片（可选）",
  uploadPhotoHint: "点击上传照片",
  removePhoto: "移除照片",
  regeneratePhoto: "重新生成",
  createMarkFavorite: "标为收藏",
  saveEntry: "保存条目",
  photoOnlyFallbackContent: "感恩时刻",
  toastPhotoTooLarge: "照片需小于 5 MB。",
  toastAiPhotoTitle: "用 AI 生成图片",
  toastAiEnhanceTitle: "用 AI 润色文字",
  toastAiEnhanceSuccess: "已用 Gemini 润色文字。",
  toastAiPhotoSuccess: "已用 Gemini 生成图片。",
  toastAiNeedContent: "请先在日记里写一些内容。",
  toastAiFailed: "AI 请求失败。请检查 GEMINI_API_KEY 后重试。",
  toastEntrySaved: "感恩条目已保存",
  toastEntrySaveFailed: "保存失败",
  toastEntryUpdated: "条目已更新",
  toastEntryUpdateFailed: "更新失败",
  toastEntryDeleted: "条目已删除",
  toastEntryDeleteFailed: "删除失败",
  categoryLabels: {
    "Family & Home": "家人与家庭",
    "Friends & Community": "朋友与社群",
    "Love & Partnership": "爱与伴侣",
    "Health & Vitality": "健康与活力",
    "Rest & Recovery": "休息与恢复",
    "Work & Purpose": "工作与意义",
    "Money & Resources": "金钱与资源",
    "Learning & Curiosity": "学习与好奇",
    "Creativity & Play": "创意与玩乐",
    "Nature & Outdoors": "大自然与户外",
    "Food & Daily Comfort": "食物与日常舒心",
    "Body & Movement": "身体与活动",
    "Mind & Inner Peace": "心灵与平静",
    "Travel & Discovery": "旅行与探索",
    "Technology & Tools": "科技与工具",
    "Pets & Companions": "宠物与陪伴",
    "Acts of Kindness": "善意与付出",
    "Past & Memories": "过去与回忆",
    "Future & Possibility": "未来与可能",
    Other: "其他",
  },
};

const localizedCopy = createLocaleCopyMap<GratefulThingsUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
});

export function getGratefulThingsUiCopy(locale: AppLocale): GratefulThingsUiCopy {
  return localizedCopy[locale] ?? localizedCopy[DEFAULT_LOCALE];
}

export function gratefulCategoryLabel(
  locale: AppLocale,
  value: string
): string {
  const copy = getGratefulThingsUiCopy(locale);
  if (value in copy.categoryLabels) {
    return copy.categoryLabels[value as GratitudeCategoryValue];
  }
  return value;
}