import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";

export type ProjectsUiCopy = {
  pageTitle: string;
  pageDescription: string;
  newProject: string;
  dailyPlanner: string;
  commandPaletteHint: string;
  // Insight strip
  insightActiveNow: string;
  insightDueThisWeek: string;
  insightStale: string;
  insightPortfolio: string;
  // Views
  viewKanban: string;
  viewGallery: string;
  viewList: string;
  viewMap: string;
  viewTimeline: string;
  timelineFootnote: string;
  // Filters & search
  searchPlaceholder: string;
  filterStatus: string;
  filterPriority: string;
  sortBy: string;
  sortUpdated: string;
  sortCreated: string;
  sortDueDate: string;
  sortPriority: string;
  sortName: string;
  sortMomentum: string;
  allStatus: string;
  allPriority: string;
  tableName: string;
  tableProgress: string;
  tableDue: string;
  todayLabel: string;
  scrollToToday: string;
  timelineFullscreen: string;
  timelineFullscreenClose: string;
  zoomIn: string;
  zoomOut: string;
  fitToScreen: string;
  relationshipLegend: string;
  relationshipHint: string;
  relationshipCreate: string;
  relationshipChooseType: string;
  relationshipCreateAction: string;
  relationshipNoEdgesTitle: string;
  relationshipNoEdgesDescription: string;
  relationshipTypeLabel: string;
  relationshipTypeRelated: string;
  relationshipTypeDependsOn: string;
  relationshipTypeBlocks: string;
  relationshipTypeChild: string;
  relationshipTypeIdea: string;
  // Kanban
  addProject: string;
  collapseColumn: string;
  sortWithinColumn: string;
  archiveAllDone: string;
  // Card
  tasks: string;
  notes: string;
  ideas: string;
  staleLabel: string;
  atRiskLabel: string;
  pinnedLabel: string;
  // List bulk
  projectsSelected: (n: number) => string;
  changeStatus: string;
  changePriority: string;
  archive: string;
  deleteAction: string;
  addAction: string;
  // Detail
  detailsTab: string;
  activityTab: string;
  edit: string;
  duplicate: string;
  pin: string;
  unpin: string;
  moveToStatus: string;
  noTasksLinked: string;
  noActivityTitle: string;
  noActivityDescription: string;
  deleteProjectTitle: string;
  deleteProjectDescription: (projectName: string) => string;
  removeFromFavorites: string;
  saveChanges: string;
  // Stale resurrection
  staleProjects: string;
  daysStale: (n: number) => string;
  resume: string;
  convertToIdea: string;
  // What's Next
  whatsNextPrefix: string;
  whatsNextSuffix: string;
  open: string;
  dismiss: string;
  // Create modal
  createTitle: string;
  magicInputLabel: string;
  magicInputHint: string;
  aiGeneratedMetadata: string;
  regenerate: string;
  uploadCustom: string;
  foundInWorkspace: string;
  similarProjectExists: string;
  view: string;
  suggestedTasks: string;
  uncheckToSkip: string;
  relatedResources: string;
  videos: string;
  podcasts: string;
  articles: string;
  news: string;
  images: string;
  websites: string;
  otherResources: string;
  addToFavorites: string;
  relatedResourcesHint: string;
  tabResources: string;
  noSavedResources: string;
  fillWithAi: string;
  aiSettingUp: string;
  projectAiReady: string;
  addTaskManually: string;
  aiSmartAddTask: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  statusLabel: string;
  priorityLabel: string;
  startDateLabel: string;
  endDateLabel: string;
  statusPlanning: string;
  statusActive: string;
  statusPaused: string;
  statusCompleted: string;
  statusCancelled: string;
  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;
  priorityUrgent: string;
  thumbnailStyleHeading: string;
  thumbnailStyleMinimal: string;
  thumbnailStyleGradient: string;
  thumbnailStyleIllustrated: string;
  thumbnailStylePhotographic: string;
  thumbnailStyleAbstract: string;
  thumbnailStyleGlassmorphism: string;
  thumbnailStyleThreeDRender: string;
  thumbnailStyleEditorial: string;
  thumbnailStyleIsometric: string;
  thumbnailStyleBrutalist: string;
  thumbnailStyleRetroY2k: string;
  thumbnailStyleNa: string;
  thumbnailStyleNaCardTitle: string;
  thumbnailStyleNaCardSubtitle: string;
  relatedResourcesEmpty: string;
  toastProjectAiGenerateFailed: string;
  openLink: string;
  manualTaskPlaceholder: string;
  cancel: string;
  saveAsDraft: string;
  createProject: string;
  fromTemplate: string;
  // Empty
  noProjectsTitle: string;
  noProjectsDescription: string;
  noProjectsAction: string;
  noResultsTitle: string;
  noResultsDescription: string;
  // Health
  healthGood: string;
  healthWarning: string;
  healthCritical: string;
  // Toasts
  toastProjectCreated: string;
  toastProjectCreateFailed: string;
  toastProjectUpdated: string;
  toastProjectUpdateFailed: string;
  toastProjectDeleted: string;
  toastProjectDeleteFailed: string;
  toastProjectArchived: string;
};

