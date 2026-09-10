import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";

export type ProjectMapUiCopy = {
  title: string;
  description: string;
  firstConnectionTitle: string;
  firstConnectionDescription: string;
  makeFirstConnection: string;
  connect: string;
  connections: (count: number) => string;
  mapMode: string;
  listMode: string;
  fit: string;
  showConnectedOnly: string;
  showAllProjects: string;
  openProject: string;
  inspectorIntroTitle: string;
  inspectorIntroDescription: string;
  connectionDetails: string;
  projectConnections: string;
  noConnectionsForProject: string;
  connectionListTitle: string;
  noConnectionsTitle: string;
  noConnectionsDescription: string;
  editConnection: string;
  removeConnection: string;
  removeConnectionTitle: string;
  removeConnectionDescription: string;
  remove: string;
  cancel: string;
  createTitle: string;
  editTitle: string;
  firstProject: string;
  secondProject: string;
  chooseProject: string;
  relationship: string;
  related: string;
  dependsOn: string;
  blocks: string;
  contains: string;
  sharedIdea: string;
  relatedHint: string;
  dependsOnHint: string;
  blocksHint: string;
  containsHint: string;
  saveConnection: string;
  saveChanges: string;
  saving: string;
  sentenceRelated: (source: string, target: string) => string;
  sentenceDependsOn: (source: string, target: string) => string;
  sentenceBlocks: (source: string, target: string) => string;
  sentenceContains: (source: string, target: string) => string;
  sentenceSharedIdea: (source: string, target: string) => string;
  errorDifferentProjects: string;
  errorDuplicate: string;
  errorCycle: string;
  toastCreated: string;
  toastUpdated: string;
  toastRemoved: string;
  toastSaveFailed: string;
  toastRemoveFailed: string;
  loadingConnections: string;
  connectionReadOnly: string;
  mapHelp: string;
};

const en: ProjectMapUiCopy = {
  title: "Project connections",
  description: "See what belongs together, and what depends on what.",
  firstConnectionTitle: "Start with one useful connection",
  firstConnectionDescription:
    "Link two projects only when the relationship helps you plan or understand your work.",
  makeFirstConnection: "Make first connection",
  connect: "Connect",
  connections: (count) => `${count} connection${count === 1 ? "" : "s"}`,
  mapMode: "Map",
  listMode: "Connection list",
  fit: "Fit",
  showConnectedOnly: "Show connected only",
  showAllProjects: "Show all projects",
  openProject: "Open project",
  inspectorIntroTitle: "Select a project or connection",
  inspectorIntroDescription:
    "Tap a project to keep its relationships highlighted, or tap a connection to inspect and edit it.",
  connectionDetails: "Connection details",
  projectConnections: "Connections",
  noConnectionsForProject: "This project has no visible connections yet.",
  connectionListTitle: "Connections",
  noConnectionsTitle: "No connections yet",
  noConnectionsDescription:
    "Create a connection when two projects are meaningfully related. Unconnected projects are completely fine.",
  editConnection: "Edit connection",
  removeConnection: "Remove connection",
  removeConnectionTitle: "Remove this connection?",
  removeConnectionDescription:
    "Only the connection will be removed. Both projects will stay exactly as they are.",
  remove: "Remove",
  cancel: "Cancel",
  createTitle: "Connect two projects",
  editTitle: "Edit connection",
  firstProject: "First project",
  secondProject: "Second project",
  chooseProject: "Choose a project…",
  relationship: "Relationship",
  related: "Is related to",
  dependsOn: "Depends on",
  blocks: "Blocks",
  contains: "Contains as a subproject",
  sharedIdea: "Shares an idea with",
  relatedHint: "These projects are meaningfully associated, without a required order.",
  dependsOnHint: "The second project needs to happen first for the first project to move forward.",
  blocksHint: "The first project is currently preventing the second project from moving forward.",
  containsHint: "The first project is the parent; the second project is its subproject.",
  saveConnection: "Save connection",
  saveChanges: "Save changes",
  saving: "Saving…",
  sentenceRelated: (source, target) => `${source} is related to ${target}.`,
  sentenceDependsOn: (source, target) => `${source} depends on ${target}.`,
  sentenceBlocks: (source, target) => `${source} blocks ${target}.`,
  sentenceContains: (source, target) => `${source} contains ${target} as a subproject.`,
  sentenceSharedIdea: (source, target) => `${source} and ${target} share an idea.`,
  errorDifferentProjects: "Choose two different projects.",
  errorDuplicate: "A connection already exists between these projects. Edit the existing one instead.",
  errorCycle: "This would create a circular dependency or hierarchy. Change the direction or relationship.",
  toastCreated: "Connection saved",
  toastUpdated: "Connection updated",
  toastRemoved: "Connection removed",
  toastSaveFailed: "Could not save this connection",
  toastRemoveFailed: "Could not remove this connection",
  loadingConnections: "Loading saved connections…",
  connectionReadOnly: "This connection comes from a shared idea and is read-only here.",
  mapHelp: "Drag to pan, pinch or scroll to zoom, and tap a project to inspect its connections.",
};

