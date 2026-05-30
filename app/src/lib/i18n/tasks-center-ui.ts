/**
 * Copy for the Tasks command center (overview strip, control bar, views,
 * advanced filters, saved presets, detail panel, AI + analytics). Kept separate
 * from the legacy `tasks-ui.ts` so the original task copy stays untouched.
 *
 * English is the complete source of truth; zh-TW / zh-CN are partial overrides
 * (missing keys fall back to English via `createLocaleCopyMap`).
 */
import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";

export type TasksCenterUiCopy = {
  // Views
  viewList: string;
  viewGrid: string;
  viewTable: string;
  viewBoard: string;

  // Overview strip
  overviewTotal: string;
  overviewActive: string;
  overviewInProgress: string;
  overviewDueToday: string;
  overviewOverdue: string;
  overviewCompletedWeek: string;
  overviewNoProject: string;
  overviewHighPriority: string;

  // Control bar
  controlSearchPlaceholder: string;
  quickFilterProject: string;
  projectAll: string;
  projectNone: string;
  quickFilterCategory: string;
  categoryAll: string;
  sortLabel: string;
  sortUpdatedAt: string;
  toggleSortDirection: string;
  advancedFilters: string;
  clearAll: string;
  activeFilterCount: (n: number) => string;
  groupBy: string;

  // Group labels (board / dynamic)
  groupNoProject: string;
  groupUncategorized: string;
  deadlineColOverdue: string;
  deadlineColToday: string;
  deadlineColThisWeek: string;
  deadlineColLater: string;
  deadlineColNone: string;
  columnCount: (n: number) => string;
  boardEmptyColumn: string;

  // Card / row
  noProjectLinked: string;
  linkProject: string;
  createdLabel: string;
  updatedLabel: string;
  scheduledLabel: string;
  aiBadge: string;
  subtaskProgress: (done: number, total: number) => string;

  // Advanced filters
  filtersTitle: string;
  filterStatus: string;
  filterPriority: string;
  filterDeadline: string;
  filterCreated: string;
  filterUpdated: string;
  filterTags: string;
  filterLinked: string;
  filterCategory: string;
  apply: string;
  reset: string;
  customStart: string;
  customEnd: string;
  tagsPlaceholder: string;
  noTags: string;

  // Deadline filter values
  deadlineAll: string;
  deadlineToday: string;
  deadlineTomorrow: string;
  deadlineThisWeek: string;
  deadlineNextWeek: string;
  deadlineThisMonth: string;
  deadlineOverdue: string;
  deadlineNone: string;
  deadlineCustom: string;

  // Date preset values
  dateAll: string;
  dateToday: string;
  dateThisWeek: string;
  dateThisMonth: string;
  dateRecent: string;
  dateCustom: string;

  // Linked entity flags
  linkedHasProject: string;
  linkedNoProject: string;
  linkedAi: string;
  linkedNotAi: string;
  linkedGoal: string;
  linkedHabit: string;
  linkedPlanner: string;
  linkedCalendar: string;
  linkedKnowledge: string;
  linkedIdea: string;

  // Saved presets
  savedFilters: string;
  saveCurrent: string;
  savePresetPlaceholder: string;
  savePresetAction: string;
  deletePresetAria: string;
  presetMyFocus: string;
  presetDueToday: string;
  presetOverdueHigh: string;
  presetThisWeek: string;
  presetNoProject: string;
  presetAiGenerated: string;
  presetProjectTasks: string;

  // Categories (canonical)
  categoryAcademic: string;
  categoryBusiness: string;
  categoryMusic: string;
  categoryPersonal: string;
  categoryAdmin: string;
  categoryCreative: string;
  categoryHealth: string;
  categoryFinance: string;
  categoryLearning: string;
  categoryOther: string;

  // Bulk actions (table)
  bulkSelected: (n: number) => string;
  bulkSetStatus: string;
  bulkSetPriority: string;
  bulkSetProject: string;
  bulkDelete: string;
  bulkClear: string;
  columns: string;
  colName: string;
  colProject: string;
  colCategory: string;
  colPriority: string;
  colStatus: string;
  colDeadline: string;
  colCreated: string;
  colUpdated: string;
  colTags: string;
  colActions: string;
  selectAll: string;
  dragHandleAria: string;
  inlineEditTitleAria: string;
  emptyColumnTask: string;

  // Detail panel
  detailLinkedTitle: string;
  detailSubtasksTitle: string;
  detailActivityTitle: string;
  addSubtaskPlaceholder: string;
  addSubtaskAction: string;
  noSubtasks: string;
  deleteSubtaskAria: string;
  unlinkProject: string;
  completedLabel: string;
  categoryNone: string;
  labelScheduledDate: string;

  // Create menu + dialog
  createQuickly: string;
  createTabQuick: string;
  createTabManual: string;
  createTabAi: string;
  quickAddHint: string;
  aiPromptPlaceholder: string;
  aiGenerate: string;
  aiUseDraft: string;
  labelTags: string;
  tagsInputPlaceholder: string;

  // AI assist (detail panel) + review card
  aiAssistHeading: string;
  aiBreakdown: string;
  aiPrioritize: string;
  aiSchedule: string;
  aiThinking: string;
  aiSourceAi: string;
  aiSourceHeuristic: string;
  aiReviewWins: string;
  aiReviewRisks: string;
  aiReviewRecommendations: string;
  aiToastSubtasksAdded: string;
  aiToastPriorityUpdated: string;
  aiToastScheduleUpdated: string;
  aiToastNoChange: string;
  aiToastFailed: string;

  // Analytics + insight panel
  openInsights: string;
  insightsTitle: string;
  analyticsTitle: string;
  analyticsCompletionRate: string;
  analyticsCompletionTrend: string;
  analyticsByStatus: string;
  analyticsByPriority: string;
  analyticsByDeadline: string;
  analyticsByCategory: string;
  analyticsProjectWorkload: string;
  analyticsEmpty: string;
  insightRuleBased: string;
  insightAiSummary: string;
  insightWeeklyReview: string;

  // Connections (detail panel)
  connectionsTitle: string;
  addToTodayPlan: string;
  addedToPlanToast: string;
  alreadyInPlanToast: string;
  scheduledForLabel: string;
  linkGoalLabel: string;
  linkGoalPlaceholder: string;
  goalLinkedToast: string;
  goalUnlinkedToast: string;
  noGoalsAvailable: string;
  connectionsFailedToast: string;
};

