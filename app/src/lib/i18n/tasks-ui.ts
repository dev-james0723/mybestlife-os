import type { AppLocale } from "./app-locale";
import type { Task } from "@/types/database";
import { createLocaleCopyMap } from "./copy-helpers";

export type ClarifyingOption = { id: string; label: string };
export type ClarifyingQuestion = { id: string; question: string; options: ClarifyingOption[] };

export type TasksUiCopy = {
  pageTitle: string;
  pageDescription: string;
  newTask: string;
  searchPlaceholder: string;
  filterStatus: string;
  filterPriority: string;
  allFilterPattern: string;
  sortPlaceholder: string;
  sortDateCreated: string;
  sortDueDate: string;
  sortPriority: string;
  sortTitle: string;
  emptyTitle: string;
  emptyDescNew: string;
  emptyDescFiltered: string;
  emptyCreate: string;
  completeTaskAria: string;
  statusTodo: string;
  statusInProgress: string;
  statusDone: string;
  statusCancelled: string;
  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;
  priorityUrgent: string;
  toastFocusStarted: (taskTitle: string) => string;
  toastTaskCreated: string;
  toastTaskCreateFailed: string;
  toastTaskUpdated: string;
  toastTaskUpdateFailed: string;
  toastTaskDeleted: string;
  toastTaskDeleteFailed: string;
  createDialogTitleNew: string;
  createDialogTitleQuestions: string;
  createDialogQuestionProgress: (n: number, total: number) => string;
  createPlaceholderTitle: string;
  createWithAi: string;
  createManually: string;
  createCustomAnswerPlaceholder: string;
  createGenerating: string;
  createTitleAiAssisted: string;
  createTitleNewTask: string;
  labelTitle: string;
  labelDescription: string;
  labelStatus: string;
  labelPriority: string;
  labelDueDate: string;
  labelEstimatedBlocks: string;
  labelProject: string;
  labelNotes: string;
  placeholderTaskTitle: string;
  placeholderDescription: string;
  placeholderBlocks: string;
  placeholderNotes: string;
  noProject: string;
  aiSuggestionsHeading: string;
  aiRemindersLabel: string;
  aiBlocksLabel: string;
  aiResourcesLabel: string;
  cancel: string;
  createTask: string;
  creating: string;
  editTask: string;
  saving: string;
  saveChanges: string;
  detailOverdue: string;
  detailDescription: string;
  detailDueDate: string;
  detailTimeBlocks: string;
  detailCreated: string;
  detailCompleted: string;
  detailReminder: string;
  detailSource: string;
  detailTags: string;
  /** Short label for tasks created with AI assistance */
  detailAiGenerated: string;
  focusRitual: string;
  close: string;
  deleteTaskTitle: string;
  deleteTaskDescription: (taskTitle: string) => string;
  delete: string;
  deleting: string;
  clarifyUrgencyQ: string;
  clarifyUrgencyOptImmediate: string;
  clarifyUrgencyOptWeek: string;
  clarifyUrgencyOptNoRush: string;
  clarifyEffortQ: string;
  clarifyEffortOptQuick: string;
  clarifyEffortOptMedium: string;
  clarifyEffortOptDeep: string;
  clarifyAudienceQ: string;
  clarifyAudienceOptSelf: string;
  clarifyAudienceOptTeam: string;
  clarifyAudienceOptPublic: string;
  clarifyDepsQ: string;
  clarifyDepsOptNone: string;
  clarifyDepsOptWaiting: string;
  clarifyDepsOptCollab: string;
  aiDescriptionTemplate: (title: string) => string;
  aiResourceDeepWork: string;
  aiReminderBeforeDue: string;
  aiReminderMorningDue: string;
};