const zhTW: DeepPartial<ProjectMapUiCopy> = {
  title: "專案連結",
  description: "一眼看清哪些專案彼此相關，以及哪些事情互相依賴。",
  firstConnectionTitle: "先建立一個真正有用的連結",
  firstConnectionDescription: "只有當兩個專案的關係有助你規劃或理解工作時，才把它們連起來。",
  makeFirstConnection: "建立第一個連結",
  connect: "連結",
  connections: (count) => `${count} 個連結`,
  mapMode: "關係圖",
  listMode: "連結列表",
  fit: "適合畫面",
  showConnectedOnly: "只顯示相連專案",
  showAllProjects: "顯示所有專案",
  openProject: "開啟專案",
  inspectorIntroTitle: "選擇一個專案或連結",
  inspectorIntroDescription: "點選專案可持續高亮它的關係；點選連線則可查看或編輯。",
  connectionDetails: "連結詳情",
  projectConnections: "連結",
  noConnectionsForProject: "這個專案目前沒有可見的連結。",
  connectionListTitle: "專案連結",
  noConnectionsTitle: "尚未建立連結",
  noConnectionsDescription: "只有在兩個專案真的有意義地相關時才建立連結。沒有連線的專案也完全正常。",
  editConnection: "編輯連結",
  removeConnection: "移除連結",
  removeConnectionTitle: "移除這個連結？",
  removeConnectionDescription: "只會移除兩個專案之間的連結，兩個專案本身都會保留。",
  remove: "移除",
  cancel: "取消",
  createTitle: "連結兩個專案",
  editTitle: "編輯連結",
  firstProject: "第一個專案",
  secondProject: "第二個專案",
  chooseProject: "選擇專案…",
  relationship: "關係",
  related: "與⋯相關",
  dependsOn: "依賴",
  blocks: "阻擋",
  contains: "包含為子專案",
  sharedIdea: "共享靈感",
  relatedHint: "兩個專案有實際關聯，但沒有必須先後完成的順序。",
  dependsOnHint: "第二個專案需要先完成或推進，第一個專案才能繼續。",
  blocksHint: "第一個專案目前正在阻礙第二個專案前進。",
  containsHint: "第一個專案是母專案，第二個專案是它的子專案。",
  saveConnection: "儲存連結",
  saveChanges: "儲存變更",
  saving: "儲存中…",
  sentenceRelated: (source, target) => `${source} 與 ${target} 相關。`,
  sentenceDependsOn: (source, target) => `${source} 依賴 ${target}。`,
  sentenceBlocks: (source, target) => `${source} 正在阻擋 ${target}。`,
  sentenceContains: (source, target) => `${source} 包含 ${target} 作為子專案。`,
  sentenceSharedIdea: (source, target) => `${source} 與 ${target} 共享一個靈感。`,
  errorDifferentProjects: "請選擇兩個不同的專案。",
  errorDuplicate: "這兩個專案之間已經有連結。請直接編輯現有連結。",
  errorCycle: "這會形成循環依賴或循環層級。請更改方向或關係類型。",
  toastCreated: "連結已儲存",
  toastUpdated: "連結已更新",
  toastRemoved: "連結已移除",
  toastSaveFailed: "無法儲存這個連結",
  toastRemoveFailed: "無法移除這個連結",
  loadingConnections: "正在載入已儲存的連結…",
  connectionReadOnly: "這個連結來自共用靈感，因此不能在這裡編輯。",
  mapHelp: "拖動畫布可平移；雙指縮放或滾動可縮放；點選專案即可查看關係。",
};

const zhCN: DeepPartial<ProjectMapUiCopy> = {
  title: "项目连接",
  description: "一眼看清哪些项目彼此相关，以及哪些事情互相依赖。",
  firstConnectionTitle: "先建立一个真正有用的连接",
  firstConnectionDescription: "只有当两个项目的关系有助于规划或理解工作时，才把它们连起来。",
  makeFirstConnection: "建立第一个连接",
  connect: "连接",
  connections: (count) => `${count} 个连接`,
  mapMode: "关系图",
  listMode: "连接列表",
  fit: "适合画面",
  showConnectedOnly: "只显示相连项目",
  showAllProjects: "显示所有项目",
  openProject: "打开项目",
  createTitle: "连接两个项目",
  editTitle: "编辑连接",
  firstProject: "第一个项目",
  secondProject: "第二个项目",
  chooseProject: "选择项目…",
  relationship: "关系",
  saveConnection: "保存连接",
  saveChanges: "保存更改",
  saving: "保存中…",
  errorDifferentProjects: "请选择两个不同的项目。",
  toastCreated: "连接已保存",
  toastUpdated: "连接已更新",
  toastRemoved: "连接已移除",
};

const MAP = createLocaleCopyMap(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
});

export function getProjectMapUiCopy(locale: AppLocale): ProjectMapUiCopy {
  return MAP[locale] ?? MAP.en;
}
