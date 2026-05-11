設計規格書 — CryptoNest Liquid Glass 加密貨幣儀表板
製作者： Claude（design-replication skill） 參考素材： ffc55354f75ae59afb32336007847768.mp4（提取 15 幀） 平台偵測： Web 應用程式（桌面優先） 設計語言 / 簽名風格： Liquid Glass Glassmorphism，疊加於暗系奢華室內攝影背景 情感基調： 高端、沉浸、神秘——如同透過磨砂水晶看市場數據

1. 執行摘要
CryptoNest 是一款加密貨幣交易與資產管理儀表板。其核心設計賣點在於「液態玻璃（Liquid Glass）」美學：所有 UI 面板皆以半透明磨砂玻璃卡片呈現，完全浮於一張深色豪華臥室實景攝影之上。背景並非靜態色塊，而是真實的室內照片（深色木材、圓形掛鏡、暖琥珀燈光），玻璃效果的模糊層讓背景成為活躍的設計元素。

三個開發者必須拿捏的核心效果：

Backdrop-filter 玻璃面板：每張卡片須有 backdrop-filter: blur(20–28px) saturate(140%) 加上極薄的白色邊框，讓磨砂質感真實呈現。
全頁沉浸背景：一張高解析度深色室內攝影需固定覆蓋整個視窗（object-fit: cover，不隨滾動移動），玻璃效果必須有實際背景才能運作。
內容載入動畫：影片顯示儀表板有明確的「空殼 → 資料填充」動畫：玻璃面板先以空白狀態出現，資料隨後以 fade-in 方式填入。
潛在風險：

無障礙對比度：白色文字疊加半透明玻璃層，對比度接近 WCAG AA 下限，實作時需謹慎。
效能：backdrop-filter 在低端裝置耗費 GPU；需提供降級方案。
Firefox 相容性：backdrop-filter 在 Firefox 需 layout.css.backdrop-filter.enabled 旗標（或 Firefox 103+ 才預設啟用）。
2. 版面系統
Grid
基礎單位： 8px
欄數（桌面）： 左側邊欄固定 175px + 主區彈性三欄式 Bento Grid
容器最大寬度： 1280px（但整個 UI 居中於視窗，帶有外邊距）
溝槽（Gutter）： 12–16px（卡片間距）
頁面外邊距： 桌面約 64px 上下、32px 左右（UI 整體有從背景浮起的感覺）
版面結構
┌──────────────────────────────────────┐
│  頂部導覽列（search + user）          │
├─────────┬────────────────────────────┤
│         │   主內容區（Bento Grid）    │
│  側邊欄  ├──────────┬────────────────│
│  175px  │  中欄     │  右欄          │
│         │ (彈性)    │ (約 290px)    │
│         ├──────────┴────────────────│
│         │   統計圖表橫跨兩欄         │
│         ├───────────────────────────│
│         │   History 表格（全寬）     │
└─────────┴───────────────────────────┘
斷點
| 名稱 | 寬度 | 用途 | |--------|---------|-----------------| | mobile | < 768px | 需折疊側邊欄（未在素材中觀察到）| | tablet | 768px | 可能縮減為 2 欄 | | desktop| 1024px | 完整版面 | | wide | 1440px+ | 水平置中，max-width 約束|

間距比例（Tailwind 相容）
4, 8, 12, 16, 20, 24, 32, 48, 64

3. 色彩系統
主色板
| Token | Hex / RGBA | 角色 | 備註 | |---------------------|-----------------------------------|---------------|---------------------------| | --bg-photo | 真實攝影圖片 | 全頁背景 | 暗系室內，主色調約 #1A1614 | | --surface-glass-1 | rgba(255,255,255,0.07) | 主玻璃面板底層 | 配合 backdrop-filter | | --surface-glass-2 | rgba(255,255,255,0.12) | 較亮玻璃面板 | 用於高層卡片（如側邊欄背景） | | --surface-dark | rgba(15,13,12,0.55) | 深色玻璃面板 | 用於 BTC 價格卡片的暗色部分 | | --border-glass | rgba(255,255,255,0.18) | 玻璃卡片邊框 | 細線，1px | | --border-subtle | rgba(255,255,255,0.08) | 次要分隔線 | | | --accent-lime | #C8E53A ≈ #D4FF3A | 主要 CTA、Active 狀態 | 亮黃綠色，用於 Exchange 按鈕、Active 導覽圖示 | | --accent-lime-bg | rgba(200,229,58,0.15) | Active 項目背景 | 石灰色半透明 | | --text-primary | #FFFFFF | 主要文字 | | | --text-secondary | rgba(255,255,255,0.65) | 次要文字、標籤 | | | --text-muted | rgba(255,255,255,0.35) | 提示文字 | | | --ethereum-purple | #627EEA | ETH 資產圖示顏色 | | | --solana-green | #14F195 | SOL 送出圖示顏色 | | | --binance-yellow | #F3BA2F | BNB 相關顏色 | | | --success | #4ADE80 | 正漲幅 | | | --danger | #F87171 | 負漲幅 | | | --chart-line | #D4FF3A | 圖表線條顏色 | 同 accent-lime | | --chart-fill | rgba(212,255,58,0.15) | 圖表填充漸層 | |