const en: TasksUiCopy = {
  pageTitle: "Tasks",
  pageDescription: "Manage and track your tasks",
  newTask: "New Task",
  searchPlaceholder: "Search tasks...",
  filterStatus: "Status",
  filterPriority: "Priority",
  allFilterPattern: "All {{label}}",
  sortPlaceholder: "Sort by",
  sortDateCreated: "Date Created",
  sortDueDate: "Due Date",
  sortPriority: "Priority",
  sortTitle: "Title",
  emptyTitle: "No tasks found",
  emptyDescNew: "Create your first task to start organizing your work",
  emptyDescFiltered: "Try adjusting your filters",
  emptyCreate: "Create Task",
  completeTaskAria: "Complete task",
  statusTodo: "To Do",
  statusInProgress: "In Progress",
  statusDone: "Done",
  statusCancelled: "Cancelled",
  priorityLow: "Low",
  priorityMedium: "Medium",
  priorityHigh: "High",
  priorityUrgent: "Urgent",
  toastFocusStarted: (taskTitle) => `Focus mode started for "${taskTitle}"`,
  toastTaskCreated: "Task created",
  toastTaskCreateFailed: "Failed to create task",
  toastTaskUpdated: "Task updated",
  toastTaskUpdateFailed: "Failed to update task",
  toastTaskDeleted: "Task deleted",
  toastTaskDeleteFailed: "Failed to delete task",
  createDialogTitleNew: "New Task",
  createDialogTitleQuestions: "A few quick questions",
  createDialogQuestionProgress: (n, total) => `Question ${n} of ${total}`,
  createPlaceholderTitle: "What do you need to do?",
  createWithAi: "Create with AI",
  createManually: "Create Manually",
  createCustomAnswerPlaceholder: "Or type your own answer…",
  createGenerating: "Generating task details…",
  createTitleAiAssisted: "AI-Assisted Task",
  createTitleNewTask: "New Task",
  labelTitle: "Title *",
  labelDescription: "Description",
  labelStatus: "Status",
  labelPriority: "Priority",
  labelDueDate: "Due Date",
  labelEstimatedBlocks: "Estimated Blocks",
  labelProject: "Project",
  labelNotes: "Notes",
  placeholderTaskTitle: "Task title",
  placeholderDescription: "What needs to be done?",
  placeholderBlocks: "e.g. 2",
  placeholderNotes: "Any extra notes…",
  noProject: "No project",
  aiSuggestionsHeading: "AI Suggestions",
  aiRemindersLabel: "Reminders:",
  aiBlocksLabel: "Suggested time blocks:",
  aiResourcesLabel: "Resources:",
  cancel: "Cancel",
  createTask: "Create Task",
  creating: "Creating…",
  editTask: "Edit Task",
  saving: "Saving…",
  saveChanges: "Save Changes",
  detailOverdue: "Overdue",
  detailDescription: "Description",
  detailDueDate: "Due Date",
  detailTimeBlocks: "Time Blocks",
  detailCreated: "Created",
  detailCompleted: "Completed",
  detailReminder: "Reminder",
  detailSource: "Source",
  detailTags: "Tags",
  detailAiGenerated: "AI-generated",
  focusRitual: "Focus Ritual",
  close: "Close",
  deleteTaskTitle: "Delete Task",
  deleteTaskDescription: (taskTitle) =>
    `Are you sure you want to delete "${taskTitle}"? This action cannot be undone.`,
  delete: "Delete",
  deleting: "Deleting…",
  clarifyUrgencyQ: "How urgent is this task?",
  clarifyUrgencyOptImmediate: "Immediate",
  clarifyUrgencyOptWeek: "This week",
  clarifyUrgencyOptNoRush: "No rush",
  clarifyEffortQ: "How much effort do you expect?",
  clarifyEffortOptQuick: "Quick (< 30 min)",
  clarifyEffortOptMedium: "Medium (1–2 hrs)",
  clarifyEffortOptDeep: "Deep work (3+ hrs)",
  clarifyAudienceQ: "Who is the audience?",
  clarifyAudienceOptSelf: "Just me",
  clarifyAudienceOptTeam: "My team",
  clarifyAudienceOptPublic: "External / public",
  clarifyDepsQ: "Does this depend on anyone else?",
  clarifyDepsOptNone: "No dependencies",
  clarifyDepsOptWaiting: "Waiting on someone",
  clarifyDepsOptCollab: "Collaborative",
  aiDescriptionTemplate: (title) =>
    `Complete the task "${title}" by breaking it into clear, actionable steps. Start with research and context gathering, then move to execution, and finish with a review pass to ensure quality.`,
  aiResourceDeepWork: "Productivity tips – Deep Work",
  aiReminderBeforeDue: "30 minutes before due date",
  aiReminderMorningDue: "Morning of due date",
};

