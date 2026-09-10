import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";
import type { MapRelation } from "@/lib/projects/connections";

const en = {
  title: "Project connections", description: "See what belongs together, and what depends on what.",
  firstTitle: "Start with one useful connection", firstBody: "Link projects when their relationship helps you plan. Unconnected projects are completely fine.",
  firstAction: "Make first connection", connect: "Connect", map: "Map", list: "Connection list", projects: "Projects",
  selectTitle: "Select a project or connection", selectBody: "Tap a project to highlight its neighbors. Tap a labeled connection to inspect it.",
  open: "Open project", connectedOnly: "Show connected only", showAll: "Show all projects",
  empty: "No connections in this view", noMatches: "No matching projects", noProjectLinks: "This project has no connections yet.",
  filtered: "Some connections are hidden by the project filters.", readOnly: "Derived from shared ideas. Edit the idea's linked projects to change this relationship.",
  createTitle: "Connect two projects", editTitle: "Edit connection", source: "First project", target: "Second project", choose: "Choose a project", search: "Find a project…",
  relationship: "Relationship", save: "Save connection", saving: "Saving…", edit: "Edit", remove: "Remove", cancel: "Cancel", close: "Close details",
  removeTitle: "Remove this connection?", removeBody: "Only this connection will be removed. Both projects will stay exactly as they are.",
  loading: "Loading saved connections…", retry: "Retry", saved: "Connection saved", removed: "Connection removed", undo: "Undo", restored: "Connection restored", dismiss: "Dismiss",
  fit: "Fit", arrange: "Arrange", zoomIn: "Zoom in", zoomOut: "Zoom out", pan: "Move map", up: "Move up", down: "Move down", left: "Move left", right: "Move right",
  help: "Drag to pan or pinch to zoom. Use the buttons without dragging. With the map focused: arrow keys move, + / − zoom, and 0 fits the view.",
  kinds: { related: "Is related to", "depends-on": "Depends on", blocks: "Blocks", "parent-child": "Contains", "shared-idea": "Shares an idea with" },
  hints: {
    related: "There is a useful association, without a required order.",
    "depends-on": "The second project is a prerequisite for the first. The arrow reads ‘depends on’, not execution order.",
    blocks: "The first project is currently preventing the second from moving forward.",
    "parent-child": "The first project is the parent; the second is its subproject.",
  },
  errors: {
    different: "Choose two different projects.", missing: "A project is no longer available. Refresh and try again.",
    duplicate: "This relationship already exists. Edit the existing connection instead.", cycle: "This would create a circular dependency or hierarchy.",
    unavailable: "Connection storage is not installed yet. Apply the project-connections database migration before saving.",
    access: "Your session or account changed. Refresh before editing connections.",
    conflict: "This connection changed or was removed on another device. Close the dialog and reopen the latest version.",
    failed: "The connection could not be saved or loaded. Your choices have been kept. Check your connection and retry.",
  },
  count: (count: number) => `${count} connection${count === 1 ? "" : "s"}`,
  visibleCount: (visible: number, total: number) => `${visible} of ${total} connections visible`,
  ideaCount: (count: number) => `${count} shared idea${count === 1 ? "" : "s"}`,
  sentence: (source: string, label: string, target: string) => `${source} ${label.toLowerCase()} ${target}.`,
};
export type ProjectMapUiCopy = typeof en;
const zhTW: DeepPartial<ProjectMapUiCopy> = {
  title: "專案連結", description: "看清哪些專案彼此相關，以及哪些事情互相依賴。",
  firstTitle: "先建立一個真正有用的連結", firstBody: "當兩個專案的關係有助你規劃時，才把它們連起來。沒有連結也完全正常。", firstAction: "建立第一個連結",
  connect: "連結", map: "關係圖", list: "連結列表", projects: "專案", selectTitle: "選擇專案或連結", selectBody: "點選專案可高亮相連專案；點選連線標籤可查看詳情。",
  open: "開啟專案", connectedOnly: "只顯示相連專案", showAll: "顯示所有專案", empty: "此檢視沒有連結", noMatches: "沒有符合的專案", noProjectLinks: "這個專案尚未建立連結。",
  filtered: "部分連結被專案篩選條件隱藏。", readOnly: "此連結來自共用靈感。請編輯靈感連結的專案來更改關係。",
  createTitle: "連結兩個專案", editTitle: "編輯連結", source: "第一個專案", target: "第二個專案", choose: "選擇專案", search: "搜尋專案…",
  relationship: "關係", save: "儲存連結", saving: "儲存中…", edit: "編輯", remove: "移除", cancel: "取消", close: "關閉詳情", removeTitle: "移除這個連結？", removeBody: "只會移除連結，兩個專案本身都會保留。",
  loading: "正在載入已儲存的連結…", retry: "重試", saved: "連結已儲存", removed: "連結已移除", undo: "復原", restored: "連結已復原", dismiss: "關閉通知",
  fit: "適合畫面", arrange: "重新排列", zoomIn: "放大", zoomOut: "縮小", pan: "移動畫布", up: "向上移動", down: "向下移動", left: "向左移動", right: "向右移動",
  help: "拖動畫布或雙指縮放，也可使用按鈕。畫布取得焦點後，可用方向鍵移動、+ / − 縮放、0 顯示全圖。",
  kinds: { related: "與之相關", "depends-on": "依賴", blocks: "阻擋", "parent-child": "包含", "shared-idea": "共享靈感於" },
  hints: { related: "兩個專案有實際關聯，但沒有必須完成的先後順序。", "depends-on": "第二個專案是第一個專案的先決條件。箭頭表示「依賴」，不是執行次序。", blocks: "第一個專案目前正在阻礙第二個專案前進。", "parent-child": "第一個專案是母專案，第二個是它的子專案。" },
  errors: { different: "請選擇兩個不同的專案。", missing: "專案已無法使用，請重新整理。", duplicate: "此關係已存在，請編輯現有連結。", cycle: "這會形成循環依賴或循環層級。", unavailable: "連結資料庫尚未安裝。請先套用 project-connections 資料庫遷移。", access: "登入狀態或帳戶已變更，請重新整理。", conflict: "此連結已在另一裝置變更或移除。請關閉視窗，再開啟最新版本。", failed: "無法儲存或載入連結。你的選擇已保留，請檢查網絡後重試。" },
  count: (count) => `${count} 個連結`, visibleCount: (visible, total) => `顯示 ${visible} / ${total} 個連結`, ideaCount: (count) => `${count} 個共用靈感`, sentence: (source, label, target) => `${source} ${label} ${target}。`,
};
const zhCN: DeepPartial<ProjectMapUiCopy> = {
  title: "项目连接", description: "看清哪些项目彼此相关，以及哪些事情互相依赖。", firstTitle: "先建立一个真正有用的连接", firstBody: "当两个项目的关系有助于规划时，才把它们连起来。没有连接也完全正常。", firstAction: "建立第一个连接",
  connect: "连接", map: "关系图", list: "连接列表", projects: "项目", selectTitle: "选择项目或连接", selectBody: "点击项目可高亮相连项目；点击连线标签可查看详情。", open: "打开项目", connectedOnly: "只显示相连项目", showAll: "显示所有项目", empty: "此视图没有连接", noMatches: "没有符合的项目", noProjectLinks: "这个项目尚未建立连接。", filtered: "部分连接被项目筛选条件隐藏。", readOnly: "此连接来自共享灵感。请编辑灵感连接的项目来更改关系。",
  createTitle: "连接两个项目", editTitle: "编辑连接", source: "第一个项目", target: "第二个项目", choose: "选择项目", search: "搜索项目…", relationship: "关系", save: "保存连接", saving: "保存中…", edit: "编辑", remove: "移除", cancel: "取消", close: "关闭详情", removeTitle: "移除这个连接？", removeBody: "只会移除连接，两个项目本身都会保留。", loading: "正在加载已保存的连接…", retry: "重试", saved: "连接已保存", removed: "连接已移除", undo: "撤销", restored: "连接已恢复", dismiss: "关闭通知",
  fit: "适合画面", arrange: "重新排列", zoomIn: "放大", zoomOut: "缩小", pan: "移动画布", up: "向上移动", down: "向下移动", left: "向左移动", right: "向右移动", help: "拖动画布或双指缩放，也可使用按钮。画布获得焦点后，可用方向键移动、+ / − 缩放、0 显示全图。",
  kinds: { related: "与之相关", "depends-on": "依赖", blocks: "阻挡", "parent-child": "包含", "shared-idea": "共享灵感于" }, hints: { related: "两个项目有实际关联，但没有必须完成的先后顺序。", "depends-on": "第二个项目是第一个项目的先决条件。箭头表示「依赖」，不是执行次序。", blocks: "第一个项目目前正在阻碍第二个项目前进。", "parent-child": "第一个项目是父项目，第二个是它的子项目。" },
  errors: { different: "请选择两个不同的项目。", missing: "项目已无法使用，请刷新。", duplicate: "此关系已存在，请编辑现有连接。", cycle: "这会形成循环依赖或循环层级。", unavailable: "连接数据库尚未安装。请先应用 project-connections 数据库迁移。", access: "登录状态或账户已变更，请刷新。", conflict: "此连接已在另一设备变更或移除。请关闭窗口，再打开最新版本。", failed: "无法保存或加载连接。你的选择已保留，请检查网络后重试。" }, count: (count) => `${count} 个连接`, visibleCount: (visible, total) => `显示 ${visible} / ${total} 个连接`, ideaCount: (count) => `${count} 个共享灵感`, sentence: (source, label, target) => `${source} ${label} ${target}。`,
};
const COPY = createLocaleCopyMap(en, { "zh-TW": zhTW, "zh-CN": zhCN });
export function getProjectMapUiCopy(locale: AppLocale): ProjectMapUiCopy { return COPY[locale] ?? COPY.en; }
export function relationshipSentence(edge: MapRelation, name: (id: string) => string, copy: ProjectMapUiCopy): string {
  return copy.sentence(name(edge.source), copy.kinds[edge.kind], name(edge.target));
}