漸層
圖表面積填充： linear-gradient(180deg, rgba(212,255,58,0.25) 0%, rgba(212,255,58,0) 100%)（用於 Overview 和 General Statistics 折線圖下方）
側邊欄背景： 略微比主區玻璃更不透明，呈現 rgba(30,28,26,0.60) 效果
頂部光暈（Specular highlight）： 部分卡片頂部有 rgba(255,255,255,0.08) 的微光邊緣，模擬玻璃頂部折射
4. 字型排版
字型家族
主要 UI 字型： 推測為 Inter 或 DM Sans（幾何無襯線，字重清晰），建議使用 Inter（via next/font/google）
數字顯示字型（如 24,657.09）： 似乎為 tabular numbers 字型，數字間距均勻，可使用 font-variant-numeric: tabular-nums 配合 Inter
備選： Satoshi、Plus Jakarta Sans
字型比例
| 角色 | 大小 | 字重 | Line-height | Letter-spacing | 用途 | |-------------|---------|-----|-------------|----------------|-----------------| | Price Large | 28–32px | 600 | 1.1 | -0.02em | BTC 價格大數字 | | H1 / 卡片標題 | 16–18px | 600 | 1.2 | -0.01em | "Your Wallet"、"Overview" | | H2 / 導覽項目 | 14px | 500 | 1.3 | 0 | Dashboard, Deposit, Withdrawal... | | Body | 13–14px | 400 | 1.5 | 0 | 表格內容、說明文字 | | Caption | 11–12px | 400 | 1.4 | 0.01em | 日期、圖表標籤 | | Badge | 12px | 600 | 1.0 | 0.02em | "+24.78%" 漲幅標籤 |