const en: ProjectsUiCopy = {
  pageTitle: "Projects",
  pageDescription: "Manage your projects and track progress",
  newProject: "New Project",
  dailyPlanner: "Daily Planner",
  commandPaletteHint: "Press ⌘K for commands",
  insightActiveNow: "Active Now",
  insightDueThisWeek: "Due This Week",
  insightStale: "Stale",
  insightPortfolio: "Portfolio Balance",
  viewKanban: "Kanban",
  viewGallery: "Gallery",
  viewList: "List",
  viewMap: "Map",
  viewTimeline: "Timeline",
  timelineFootnote:
    "Bars use start and due dates when set; otherwise they begin at the created date with a 30-day default span.",
  searchPlaceholder: "Search projects...",
  filterStatus: "Status",
  filterPriority: "Priority",
  sortBy: "Sort by",
  sortUpdated: "Updated",
  sortCreated: "Created",
  sortDueDate: "Due Date",
  sortPriority: "Priority",
  sortName: "Name",
  sortMomentum: "Momentum",
  allStatus: "All Status",
  allPriority: "All Priority",
  tableName: "Name",
  tableProgress: "Progress",
  tableDue: "Due",
  todayLabel: "Today",
  scrollToToday: "Scroll to today",
  timelineFullscreen: "Full-page timeline",
  timelineFullscreenClose: "Close",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  fitToScreen: "Fit to screen",
  relationshipLegend: "Legend",
  relationshipHint:
    "Drag to pan, use the wheel to zoom, and click two projects to connect them.",
  relationshipCreate: "Create relationship",
  relationshipChooseType: "Choose relationship type",
  relationshipCreateAction: "Save connection",
  relationshipNoEdgesTitle: "No relationships yet",
  relationshipNoEdgesDescription:
    "Click two projects to create a connection, or link projects to the same idea to surface related work here.",
  relationshipTypeLabel: "Relationship type",
  relationshipTypeRelated: "Related",
  relationshipTypeDependsOn: "Depends on",
  relationshipTypeBlocks: "Blocks",
  relationshipTypeChild: "Parent-child",
  relationshipTypeIdea: "Shared idea",
  addProject: "Add project",
  collapseColumn: "Collapse column",
  sortWithinColumn: "Sort within column",
  archiveAllDone: "Archive all done",
  tasks: "tasks",
  notes: "notes",
  ideas: "ideas",
  staleLabel: "Stale",
  atRiskLabel: "At risk",
  pinnedLabel: "Pinned",
  projectsSelected: (n) => `${n} project${n === 1 ? "" : "s"} selected`,
  changeStatus: "Change Status",
  changePriority: "Change Priority",
  archive: "Archive",
  deleteAction: "Delete",
  addAction: "Add",
  detailsTab: "Details",
  activityTab: "Activity",
  edit: "Edit",
  duplicate: "Duplicate",
  pin: "Pin",
  unpin: "Unpin",
  moveToStatus: "Move to status",
  noTasksLinked: "No tasks linked to this project yet.",
  noActivityTitle: "No activity yet",
  noActivityDescription: "Comments and activity will appear here.",
  deleteProjectTitle: "Delete Project",
  deleteProjectDescription: (projectName) =>
    `Are you sure you want to delete "${projectName}"? This action cannot be undone.`,
  removeFromFavorites: "Remove from favorites",
  saveChanges: "Save Changes",
  staleProjects: "Stale Projects",
  daysStale: (n) => `${n} day${n === 1 ? "" : "s"} stale`,
  resume: "Resume",
  convertToIdea: "Convert to Idea",
  whatsNextPrefix: "You haven't touched",
  whatsNextSuffix: "Want to jump in?",
  open: "Open",
  dismiss: "Dismiss",
  createTitle: "Create Project",
  magicInputLabel: "What are you working on?",
  magicInputHint: 'Try: "Opening a coffee shop by August 2030"',
  aiGeneratedMetadata: "AI-Generated Metadata",
  regenerate: "Regenerate",
  uploadCustom: "Upload custom",
  foundInWorkspace: "Found in your workspace",
  similarProjectExists: "Similar project exists",
  view: "View",
  suggestedTasks: "Suggested tasks",
  uncheckToSkip: "uncheck to skip",
  relatedResources: "Related Resources",
  videos: "Videos",
  podcasts: "Podcasts",
  articles: "Articles",
  news: "News",
  images: "Photos / Images",
  websites: "Website",
  otherResources: "Other",
  addToFavorites: "Save to project",
  relatedResourcesHint: "Uncheck to skip saving a link.",
  tabResources: "Resources",
  noSavedResources: "No saved links yet. They appear here when you include them while creating the project.",
  fillWithAi: "Fill project data with AI",
  aiSettingUp: "AI is setting up your project…",
  projectAiReady: "Project setup complete!",
  addTaskManually: "Add task manually",
  aiSmartAddTask: "AI-assisted add task",
  descriptionLabel: "Description",
  descriptionPlaceholder: "What is this project about?",
  statusLabel: "Status",
  priorityLabel: "Priority",
  startDateLabel: "Start date",
  endDateLabel: "End date",
  statusPlanning: "Planning",
  statusActive: "Active",
  statusPaused: "Paused",
  statusCompleted: "Completed",
  statusCancelled: "Cancelled",
  priorityLow: "Low",
  priorityMedium: "Medium",
  priorityHigh: "High",
  priorityUrgent: "Urgent",
  thumbnailStyleHeading: "Thumbnail style",
  thumbnailStyleMinimal: "Minimal",
  thumbnailStyleGradient: "Gradient",
  thumbnailStyleIllustrated: "Illustrated",
  thumbnailStylePhotographic: "Photo",
  thumbnailStyleAbstract: "Abstract",
  thumbnailStyleGlassmorphism: "Glassmorphism",
  thumbnailStyleThreeDRender: "3D Render",
  thumbnailStyleEditorial: "Editorial",
  thumbnailStyleIsometric: "Isometric",
  thumbnailStyleBrutalist: "Brutalist",
  thumbnailStyleRetroY2k: "Retro / Y2K",
  thumbnailStyleNa: "N/A",
  thumbnailStyleNaCardTitle: "Title",
  thumbnailStyleNaCardSubtitle: "only",
  relatedResourcesEmpty:
    "No related links were found this time. Try “Regenerate” or check your network — we combine live search with a curated AI fallback, and only links that pass availability checks are shown.",
  toastProjectAiGenerateFailed: "Could not generate AI data. Try again.",
  openLink: "Open",
  manualTaskPlaceholder: "Task title…",
  cancel: "Cancel",
  saveAsDraft: "Save as Draft",
  createProject: "Create Project",
  fromTemplate: "From Template",
  noProjectsTitle: "No projects yet",
  noProjectsDescription: "Create your first project to get started",
  noProjectsAction: "Create Project",
  noResultsTitle: "No projects found",
  noResultsDescription: "Try adjusting your filters",
  healthGood: "On track",
  healthWarning: "Needs attention",
  healthCritical: "At risk",
  toastProjectCreated: "Project created",
  toastProjectCreateFailed: "Could not create project",
  toastProjectUpdated: "Project updated",
  toastProjectUpdateFailed: "Could not update project",
  toastProjectDeleted: "Project deleted",
  toastProjectDeleteFailed: "Could not delete project",
  toastProjectArchived: "Project archived",
};

