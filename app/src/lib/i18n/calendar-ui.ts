import type { AppLocale } from "./app-locale";
import { DEFAULT_LOCALE } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";
import type { DayLoad } from "@/lib/calendar/types";

export type CalendarUiCopy = {
  pageTitle: string;
  pageDescription: string;

  // Tabs
  tabToday: string;
  tabAgenda: string;
  tabWeek: string;
  tabMonth: string;
  tabAIPlan: string;

  // Today block
  todayBlockTitle: string;
  todayLoadLabel: string;
  todayTimelineTitle: string;
  todayFreeWindowsTitle: string;
  todaySummarySkeleton: string;
  todayNoItems: string;
  todayNoConflicts: string;
  todayNoFreeWindows: string;
  todayOverdueLabel: (n: number) => string;
  todayConflictLabel: (n: number) => string;

  // Quick actions
  quickAdd: string;
  planMyDay: string;
  openCalendar: string;
  newEvent: string;
  viewFullList: string;
  backToAIPlan: string;
  backToDailyPlanner: string;

  // Month toggle
  monthToggleComplete: string;
  monthToggleMinimal: string;
  monthToggleOrbital: string;

  // Minimal agenda
  minimalAgendaTitle: string;
  agendaToday: string;
  agendaTomorrow: string;

  // Orbital
  orbitalTodayLabel: string;
  orbitalEventsCount: (n: number) => string;
  orbitalUpcomingTitle: string;
  orbitalEmptyState: string;
  orbitalBubbleAria: (date: string, count: number) => string;

  // Priority badges
  badgeDeadline: string;
  badgeMilestone: string;
  badgeFocus: string;
  badgeHabit: string;
  badgeReminder: string;
  badgeExternal: string;

  // Agenda / lists
  overdueSectionTitle: string;
  loadingAgenda: string;

  // AI Plan tab
  aiPlanTitle: string;
  aiGenerate: string;
  aiGenerating: string;
  aiAcceptAll: string;
  aiReject: string;
  aiAccept: string;
  aiRationaleLabel: string;
  aiConflictsTitle: string;
  aiFreeWindowsTitle: string;
  aiEnergyArcTitle: string;
  aiEmptyState: string;

  // Day load labels
  dayLoadLabels: Record<DayLoad, string>;

  // Energy categories
  energyDeep: string;
  energyShallow: string;
  energyRecovery: string;

  // Settings
  googleCalendarConnect: string;
  googleCalendarComingSoon: string;

  // Common
  loading: string;
  error: string;
  retry: string;
  close: string;
  today: string;
  week: string;
  month: string;
};