5. 圖示系統
風格： 填充式圓角正方形容器內的細線圖示（類似 SF Symbols 或 Phosphor Filled 變體）
描邊粗細： 約 1.5px
尺寸： 16×16（表格行動按鈕）、20×20（導覽圖示）、24×24（錢包動作圖示）
容器： 圖示置於 32–36px 圓形玻璃容器內（用於導覽 Active 狀態）
推薦來源： Lucide React（與 shadcn/ui 整合最佳）或 Phosphor Icons
特殊圖示： CryptoNest Logo 為自訂漸層圖示（帶金色/黃色調）；加密貨幣代幣使用各自官方圓形 Logo
6. 元件清單
6.1 GlassPanel（核心基礎元件）
用途： 所有卡片的基礎容器
可見於： 全部幀
樣式：
background: rgba(255,255,255,0.07)
backdrop-filter: blur(24px) saturate(140%)
border: 1px solid rgba(255,255,255,0.18)
border-radius: 20–24px
box-shadow: 0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)
實作備註： 必須有非純色背景才能產生效果；需同時加 -webkit-backdrop-filter
6.2 Sidebar（側邊欄）
用途： 主要導覽
寬度： 固定 175px
結構： Logo 區 + 導覽群組（一般、Trading Bots、Assets）+ Log Out
Active 狀態： 黃綠色圖示容器 + 略亮的行背景 rgba(200,229,58,0.15)
底部： "Log Out" 項目置於最底部（利用 mt-auto 推至底部）
Assets 區塊： 顯示代幣 Logo + 名稱 + 美元價值
群組標籤： "Trading Bots"、"Assets" 以 10–11px 大寫灰色文字標示
6.3 TopBar（頂部導覽）
用途： 全域搜尋 + 通知 + 用戶資訊
高度： 約 52px
搜尋欄： Search Here... placeholder，右側顯示鍵盤快捷鍵 ⌘K，玻璃底色
右側： 通知鈴鐺圖示 + 設定圖示 + 用戶頭像圓形 + 名稱"David Owner" + admin 郵件 + 下拉箭頭
實作備註： position sticky 置頂，背景同樣帶輕微 backdrop-filter
6.4 BTCPriceCard（BTC 價格卡）
用途： 顯示當前 BTC/USDT 即時報價
結構：
頂部行：BTC/USDT 代幣對 + 橙色 BTC Logo + 切換/設定按鈕
大數字：24,657.09（price large 字型）
底部兩列：2,617.000PLN + +24.78% 漲幅徽章（綠色）
說明文字：Last Trade Price | Price (24h)
漲幅徽章： background: rgba(74,222,128,0.15), color: #4ADE80, 圓角 6px, 12px bold
6.5 OverviewChart（概覽迷你圖）
用途： 顯示短期價格走勢折線圖
特徵： 帶橢圓 tooltip（"+0.25%"）浮於圖表上，折線為白色，填充漸層為 lime
實作： 推薦使用 Recharts 的 AreaChart，dot 自訂為白色圓點
6.6 WalletCard（錢包卡）
用途： Send/Receive 加密貨幣
結構：
標題 "Your Wallet" + Buy / Sell / Exchange 標籤（Exchange 為主要 CTA，亮黃綠按鈕）
Send 行：SOL 代幣 Logo + 下拉 + Balance 數字
進度條/滑桿：帶綠色端點的刻度尺（表示傳送量）
Receive 行：USD 代幣 + Updated Balance
Exchange 按鈕： background: #C8E53A, color: #0D0D0D, border-radius: 8px, font-weight: 600, padding: 6px 16px
6.7 GeneralStatsChart（綜合統計圖）
用途： 全年度加密貨幣市場份額面積圖
特徵：
標題 "General Statistocs"（原始設計有拼寫錯誤）+ Monthly 下拉
圖例：Ethereum 8%（黃綠點）/ Binance 30%（紅點）/ Bitcoin 40%（紅點）
折線圖帶斜線填充圖案（hatching pattern）疊於面積色塊上
Y 軸標籤：2K, 5K, 7K, 10K, 12K；X 軸：月份簡稱
懸停 tooltip："$33k" 標籤（白底深色文字）
實作： Recharts AreaChart + 自訂 SVG <defs> pattern 實現斜線紋理
6.8 DominanceChart（每日相對主導地位圖）
用途： 各幣種市場佔比視覺化
類型： 玫瑰圖 / 極坐標圓餅圖（非普通圓餅圖）
顏色： 深綠（Ethereum ~40%）、深紫、深藍、深金，共 6–8 個扇形
實作： 推薦使用 Recharts 的 RadarChart 或自訂 D3 polar chart
6.9 HistoryTable（交易歷史表格）
用途： 分頁交易記錄
欄位： Date ↕ / Trade / Token Price / Value / Dex / Total / Qty / ETH / Action
篩選標籤： All（選中，白色膠囊底色）/ 1D / 1W / 1M / 1Y
分頁： 右上顯示 "1 - 10 of 50" + 左右箭頭
行操作： 每行右側有兩個圓形圖示按鈕（編輯/刪除，玻璃底色）
邊框： 無傳統表格邊框，行間使用極細的 rgba(255,255,255,0.06) 分隔線
6.10 FilterTabGroup（時間篩選標籤組）
用途： 切換 All / 1D / 1W / 1M / 1Y
Active 樣式： 白色/淺色實心膠囊背景，文字深色
非 Active 樣式： 透明底，文字 rgba(255,255,255,0.55)
實作： 使用 useState + Tailwind 動態 class 切換
7. 互動與動畫
微互動
| 元素 | 觸發 | 行為 | 時長 | 緩動 | |--------------|-------|-------------------------------|-------|------------------------------| | 玻璃卡片 | hover | 邊框微亮（opacity +0.1）+ 輕微上移 2px | 200ms | ease-out | | 導覽項目 | hover | 背景 rgba(255,255,255,0.05) 填入 | 150ms | ease-out | | CTA 按鈕 | hover | 背景加亮 15%，輕微縮放 scale(1.02) | 120ms | ease-out | | 表格行操作按鈕 | hover | 玻璃底色加深 | 150ms | ease | | 篩選標籤切換 | click | 白色膠囊滑動至新選項（layout animation） | 250ms | cubic-bezier(0.4,0,0.2,1) |

頁面載入簽名動畫（最重要）
影片清楚顯示以下順序：

0.0s：玻璃面板空殼先顯示（backdrop-filter 已生效，但內容區空白）
~3.0s：資料逐步 fade-in 填充到各玻璃面板內
~8.0s：背景攝影視差移動（相機在背景場景中輕微平移），UI 面板保持固定
建議實作：

// 使用 Framer Motion staggerChildren
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.3 }
  }
}
const card = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
}
背景視差
背景圖片以極緩慢速度橫移（可能是 CSS animation 或 JS mousemove parallax）
推薦：@keyframes subtlePan { from { background-position: 50% 50% } to { background-position: 55% 50% } } 配合 animation: subtlePan 30s ease-in-out infinite alternate
8. 簽名效果實作配方
8.1 標準玻璃面板
.glass-panel {
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}
關鍵前提：背景必須是非純色（攝影圖、漸層等），否則模糊效果將毫無意義。

8.2 全頁沉浸背景
.app-background {
  position: fixed;
  inset: 0;
  background-image: url('/bg-luxury-room.jpg');
  background-size: cover;
  background-position: center;
  z-index: -1;
  /* 可選視差動畫 */
  animation: subtlePan 30s ease-in-out infinite alternate;
}