const zhTW: ProjectsUiCopy = {
  pageTitle: "專案",
  pageDescription: "管理您的專案並追蹤進度",
  newProject: "新專案",
  dailyPlanner: "每日規劃",
  commandPaletteHint: "按 ⌘K 開啟指令面板",
  insightActiveNow: "進行中",
  insightDueThisWeek: "本週到期",
  insightStale: "停滯",
  insightPortfolio: "專案分布",
  viewKanban: "看板",
  viewGallery: "畫廊",
  viewList: "列表",
  viewMap: "關係圖",
  viewTimeline: "時間軸",
  timelineFootnote:
    "有設定開始／結束日則依該區間顯示；否則以建立日為起點，預設顯示約 30 天的寬度。",
  searchPlaceholder: "搜尋專案...",
  filterStatus: "狀態",
  filterPriority: "優先順序",
  sortBy: "排序方式",
  sortUpdated: "更新時間",
  sortCreated: "建立時間",
  sortDueDate: "到期日",
  sortPriority: "優先順序",
  sortName: "名稱",
  sortMomentum: "動能",
  allStatus: "所有狀態",
  allPriority: "所有優先順序",
  tableName: "名稱",
  tableProgress: "進度",
  tableDue: "到期",
  todayLabel: "今天",
  scrollToToday: "捲動到今天",
  timelineFullscreen: "全頁面顯示時間軸",
  timelineFullscreenClose: "關閉",
  zoomIn: "放大",
  zoomOut: "縮小",
  fitToScreen: "重置視圖",
  relationshipLegend: "圖例",
  relationshipHint: "拖曳畫布可平移，滾輪可縮放，點擊兩個專案即可建立關聯。",
  relationshipCreate: "建立關聯",
  relationshipChooseType: "選擇關聯類型",
  relationshipCreateAction: "儲存連線",
  relationshipNoEdgesTitle: "尚未建立關聯",
  relationshipNoEdgesDescription:
    "點擊兩個專案可建立連線，或把多個專案連到同一則靈感，系統就會在這裡顯示關聯。",
  relationshipTypeLabel: "關聯類型",
  relationshipTypeRelated: "相關",
  relationshipTypeDependsOn: "依賴",
  relationshipTypeBlocks: "阻擋",
  relationshipTypeChild: "父子",
  relationshipTypeIdea: "共用靈感",
  addProject: "新增專案",
  collapseColumn: "收合欄位",
  sortWithinColumn: "欄位內排序",
  archiveAllDone: "封存所有完成項目",
  tasks: "任務",
  notes: "筆記",
  ideas: "靈感",
  staleLabel: "停滯",
  atRiskLabel: "風險中",
  pinnedLabel: "已釘選",
  projectsSelected: (n) => `已選取 ${n} 個專案`,
  changeStatus: "變更狀態",
  changePriority: "變更優先順序",
  archive: "封存",
  deleteAction: "刪除",
  addAction: "新增",
  detailsTab: "詳細資訊",
  activityTab: "活動",
  edit: "編輯",
  duplicate: "複製",
  pin: "釘選",
  unpin: "取消釘選",
  moveToStatus: "移動至狀態",
  noTasksLinked: "這個專案目前尚未連結任何任務。",
  noActivityTitle: "尚無活動",
  noActivityDescription: "留言與活動紀錄會顯示在這裡。",
  deleteProjectTitle: "刪除專案",
  deleteProjectDescription: (projectName) =>
    `確定要刪除「${projectName}」嗎？此操作無法復原。`,
  removeFromFavorites: "從收藏中移除",
  saveChanges: "儲存變更",
  staleProjects: "停滯專案",
  daysStale: (n) => `停滯 ${n} 天`,
  resume: "恢復",
  convertToIdea: "轉為靈感",
  whatsNextPrefix: "你已經",
  whatsNextSuffix: "要繼續進行嗎？",
  open: "開啟",
  dismiss: "忽略",
  createTitle: "建立專案",
  magicInputLabel: "你正在做什麼？",
  magicInputHint: "試試：「在 2030 年 8 月前開一間咖啡店」",
  aiGeneratedMetadata: "AI 生成的資料",
  regenerate: "重新生成",
  uploadCustom: "上傳自訂",
  foundInWorkspace: "在你的工作區中找到",
  similarProjectExists: "已存在類似專案",
  view: "檢視",
  suggestedTasks: "建議任務",
  uncheckToSkip: "取消勾選以跳過",
  relatedResources: "相關資源",
  videos: "影片",
  podcasts: "Podcast",
  articles: "文章",
  news: "新聞",
  images: "圖片／影像",
  websites: "網站",
  otherResources: "其他",
  addToFavorites: "加入專案收藏",
  relatedResourcesHint: "取消勾選則不會儲存該連結。",
  tabResources: "相關資源",
  noSavedResources: "尚無已儲存的連結。建立專案時勾選的項目會顯示在此。",
  fillWithAi: "用 AI 填充專案資料",
  aiSettingUp: "AI 正在設定您的專案⋯",
  projectAiReady: "專案設定完成！",
  addTaskManually: "手動添加任務",
  aiSmartAddTask: "AI 協助添加任務",
  descriptionLabel: "描述",
  descriptionPlaceholder: "這個專案是關於什麼？",
  statusLabel: "狀態",
  priorityLabel: "優先順序",
  startDateLabel: "開始日期",
  endDateLabel: "結束日期",
  statusPlanning: "規劃中",
  statusActive: "進行中",
  statusPaused: "暫停",
  statusCompleted: "已完成",
  statusCancelled: "已取消",
  priorityLow: "低",
  priorityMedium: "中",
  priorityHigh: "高",
  priorityUrgent: "緊急",
  thumbnailStyleHeading: "縮圖風格",
  thumbnailStyleMinimal: "極簡",
  thumbnailStyleGradient: "漸層",
  thumbnailStyleIllustrated: "插畫",
  thumbnailStylePhotographic: "照片",
  thumbnailStyleAbstract: "抽象",
  thumbnailStyleGlassmorphism: "玻璃擬態",
  thumbnailStyleThreeDRender: "3D 算繪",
  thumbnailStyleEditorial: "雜誌風",
  thumbnailStyleIsometric: "等角透視",
  thumbnailStyleBrutalist: "粗獷主義",
  thumbnailStyleRetroY2k: "復古 Y2K",
  thumbnailStyleNa: "不適用",
  thumbnailStyleNaCardTitle: "僅標題",
  thumbnailStyleNaCardSubtitle: "無圖",
  relatedResourcesEmpty:
    "本次找不到相關連結。請按「重新生成」或檢查網路；系統會結合即時搜尋與 AI 備援，只顯示通過可用性檢查的網址。",
  toastProjectAiGenerateFailed: "無法產生 AI 資料，請稍後再試。",
  openLink: "開啟",
  manualTaskPlaceholder: "任務標題…",
  cancel: "取消",
  saveAsDraft: "儲存為草稿",
  createProject: "建立專案",
  fromTemplate: "從範本建立",
  noProjectsTitle: "尚無專案",
  noProjectsDescription: "建立第一個專案開始使用",
  noProjectsAction: "建立專案",
  noResultsTitle: "未找到專案",
  noResultsDescription: "請嘗試調整篩選條件",
  healthGood: "進度正常",
  healthWarning: "需要關注",
  healthCritical: "風險中",
  toastProjectCreated: "專案已建立",
  toastProjectCreateFailed: "無法建立專案",
  toastProjectUpdated: "專案已更新",
  toastProjectUpdateFailed: "無法更新專案",
  toastProjectDeleted: "專案已刪除",
  toastProjectDeleteFailed: "無法刪除專案",
  toastProjectArchived: "專案已封存",
};

