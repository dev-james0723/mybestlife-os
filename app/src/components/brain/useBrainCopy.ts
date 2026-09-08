"use client";

import { useLocaleSlug } from "@/hooks/use-locale-slug";

const zh: Record<string, string> = {
  Map: "總覽", Local: "鄰近", "3D": "3D",
  "Personal Growth": "個人成長", "Life Quality": "生活品質", Health: "健康", "Assets & Tools": "資產與工具", "Explore locally": "探索鄰近連結", Created: "建立於", Strength: "連結強度", Confidence: "信心值",
  Brain: "大腦", "Your connected life": "連結你的生活", "Explore how your ideas, goals and everyday life connect.": "探索想法、目標與日常生活之間的連結。",
  Overview: "總覽", Neighborhood: "鄰近連結", Sphere: "立體球體", "Graph mode": "圖譜模式",
  "Search your Brain": "搜尋你的大腦", "Clear search": "清除搜尋", "Search results": "搜尋結果", "No matching nodes": "找不到相符節點",
  "Try another word or clear your filters.": "試試其他關鍵字，或清除篩選條件。", "Search highlights nodes. Choose a result to explore it.": "搜尋會標示相符節點。選擇結果以探索連結。",
  "Focus mode": "專注模式", "Exit focus mode": "退出專注模式", Fullscreen: "全螢幕", "Exit fullscreen": "退出全螢幕",
  Filters: "篩選", "Close filters": "關閉篩選", "Reset filters": "重設篩選", "Graph settings": "圖譜設定", "Close settings": "關閉設定", Settings: "設定",
  "Fit graph to view": "縮放至完整圖譜", "Reset layout": "重設佈局", "Zoom in": "放大", "Zoom out": "縮小", "Reset zoom": "重設縮放",
  "Show details": "顯示詳情", "Hide details": "隱藏詳情", "Close details": "關閉詳情", Details: "詳情", "Expand node details": "展開節點詳情", "Collapse node details": "收合節點詳情",
  "Browse nodes": "瀏覽節點", "Close node list": "關閉節點清單", "Node list": "節點清單", "Show more": "顯示更多", nodes: "節點", connections: "連結",
  Help: "使用指南", "Close help": "關閉指南", "Explore your Brain": "探索你的大腦", "Drag the background to pan. Pinch or scroll to zoom. Drag a node to arrange it.": "拖曳背景以平移，雙指縮放或滾動以調整大小。拖曳節點可重新排列。",
  "Select a node to read its details. Neighborhood shows its closest connections.": "選取節點以閱讀詳情。「鄰近連結」會顯示它附近的關係。",
  "Use + / − to zoom, arrow keys to pan, and 0 to fit while the graph is focused.": "圖譜取得焦點時，可用 + / − 縮放、方向鍵平移，以及 0 顯示完整圖譜。",
  "Focus mode fills the window; fullscreen also hides browser chrome when supported.": "專注模式會填滿視窗；支援的瀏覽器亦可使用全螢幕模式。", "Got it": "明白了",
  "Loading your Brain…": "正在載入你的大腦…", "Your Brain starts here": "從這裡建立你的大腦", "Add a goal, project or note to start discovering connections.": "新增目標、專案或筆記，開始探索它們之間的連結。", "Open knowledge base": "開啟知識庫",
  "Could not load your Brain": "無法載入你的大腦", "Your data could not be loaded. Try again.": "暫時無法載入資料，請重試。", Retry: "重試", "Partial sync": "部分資料未同步", "Some sources could not be loaded. Your available data is shown.": "部分來源未能載入，目前顯示已取得的資料。", Dismiss: "關閉",
  "No nodes match these filters": "沒有符合篩選條件的節點", "Clear all filters": "清除所有篩選", "Select a node to explore its neighborhood.": "選取節點以探索它的鄰近連結。",
  "Refresh data": "重新載入資料", Refreshing: "重新載入中", "Data refreshed": "資料已更新", "Refresh incomplete. Try again.": "更新未完成，請重試。",
  "All Connections": "所有連結", "Strong Only": "較強連結", Explicit: "明確連結", Suggested: "建議連結", Orphans: "獨立節點", "Hide disconnected nodes": "隱藏獨立節點", "Connection filter": "連結篩選", "Local depth": "鄰近層數", Labels: "標籤", "Sphere links": "球體連結", "Auto rotate": "自動旋轉", off: "關閉", slow: "慢速", normal: "一般", "Cluster by": "分群方式", Category: "分類", Type: "類型", Collection: "收藏集", Project: "專案", Source: "來源", None: "無", Legend: "圖例",
  "Find connections": "尋找連結", "Close connection suggestions": "關閉連結建議", "Domains": "領域", "Node types": "節點類型", "Connections": "連結", "Reset": "重設", "Hide orphan nodes": "隱藏獨立節點", "Show AI suggestions": "顯示 AI 建議", "Manual links only": "僅手動連結", "Min AI confidence": "最低 AI 信心值", "Minimum AI confidence": "最低 AI 信心值", "Brain filters": "大腦篩選", "Brain legend": "大腦圖例", "Close legend": "關閉圖例",
  "Growth & Goals": "成長與目標", "Career & Work": "職涯與工作", Relationships: "人際關係", Knowledge: "知識", "Life & Routines": "生活與習慣", "Health & Wellness": "健康", Finance: "財務", "Tools & Resources": "工具與資源",
  "Goal": "目標", "Habit": "習慣", "Task": "任務", "Idea": "想法", "Quote": "名言", "Person": "人物", "Tag": "標籤", "Role Model": "榜樣", "Journal": "日記", "Software": "軟件", "About Me": "關於我", "Close": "關閉", "Open": "開啟", "Tags": "標籤", "Connected nodes": "相連節點", "No connections yet.": "暫時沒有連結。", "Explore in Local mode": "探索鄰近連結",
};

export function useBrainCopy() {
  const locale = useLocaleSlug();
  return (english: string) => locale === "en" ? english : (zh[english] ?? english);
}