@keyframes subtlePan {
  from { background-position: 48% 50%; }
  to   { background-position: 52% 50%; }
}
8.3 深色玻璃變體（用於 BTC 卡底色、圖表區）
.glass-panel-dark {
  background: rgba(10, 8, 8, 0.50);
  backdrop-filter: blur(20px) saturate(120%);
  -webkit-backdrop-filter: blur(20px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 16px;
}
8.4 Lime CTA 按鈕
.btn-primary {
  background: #C8E53A;
  color: #0D0D0D;
  font-weight: 600;
  font-size: 13px;
  padding: 6px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: filter 120ms ease-out, transform 120ms ease-out;
}
.btn-primary:hover {
  filter: brightness(1.12);
  transform: scale(1.02);
}
8.5 斜線填充圖案（用於 General Statistics 圖表）
// 在 Recharts SVG 內的 <defs>
<defs>
  <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(212,255,58,0.4)" strokeWidth="2"/>
  </pattern>
</defs>
// Area fill:  fill="url(#hatch)"
8.6 降級方案（不支援 backdrop-filter 的瀏覽器）
@supports not (backdrop-filter: blur(1px)) {
  .glass-panel {
    background: rgba(20, 18, 16, 0.85);
  }
}
9. 無障礙設計備註
對比度警告：白色文字 #FFFFFF 疊加於 rgba(255,255,255,0.07) 玻璃 + 暗色背景，實際對比度約 4.2:1，略低於 WCAG AA 的 4.5:1 標準。建議於圖表說明、表格 caption 等小字區域加強：可將文字顏色調至純白，或略微加深玻璃面板背景 opacity 至 0.12。
焦點樣式：素材中未觀察到 focus ring。實作時必須加入：
*:focus-visible {
  outline: 2px solid #C8E53A;
  outline-offset: 2px;
  border-radius: 4px;
}
減少動態偏好：
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .app-background { animation: none; }
}
鍵盤導覽：圖表互動（hover tooltip）目前看起來是純滑鼠操作，需為鍵盤用戶提供 ARIA 標籤與替代數字呈現方式。
aria-label 要求：圖示按鈕（如表格行操作按鈕、通知鈴鐺）無文字，必須加 aria-label。
10. 推薦技術堆疊
| 層級 | 技術 | 理由 | |------------|------------------------------------------|----------------------------------| | 框架 | Next.js 14（App Router） | 用戶偏好；SSR 利於初始載入效能 | | 樣式 | Tailwind CSS v3 + CSS 變數 | Utility classes + 動態玻璃 token | | 動畫 | Framer Motion | staggerChildren 載入動畫、layout 動畫 | | 圖表 | Recharts | React 原生，Customizable，支援 SVG defs| | UI 基礎 | shadcn/ui + Radix UI | Dialog, Dropdown, Tabs 等無障礙元件 | | 圖示 | Lucide React | 與 shadcn/ui 完美配合 | | 字型 | next/font/google → Inter | 零 CLS，自動 woff2 優化 | | 狀態管理 | Zustand | 輕量，適合儀表板篩選/切換狀態 | | 資料獲取 | TanStack Query (React Query) | 加密貨幣價格 API 快取與即時更新 |

11. 推論假設（請確認）
字型：推測為 Inter 或 DM Sans，解析度限制下無法 100% 確認——請告知實際字型或接受 Inter 作為替代。
側邊欄寬度：目測 ~175px，無法精確量測，可能為 180px 或 200px。
行動版版面：素材中完全未出現行動版；此規格書僅描述桌面版。建議以抽屜式側邊欄（Drawer）實現行動版。
背景圖片動畫：影片中的視角移動可能是影片剪輯的攝影鏡頭移動，不一定是 CSS 動畫——若僅需靜態背景亦合理。
圖表資料：所有圖表數字（24,657.09 BTC、8%/30%/40% 分配等）均為範例假資料，不代表真實市場數據。
"General Statistocs" 拼寫錯誤：素材中原文有此錯誤，實作時請改為 "General Statistics"。
12. 實作資產清單
開發者需準備以下素材：

[ ] 背景攝影：高解析度深色奢華臥室室內照片（建議 2560×1440px 以上，JPEG/WebP，< 500KB 壓縮後），或購買類似授權素材（Unsplash、Getty）
[ ] CryptoNest Logo：自訂 SVG 圖示（帶金色漸層的蜂巢/鳥巢造型，需重繪或向原設計師取得）
[ ] 加密貨幣代幣圖示：ETH、BTC、BNB、SOL、USD Logo（可從 CoinGecko API 或 Cryptocurrency Icons 套件取得）
[ ] Inter 字型：通過 next/font/google 自動載入，無需手動準備
[ ] Lucide React：npm package，npm install lucide-react
[ ] Recharts：npm package，npm install recharts
[ ] Framer Motion：npm package，npm install framer-motion
Added Apr 23, 2026
Modified Apr 23, 2026
CryptoNest Liquid Glass 加密貨幣儀表板設計系統規格