const en: TasksCenterUiCopy = {
  viewList: "List",
  viewGrid: "Grid",
  viewTable: "Table",
  viewBoard: "Board",

  overviewTotal: "Total",
  overviewActive: "Active",
  overviewInProgress: "In Progress",
  overviewDueToday: "Due Today",
  overviewOverdue: "Overdue",
  overviewCompletedWeek: "Done This Week",
  overviewNoProject: "No Project",
  overviewHighPriority: "High / Urgent",

  controlSearchPlaceholder: "Search title, project, tags…",
  quickFilterProject: "Project",
  projectAll: "All Projects",
  projectNone: "No Project",
  quickFilterCategory: "Category",
  categoryAll: "All Categories",
  sortLabel: "Sort",
  sortUpdatedAt: "Last Updated",
  toggleSortDirection: "Toggle sort direction",
  advancedFilters: "Filters",
  clearAll: "Clear",
  activeFilterCount: (n) => `${n} active`,
  groupBy: "Group by",

  groupNoProject: "No Project",
  groupUncategorized: "Uncategorized",
  deadlineColOverdue: "Overdue",
  deadlineColToday: "Today",
  deadlineColThisWeek: "This Week",
  deadlineColLater: "Later",
  deadlineColNone: "No Deadline",
  columnCount: (n) => `${n}`,
  boardEmptyColumn: "Nothing here",

  noProjectLinked: "No Project Linked",
  linkProject: "Link Project",
  createdLabel: "Created",
  updatedLabel: "Updated",
  scheduledLabel: "Scheduled",
  aiBadge: "AI",
  subtaskProgress: (done, total) => `${done}/${total} subtasks`,

  filtersTitle: "Advanced Filters",
  filterStatus: "Status",
  filterPriority: "Priority",
  filterDeadline: "Deadline",
  filterCreated: "Created",
  filterUpdated: "Updated",
  filterTags: "Tags",
  filterLinked: "Links",
  filterCategory: "Category",
  apply: "Apply",
  reset: "Reset",
  customStart: "From",
  customEnd: "To",
  tagsPlaceholder: "Filter by tag…",
  noTags: "No tags available",

  deadlineAll: "Any Deadline",
  deadlineToday: "Today",
  deadlineTomorrow: "Tomorrow",
  deadlineThisWeek: "This Week",
  deadlineNextWeek: "Next Week",
  deadlineThisMonth: "This Month",
  deadlineOverdue: "Overdue",
  deadlineNone: "No Deadline",
  deadlineCustom: "Custom Range",

  dateAll: "Any Time",
  dateToday: "Today",
  dateThisWeek: "This Week",
  dateThisMonth: "This Month",
  dateRecent: "Recently",
  dateCustom: "Custom Range",

  linkedHasProject: "Has Project",
  linkedNoProject: "No Project",
  linkedAi: "AI-generated",
  linkedNotAi: "Not AI-generated",
  linkedGoal: "Linked to Goal",
  linkedHabit: "Linked to Habit",
  linkedPlanner: "In Daily Planner",
  linkedCalendar: "On Calendar",
  linkedKnowledge: "Linked to Knowledge",
  linkedIdea: "Linked to Idea",

  savedFilters: "Saved Filters",
  saveCurrent: "Save",
  savePresetPlaceholder: "Preset name",
  savePresetAction: "Save filter",
  deletePresetAria: "Delete preset",
  presetMyFocus: "My Focus",
  presetDueToday: "Due Today",
  presetOverdueHigh: "Overdue High Priority",
  presetThisWeek: "This Week",
  presetNoProject: "No Project",
  presetAiGenerated: "AI-generated",
  presetProjectTasks: "Project Tasks",

  categoryAcademic: "Academic",
  categoryBusiness: "Business",
  categoryMusic: "Music",
  categoryPersonal: "Personal",
  categoryAdmin: "Admin",
  categoryCreative: "Creative",
  categoryHealth: "Health",
  categoryFinance: "Finance",
  categoryLearning: "Learning",
  categoryOther: "Other",

  bulkSelected: (n) => `${n} selected`,
  bulkSetStatus: "Set Status",
  bulkSetPriority: "Set Priority",
  bulkSetProject: "Set Project",
  bulkDelete: "Delete",
  bulkClear: "Clear selection",
  columns: "Columns",
  colName: "Task",
  colProject: "Project",
  colCategory: "Category",
  colPriority: "Priority",
  colStatus: "Status",
  colDeadline: "Deadline",
  colCreated: "Created",
  colUpdated: "Updated",
  colTags: "Tags",
  colActions: "Actions",
  selectAll: "Select all",
  dragHandleAria: "Drag to move",
  inlineEditTitleAria: "Edit task title",
  emptyColumnTask: "No tasks",

  detailLinkedTitle: "Linked",
  detailSubtasksTitle: "Subtasks",
  detailActivityTitle: "Activity",
  addSubtaskPlaceholder: "Add a subtask…",
  addSubtaskAction: "Add",
  noSubtasks: "No subtasks yet",
  deleteSubtaskAria: "Delete subtask",
  unlinkProject: "Unlink",
  completedLabel: "Completed",
  categoryNone: "No Category",
  labelScheduledDate: "Scheduled Date",

  createQuickly: "Add Quickly",
  createTabQuick: "Quick",
  createTabManual: "Manual",
  createTabAi: "AI",
  quickAddHint: "Type a title and press Enter to add",
  aiPromptPlaceholder: "Describe what you want to get done…",
  aiGenerate: "Generate",
  aiUseDraft: "Use draft",
  labelTags: "Tags",
  tagsInputPlaceholder: "Comma-separated tags",

  aiAssistHeading: "AI Assist",
  aiBreakdown: "Break into subtasks",
  aiPrioritize: "Suggest priority",
  aiSchedule: "Suggest schedule",
  aiThinking: "Thinking…",
  aiSourceAi: "AI",
  aiSourceHeuristic: "Heuristic",
  aiReviewWins: "Wins",
  aiReviewRisks: "Risks",
  aiReviewRecommendations: "Recommendations",
  aiToastSubtasksAdded: "Subtasks added",
  aiToastPriorityUpdated: "Priority updated",
  aiToastScheduleUpdated: "Schedule updated",
  aiToastNoChange: "No change suggested",
  aiToastFailed: "AI request failed",

  openInsights: "Insights",
  insightsTitle: "Task Insights",
  analyticsTitle: "Analytics",
  analyticsCompletionRate: "Completion rate",
  analyticsCompletionTrend: "Completed (14 days)",
  analyticsByStatus: "By status",
  analyticsByPriority: "By priority",
  analyticsByDeadline: "By deadline",
  analyticsByCategory: "By category",
  analyticsProjectWorkload: "Project workload",
  analyticsEmpty: "No tasks yet",
  insightRuleBased: "Rule-based",
  insightAiSummary: "AI summary",
  insightWeeklyReview: "Weekly review",

  connectionsTitle: "Connections",
  addToTodayPlan: "Add to today's plan",
  addedToPlanToast: "Added to today's plan",
  alreadyInPlanToast: "Already in today's plan",
  scheduledForLabel: "Scheduled for",
  linkGoalLabel: "Linked goals",
  linkGoalPlaceholder: "Link a goal…",
  goalLinkedToast: "Goal linked",
  goalUnlinkedToast: "Goal unlinked",
  noGoalsAvailable: "No goals yet",
  connectionsFailedToast: "Could not update connection",
};

