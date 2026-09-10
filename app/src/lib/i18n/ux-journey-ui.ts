import type { AppLocale } from "./app-locale";

const en = {
  optionalDetails: "Add details (optional)",
  planningSettings: "Time window & calendar sync (optional)",
  plannerStart: "Add one thing to do. You can plan without connecting a calendar.",
  notEnoughData: "Not enough data yet",
  moreRanges: "More date ranges",
  fewerRanges: "Fewer date ranges",
  retry: "Try again",
  clearFilters: "Clear filters",
  allRecords: "All records, before filters",
  mapUnavailable: "The map is unavailable. You can still explore your wish list below.",
  mapRetry: "Reload map",
};

type JourneyCopy = typeof en;
const zhTW: JourneyCopy = {
  optionalDetails: "補充資料（選填）",
  planningSettings: "時段與日曆同步（選用）",
  plannerStart: "先記下一件要做的事。毋須連接日曆也可開始安排。",
  notEnoughData: "暫時未有足夠資料",
  moreRanges: "更多日期範圍",
  fewerRanges: "收起日期範圍",
  retry: "重試",
  clearFilters: "清除篩選",
  allRecords: "全部記錄，不受篩選影響",
  mapUnavailable: "地圖暫時未能載入，你仍可查看下方的願望清單。",
  mapRetry: "重新載入地圖",
};
const zhCN: JourneyCopy = {
  optionalDetails: "补充资料（选填）",
  planningSettings: "时段与日历同步（可选）",
  plannerStart: "先记下一件要做的事。无需连接日历也可开始安排。",
  notEnoughData: "暂时没有足够资料",
  moreRanges: "更多日期范围",
  fewerRanges: "收起日期范围",
  retry: "重试",
  clearFilters: "清除筛选",
  allRecords: "全部记录，不受筛选影响",
  mapUnavailable: "地图暂时无法加载，你仍可查看下方的愿望清单。",
  mapRetry: "重新加载地图",
};

export function getUxJourneyCopy(locale: AppLocale): JourneyCopy {
  return locale === "zh-TW" ? zhTW : locale === "zh-CN" ? zhCN : en;
}