設計規格書 — CryptoNest Liquid Glass 加密貨幣儀表板
製作者： Claude（design-replication skill） 參考素材： ffc55354f75ae59afb32336007847768.mp4（提取 15 幀） 平台偵測： Web 應用程式（桌面優先） 設計語言 / 簽名風格： Liquid Glass Glassmorphism，疊加於暗系奢華室內攝影背景 情感基調： 高端、沉浸、神秘——如同透過磨砂水晶看市場數據

1. 執行摘要
CryptoNest 是一款加密貨幣交易與資產管理儀表板。其核心設計賣點在於「液態玻璃（Liquid Glass）」美學：所有 UI 面板皆以半透明磨砂玻璃卡片呈現，完全浮於一張深色豪華臥室實景攝影之上。背景並非靜態色塊，而是真實的室內照片（深色木材、圓形掛鏡、暖琥珀燈光），玻璃效果的模糊層讓背景成為活躍的設計元素。

三個開發者必須拿捏的核心效果：

Backdrop-filter 玻璃面板：每張卡片須有 backdrop-filter: blur(20–28px) saturate(140%) 加上極薄的白色邊框，讓磨砂質感真實呈現。
全頁沉浸背景：一張高解析度深色室內攝影需固定覆蓋整個視窗（object-fit: cover，不隨滾動移動），玻璃效果必須有實際背景才能運作。
內容載入動畫：影片顯示儀表板有明確的「空殼 → 資料填充」動畫：玻璃面板先以空白狀態出現，資料隨後以 fade-in 方式填入。
潛在風險：

無障礙對比度：白色文字疊加半透明玻璃層，對比度接近 WCAG AA 下限，實作時需謹慎。
效能：backdrop-filter 在低端裝置耗費 GPU；需提供降級方案。
Firefox 相容性：backdrop-filter 在 Firefox 需 layout.css.backdrop-filter.enabled 旗標（或 Firefox 103+ 才預設啟用）。
2. 版面系統
Grid
基礎單位： 8px
欄數（桌面）： 左側邊欄固定 175px + 主區彈性三欄式 Bento Grid
容器最大寬度： 1280px（但整個 UI 居中於視窗，帶有外邊距）
溝槽（Gutter）： 12–16px（卡片間距）
頁面外邊距： 桌面約 64px 上下、32px 左右（UI 整體有從背景浮起的感覺）
版面結構
┌──────────────────────────────────────┐
│  頂部導覽列（search + user）          │
├─────────┬────────────────────────────┤
│         │   主內容區（Bento Grid）    │
│  側邊欄  ├──────────┬────────────────│
│  175px  │  中欄     │  右欄          │
│         │ (彈性)    │ (約 290px)    │
│         ├──────────┴────────────────│
│         │   統計圖表橫跨兩欄         │
│         ├───────────────────────────│
│         │   History 表格（全寬）     │
└─────────┴───────────────────────────┘
斷點
| 名稱 | 寬度 | 用途 | |--------|---------|-----------------| | mobile | < 768px | 需折疊側邊欄（未在素材中觀察到）| | tablet | 768px | 可能縮減為 2 欄 | | desktop| 1024px | 完整版面 | | wide | 1440px+ | 水平置中，max-width 約束|

間距比例（Tailwind 相容）
4, 8, 12, 16, 20, 24, 32, 48, 64

3. 色彩系統
主色板
| Token | Hex / RGBA | 角色 | 備註 | |---------------------|-----------------------------------|---------------|---------------------------| | --bg-photo | 真實攝影圖片 | 全頁背景 | 暗系室內，主色調約 #1A1614 | | --surface-glass-1 | rgba(255,255,255,0.07) | 主玻璃面板底層 | 配合 backdrop-filter | | --surface-glass-2 | rgba(255,255,255,0.12) | 較亮玻璃面板 | 用於高層卡片（如側邊欄背景） | | --surface-dark | rgba(15,13,12,0.55) | 深色玻璃面板 | 用於 BTC 價格卡片的暗色部分 | | --border-glass | rgba(255,255,255,0.18) | 玻璃卡片邊框 | 細線，1px | | --border-subtle | rgba(255,255,255,0.08) | 次要分隔線 | | | --accent-lime | #C8E53A ≈ #D4FF3A | 主要 CTA、Active 狀態 | 亮黃綠色，用於 Exchange 按鈕、Active 導覽圖示 | | --accent-lime-bg | rgba(200,229,58,0.15) | Active 項目背景 | 石灰色半透明 | | --text-primary | #FFFFFF | 主要文字 | | | --text-secondary | rgba(255,255,255,0.65) | 次要文字、標籤 | | | --text-muted | rgba(255,255,255,0.35) | 提示文字 | | | --ethereum-purple | #627EEA | ETH 資產圖示顏色 | | | --solana-green | #14F195 | SOL 送出圖示顏色 | | | --binance-yellow | #F3BA2F | BNB 相關顏色 | | | --success | #4ADE80 | 正漲幅 | | | --danger | #F87171 | 負漲幅 | | | --chart-line | #D4FF3A | 圖表線條顏色 | 同 accent-lime | | --chart-fill | rgba(212,255,58,0.15) | 圖表填充漸層 | |