const zhTW: DeepPartial<TasksCenterUiCopy> = {
  viewList: "清單",
  viewGrid: "格狀",
  viewTable: "表格",
  viewBoard: "看板",

  overviewTotal: "全部",
  overviewActive: "進行中任務",
  overviewInProgress: "進行中",
  overviewDueToday: "今天到期",
  overviewOverdue: "已逾期",
  overviewCompletedWeek: "本週完成",
  overviewNoProject: "未綁專案",
  overviewHighPriority: "高 / 緊急",

  controlSearchPlaceholder: "搜尋標題、專案、標籤…",
  quickFilterProject: "專案",
  projectAll: "全部專案",
  projectNone: "無專案",
  quickFilterCategory: "分類",
  categoryAll: "全部分類",
  sortLabel: "排序",
  sortUpdatedAt: "最近更新",
  toggleSortDirection: "切換排序方向",
  advancedFilters: "篩選",
  clearAll: "清除",
  activeFilterCount: (n) => `${n} 個篩選`,
  groupBy: "分組",

  groupNoProject: "無專案",
  groupUncategorized: "未分類",
  deadlineColOverdue: "已逾期",
  deadlineColToday: "今天",
  deadlineColThisWeek: "本週",
  deadlineColLater: "之後",
  deadlineColNone: "無期限",
  boardEmptyColumn: "目前沒有任務",

  noProjectLinked: "尚未綁定專案",
  linkProject: "綁定專案",
  createdLabel: "建立",
  updatedLabel: "更新",
  scheduledLabel: "排程",
  aiBadge: "AI",
  subtaskProgress: (done, total) => `${done}/${total} 子任務`,

  filtersTitle: "進階篩選",
  filterStatus: "狀態",
  filterPriority: "優先度",
  filterDeadline: "期限",
  filterCreated: "建立時間",
  filterUpdated: "更新時間",
  filterTags: "標籤",
  filterLinked: "關聯",
  filterCategory: "分類",
  apply: "套用",
  reset: "重設",
  customStart: "從",
  customEnd: "到",
  tagsPlaceholder: "依標籤篩選…",
  noTags: "沒有可用標籤",

  deadlineAll: "任何期限",
  deadlineToday: "今天",
  deadlineTomorrow: "明天",
  deadlineThisWeek: "本週",
  deadlineNextWeek: "下週",
  deadlineThisMonth: "本月",
  deadlineOverdue: "已逾期",
  deadlineNone: "無期限",
  deadlineCustom: "自訂範圍",

  dateAll: "任何時間",
  dateToday: "今天",
  dateThisWeek: "本週",
  dateThisMonth: "本月",
  dateRecent: "最近",
  dateCustom: "自訂範圍",

  linkedHasProject: "已綁專案",
  linkedNoProject: "無專案",
  linkedAi: "AI 生成",
  linkedNotAi: "非 AI 生成",
  linkedGoal: "連結目標",
  linkedHabit: "連結習慣",
  linkedPlanner: "在每日計畫",
  linkedCalendar: "在行事曆",
  linkedKnowledge: "連結知識",
  linkedIdea: "連結靈感",

  savedFilters: "已存篩選",
  saveCurrent: "儲存",
  savePresetPlaceholder: "篩選名稱",
  savePresetAction: "儲存篩選",
  deletePresetAria: "刪除篩選",
  presetMyFocus: "我的重點",
  presetDueToday: "今天到期",
  presetOverdueHigh: "逾期高優先",
  presetThisWeek: "本週",
  presetNoProject: "未綁專案",
  presetAiGenerated: "AI 生成",
  presetProjectTasks: "專案任務",

  categoryAcademic: "學術",
  categoryBusiness: "商務",
  categoryMusic: "音樂",
  categoryPersonal: "個人",
  categoryAdmin: "行政",
  categoryCreative: "創作",
  categoryHealth: "健康",
  categoryFinance: "財務",
  categoryLearning: "學習",
  categoryOther: "其他",

  bulkSelected: (n) => `已選 ${n} 項`,
  bulkSetStatus: "設定狀態",
  bulkSetPriority: "設定優先度",
  bulkSetProject: "設定專案",
  bulkDelete: "刪除",
  bulkClear: "取消選取",
  columns: "欄位",
  colName: "任務",
  colProject: "專案",
  colCategory: "分類",
  colPriority: "優先度",
  colStatus: "狀態",
  colDeadline: "期限",
  colCreated: "建立",
  colUpdated: "更新",
  colTags: "標籤",
  colActions: "操作",
  selectAll: "全選",
  dragHandleAria: "拖曳以移動",
  inlineEditTitleAria: "編輯任務標題",
  emptyColumnTask: "沒有任務",

  detailLinkedTitle: "關聯",
  detailSubtasksTitle: "子任務",
  detailActivityTitle: "動態",
  addSubtaskPlaceholder: "新增子任務…",
  addSubtaskAction: "新增",
  noSubtasks: "尚無子任務",
  deleteSubtaskAria: "刪除子任務",
  unlinkProject: "解除綁定",
  completedLabel: "完成",
  categoryNone: "未分類",
  labelScheduledDate: "排程日期",

  createQuickly: "快速新增",
  createTabQuick: "快速",
  createTabManual: "手動",
  createTabAi: "AI",
  quickAddHint: "輸入標題並按 Enter 新增",
  aiPromptPlaceholder: "描述你想完成的事…",
  aiGenerate: "生成",
  aiUseDraft: "使用草稿",
  labelTags: "標籤",
  tagsInputPlaceholder: "以逗號分隔標籤",

  aiAssistHeading: "AI 協助",
  aiBreakdown: "拆解為子任務",
  aiPrioritize: "建議優先度",
  aiSchedule: "建議排程",
  aiThinking: "思考中…",
  aiSourceAi: "AI",
  aiSourceHeuristic: "規則",
  aiReviewWins: "亮點",
  aiReviewRisks: "風險",
  aiReviewRecommendations: "建議",
  aiToastSubtasksAdded: "已新增子任務",
  aiToastPriorityUpdated: "已更新優先度",
  aiToastScheduleUpdated: "已更新排程",
  aiToastNoChange: "沒有建議變更",
  aiToastFailed: "AI 請求失敗",

  openInsights: "洞察",
  insightsTitle: "任務洞察",
  analyticsTitle: "分析",
  analyticsCompletionRate: "完成率",
  analyticsCompletionTrend: "完成數（14 天）",
  analyticsByStatus: "依狀態",
  analyticsByPriority: "依優先度",
  analyticsByDeadline: "依截止",
  analyticsByCategory: "依分類",
  analyticsProjectWorkload: "專案工作量",
  analyticsEmpty: "尚無任務",
  insightRuleBased: "規則",
  insightAiSummary: "AI 摘要",
  insightWeeklyReview: "每週回顧",

  connectionsTitle: "關聯",
  addToTodayPlan: "加入今天的計畫",
  addedToPlanToast: "已加入今天的計畫",
  alreadyInPlanToast: "已在今天的計畫中",
  scheduledForLabel: "已排程於",
  linkGoalLabel: "關聯目標",
  linkGoalPlaceholder: "關聯一個目標…",
  goalLinkedToast: "已關聯目標",
  goalUnlinkedToast: "已取消關聯",
  noGoalsAvailable: "尚無目標",
  connectionsFailedToast: "無法更新關聯",
};