function withBase(overrides: Partial<ProjectsUiCopy>): ProjectsUiCopy {
  return { ...en, ...overrides };
}

const zhCN = withBase({
  ...zhTW,
  pageDescription: "管理您的项目并追踪进度",
  viewMap: "关系图",
  timelineFootnote:
    "已设定开始/结束日期时按该区间显示；否则以创建日为起点，并预设约 30 天的跨度。",
  searchPlaceholder: "搜索项目...",
  filterPriority: "优先级",
  sortUpdated: "更新时间",
  sortCreated: "创建时间",
  sortPriority: "优先级",
  sortName: "名称",
  allPriority: "所有优先级",
  tableName: "名称",
  tableProgress: "进度",
  todayLabel: "今天",
  scrollToToday: "滚动到今天",
  fitToScreen: "重置视图",
  relationshipLegend: "图例",
  relationshipHint: "拖动画布可平移，滚轮可缩放，点击两个项目即可建立关联。",
  relationshipCreate: "建立关联",
  relationshipChooseType: "选择关联类型",
  relationshipCreateAction: "保存连线",
  relationshipNoEdgesTitle: "尚未建立关联",
  relationshipNoEdgesDescription:
    "点击两个项目即可建立连线，或将多个项目链接到同一个灵感，系统就会在这里显示关联。",
  relationshipTypeLabel: "关联类型",
  statusPlanning: "规划中",
  priorityUrgent: "紧急",
  noProjectsTitle: "暂无项目",
  noProjectsDescription: "创建第一个项目开始使用",
  noProjectsAction: "创建项目",
  noResultsTitle: "未找到项目",
  noResultsDescription: "请尝试调整筛选条件",
  toastProjectCreated: "项目已创建",
  toastProjectCreateFailed: "无法创建项目",
  toastProjectUpdated: "项目已更新",
  toastProjectUpdateFailed: "无法更新项目",
  toastProjectDeleted: "项目已删除",
  toastProjectDeleteFailed: "无法删除项目",
  toastProjectArchived: "项目已归档",
  thumbnailStyleHeading: "缩略图风格",
  thumbnailStyleMinimal: "极简",
  thumbnailStyleGradient: "渐变",
  thumbnailStyleIllustrated: "插画",
  thumbnailStylePhotographic: "照片",
  thumbnailStyleAbstract: "抽象",
  thumbnailStyleGlassmorphism: "玻璃态",
  thumbnailStyleThreeDRender: "3D 渲染",
  thumbnailStyleEditorial: "杂志风",
  thumbnailStyleIsometric: "等轴测",
  thumbnailStyleBrutalist: "粗犷主义",
  thumbnailStyleRetroY2k: "复古 Y2K",
  thumbnailStyleNa: "不适用",
  thumbnailStyleNaCardTitle: "标题",
  thumbnailStyleNaCardSubtitle: "仅",
});