漸層
圖表面積填充： linear-gradient(180deg, rgba(212,255,58,0.25) 0%, rgba(212,255,58,0) 100%)（用於 Overview 和 General Statistics 折線圖下方）
側邊欄背景： 略微比主區玻璃更不透明，呈現 rgba(30,28,26,0.60) 效果
頂部光暈（Specular highlight）： 部分卡片頂部有 rgba(255,255,255,0.08) 的微光邊緣，模擬玻璃頂部折射
4. 字型排版
字型家族
主要 UI 字型： 推測為 Inter 或 DM Sans（幾何無襯線，字重清晰），建議使用 Inter（via next/font/google）
數字顯示字型（如 24,657.09）： 似乎為 tabular numbers 字型，數字間距均勻，可使用 font-variant-numeric: tabular-nums 配合 Inter
備選： Satoshi、Plus Jakarta Sans
字型比例
| 角色 | 大小 | 字重 | Line-height | Letter-spacing | 用途 | |-------------|---------|-----|-------------|----------------|-----------------| | Price Large | 28–32px | 600 | 1.1 | -0.02em | BTC 價格大數字 | | H1 / 卡片標題 | 16–18px | 600 | 1.2 | -0.01em | "Your Wallet"、"Overview" | | H2 / 導覽項目 | 14px | 500 | 1.3 | 0 | Dashboard, Deposit, Withdrawal... | | Body | 13–14px | 400 | 1.5 | 0 | 表格內容、說明文字 | | Caption | 11–12px | 400 | 1.4 | 0.01em | 日期、圖表標籤 | | Badge | 12px | 600 | 1.0 | 0.02em | "+24.78%" 漲幅標籤 |