const zhTW: TasksUiCopy = {
  pageTitle: "任務",
  pageDescription: "管理與追蹤你的待辦",
  newTask: "新增任務",
  searchPlaceholder: "搜尋任務…",
  filterStatus: "狀態",
  filterPriority: "優先度",
  allFilterPattern: "全部{{label}}",
  sortPlaceholder: "排序",
  sortDateCreated: "建立日期",
  sortDueDate: "到期日",
  sortPriority: "優先度",
  sortTitle: "標題",
  emptyTitle: "找不到任務",
  emptyDescNew: "建立第一個任務，開始整理你的工作",
  emptyDescFiltered: "試試調整篩選條件",
  emptyCreate: "建立任務",
  completeTaskAria: "完成任務",
  statusTodo: "待辦",
  statusInProgress: "進行中",
  statusDone: "完成",
  statusCancelled: "已取消",
  priorityLow: "低",
  priorityMedium: "中",
  priorityHigh: "高",
  priorityUrgent: "緊急",
  toastFocusStarted: (taskTitle) => `已為「${taskTitle}」開始專注模式`,
  toastTaskCreated: "任務已建立",
  toastTaskCreateFailed: "建立任務失敗",
  toastTaskUpdated: "任務已更新",
  toastTaskUpdateFailed: "更新任務失敗",
  toastTaskDeleted: "任務已刪除",
  toastTaskDeleteFailed: "刪除任務失敗",
  createDialogTitleNew: "新增任務",
  createDialogTitleQuestions: "幾個快速問題",
  createDialogQuestionProgress: (n, total) => `第 ${n} 題，共 ${total} 題`,
  createPlaceholderTitle: "你需要完成什麼？",
  createWithAi: "用 AI 建立",
  createManually: "手動建立",
  createCustomAnswerPlaceholder: "或輸入你自己的答案…",
  createGenerating: "正在產生任務內容…",
  createTitleAiAssisted: "AI 輔助任務",
  createTitleNewTask: "新增任務",
  labelTitle: "標題 *",
  labelDescription: "說明",
  labelStatus: "狀態",
  labelPriority: "優先度",
  labelDueDate: "到期日",
  labelEstimatedBlocks: "預估時間塊",
  labelProject: "專案",
  labelNotes: "備註",
  placeholderTaskTitle: "任務標題",
  placeholderDescription: "需要做什麼？",
  placeholderBlocks: "例如：2",
  placeholderNotes: "其他備註…",
  noProject: "無專案",
  aiSuggestionsHeading: "AI 建議",
  aiRemindersLabel: "提醒：",
  aiBlocksLabel: "建議時間塊：",
  aiResourcesLabel: "參考資源：",
  cancel: "取消",
  createTask: "建立任務",
  creating: "建立中…",
  editTask: "編輯任務",
  saving: "儲存中…",
  saveChanges: "儲存變更",
  detailOverdue: "已逾期",
  detailDescription: "說明",
  detailDueDate: "到期日",
  detailTimeBlocks: "時間塊",
  detailCreated: "建立於",
  detailCompleted: "完成於",
  detailReminder: "提醒",
  detailSource: "來源",
  detailTags: "標籤",
  detailAiGenerated: "AI 生成",
  focusRitual: "專注儀式",
  close: "關閉",
  deleteTaskTitle: "刪除任務",
  deleteTaskDescription: (taskTitle) =>
    `確定要刪除「${taskTitle}」嗎？此操作無法復原。`,
  delete: "刪除",
  deleting: "刪除中…",
  clarifyUrgencyQ: "這項任務有多急？",
  clarifyUrgencyOptImmediate: "立刻",
  clarifyUrgencyOptWeek: "本週內",
  clarifyUrgencyOptNoRush: "不急",
  clarifyEffortQ: "你預期要花多少力氣？",
  clarifyEffortOptQuick: "很快（< 30 分鐘）",
  clarifyEffortOptMedium: "中等（1–2 小時）",
  clarifyEffortOptDeep: "深度工作（3+ 小時）",
  clarifyAudienceQ: "對象是誰？",
  clarifyAudienceOptSelf: "只有自己",
  clarifyAudienceOptTeam: "我的團隊",
  clarifyAudienceOptPublic: "外部／大眾",
  clarifyDepsQ: "是否依賴其他人？",
  clarifyDepsOptNone: "沒有依賴",
  clarifyDepsOptWaiting: "在等待某人",
  clarifyDepsOptCollab: "需要協作",
  aiDescriptionTemplate: (title) =>
    `請將「${title}」拆成清楚可執行的步驟：先蒐集背景，再執行，最後檢視品質。`,
  aiResourceDeepWork: "生產力技巧 — 深度工作",
  aiReminderBeforeDue: "到期前 30 分鐘",
  aiReminderMorningDue: "到期當天早上",
};