const en: CalendarUiCopy = {
  pageTitle: "Calendar",
  pageDescription: "Your unified time layer — tasks, habits, milestones, and external events.",

  tabToday: "Today",
  tabAgenda: "Agenda",
  tabWeek: "Week",
  tabMonth: "Month",
  tabAIPlan: "AI Plan",

  todayBlockTitle: "Today",
  todayLoadLabel: "Day load",
  todayTimelineTitle: "Today's timeline",
  todayFreeWindowsTitle: "Free windows",
  todaySummarySkeleton: "Composing today's summary…",
  todayNoItems: "Nothing on the calendar today. Enjoy the open time.",
  todayNoConflicts: "No conflicts detected.",
  todayNoFreeWindows: "No free windows — today is fully booked.",
  todayOverdueLabel: (n) => `${n} overdue`,
  todayConflictLabel: (n) => `${n} conflict${n === 1 ? "" : "s"}`,

  quickAdd: "Quick Add",
  planMyDay: "Plan My Day",
  openCalendar: "Open Calendar",
  newEvent: "+ New Event",
  viewFullList: "View Full List →",
  backToAIPlan: "Back to AI Plan",
  backToDailyPlanner: "Back to Daily Planner",

  monthToggleComplete: "Complete",
  monthToggleMinimal: "Minimal",
  monthToggleOrbital: "Orbital",

  minimalAgendaTitle: "Agenda",
  agendaToday: "TODAY",
  agendaTomorrow: "TOMORROW",

  orbitalTodayLabel: "TODAY",
  orbitalEventsCount: (n) => (n === 1 ? "1 Event" : `${n} Events`),
  orbitalUpcomingTitle: "Upcoming Priorities",
  orbitalEmptyState: "No upcoming priorities — enjoy the calm.",
  orbitalBubbleAria: (date, count) =>
    `${date}, ${count} item${count === 1 ? "" : "s"}`,

  badgeDeadline: "Deadline",
  badgeMilestone: "Milestone",
  badgeFocus: "Focus",
  badgeHabit: "Habit",
  badgeReminder: "Reminder",
  badgeExternal: "Event",

  overdueSectionTitle: "Overdue",
  loadingAgenda: "Loading agenda…",

  aiPlanTitle: "AI Plan",
  aiGenerate: "Generate My Day",
  aiGenerating: "Thinking…",
  aiAcceptAll: "Accept all",
  aiReject: "Reject",
  aiAccept: "Accept",
  aiRationaleLabel: "Why:",
  aiConflictsTitle: "Conflicts & warnings",
  aiFreeWindowsTitle: "Free windows",
  aiEnergyArcTitle: "Energy arc",
  aiEmptyState: "Press “Generate My Day” for an AI-proposed schedule.",

  dayLoadLabels: {
    Light: "Light",
    Balanced: "Balanced",
    "Focus-heavy": "Focus-heavy",
    "Deadline-heavy": "Deadline-heavy",
    Recovery: "Recovery",
  },

  energyDeep: "Deep work",
  energyShallow: "Shallow work",
  energyRecovery: "Recovery",

  googleCalendarConnect: "Connect Google Calendar",
  googleCalendarComingSoon: "Coming soon",

  loading: "Loading…",
  error: "Something went wrong.",
  retry: "Retry",
  close: "Close",
  today: "Today",
  week: "Week",
  month: "Month",
};

const zhTW: DeepPartial<CalendarUiCopy> = {
  pageTitle: "行事曆",
  pageDescription: "你統一的時間層 — 任務、習慣、里程碑與外部事件。",
  tabToday: "今天",
  tabAgenda: "議程",
  tabWeek: "週",
  tabMonth: "月",
  tabAIPlan: "AI 規劃",
  todayBlockTitle: "今天",
  todayLoadLabel: "今日負荷",
  todayTimelineTitle: "今日時間軸",
  todayFreeWindowsTitle: "空檔時段",
  todaySummarySkeleton: "正在撰寫今日摘要…",
  todayNoItems: "今天沒有行程，享受難得的空閒時光。",
  todayNoConflicts: "沒有衝突。",
  todayNoFreeWindows: "沒有空檔 — 今天行程滿檔。",
  todayOverdueLabel: (n) => `逾期 ${n}`,
  todayConflictLabel: (n) => `衝突 ${n}`,
  quickAdd: "快速新增",
  planMyDay: "規劃我的一天",
  openCalendar: "開啟行事曆",
  newEvent: "＋ 新事件",
  viewFullList: "查看完整列表 →",
  backToAIPlan: "回到 AI 規劃",
  backToDailyPlanner: "回到每日規劃",
  monthToggleComplete: "完整",
  monthToggleMinimal: "簡潔",
  monthToggleOrbital: "軌道",
  minimalAgendaTitle: "議程",
  agendaToday: "今日",
  agendaTomorrow: "明日",
  orbitalTodayLabel: "今日",
  orbitalEventsCount: (n) => `${n} 件事件`,
  orbitalUpcomingTitle: "即將到來的重點",
  orbitalEmptyState: "未來沒有重要事項 — 好好享受此刻。",
  orbitalBubbleAria: (date, count) => `${date}，${count} 項事件`,
  badgeDeadline: "期限",
  badgeMilestone: "里程碑",
  badgeFocus: "專注",
  badgeHabit: "習慣",
  badgeReminder: "提醒",
  badgeExternal: "事件",
  overdueSectionTitle: "逾期",
  loadingAgenda: "載入議程中…",
  aiPlanTitle: "AI 規劃",
  aiGenerate: "生成我的一天",
  aiGenerating: "思考中…",
  aiAcceptAll: "全部採用",
  aiReject: "略過",
  aiAccept: "採用",
  aiRationaleLabel: "原因：",
  aiConflictsTitle: "衝突與提醒",
  aiFreeWindowsTitle: "空檔時段",
  aiEnergyArcTitle: "能量曲線",
  aiEmptyState: "點擊「生成我的一天」讓 AI 建議日程。",
  dayLoadLabels: {
    Light: "輕量",
    Balanced: "均衡",
    "Focus-heavy": "深度專注",
    "Deadline-heavy": "期限密集",
    Recovery: "恢復",
  },
  energyDeep: "深度工作",
  energyShallow: "淺層工作",
  energyRecovery: "恢復",
  googleCalendarConnect: "連結 Google 日曆",
  googleCalendarComingSoon: "即將推出",
  loading: "載入中…",
  error: "發生錯誤。",
  retry: "重試",
  close: "關閉",
  today: "今天",
  week: "週",
  month: "月",
};