5. 圖示系統
風格： 填充式圓角正方形容器內的細線圖示（類似 SF Symbols 或 Phosphor Filled 變體）
描邊粗細： 約 1.5px
尺寸： 16×16（表格行動按鈕）、20×20（導覽圖示）、24×24（錢包動作圖示）
容器： 圖示置於 32–36px 圓形玻璃容器內（用於導覽 Active 狀態）
推薦來源： Lucide React（與 shadcn/ui 整合最佳）或 Phosphor Icons
特殊圖示： CryptoNest Logo 為自訂漸層圖示（帶金色/黃色調）；加密貨幣代幣使用各自官方圓形 Logo
6. 元件清單
6.1 GlassPanel（核心基礎元件）
用途： 所有卡片的基礎容器
可見於： 全部幀
樣式：
background: rgba(255,255,255,0.07)
backdrop-filter: blur(24px) saturate(140%)
border: 1px solid rgba(255,255,255,0.18)
border-radius: 20–24px
box-shadow: 0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)
實作備註： 必須有非純色背景才能產生效果；需同時加 -webkit-backdrop-filter
6.2 Sidebar（側邊欄）
用途： 主要導覽
寬度： 固定 175px
結構： Logo 區 + 導覽群組（一般、Trading Bots、Assets）+ Log Out
Active 狀態： 黃綠色圖示容器 + 略亮的行背景 rgba(200,229,58,0.15)
底部： "Log Out" 項目置於最底部（利用 mt-auto 推至底部）
Assets 區塊： 顯示代幣 Logo + 名稱 + 美元價值
群組標籤： "Trading Bots"、"Assets" 以 10–11px 大寫灰色文字標示
6.3 TopBar（頂部導覽）
用途： 全域搜尋 + 通知 + 用戶資訊
高度： 約 52px
搜尋欄： Search Here... placeholder，右側顯示鍵盤快捷鍵 ⌘K，玻璃底色
右側： 通知鈴鐺圖示 + 設定圖示 + 用戶頭像圓形 + 名稱"David Owner" + admin 郵件 + 下拉箭頭
實作備註： position sticky 置頂，背景同樣帶輕微 backdrop-filter
6.4 BTCPriceCard（BTC 價格卡）
用途： 顯示當前 BTC/USDT 即時報價
結構：
頂部行：BTC/USDT 代幣對 + 橙色 BTC Logo + 切換/設定按鈕
大數字：24,657.09（price large 字型）
底部兩列：2,617.000PLN + +24.78% 漲幅徽章（綠色）
說明文字：Last Trade Price | Price (24h)
漲幅徽章： background: rgba(74,222,128,0.15), color: #4ADE80, 圓角 6px, 12px bold
6.5 OverviewChart（概覽迷你圖）
用途： 顯示短期價格走勢折線圖
特徵： 帶橢圓 tooltip（"+0.25%"）浮於圖表上，折線為白色，填充漸層為 lime
實作： 推薦使用 Recharts 的 AreaChart，dot 自訂為白色圓點
6.6 WalletCard（錢包卡）
用途： Send/Receive 加密貨幣
結構：
標題 "Your Wallet" + Buy / Sell / Exchange 標籤（Exchange 為主要 CTA，亮黃綠按鈕）
Send 行：SOL 代幣 Logo + 下拉 + Balance 數字
進度條/滑桿：帶綠色端點的刻度尺（表示傳送量）
Receive 行：USD 代幣 + Updated Balance
Exchange 按鈕： background: #C8E53A, color: #0D0D0D, border-radius: 8px, font-weight: 600, padding: 6px 16px
6.7 GeneralStatsChart（綜合統計圖）
用途： 全年度加密貨幣市場份額面積圖
特徵：
標題 "General Statistocs"（原始設計有拼寫錯誤）+ Monthly 下拉
圖例：Ethereum 8%（黃綠點）/ Binance 30%（紅點）/ Bitcoin 40%（紅點）
折線圖帶斜線填充圖案（hatching pattern）疊於面積色塊上
Y 軸標籤：2K, 5K, 7K, 10K, 12K；X 軸：月份簡稱
懸停 tooltip："$33k" 標籤（白底深色文字）
實作： Recharts AreaChart + 自訂 SVG <defs> pattern 實現斜線紋理
6.8 DominanceChart（每日相對主導地位圖）
用途： 各幣種市場佔比視覺化
類型： 玫瑰圖 / 極坐標圓餅圖（非普通圓餅圖）
顏色： 深綠（Ethereum ~40%）、深紫、深藍、深金，共 6–8 個扇形
實作： 推薦使用 Recharts 的 RadarChart 或自訂 D3 polar chart
6.9 HistoryTable（交易歷史表格）
用途： 分頁交易記錄
欄位： Date ↕ / Trade / Token Price / Value / Dex / Total / Qty / ETH / Action
篩選標籤： All（選中，白色膠囊底色）/ 1D / 1W / 1M / 1Y
分頁： 右上顯示 "1 - 10 of 50" + 左右箭頭
行操作： 每行右側有兩個圓形圖示按鈕（編輯/刪除，玻璃底色）
邊框： 無傳統表格邊框，行間使用極細的 rgba(255,255,255,0.06) 分隔線
6.10 FilterTabGroup（時間篩選標籤組）
用途： 切換 All / 1D / 1W / 1M / 1Y
Active 樣式： 白色/淺色實心膠囊背景，文字深色
非 Active 樣式： 透明底，文字 rgba(255,255,255,0.55)
實作： 使用 useState + Tailwind 動態 class 切換
7. 互動與動畫
微互動
| 元素 | 觸發 | 行為 | 時長 | 緩動 | |--------------|-------|-------------------------------|-------|------------------------------| | 玻璃卡片 | hover | 邊框微亮（opacity +0.1）+ 輕微上移 2px | 200ms | ease-out | | 導覽項目 | hover | 背景 rgba(255,255,255,0.05) 填入 | 150ms | ease-out | | CTA 按鈕 | hover | 背景加亮 15%，輕微縮放 scale(1.02) | 120ms | ease-out | | 表格行操作按鈕 | hover | 玻璃底色加深 | 150ms | ease | | 篩選標籤切換 | click | 白色膠囊滑動至新選項（layout animation） | 250ms | cubic-bezier(0.4,0,0.2,1) |

頁面載入簽名動畫（最重要）
影片清楚顯示以下順序：

0.0s：玻璃面板空殼先顯示（backdrop-filter 已生效，但內容區空白）
~3.0s：資料逐步 fade-in 填充到各玻璃面板內
~8.0s：背景攝影視差移動（相機在背景場景中輕微平移），UI 面板保持固定
建議實作：

// 使用 Framer Motion staggerChildren
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.3 }
  }
}
const card = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
}
背景視差
背景圖片以極緩慢速度橫移（可能是 CSS animation 或 JS mousemove parallax）
推薦：@keyframes subtlePan { from { background-position: 50% 50% } to { background-position: 55% 50% } } 配合 animation: subtlePan 30s ease-in-out infinite alternate
8. 簽名效果實作配方
8.1 標準玻璃面板
.glass-panel {
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}
關鍵前提：背景必須是非純色（攝影圖、漸層等），否則模糊效果將毫無意義。

8.2 全頁沉浸背景
.app-background {
  position: fixed;
  inset: 0;
  background-image: url('/bg-luxury-room.jpg');
  background-size: cover;
  background-position: center;
  z-index: -1;
  /* 可選視差動畫 */
  animation: subtlePan 30s ease-in-out infinite alternate;
}