const zhCN: TasksUiCopy = {
  pageTitle: "任务",
  pageDescription: "管理与跟踪你的待办",
  newTask: "新建任务",
  searchPlaceholder: "搜索任务…",
  filterStatus: "状态",
  filterPriority: "优先级",
  allFilterPattern: "全部{{label}}",
  sortPlaceholder: "排序",
  sortDateCreated: "创建日期",
  sortDueDate: "截止日期",
  sortPriority: "优先级",
  sortTitle: "标题",
  emptyTitle: "没有找到任务",
  emptyDescNew: "创建第一个任务，开始整理你的工作",
  emptyDescFiltered: "试试调整筛选条件",
  emptyCreate: "创建任务",
  completeTaskAria: "完成任务",
  statusTodo: "待办",
  statusInProgress: "进行中",
  statusDone: "已完成",
  statusCancelled: "已取消",
  priorityLow: "低",
  priorityMedium: "中",
  priorityHigh: "高",
  priorityUrgent: "紧急",
  toastFocusStarted: (taskTitle) => `已为「${taskTitle}」开始专注模式`,
  toastTaskCreated: "任务已创建",
  toastTaskCreateFailed: "创建任务失败",
  toastTaskUpdated: "任务已更新",
  toastTaskUpdateFailed: "更新任务失败",
  toastTaskDeleted: "任务已删除",
  toastTaskDeleteFailed: "删除任务失败",
  createDialogTitleNew: "新建任务",
  createDialogTitleQuestions: "几个快速问题",
  createDialogQuestionProgress: (n, total) => `第 ${n} 题，共 ${total} 题`,
  createPlaceholderTitle: "你需要完成什么？",
  createWithAi: "用 AI 创建",
  createManually: "手动创建",
  createCustomAnswerPlaceholder: "或输入你自己的答案…",
  createGenerating: "正在生成任务详情…",
  createTitleAiAssisted: "AI 辅助任务",
  createTitleNewTask: "新建任务",
  labelTitle: "标题 *",
  labelDescription: "描述",
  labelStatus: "状态",
  labelPriority: "优先级",
  labelDueDate: "截止日期",
  labelEstimatedBlocks: "预估时间块",
  labelProject: "项目",
  labelNotes: "备注",
  placeholderTaskTitle: "任务标题",
  placeholderDescription: "需要做什么？",
  placeholderBlocks: "例如：2",
  placeholderNotes: "其他备注…",
  noProject: "无项目",
  aiSuggestionsHeading: "AI 建议",
  aiRemindersLabel: "提醒：",
  aiBlocksLabel: "建议时间块：",
  aiResourcesLabel: "参考资源：",
  cancel: "取消",
  createTask: "创建任务",
  creating: "创建中…",
  editTask: "编辑任务",
  saving: "保存中…",
  saveChanges: "保存更改",
  detailOverdue: "已逾期",
  detailDescription: "描述",
  detailDueDate: "截止日期",
  detailTimeBlocks: "时间块",
  detailCreated: "创建于",
  detailCompleted: "完成于",
  detailReminder: "提醒",
  detailSource: "来源",
  detailTags: "标签",
  detailAiGenerated: "AI 生成",
  focusRitual: "专注仪式",
  close: "关闭",
  deleteTaskTitle: "删除任务",
  deleteTaskDescription: (taskTitle) =>
    `确定要删除「${taskTitle}」吗？此操作无法撤销。`,
  delete: "删除",
  deleting: "删除中…",
  clarifyUrgencyQ: "这项任务有多急？",
  clarifyUrgencyOptImmediate: "立刻",
  clarifyUrgencyOptWeek: "本周内",
  clarifyUrgencyOptNoRush: "不急",
  clarifyEffortQ: "你预期要花多少精力？",
  clarifyEffortOptQuick: "很快（< 30 分钟）",
  clarifyEffortOptMedium: "中等（1–2 小时）",
  clarifyEffortOptDeep: "深度工作（3+ 小时）",
  clarifyAudienceQ: "受众是谁？",
  clarifyAudienceOptSelf: "只有自己",
  clarifyAudienceOptTeam: "我的团队",
  clarifyAudienceOptPublic: "外部／公众",
  clarifyDepsQ: "是否依赖其他人？",
  clarifyDepsOptNone: "没有依赖",
  clarifyDepsOptWaiting: "在等待某人",
  clarifyDepsOptCollab: "需要协作",
  aiDescriptionTemplate: (title) =>
    `请将「${title}」拆成清晰可执行的步骤：先收集背景，再执行，最后检查质量。`,
  aiResourceDeepWork: "生产力技巧 — 深度工作",
  aiReminderBeforeDue: "截止前 30 分钟",
  aiReminderMorningDue: "截止当天早上",
};

const localizedCopy = createLocaleCopyMap<TasksUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
});

export function getTasksUiCopy(locale: AppLocale): TasksUiCopy {
  return localizedCopy[locale] ?? localizedCopy.en;
}

export function formatAllFilterLabel(copy: TasksUiCopy, filterLabel: string): string {
  return copy.allFilterPattern.replace("{{label}}", filterLabel);
}