const ja = withBase({
  pageTitle: "プロジェクト",
  pageDescription: "プロジェクトを管理し、進捗を追跡します",
  newProject: "新規プロジェクト",
  dailyPlanner: "デイリープランナー",
  insightActiveNow: "進行中",
  insightDueThisWeek: "今週の期限",
  insightStale: "停滞",
  insightPortfolio: "ポートフォリオ",
  viewMap: "関係図",
  viewTimeline: "タイムライン",
  timelineFootnote:
    "開始日と終了日があればその範囲を使い、未設定の場合は作成日から既定の 30 日幅で表示します。",
  searchPlaceholder: "プロジェクトを検索...",
  filterStatus: "ステータス",
  filterPriority: "優先度",
  sortBy: "並び替え",
  sortUpdated: "更新日",
  sortCreated: "作成日",
  sortDueDate: "期限",
  sortPriority: "優先度",
  sortName: "名前",
  sortMomentum: "勢い",
  allStatus: "すべてのステータス",
  allPriority: "すべての優先度",
  tableName: "名前",
  tableProgress: "進捗",
  tableDue: "期限",
  statusPlanning: "計画中",
  statusActive: "進行中",
  statusPaused: "一時停止",
  statusCompleted: "完了",
  statusCancelled: "キャンセル",
  priorityLow: "低",
  priorityMedium: "中",
  priorityHigh: "高",
  priorityUrgent: "緊急",
  noResultsTitle: "プロジェクトが見つかりません",
  noResultsDescription: "フィルターを調整してください",
  todayLabel: "今日",
  scrollToToday: "今日へ移動",
  timelineFullscreen: "タイムラインを全画面表示",
  timelineFullscreenClose: "閉じる",
  zoomIn: "拡大",
  zoomOut: "縮小",
  fitToScreen: "画面に合わせる",
  relationshipLegend: "凡例",
  relationshipHint:
    "キャンバスをドラッグして移動し、ホイールで拡大縮小できます。2 つのプロジェクトをクリックすると接続できます。",
  relationshipCreate: "関係を作成",
  relationshipChooseType: "関係タイプを選択",
  relationshipCreateAction: "接続を保存",
  relationshipNoEdgesTitle: "まだ関係がありません",
  relationshipNoEdgesDescription:
    "2 つのプロジェクトをクリックして接続するか、同じアイデアに関連付けると、ここに関係が表示されます。",
  relationshipTypeLabel: "関係タイプ",
  relationshipTypeRelated: "関連",
  relationshipTypeDependsOn: "依存",
  relationshipTypeBlocks: "阻害",
  relationshipTypeChild: "親子",
  relationshipTypeIdea: "共有アイデア",
});