@keyframes subtlePan {
  from { background-position: 48% 50%; }
  to   { background-position: 52% 50%; }
}
8.3 深色玻璃變體（用於 BTC 卡底色、圖表區）
.glass-panel-dark {
  background: rgba(10, 8, 8, 0.50);
  backdrop-filter: blur(20px) saturate(120%);
  -webkit-backdrop-filter: blur(20px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 16px;
}
8.4 Lime CTA 按鈕
.btn-primary {
  background: #C8E53A;
  color: #0D0D0D;
  font-weight: 600;
  font-size: 13px;
  padding: 6px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: filter 120ms ease-out, transform 120ms ease-out;
}
.btn-primary:hover {
  filter: brightness(1.12);
  transform: scale(1.02);
}
8.5 斜線填充圖案（用於 General Statistics 圖表）
// 在 Recharts SVG 內的 <defs>
<defs>
  <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(212,255,58,0.4)" strokeWidth="2"/>
  </pattern>
</defs>
// Area fill:  fill="url(#hatch)"
8.6 降級方案（不支援 backdrop-filter 的瀏覽器）
@supports not (backdrop-filter: blur(1px)) {
  .glass-panel {
    background: rgba(20, 18, 16, 0.85);
  }
}
9. 無障礙設計備註
對比度警告：白色文字 #FFFFFF 疊加於 rgba(255,255,255,0.07) 玻璃 + 暗色背景，實際對比度約 4.2:1，略低於 WCAG AA 的 4.5:1 標準。建議於圖表說明、表格 caption 等小字區域加強：可將文字顏色調至純白，或略微加深玻璃面板背景 opacity 至 0.12。
焦點樣式：素材中未觀察到 focus ring。實作時必須加入：
*:focus-visible {
  outline: 2px solid #C8E53A;
  outline-offset: 2px;
  border-radius: 4px;
}
減少動態偏好：
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .app-background { animation: none; }
}
鍵盤導覽：圖表互動（hover tooltip）目前看起來是純滑鼠操作，需為鍵盤用戶提供 ARIA 標籤與替代數字呈現方式。
aria-label 要求：圖示按鈕（如表格行操作按鈕、通知鈴鐺）無文字，必須加 aria-label。
10. 推薦技術堆疊
| 層級 | 技術 | 理由 | |------------|------------------------------------------|----------------------------------| | 框架 | Next.js 14（App Router） | 用戶偏好；SSR 利於初始載入效能 | | 樣式 | Tailwind CSS v3 + CSS 變數 | Utility classes + 動態玻璃 token | | 動畫 | Framer Motion | staggerChildren 載入動畫、layout 動畫 | | 圖表 | Recharts | React 原生，Customizable，支援 SVG defs| | UI 基礎 | shadcn/ui + Radix UI | Dialog, Dropdown, Tabs 等無障礙元件 | | 圖示 | Lucide React | 與 shadcn/ui 完美配合 | | 字型 | next/font/google → Inter | 零 CLS，自動 woff2 優化 | | 狀態管理 | Zustand | 輕量，適合儀表板篩選/切換狀態 | | 資料獲取 | TanStack Query (React Query) | 加密貨幣價格 API 快取與即時更新 |

11. 推論假設（請確認）
字型：推測為 Inter 或 DM Sans，解析度限制下無法 100% 確認——請告知實際字型或接受 Inter 作為替代。
側邊欄寬度：目測 ~175px，無法精確量測，可能為 180px 或 200px。
行動版版面：素材中完全未出現行動版；此規格書僅描述桌面版。建議以抽屜式側邊欄（Drawer）實現行動版。
背景圖片動畫：影片中的視角移動可能是影片剪輯的攝影鏡頭移動，不一定是 CSS 動畫——若僅需靜態背景亦合理。
圖表資料：所有圖表數字（24,657.09 BTC、8%/30%/40% 分配等）均為範例假資料，不代表真實市場數據。
"General Statistocs" 拼寫錯誤：素材中原文有此錯誤，實作時請改為 "General Statistics"。
12. 實作資產清單
開發者需準備以下素材：

[ ] 背景攝影：高解析度深色奢華臥室室內照片（建議 2560×1440px 以上，JPEG/WebP，< 500KB 壓縮後），或購買類似授權素材（Unsplash、Getty）
[ ] CryptoNest Logo：自訂 SVG 圖示（帶金色漸層的蜂巢/鳥巢造型，需重繪或向原設計師取得）
[ ] 加密貨幣代幣圖示：ETH、BTC、BNB、SOL、USD Logo（可從 CoinGecko API 或 Cryptocurrency Icons 套件取得）
[ ] Inter 字型：通過 next/font/google 自動載入，無需手動準備
[ ] Lucide React：npm package，npm install lucide-react
[ ] Recharts：npm package，npm install recharts
[ ] Framer Motion：npm package，npm install framer-motion