const zhCN: DeepPartial<CalendarUiCopy> = {
  pageTitle: "日历",
  pageDescription: "你统一的时间层 — 任务、习惯、里程碑与外部事件。",
  tabToday: "今天",
  tabAgenda: "议程",
  tabWeek: "周",
  tabMonth: "月",
  tabAIPlan: "AI 规划",
  todayBlockTitle: "今天",
  todayLoadLabel: "今日负荷",
  todayTimelineTitle: "今日时间轴",
  todayFreeWindowsTitle: "空闲时段",
  todaySummarySkeleton: "正在撰写今日摘要…",
  todayNoItems: "今天没有行程，享受难得的空闲时光。",
  todayNoConflicts: "没有冲突。",
  todayNoFreeWindows: "没有空闲 — 今天排满了。",
  todayOverdueLabel: (n) => `逾期 ${n}`,
  todayConflictLabel: (n) => `冲突 ${n}`,
  quickAdd: "快速新增",
  planMyDay: "规划我的一天",
  openCalendar: "打开日历",
  newEvent: "＋ 新事件",
  viewFullList: "查看完整列表 →",
  backToAIPlan: "返回 AI 规划",
  backToDailyPlanner: "返回每日规划",
  monthToggleComplete: "完整",
  monthToggleMinimal: "简洁",
  monthToggleOrbital: "轨道",
  minimalAgendaTitle: "议程",
  agendaToday: "今日",
  agendaTomorrow: "明日",
  orbitalTodayLabel: "今日",
  orbitalEventsCount: (n) => `${n} 件事件`,
  orbitalUpcomingTitle: "即将到来的重点",
  orbitalEmptyState: "没有即将到来的事项 — 好好享受此刻。",
  orbitalBubbleAria: (date, count) => `${date}，${count} 项事件`,
  badgeDeadline: "期限",
  badgeMilestone: "里程碑",
  badgeFocus: "专注",
  badgeHabit: "习惯",
  badgeReminder: "提醒",
  badgeExternal: "事件",
  overdueSectionTitle: "逾期",
  loadingAgenda: "载入议程中…",
  aiPlanTitle: "AI 规划",
  aiGenerate: "生成我的一天",
  aiGenerating: "思考中…",
  aiAcceptAll: "全部采用",
  aiReject: "略过",
  aiAccept: "采用",
  aiRationaleLabel: "原因：",
  aiConflictsTitle: "冲突与提醒",
  aiFreeWindowsTitle: "空闲时段",
  aiEnergyArcTitle: "能量曲线",
  aiEmptyState: "点击「生成我的一天」让 AI 建议日程。",
  dayLoadLabels: {
    Light: "轻量",
    Balanced: "均衡",
    "Focus-heavy": "深度专注",
    "Deadline-heavy": "期限密集",
    Recovery: "恢复",
  },
  energyDeep: "深度工作",
  energyShallow: "浅层工作",
  energyRecovery: "恢复",
  googleCalendarConnect: "连接 Google 日历",
  googleCalendarComingSoon: "即将推出",
  loading: "载入中…",
  error: "发生错误。",
  retry: "重试",
  close: "关闭",
  today: "今天",
  week: "周",
  month: "月",
};

const localized = createLocaleCopyMap<CalendarUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
});

export function getCalendarUiCopy(locale: AppLocale): CalendarUiCopy {
  return localized[locale] ?? localized[DEFAULT_LOCALE];
}