export function getTaskStatusOptions(copy: TasksUiCopy): { value: Task["status"]; label: string }[] {
  return [
    { value: "todo", label: copy.statusTodo },
    { value: "in-progress", label: copy.statusInProgress },
    { value: "done", label: copy.statusDone },
    { value: "cancelled", label: copy.statusCancelled },
  ];
}

export function getTaskPriorityOptions(copy: TasksUiCopy): {
  value: Task["priority"];
  label: string;
}[] {
  return [
    { value: "low", label: copy.priorityLow },
    { value: "medium", label: copy.priorityMedium },
    { value: "high", label: copy.priorityHigh },
    { value: "urgent", label: copy.priorityUrgent },
  ];
}

export function getTaskSortOptions(copy: TasksUiCopy): { value: string; label: string }[] {
  return [
    { value: "created_at", label: copy.sortDateCreated },
    { value: "due_date", label: copy.sortDueDate },
    { value: "priority", label: copy.sortPriority },
    { value: "title", label: copy.sortTitle },
  ];
}

export function taskStatusLabel(copy: TasksUiCopy, value: Task["status"]): string {
  return getTaskStatusOptions(copy).find((o) => o.value === value)?.label ?? value;
}

export function taskPriorityLabel(copy: TasksUiCopy, value: Task["priority"]): string {
  return getTaskPriorityOptions(copy).find((o) => o.value === value)?.label ?? value;
}

export function buildClarifyingQuestions(copy: TasksUiCopy, title: string): ClarifyingQuestion[] {
  const lower = title.toLowerCase();
  const base: ClarifyingQuestion[] = [
    {
      id: "urgency",
      question: copy.clarifyUrgencyQ,
      options: [
        { id: "urgency_immediate", label: copy.clarifyUrgencyOptImmediate },
        { id: "urgency_week", label: copy.clarifyUrgencyOptWeek },
        { id: "urgency_norush", label: copy.clarifyUrgencyOptNoRush },
      ],
    },
    {
      id: "effort",
      question: copy.clarifyEffortQ,
      options: [
        { id: "effort_quick", label: copy.clarifyEffortOptQuick },
        { id: "effort_medium", label: copy.clarifyEffortOptMedium },
        { id: "effort_deep", label: copy.clarifyEffortOptDeep },
      ],
    },
  ];
  if (
    lower.includes("design") ||
    lower.includes("build") ||
    lower.includes("create")
  ) {
    base.push({
      id: "audience",
      question: copy.clarifyAudienceQ,
      options: [
        { id: "audience_self", label: copy.clarifyAudienceOptSelf },
        { id: "audience_team", label: copy.clarifyAudienceOptTeam },
        { id: "audience_public", label: copy.clarifyAudienceOptPublic },
      ],
    });
  } else {
    base.push({
      id: "deps",
      question: copy.clarifyDepsQ,
      options: [
        { id: "deps_none", label: copy.clarifyDepsOptNone },
        { id: "deps_waiting", label: copy.clarifyDepsOptWaiting },
        { id: "deps_collab", label: copy.clarifyDepsOptCollab },
      ],
    });
  }
  return base;
}

export function buildAiMetadata(copy: TasksUiCopy, title: string) {
  return {
    reminders: [copy.aiReminderBeforeDue, copy.aiReminderMorningDue],
    suggestedBlocks: 2,
    webResources: [
      {
        label: `Best practices for "${title.slice(0, 30)}${title.length > 30 ? "…" : ""}"`,
        url: "#",
      },
      { label: copy.aiResourceDeepWork, url: "#" },
    ],
  };
}

/** Map clarifying answer option ids to defaults after the wizard. */
export function applyClarifyingInference(
  questions: ClarifyingQuestion[],
  answers: string[],
): { estimatedBlocks: string; priority: Task["priority"] } {
  const effIdx = questions.findIndex((q) => q.id === "effort");
  const urgIdx = questions.findIndex((q) => q.id === "urgency");
  const effortId = effIdx >= 0 ? (answers[effIdx] ?? "") : "";
  const urgencyId = urgIdx >= 0 ? (answers[urgIdx] ?? "") : "";
  let estimatedBlocks = "";
  if (effortId === "effort_quick") estimatedBlocks = "1";
  else if (effortId === "effort_medium") estimatedBlocks = "2";
  else if (effortId === "effort_deep") estimatedBlocks = "4";
  let priority: Task["priority"] = "medium";
  if (urgencyId === "urgency_immediate") priority = "urgent";
  else if (urgencyId === "urgency_week") priority = "high";
  return { estimatedBlocks, priority };
}
