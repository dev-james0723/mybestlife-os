import type { AutoPlanCopy } from "@/components/daily-planner/auto-plan-panel";

import type { AppLocale } from "./app-locale";

export interface AutoPlanUiCopy extends AutoPlanCopy {
  modeLabel: string;
  calendarConnectedNotice: string;
  calendarDisconnectedNotice: string;
  calendarUnavailableNotice: string;
  unscheduledInsufficientTime: string;
  toastBuilt: string;
  toastAccepted: string;
  toastBuildFailed: string;
  toastAcceptFailed: string;
  candidateSourceFree: string;
  candidateSourceTimed: string;
}

function formatEnglishMinutes(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function formatChineseMinutes(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (hours === 0) return `${remainder} 分鐘`;
  if (remainder === 0) return `${hours} 小時`;
  return `${hours} 小時 ${remainder} 分鐘`;
}

const english: AutoPlanUiCopy = {
  modeLabel: "Auto Plan",
  title: "Auto Plan",
  description:
    "Turn your tasks into a realistic schedule around fixed calendar events.",
  statusLabels: {
    empty: "Needs tasks",
    ready: "Ready",
    preview: "Preview",
    accepted: "Accepted",
  },
  stateTitles: {
    empty: "Add tasks first",
    ready: "Ready to shape your day",
    preview: "Review before accepting",
    accepted: "Plan accepted",
  },
  stateDescriptions: {
    empty: "Add tasks in Free Plan or Time Block mode, then return here.",
    ready:
      "Auto Plan will prioritize your tasks and place them into your open time.",
    preview:
      "Check the proposed times and lock anything you want Auto Plan to keep.",
    accepted:
      "Your schedule is saved. You can replan unlocked items whenever priorities change.",
  },
  candidateCount: (count) => `${count} task${count === 1 ? "" : "s"}`,
  calendarBusyWindowCount: (count) =>
    `${count} fixed calendar window${count === 1 ? "" : "s"} protected`,
  availableLabel: "Available",
  plannedLabel: "Planned",
  remainingLabel: "Open",
  formatMinutes: formatEnglishMinutes,
  capacityProgressLabel: "Auto Plan capacity used",
  capacityProgressValue: (plannedMinutes, availableMinutes) =>
    `${formatEnglishMinutes(plannedMinutes)} of ${formatEnglishMinutes(availableMinutes)} planned`,
  bufferIntensityLabel: "Breathing room",
  bufferIntensityDescription:
    "Choose how much open time to keep between scheduled tasks.",
  formatBufferOption: (minutes) =>
    minutes === 0 ? "No gaps" : `${minutes} min gaps`,
  scheduledTitle: "Proposed schedule",
  scheduledCount: (count) => `${count} scheduled`,
  noScheduledItems: "No task fits the available time yet.",
  unscheduledTitle: "Not scheduled",
  unscheduledCount: (count) => `${count} remaining`,
  allCandidatesScheduled: "Everything fits in this planning window.",
  priorityLabels: {
    must: "Must",
    should: "Should",
    could: "Could",
  },
  formatTimeRange: (start, end) => `${start}–${end}`,
  lockItem: (title) => `Lock ${title}`,
  unlockItem: (title) => `Unlock ${title}`,
  reviewNoticeTitle: "Preview only",
  reviewNoticeDescription:
    "Review the times and lock anything you want to keep. Your saved plan and Google Calendar will not change until you accept.",
  buildMyDay: "Build my day",
  buildingPlan: "Building plan…",
  acceptPlan: "Accept plan",
  acceptingPlan: "Accepting plan…",
  replanRemaining: "Replan unlocked",
  calendarConnectedNotice:
    "Google Calendar commitments are included and protected from overlap.",
  calendarDisconnectedNotice:
    "Connect Google Calendar to protect external commitments. Local planner items are still included.",
  calendarUnavailableNotice:
    "Google Calendar is temporarily unavailable. This preview uses local planner items only.",
  unscheduledInsufficientTime:
    "Not enough open time remains in this planning window.",
  toastBuilt: "Auto Plan preview is ready. Nothing has been saved yet.",
  toastAccepted: "Auto Plan accepted and saved.",
  toastBuildFailed: "Auto Plan could not build a preview. Please try again.",
  toastAcceptFailed: "Auto Plan could not be saved. Please try again.",
  candidateSourceFree: "Built from unfinished Free Plan tasks.",
  candidateSourceTimed: "Built from your current timed tasks.",
};

const traditionalChinese: AutoPlanUiCopy = {
  modeLabel: "自動排程",
  title: "自動排程",
  description: "按照固定行事曆活動，把任務排成切合實際的一天。",
  statusLabels: {
    empty: "需要任務",
    ready: "可以開始",
    preview: "預覽",
    accepted: "已採用",
  },
  stateTitles: {
    empty: "請先加入任務",
    ready: "準備安排你的一天",
    preview: "採用前請先檢查",
    accepted: "行程已採用",
  },
  stateDescriptions: {
    empty: "請先在自由規劃或時間區塊模式加入任務，再回到這裡。",
    ready: "自動排程會按優先次序，把任務放進可用時間。",
    preview: "檢查建議時間，並鎖定你希望保留不動的項目。",
    accepted: "行程已儲存。優先次序有變時，可重新安排未鎖定的項目。",
  },
  candidateCount: (count) => `${count} 項任務`,
  calendarBusyWindowCount: (count) => `已避開 ${count} 個固定行事曆時段`,
  availableLabel: "可用",
  plannedLabel: "已安排",
  remainingLabel: "尚餘",
  formatMinutes: formatChineseMinutes,
  capacityProgressLabel: "自動排程已用容量",
  capacityProgressValue: (plannedMinutes, availableMinutes) =>
    `已安排 ${formatChineseMinutes(plannedMinutes)}，共可用 ${formatChineseMinutes(availableMinutes)}`,
  bufferIntensityLabel: "預留空間",
  bufferIntensityDescription: "選擇每項已排任務之間要保留多少空檔。",
  formatBufferOption: (minutes) =>
    minutes === 0 ? "不留空檔" : `${minutes} 分鐘空檔`,
  scheduledTitle: "建議行程",
  scheduledCount: (count) => `已安排 ${count} 項`,
  noScheduledItems: "目前沒有任務能放進可用時間。",
  unscheduledTitle: "未能安排",
  unscheduledCount: (count) => `尚餘 ${count} 項`,
  allCandidatesScheduled: "所有任務都能放進這個規劃時段。",
  priorityLabels: {
    must: "必須",
    should: "應該",
    could: "可以",
  },
  formatTimeRange: (start, end) => `${start}–${end}`,
  lockItem: (title) => `鎖定「${title}」`,
  unlockItem: (title) => `解除鎖定「${title}」`,
  reviewNoticeTitle: "只供預覽",
  reviewNoticeDescription:
    "請檢查建議時間並鎖定想保留的項目。採用之前，已儲存的計劃和 Google 行事曆都不會更改。",
  buildMyDay: "安排我的一天",
  buildingPlan: "正在安排…",
  acceptPlan: "採用行程",
  acceptingPlan: "正在採用…",
  replanRemaining: "重排未鎖定項目",
  calendarConnectedNotice: "已納入 Google 行事曆活動，排程不會與其重疊。",
  calendarDisconnectedNotice:
    "連接 Google 行事曆即可避開外部活動；目前仍會納入本地規劃項目。",
  calendarUnavailableNotice:
    "Google 行事曆暫時無法使用；這次預覽只會參考本地規劃項目。",
  unscheduledInsufficientTime: "這個規劃時段沒有足夠的剩餘時間。",
  toastBuilt: "自動排程預覽已準備好，尚未儲存任何更改。",
  toastAccepted: "已採用並儲存自動排程。",
  toastBuildFailed: "無法建立自動排程預覽，請再試一次。",
  toastAcceptFailed: "無法儲存自動排程，請再試一次。",
  candidateSourceFree: "根據自由規劃中尚未完成的任務建立。",
  candidateSourceTimed: "根據目前已有時間的任務建立。",
};

const simplifiedChinese: AutoPlanUiCopy = {
  modeLabel: "自动排程",
  title: "自动排程",
  description: "根据固定日历活动，把任务排成切合实际的一天。",
  statusLabels: {
    empty: "需要任务",
    ready: "可以开始",
    preview: "预览",
    accepted: "已采用",
  },
  stateTitles: {
    empty: "请先添加任务",
    ready: "准备安排你的一天",
    preview: "采用前请先检查",
    accepted: "日程已采用",
  },
  stateDescriptions: {
    empty: "请先在自由规划或时间块模式添加任务，再回到这里。",
    ready: "自动排程会按优先级，把任务放进可用时间。",
    preview: "检查建议时间，并锁定你希望保留不动的项目。",
    accepted: "日程已保存。优先级有变化时，可重新安排未锁定的项目。",
  },
  candidateCount: (count) => `${count} 项任务`,
  calendarBusyWindowCount: (count) => `已避开 ${count} 个固定日历时段`,
  availableLabel: "可用",
  plannedLabel: "已安排",
  remainingLabel: "剩余",
  formatMinutes: formatChineseMinutes,
  capacityProgressLabel: "自动排程已用容量",
  capacityProgressValue: (plannedMinutes, availableMinutes) =>
    `已安排 ${formatChineseMinutes(plannedMinutes)}，共可用 ${formatChineseMinutes(availableMinutes)}`,
  bufferIntensityLabel: "预留空间",
  bufferIntensityDescription: "选择每项已排任务之间要保留多少空档。",
  formatBufferOption: (minutes) =>
    minutes === 0 ? "不留空档" : `${minutes} 分钟空档`,
  scheduledTitle: "建议日程",
  scheduledCount: (count) => `已安排 ${count} 项`,
  noScheduledItems: "目前没有任务能放进可用时间。",
  unscheduledTitle: "未能安排",
  unscheduledCount: (count) => `剩余 ${count} 项`,
  allCandidatesScheduled: "所有任务都能放进这个规划时段。",
  priorityLabels: {
    must: "必须",
    should: "应该",
    could: "可以",
  },
  formatTimeRange: (start, end) => `${start}–${end}`,
  lockItem: (title) => `锁定“${title}”`,
  unlockItem: (title) => `解锁“${title}”`,
  reviewNoticeTitle: "仅供预览",
  reviewNoticeDescription:
    "请检查建议时间并锁定想保留的项目。采用之前，已保存的计划和 Google 日历都不会更改。",
  buildMyDay: "安排我的一天",
  buildingPlan: "正在安排…",
  acceptPlan: "采用日程",
  acceptingPlan: "正在采用…",
  replanRemaining: "重排未锁定项目",
  calendarConnectedNotice: "已纳入 Google 日历活动，排程不会与其重叠。",
  calendarDisconnectedNotice:
    "连接 Google 日历即可避开外部活动；目前仍会纳入本地规划项目。",
  calendarUnavailableNotice:
    "Google 日历暂时不可用；这次预览只会参考本地规划项目。",
  unscheduledInsufficientTime: "这个规划时段没有足够的剩余时间。",
  toastBuilt: "自动排程预览已准备好，尚未保存任何更改。",
  toastAccepted: "已采用并保存自动排程。",
  toastBuildFailed: "无法建立自动排程预览，请重试。",
  toastAcceptFailed: "无法保存自动排程，请重试。",
  candidateSourceFree: "根据自由规划中尚未完成的任务建立。",
  candidateSourceTimed: "根据当前已有时间的任务建立。",
};

const copies: Record<AppLocale, AutoPlanUiCopy> = {
  en: english,
  "zh-TW": traditionalChinese,
  "zh-CN": simplifiedChinese,
  ja: english,
  ko: english,
  fr: english,
  it: english,
  es: english,
  vi: english,
};

export function getAutoPlanUiCopy(locale: AppLocale): AutoPlanUiCopy {
  return copies[locale];
}