const zhCN: DeepPartial<TasksCenterUiCopy> = {
  viewList: "列表",
  viewGrid: "网格",
  viewTable: "表格",
  viewBoard: "看板",

  overviewTotal: "全部",
  overviewActive: "进行中任务",
  overviewInProgress: "进行中",
  overviewDueToday: "今天到期",
  overviewOverdue: "已逾期",
  overviewCompletedWeek: "本周完成",
  overviewNoProject: "未绑项目",
  overviewHighPriority: "高 / 紧急",

  controlSearchPlaceholder: "搜索标题、项目、标签…",
  quickFilterProject: "项目",
  projectAll: "全部项目",
  projectNone: "无项目",
  quickFilterCategory: "分类",
  categoryAll: "全部分类",
  sortLabel: "排序",
  sortUpdatedAt: "最近更新",
  toggleSortDirection: "切换排序方向",
  advancedFilters: "筛选",
  clearAll: "清除",
  activeFilterCount: (n) => `${n} 个筛选`,
  groupBy: "分组",

  groupNoProject: "无项目",
  groupUncategorized: "未分类",
  deadlineColOverdue: "已逾期",
  deadlineColToday: "今天",
  deadlineColThisWeek: "本周",
  deadlineColLater: "之后",
  deadlineColNone: "无期限",
  boardEmptyColumn: "暂无任务",

  noProjectLinked: "尚未绑定项目",
  linkProject: "绑定项目",
  createdLabel: "创建",
  updatedLabel: "更新",
  scheduledLabel: "排程",
  aiBadge: "AI",
  subtaskProgress: (done, total) => `${done}/${total} 子任务`,

  filtersTitle: "高级筛选",
  filterStatus: "状态",
  filterPriority: "优先级",
  filterDeadline: "期限",
  filterCreated: "创建时间",
  filterUpdated: "更新时间",
  filterTags: "标签",
  filterLinked: "关联",
  filterCategory: "分类",
  apply: "应用",
  reset: "重置",
  customStart: "从",
  customEnd: "到",
  tagsPlaceholder: "按标签筛选…",
  noTags: "没有可用标签",

  deadlineAll: "任何期限",
  deadlineToday: "今天",
  deadlineTomorrow: "明天",
  deadlineThisWeek: "本周",
  deadlineNextWeek: "下周",
  deadlineThisMonth: "本月",
  deadlineOverdue: "已逾期",
  deadlineNone: "无期限",
  deadlineCustom: "自定义范围",

  dateAll: "任何时间",
  dateToday: "今天",
  dateThisWeek: "本周",
  dateThisMonth: "本月",
  dateRecent: "最近",
  dateCustom: "自定义范围",

  linkedHasProject: "已绑项目",
  linkedNoProject: "无项目",
  linkedAi: "AI 生成",
  linkedNotAi: "非 AI 生成",
  linkedGoal: "关联目标",
  linkedHabit: "关联习惯",
  linkedPlanner: "在每日计划",
  linkedCalendar: "在日历",
  linkedKnowledge: "关联知识",
  linkedIdea: "关联灵感",

  savedFilters: "已存筛选",
  saveCurrent: "保存",
  savePresetPlaceholder: "筛选名称",
  savePresetAction: "保存筛选",
  deletePresetAria: "删除筛选",
  presetMyFocus: "我的重点",
  presetDueToday: "今天到期",
  presetOverdueHigh: "逾期高优先",
  presetThisWeek: "本周",
  presetNoProject: "未绑项目",
  presetAiGenerated: "AI 生成",
  presetProjectTasks: "项目任务",

  categoryAcademic: "学术",
  categoryBusiness: "商务",
  categoryMusic: "音乐",
  categoryPersonal: "个人",
  categoryAdmin: "行政",
  categoryCreative: "创作",
  categoryHealth: "健康",
  categoryFinance: "财务",
  categoryLearning: "学习",
  categoryOther: "其他",

  bulkSelected: (n) => `已选 ${n} 项`,
  bulkSetStatus: "设置状态",
  bulkSetPriority: "设置优先级",
  bulkSetProject: "设置项目",
  bulkDelete: "删除",
  bulkClear: "取消选择",
  columns: "列",
  colName: "任务",
  colProject: "项目",
  colCategory: "分类",
  colPriority: "优先级",
  colStatus: "状态",
  colDeadline: "期限",
  colCreated: "创建",
  colUpdated: "更新",
  colTags: "标签",
  colActions: "操作",
  selectAll: "全选",
  dragHandleAria: "拖动以移动",
  inlineEditTitleAria: "编辑任务标题",
  emptyColumnTask: "没有任务",

  detailLinkedTitle: "关联",
  detailSubtasksTitle: "子任务",
  detailActivityTitle: "动态",
  addSubtaskPlaceholder: "添加子任务…",
  addSubtaskAction: "添加",
  noSubtasks: "暂无子任务",
  deleteSubtaskAria: "删除子任务",
  unlinkProject: "解除绑定",
  completedLabel: "完成",
  categoryNone: "未分类",
  labelScheduledDate: "排程日期",

  createQuickly: "快速添加",
  createTabQuick: "快速",
  createTabManual: "手动",
  createTabAi: "AI",
  quickAddHint: "输入标题并按 Enter 添加",
  aiPromptPlaceholder: "描述你想完成的事…",
  aiGenerate: "生成",
  aiUseDraft: "使用草稿",
  labelTags: "标签",
  tagsInputPlaceholder: "用逗号分隔标签",

  aiAssistHeading: "AI 协助",
  aiBreakdown: "拆解为子任务",
  aiPrioritize: "建议优先级",
  aiSchedule: "建议排程",
  aiThinking: "思考中…",
  aiSourceAi: "AI",
  aiSourceHeuristic: "规则",
  aiReviewWins: "亮点",
  aiReviewRisks: "风险",
  aiReviewRecommendations: "建议",
  aiToastSubtasksAdded: "已添加子任务",
  aiToastPriorityUpdated: "已更新优先级",
  aiToastScheduleUpdated: "已更新排程",
  aiToastNoChange: "没有建议变更",
  aiToastFailed: "AI 请求失败",

  openInsights: "洞察",
  insightsTitle: "任务洞察",
  analyticsTitle: "分析",
  analyticsCompletionRate: "完成率",
  analyticsCompletionTrend: "完成数（14 天）",
  analyticsByStatus: "按状态",
  analyticsByPriority: "按优先级",
  analyticsByDeadline: "按截止",
  analyticsByCategory: "按分类",
  analyticsProjectWorkload: "项目工作量",
  analyticsEmpty: "暂无任务",
  insightRuleBased: "规则",
  insightAiSummary: "AI 摘要",
  insightWeeklyReview: "每周回顾",

  connectionsTitle: "关联",
  addToTodayPlan: "加入今天的计划",
  addedToPlanToast: "已加入今天的计划",
  alreadyInPlanToast: "已在今天的计划中",
  scheduledForLabel: "已排程于",
  linkGoalLabel: "关联目标",
  linkGoalPlaceholder: "关联一个目标…",
  goalLinkedToast: "已关联目标",
  goalUnlinkedToast: "已取消关联",
  noGoalsAvailable: "暂无目标",
  connectionsFailedToast: "无法更新关联",
};