const ko = withBase({
  pageTitle: "프로젝트",
  pageDescription: "프로젝트를 관리하고 진행 상황을 추적합니다",
  newProject: "새 프로젝트",
  dailyPlanner: "데일리 플래너",
  insightActiveNow: "진행 중",
  insightDueThisWeek: "이번 주 마감",
  insightStale: "정체",
  insightPortfolio: "포트폴리오",
  viewMap: "관계도",
  viewTimeline: "타임라인",
  timelineFootnote:
    "시작일과 종료일이 있으면 그 범위를 사용하고, 없으면 생성일을 기준으로 기본 30일 폭으로 표시합니다.",
  searchPlaceholder: "프로젝트 검색...",
  filterStatus: "상태",
  filterPriority: "우선순위",
  sortBy: "정렬",
  sortUpdated: "업데이트순",
  sortCreated: "생성순",
  sortDueDate: "마감일",
  sortPriority: "우선순위",
  sortName: "이름",
  sortMomentum: "모멘텀",
  allStatus: "모든 상태",
  allPriority: "모든 우선순위",
  tableName: "이름",
  tableProgress: "진행률",
  tableDue: "마감",
  statusPlanning: "계획 중",
  statusActive: "진행 중",
  statusPaused: "일시중지",
  statusCompleted: "완료",
  statusCancelled: "취소됨",
  priorityLow: "낮음",
  priorityMedium: "보통",
  priorityHigh: "높음",
  priorityUrgent: "긴급",
  noResultsTitle: "프로젝트를 찾을 수 없습니다",
  noResultsDescription: "필터를 조정해 보세요",
  todayLabel: "오늘",
  scrollToToday: "오늘로 이동",
  timelineFullscreen: "타임라인 전체 화면",
  timelineFullscreenClose: "닫기",
  zoomIn: "확대",
  zoomOut: "축소",
  fitToScreen: "화면에 맞추기",
  relationshipLegend: "범례",
  relationshipHint:
    "캔버스를 드래그해 이동하고, 휠로 확대/축소하세요. 두 프로젝트를 클릭하면 연결할 수 있습니다.",
  relationshipCreate: "관계 만들기",
  relationshipChooseType: "관계 유형 선택",
  relationshipCreateAction: "연결 저장",
  relationshipNoEdgesTitle: "아직 관계가 없습니다",
  relationshipNoEdgesDescription:
    "두 프로젝트를 클릭해 연결하거나, 같은 아이디어에 연결하면 여기에 관계가 표시됩니다.",
  relationshipTypeLabel: "관계 유형",
  relationshipTypeRelated: "관련",
  relationshipTypeDependsOn: "의존",
  relationshipTypeBlocks: "차단",
  relationshipTypeChild: "상하위",
  relationshipTypeIdea: "공유 아이디어",
});

const fr = withBase({
  pageTitle: "Projets",
  pageDescription: "Gerez vos projets et suivez leur avancement",
  newProject: "Nouveau projet",
  dailyPlanner: "Planificateur quotidien",
  insightActiveNow: "En cours",
  insightDueThisWeek: "Cette semaine",
  insightStale: "En pause",
  insightPortfolio: "Portefeuille",
  viewMap: "Graphe",
  viewTimeline: "Chronologie",
  timelineFootnote:
    "Les barres utilisent les dates de debut et d'echeance lorsqu'elles existent ; sinon elles commencent a la date de creation avec une duree par defaut de 30 jours.",
  searchPlaceholder: "Rechercher des projets...",
  filterStatus: "Statut",
  filterPriority: "Priorite",
  sortBy: "Trier par",
  sortUpdated: "Mis a jour",
  sortCreated: "Creation",
  sortDueDate: "Echeance",
  sortPriority: "Priorite",
  sortName: "Nom",
  sortMomentum: "Dynamique",
  allStatus: "Tous les statuts",
  allPriority: "Toutes les priorites",
  tableName: "Nom",
  tableProgress: "Avancement",
  tableDue: "Echeance",
  statusPlanning: "Planification",
  statusActive: "En cours",
  statusPaused: "En pause",
  statusCompleted: "Termine",
  statusCancelled: "Annule",
  priorityLow: "Basse",
  priorityMedium: "Moyenne",
  priorityHigh: "Haute",
  priorityUrgent: "Urgente",
  noResultsTitle: "Aucun projet trouve",
  noResultsDescription: "Essayez d'ajuster vos filtres",
  todayLabel: "Aujourd'hui",
  scrollToToday: "Aller a aujourd'hui",
  timelineFullscreen: "Chronologie plein ecran",
  timelineFullscreenClose: "Fermer",
  zoomIn: "Zoom avant",
  zoomOut: "Zoom arriere",
  fitToScreen: "Ajuster a l'ecran",
  relationshipLegend: "Legende",
  relationshipHint:
    "Faites glisser le canevas pour vous deplacer et utilisez la molette pour zoomer. Cliquez sur deux projets pour les relier.",
  relationshipCreate: "Creer un lien",
  relationshipChooseType: "Choisir un type de lien",
  relationshipCreateAction: "Enregistrer le lien",
  relationshipNoEdgesTitle: "Aucune relation pour l'instant",
  relationshipNoEdgesDescription:
    "Cliquez sur deux projets pour creer un lien, ou reliez-les a la meme idee pour afficher leur relation ici.",
  relationshipTypeLabel: "Type de relation",
  relationshipTypeRelated: "Associe",
  relationshipTypeDependsOn: "Depend de",
  relationshipTypeBlocks: "Bloque",
  relationshipTypeChild: "Parent-enfant",
  relationshipTypeIdea: "Idee partagee",
});