const localizedCopy = createLocaleCopyMap<TasksCenterUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
});

export function getTasksCenterUiCopy(locale: AppLocale): TasksCenterUiCopy {
  return localizedCopy[locale] ?? localizedCopy.en;
}

/** Localized label for a board deadline lane / `deadlineBucketToColumn` value. */
export function deadlineColumnLabel(copy: TasksCenterUiCopy, column: string): string {
  switch (column) {
    case "overdue":
      return copy.deadlineColOverdue;
    case "today":
      return copy.deadlineColToday;
    case "this-week":
      return copy.deadlineColThisWeek;
    case "later":
      return copy.deadlineColLater;
    case "none":
      return copy.deadlineColNone;
    default:
      return column;
  }
}

/** Localized label for a category value (canonical -> i18n, custom -> title case). */
export function taskCategoryLabel(copy: TasksCenterUiCopy, value: string): string {
  switch (value) {
    case "academic":
      return copy.categoryAcademic;
    case "business":
      return copy.categoryBusiness;
    case "music":
      return copy.categoryMusic;
    case "personal":
      return copy.categoryPersonal;
    case "admin":
      return copy.categoryAdmin;
    case "creative":
      return copy.categoryCreative;
    case "health":
      return copy.categoryHealth;
    case "finance":
      return copy.categoryFinance;
    case "learning":
      return copy.categoryLearning;
    case "other":
      return copy.categoryOther;
    default:
      return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