const it = withBase({
  pageTitle: "Progetti",
  pageDescription: "Gestisci i tuoi progetti e segui i progressi",
  newProject: "Nuovo progetto",
  dailyPlanner: "Pianificatore giornaliero",
  insightActiveNow: "In corso",
  insightDueThisWeek: "Questa settimana",
  insightStale: "In stallo",
  insightPortfolio: "Portafoglio",
  viewMap: "Grafo",
  viewTimeline: "Timeline",
  timelineFootnote:
    "Le barre usano le date di inizio e fine quando presenti; altrimenti partono dalla data di creazione con una durata predefinita di 30 giorni.",
  searchPlaceholder: "Cerca progetti...",
  filterStatus: "Stato",
  filterPriority: "Priorita",
  sortBy: "Ordina per",
  sortUpdated: "Aggiornato",
  sortCreated: "Creato",
  sortDueDate: "Scadenza",
  sortPriority: "Priorita",
  sortName: "Nome",
  sortMomentum: "Momentum",
  allStatus: "Tutti gli stati",
  allPriority: "Tutte le priorita",
  tableName: "Nome",
  tableProgress: "Avanzamento",
  tableDue: "Scadenza",
  statusPlanning: "Pianificazione",
  statusActive: "In corso",
  statusPaused: "In pausa",
  statusCompleted: "Completato",
  statusCancelled: "Annullato",
  priorityLow: "Bassa",
  priorityMedium: "Media",
  priorityHigh: "Alta",
  priorityUrgent: "Urgente",
  noResultsTitle: "Nessun progetto trovato",
  noResultsDescription: "Prova a modificare i filtri",
  todayLabel: "Oggi",
  scrollToToday: "Vai a oggi",
  timelineFullscreen: "Timeline a schermo intero",
  timelineFullscreenClose: "Chiudi",
  zoomIn: "Zoom avanti",
  zoomOut: "Zoom indietro",
  fitToScreen: "Adatta allo schermo",
  relationshipLegend: "Legenda",
  relationshipHint:
    "Trascina la tela per spostarti e usa la rotella per zoomare. Fai clic su due progetti per collegarli.",
  relationshipCreate: "Crea relazione",
  relationshipChooseType: "Scegli il tipo di relazione",
  relationshipCreateAction: "Salva collegamento",
  relationshipNoEdgesTitle: "Nessuna relazione ancora",
  relationshipNoEdgesDescription:
    "Fai clic su due progetti per creare un collegamento, oppure collegali alla stessa idea per mostrare qui la relazione.",
  relationshipTypeLabel: "Tipo di relazione",
  relationshipTypeRelated: "Correlato",
  relationshipTypeDependsOn: "Dipende da",
  relationshipTypeBlocks: "Blocca",
  relationshipTypeChild: "Genitore-figlio",
  relationshipTypeIdea: "Idea condivisa",
});

const es = withBase({
  pageTitle: "Proyectos",
  pageDescription: "Gestiona tus proyectos y sigue el progreso",
  newProject: "Nuevo proyecto",
  dailyPlanner: "Planificador diario",
  insightActiveNow: "En curso",
  insightDueThisWeek: "Esta semana",
  insightStale: "Estancado",
  insightPortfolio: "Portafolio",
  viewMap: "Grafo",
  viewTimeline: "Cronologia",
  timelineFootnote:
    "Las barras usan las fechas de inicio y fin cuando existen; si no, empiezan en la fecha de creacion con una duracion predeterminada de 30 dias.",
  searchPlaceholder: "Buscar proyectos...",
  filterStatus: "Estado",
  filterPriority: "Prioridad",
  sortBy: "Ordenar por",
  sortUpdated: "Actualizado",
  sortCreated: "Creado",
  sortDueDate: "Vencimiento",
  sortPriority: "Prioridad",
  sortName: "Nombre",
  sortMomentum: "Impulso",
  allStatus: "Todos los estados",
  allPriority: "Todas las prioridades",
  tableName: "Nombre",
  tableProgress: "Progreso",
  tableDue: "Vence",
  statusPlanning: "Planificacion",
  statusActive: "En curso",
  statusPaused: "En pausa",
  statusCompleted: "Completado",
  statusCancelled: "Cancelado",
  priorityLow: "Baja",
  priorityMedium: "Media",
  priorityHigh: "Alta",
  priorityUrgent: "Urgente",
  noResultsTitle: "No se encontraron proyectos",
  noResultsDescription: "Prueba ajustando los filtros",
  todayLabel: "Hoy",
  scrollToToday: "Ir a hoy",
  timelineFullscreen: "Cronologia a pantalla completa",
  timelineFullscreenClose: "Cerrar",
  zoomIn: "Acercar",
  zoomOut: "Alejar",
  fitToScreen: "Ajustar a pantalla",
  relationshipLegend: "Leyenda",
  relationshipHint:
    "Arrastra el lienzo para moverte y usa la rueda para acercar o alejar. Haz clic en dos proyectos para conectarlos.",
  relationshipCreate: "Crear relacion",
  relationshipChooseType: "Elegir tipo de relacion",
  relationshipCreateAction: "Guardar conexion",
  relationshipNoEdgesTitle: "Aun no hay relaciones",
  relationshipNoEdgesDescription:
    "Haz clic en dos proyectos para crear una conexion, o enlazalos a la misma idea para mostrar aqui su relacion.",
  relationshipTypeLabel: "Tipo de relacion",
  relationshipTypeRelated: "Relacionado",
  relationshipTypeDependsOn: "Depende de",
  relationshipTypeBlocks: "Bloquea",
  relationshipTypeChild: "Padre-hijo",
  relationshipTypeIdea: "Idea compartida",
});

const vi = withBase({
  pageTitle: "Du an",
  pageDescription: "Quan ly du an va theo doi tien do",
  newProject: "Du an moi",
  dailyPlanner: "Ke hoach hang ngay",
  insightActiveNow: "Dang thuc hien",
  insightDueThisWeek: "Tuan nay",
  insightStale: "Cham lai",
  insightPortfolio: "Danh muc",
  viewMap: "So do quan he",
  viewTimeline: "Dong thoi gian",
  timelineFootnote:
    "Thanh tien do su dung ngay bat dau va ket thuc neu co; neu khong se bat dau tu ngay tao voi do dai mac dinh 30 ngay.",
  searchPlaceholder: "Tim kiem du an...",
  filterStatus: "Trang thai",
  filterPriority: "Muc uu tien",
  sortBy: "Sap xep theo",
  sortUpdated: "Cap nhat",
  sortCreated: "Tao",
  sortDueDate: "Han",
  sortPriority: "Uu tien",
  sortName: "Ten",
  sortMomentum: "Dong luc",
  allStatus: "Tat ca trang thai",
  allPriority: "Tat ca muc uu tien",
  tableName: "Ten",
  tableProgress: "Tien do",
  tableDue: "Han",
  statusPlanning: "Dang len ke hoach",
  statusActive: "Dang thuc hien",
  statusPaused: "Tam dung",
  statusCompleted: "Hoan thanh",
  statusCancelled: "Da huy",
  priorityLow: "Thap",
  priorityMedium: "Trung binh",
  priorityHigh: "Cao",
  priorityUrgent: "Khan cap",
  noResultsTitle: "Khong tim thay du an",
  noResultsDescription: "Thu dieu chinh bo loc",
  todayLabel: "Hom nay",
  scrollToToday: "Chuyen den hom nay",
  timelineFullscreen: "Toan man hinh dong thoi gian",
  timelineFullscreenClose: "Dong",
  zoomIn: "Phong to",
  zoomOut: "Thu nho",
  fitToScreen: "Vua man hinh",
  relationshipLegend: "Chu giai",
  relationshipHint:
    "Keo de di chuyen khung nhin va dung con lan de phong to/thu nho. Nhan vao hai du an de tao lien ket.",
  relationshipCreate: "Tao lien ket",
  relationshipChooseType: "Chon loai lien ket",
  relationshipCreateAction: "Luu lien ket",
  relationshipNoEdgesTitle: "Chua co lien ket",
  relationshipNoEdgesDescription:
    "Nhan vao hai du an de tao lien ket, hoac lien ket chung voi mot y tuong de hien thi moi quan he tai day.",
  relationshipTypeLabel: "Loai lien ket",
  relationshipTypeRelated: "Lien quan",
  relationshipTypeDependsOn: "Phu thuoc",
  relationshipTypeBlocks: "Chan",
  relationshipTypeChild: "Cha-con",
  relationshipTypeIdea: "Y tuong chung",
});

const allCopy = createLocaleCopyMap<ProjectsUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
});

export function getProjectsUiCopy(locale: AppLocale): ProjectsUiCopy {
  return allCopy[locale] ?? en;
}
