# Daily Planner Design Specification

最後更新：2026-06-09

呢份文件係將 MyLifeOS 入面 Daily Planner 現有設計抽出成一份可以直接交俾設計、前端、或者之後重構用嘅規格書。重點會寫得好仔細，尤其係：

- 顏色點樣分工。
- Liquid Glass 點樣同顏色、透明度、背景、陰影配搭。
- 字體、字級、字重、數字排版。
- 每個主要 element 嘅外觀、狀態、互動同 responsive 行為。

參考來源：

| 類型 | 路徑 |
| --- | --- |
| Route | `app/src/app/[locale]/(protected)/daily-planner/page.tsx` |
| Daily Planner components | `app/src/components/daily-planner/**` |
| OS primitives | `app/src/components/ui/os-primitives.tsx` |
| OS glass classes | `app/src/components/ui/os-glass.ts` |
| Default glass panel | `app/src/components/ui/glass-panel.tsx` |
| Global tokens | `app/src/app/globals.css` |
| 截圖證據 | `test-results/focus-reality-daily-planner.png` |
| 截圖證據 | `test-results/daily-planner-quick-icons-desktop.png` |
| 截圖證據 | `test-results/daily-planner-quick-icons-mobile.png` |
| 截圖證據 | `test-results/focus-reality-daily-planner-task.png` |
| 截圖證據 | `test-results/focus-reality-plan-quality.png` |

## 1. 設計定位

Daily Planner 唔係 landing page。佢係一個需要日日重複用嘅 productivity workspace，設計要做到：

- 專注：一眼知道今日點排。
- 高訊息密度但唔壓迫：時間、任務、focus、sync 狀態要可 scan。
- Premium Liquid Glass：有玻璃、光感、層次，但唔可以犧牲 readability。
- 操作快：Quick Add、拖拉、時間調整、focus session、Google Calendar sync 要好順。
- Mobile-first：手機有 swipe actions、safe-area spacing，同 floating OS Buddy/FAB 唔可以撞住主要操作。

Liquid Glass 喺 Web 上係近似實作，唔係 Apple 官方 CSS system。今個 app 嘅 Liquid Glass 由以下材料組成：

- 半透明 fill。
- `backdrop-filter: blur(...) saturate(...)`。
- 低對比但清楚嘅 border。
- 內側 specular highlight。
- 軟陰影。
- 相片 layer 加暗角 overlay。
- Dark mode 用低 opacity、低 blur，保住文字對比。
- 不支援 backdrop-filter 時提供更實色 fallback。

設計原則：玻璃用嚟建立層次，唔係將所有嘢都變透明。

## 2. 產品結構

Daily Planner 有兩個 mode。

| Mode | 目的 | 畫面結構 |
| --- | --- | --- |
| Time Block | 用 10 分鐘 block 建立連續 schedule。 | Date & Time Card、Time Summary Cards、Today Focus Strip、Task Builder、Visual Schedule Generator、Timeline。 |
| Free Plan | 唔強迫排時間，先按優先次序 capture 今日要做嘅嘢。 | Date & Time Card、Planning Window Caption、Today Focus Strip、Quick Capture、Stats、四個 Priority Sections、Free Plan Summary。 |

Protected app chrome 長期存在：

- 左邊 Liquid Glass Sidebar。
- Topbar search/weather/utility/clock。
- OS Buddy Dock。
- Floating action button。
- Mobile bottom safe-area padding。

Daily Planner 本身唔應該再加第二套 app navigation。

## 3. Source Of Truth

Daily Planner 設計應該優先用現有 OS primitives。

| 需要 | 應使用 | 用途 |
| --- | --- | --- |
| Page title + action row | `PageShell` + `OSPageHeader` | 統一 protected route header。 |
| 大型 section panel | `OSFrostedPanel` | Date/time、Focus strip、Task builder、Timeline。 |
| 強一級 glass card | `GlassPanel variant="strong"` | Free Plan quick capture、priority sections。 |
| 密集文字 / form / error | `OSSolidPanel` | 可讀性優先。 |
| Secondary action | `OSControl` | Import、Templates、Details、Today。 |
| Icon-only action | `OSIconControl` | Prev/next day、compact tool。 |
| Primary action | `OSPrimaryAction` | Google Calendar sync、最高優先操作。 |
| Segmented switch | `OSSegmentedControl` | Time Block / Free Plan mode toggle。 |
| Modal / sheet | `OSDialogSurface`、`OSSheetSurface` 或現有 `DialogContent` glass styling | Hidden layer。 |

唔好為 Daily Planner 另起一套 design system，除非現有 primitive 真係表達唔到個狀態。

## 4. 顏色系統

### 4.1 Core Theme Tokens

Default light mode：

| Token | Value | 角色 |
| --- | --- | --- |
| `--background` | `oklch(0.985 0.002 264)` | 極淡冷灰背景。 |
| `--foreground` | `oklch(0.145 0 0)` | 主要文字，接近黑。 |
| `--card` | `oklch(1 0 0)` | 實白 card base。 |
| `--muted` | `oklch(0.97 0 0)` | 淡 control background。 |
| `--muted-foreground` | `oklch(0.556 0 0)` | 次要文字。 |
| `--primary` | `oklch(0.488 0.2 264)` | Product blue，focus ring / selected day / standard primary。 |
| `--life-os-brand` | `#00a85f` | Brand green，只應主要用喺 logo / brand accent。 |
| `--radius` | `0.625rem` | 基礎 radius。Planner 主要用 `rounded-xl` 同 `rounded-2xl`。 |

Default dark mode：

| Token | Value | 角色 |
| --- | --- | --- |
| `--background` | `oklch(0.145 0 0)` | 深色 app base。 |
| `--foreground` | `oklch(0.985 0 0)` | 主要文字，接近白。 |
| `--card` | `oklch(0.205 0 0)` | 深色 card base。 |
| `--muted` | `oklch(0.269 0 0)` | 深色 muted controls。 |
| `--muted-foreground` | `oklch(0.708 0 0)` | 深色模式次要文字。 |
| `--primary` | `oklch(0.62 0.17 264)` | 深色模式較亮 product blue。 |

### 4.2 Liquid Glass Tokens

Default light Liquid Glass：

| Token | Value | 用途 |
| --- | --- | --- |
| `--glass-blur` | `20px` | 標準 glass blur。 |
| `--glass-saturation` | `135%` | 增加 vibrancy，但唔 neon。 |
| `--surface-glass` | `color-mix(in oklch, white 65%, transparent)` | 一般 glass surface。 |
| `--surface-glass-strong` | `color-mix(in oklch, white 80%, transparent)` | 更實、更 readable 嘅 glass。 |
| `--border-glass` | `color-mix(in oklch, black 10%, transparent)` | Light mode glass border。 |
| `--border-glass-strong` | `color-mix(in oklch, black 16%, transparent)` | Hover / active / focus border。 |
| `--shadow-glass` | `0 8px 32px black/10 + inset white/70` | 外浮陰影 + 內側光邊。 |

Default dark Liquid Glass：

| Token | Value | 用途 |
| --- | --- | --- |
| `--glass-blur` | `6px` | Dark mode 用低 blur，避免文字變灰。 |
| `--glass-saturation` | `110%` | 只保留少量 vibrancy。 |
| `--surface-glass` | `color-mix(in oklch, oklch(0.96 0.005 264) 1.5%, transparent)` | 非常薄嘅夜間玻璃。 |
| `--surface-glass-strong` | `color-mix(in oklch, oklch(0.20 0.02 264) 35%, transparent)` | 深色 readable glass。 |
| `--border-glass` | `color-mix(in oklch, white 11%, transparent)` | 深色模式白邊。 |
| `--border-glass-strong` | `color-mix(in oklch, white 22%, transparent)` | Active / hover 白邊。 |
| `--shadow-glass` | `0 8px 32px black/45 + inset white/8` | 夜間浮起感。 |

Backdrop-filter fallback：

- Light mode：glass 變成接近不透明白，避免透明到睇唔到字。
- Dark mode：glass 變成接近不透明深 slate。
- 唔可以喺不支援 blur 嘅 browser 留低透明低對比文字。

### 4.3 OS Primitive Materials

| Primitive | Light material | Dark material | Daily Planner 用法 |
| --- | --- | --- | --- |
| `OSFrostedPanel` | `bg-white/70`、`border-slate-300/55`、`backdrop-blur-lg`、`shadow black/10`、inset white/70 | `bg-slate-950/72`、`border-white/10`、`shadow black/24`、inset white/7 | 主要 section。 |
| `OSGlassPanel` | `bg-white/78`、更重 shadow、`backdrop-blur-xl` | `bg-slate-950/82`、更實 | 更高層 panel，Planner 少用。 |
| `OSSolidPanel` | `bg-white/92` | `bg-slate-950/92` | 密集文字、長 form、error。 |
| `OSControl` | `bg-white/72`、`border-slate-300/55` | `bg-white/[0.055]`、`border-white/12` | Secondary controls。 |
| `OSPrimaryAction` | `bg-lime-300`、dark text、lime glow | 同 light | 最高優先 action。 |

### 4.4 Accent Color 分工

| Accent | Approx color | 用途 |
| --- | --- | --- |
| Lime | Tailwind `lime-300` / `lime-200` hover | OS primary action、最重要即時操作。唔代表 success。 |
| Product Blue | `--primary` | Focus ring、selected day、標準 app primary。 |
| Emerald | `emerald-500`、`emerald-700`、`emerald-300` | Success、synced、remaining positive、active focus、done。 |
| Sky | `sky-500`、`sky-300` | Pending sync、planned tile、Could priority、add one block。 |
| Violet | `violet-500`、`violet-300` | AI / focus intelligence / ritual / available tile。 |
| Rose | `rose-500`、`rose-400` | Must priority、delete、over-scheduled。 |
| Amber | `amber-500`、`amber-300` | Should priority、conflict、warning、remove one block、cross-day hint。 |
| Orange | `orange-500` | Remote deleted sync、Dinner quick task、secondary warning。 |
| Slate | `slate-950`、`slate-300`、`white/xx` | 結構、border、glass rim、低彩度層次。 |

### 4.5 顏色同 Liquid Glass 配搭規則

1. Light mode glass 要比 dark mode 更實。`white/65-80` 先會似 readable glass；`white/7` 喺 light mode 會變成霧。
2. Dark mode glass 要薄、清、帶白 rim。用過高 blur 會令文字灰咗。
3. Lime 只俾最高優先 action，例如 Google Calendar sync。Success 要用 emerald，唔好混淆。
4. Violet / magenta 只應用喺 AI、plan intelligence、ritual、generated visual 相關 element。
5. Priority colors 喺 Free Plan 入面只可以做 dot、top tint、ring、細 icon state，唔好令成個 column 變色。
6. Timeline task colors 可以多色，因為顏色代表任務序列，但文字仍然要用 `foreground` / `muted-foreground`。
7. Destructive action 必須用 rose/red text 或 surface，唔好收埋喺普通玻璃入面。
8. 相片 summary card 唔用 muted gray text。相片上面只用白字、status 色同 text shadow。
9. 如果 panel 內容密集，應該加 fill 或改用 solid panel，唔係加更多 blur。
10. 成個頁面唔可以每個 element 都高彩度。Premium feel 來自 quiet glass + 少量亮 action。

## 5. Liquid Glass Layering

### 5.1 Layer 0：Ambient App Backdrop

Protected scroll region 用 `[data-atmosphere]::before` 加兩個 primary-tinted radial glow：

| Glow | 位置 | 顏色 |
| --- | --- | --- |
| Left glow | `18% 28%` | `var(--primary)` mix 18% |
| Right glow | `82% 18%` | `var(--primary)` mix 12% |

用途：

- 俾 glass panel 有嘢可以折射。
- 避免頁面變成純白 / 純黑。
- 只做 ambient，唔可以低到影響文字對比。

### 5.2 Layer 1：Page-Level Frosted Sections

用喺：

- Date & Time Card。
- Today Focus Strip。
- Task Builder。
- Visual Schedule Generator。
- Timeline。

材料配方：

```css
border-radius: 1rem;
background: rgba(255, 255, 255, 0.70);
backdrop-filter: blur(16px) saturate(150%);
border: 1px solid rgba(148, 163, 184, 0.55);
box-shadow:
  0 12px 38px rgba(15, 23, 42, 0.10),
  inset 0 1px 0 rgba(255, 255, 255, 0.70);
```

Dark mode 近似：

```css
background: rgba(2, 8, 23, 0.72);
border: 1px solid rgba(255, 255, 255, 0.10);
box-shadow:
  0 12px 38px rgba(2, 8, 23, 0.24),
  inset 0 1px 0 rgba(255, 255, 255, 0.07);
```

### 5.3 Layer 2：In-Panel Glass Controls

用喺：

- Date display。
- Time picker trigger。
- Quick task buttons。
- Sortable task rows。
- Mini calendar trigger。
- Mode / date controls。

材料配方：

```css
background: rgba(255, 255, 255, 0.56);
border: 1px solid rgba(148, 163, 184, 0.55);
backdrop-filter: blur(12px) saturate(150%);
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
```

Dark mode：

```css
background: rgba(255, 255, 255, 0.045);
border: 1px solid rgba(255, 255, 255, 0.10);
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
```

### 5.4 Layer 3：Image Glass Cards

Time Summary Cards 係特別材料，唔係一般 frosted panel。

結構：

1. 相片 layer：`inset: -8%`、`scale(1.025)`。
2. 暗角 overlay：radial + linear gradient。
3. 薄 glass tint：唔用重 blur，保留相片銳度。
4. 文字 / icon content。

互動：

- Desktop fine pointer 先開 parallax。
- Parallax strength 預設 `4px`。
- Hover 只微微上浮同加陰影。
- Reduced motion 關閉 parallax 同 transition。

唔應該：

- 將相片 layer blur。
- 放長文案。
- 放低對比 muted text。

### 5.5 Layer 4：Modal / Popover / Sheet Glass

Hidden layer 要比 page panel 更實，因為後面內容會 blur。

材料：

```css
background: rgba(255, 255, 255, 0.72);
backdrop-filter: blur(24px) saturate(140%);
border: 1px solid rgba(255, 255, 255, 0.18);
box-shadow:
  0 8px 32px rgba(0, 0, 0, 0.35),
  inset 0 1px 0 rgba(255, 255, 255, 0.10);
```

Dark mode：

```css
background: rgba(255, 255, 255, 0.10);
border-color: rgba(255, 255, 255, 0.16);
box-shadow:
  0 8px 32px rgba(0, 0, 0, 0.45),
  inset 0 1px 0 rgba(255, 255, 255, 0.10);
```

Form-heavy modal 應該提高 fill 或用 solid inner panel，唔好淨係靠 blur。

## 6. 字體系統

### 6.1 Font Family

Daily Planner default theme 用 Geist。

| Variable | Font | 用途 |
| --- | --- | --- |
| `--font-geist-sans` | Geist | Main UI、heading、button、body。 |
| `--font-geist-mono` | Geist Mono | 只喺真正需要 monospace 時用。 |
| `--font-heading` | `var(--font-sans)` | 現時 heading family。 |
| `--font-display` | `var(--font-geist-sans)` | Theme-overridable display。 |
| `--font-body` | `var(--font-geist-sans)` | Theme-overridable body。 |

Root layout 另外載入以下 fonts 俾 theme 用：

- Orbitron。
- Space Grotesk。
- Playfair Display。
- Lora。
- Fraunces。
- DM Sans。

Daily Planner 本身唔應該主動插入 serif。若 theme 改咗 display/body font，Planner 跟 theme，但要保留 line-height、button height、mobile wrapping。

### 6.2 字體規則

1. Default Daily Planner 用 Geist Sans。
2. 時間、block count、score、date stamp 用 `tabular-nums`。
3. 唔用 viewport width 控制 font size。
4. 唔用 negative letter spacing。
5. Uppercase label 用細字 + tracking，而唔係只靠顏色。
6. H1 唔做 hero scale。呢個係工具頁，唔係 landing page。
7. Emphasis 用同一 font 嘅 weight / color / icon，唔混 serif。
8. Button 文字必須可以 truncate 或換行，唔可以 overflow。

### 6.3 Type Scale

| Element | Size | Weight | Line-height | Tracking | 備註 |
| --- | --- | --- | --- | --- | --- |
| Page H1 | `text-2xl` mobile、`text-3xl` desktop | `600` | tight | `tracking-tight` | `Daily Planner`。 |
| Page description | `text-sm` | `400` | `leading-6` | 0 | muted，max width `2xl`。 |
| Section title | `text-base` 至 `text-lg` | `600` | snug | `tracking-tight` | Task Builder、Timeline title。 |
| Panel body | `text-xs` 至 `text-sm` | `400` | relaxed | 0 | 玻璃上要夠清楚。 |
| Control label | `text-sm` | `600` | normal | 0 | Buttons、segmented tabs。 |
| Compact control | `text-xs` | `600` | normal | 0 | Desktop compact controls。 |
| Form label | `text-xs` | `500` | normal | 0 | Start Time、End Time、Image Style。 |
| Section eyebrow | `text-[10px]` 至 `text-xs` | `600` | snug | `tracking-[0.12em]` | Quick Add、Planning Window。 |
| Quick task title | `text-xs` | `600` | snug | 0 | button 內 truncate。 |
| Quick task meta | `text-[10px]` | `500` | normal | 0 | `3b · 30 min`。 |
| Task row title | `text-sm` | `600` | snug | 0 | list 可 wrap，timeline 要 ellipsis。 |
| Timeline axis | `text-[11px]` | `500` | normal | 0 | `tabular-nums`。 |
| Timeline next-day badge | `text-[9px]` | `600` | normal | uppercase | 跨日提示。 |
| Timeline card meta | `text-[11px]` | `500-600` | snug | 0 | Time range + duration。 |
| Time summary label | `text-[10px]` mobile、`text-xs` desktop | `500` | normal | `tracking-wide` | 相片卡白字。 |
| Time summary value | `text-[11px]` mobile、`text-sm` desktop | `600` | tight | 0 | `tabular-nums`。 |
| Badge | `text-[10px]` 至 `text-xs` | `600` | normal | 0 | 少量使用。 |
| Dialog title | component default / `text-xl` | `600` | tight | 0 | hidden layer hierarchy。 |

### 6.4 對比度規則

Dark mode 入面 `[data-slot="glass-panel"]` 嘅 heading 強制純白，避免 glass + blue atmosphere 令 heading 變灰。

相片 card 必須有 text shadow：

```css
text-shadow:
  0 1px 2px rgba(0, 0, 0, 0.55),
  0 0 16px rgba(0, 0, 0, 0.35);
```

唔好喺相片 card 放 muted gray 小字。

## 7. Layout System

### 7.1 Page Rhythm

`PageShell`：

- Wrapper：`space-y-8 sm:space-y-10`。
- Header 用 `data-motion-reveal`。
- Content 用 `data-motion-reveal`。
- Planner content：`space-y-6`。

設計方向：

- 左對齊。
- 工具感。
- 無 marketing hero。
- 無裝飾性 nested card。

### 7.2 Time Block Desktop Grid

Time Block main grid：

```txt
grid-cols-1
xl:grid-cols-[minmax(21rem,0.9fr)_minmax(0,1.1fr)]
gap-6
```

左欄：

- Task Builder。
- Quick Add。
- Sortable task list。

右欄：

- Visual Schedule Generator。
- Timeline。

### 7.3 Free Plan Layout

Free Plan 永遠單欄：

- Quick Capture。
- Stats row。
- Priority sections。
- Summary recap。

理由：任務名通常會長，四欄 Kanban 喺 mobile/tablet/desktop 都容易壓爆文字。

### 7.4 Mobile Layout

Mobile 必須：

- 觸控區最少 `44px`。
- Header action 可 wrap / horizontal scroll。
- Date/time controls stack。
- Task Builder actions full-width。
- Quick task 兩欄，但每個 button 高度固定。
- Timeline row height 穩定。
- Swipe action panel 固定 `144px`。
- Bottom padding 避免 OS Buddy / FAB 擋住。

## 8. Elements 詳細規格

### 8.1 Protected Chrome

Daily Planner 外圍包括：

- Liquid Glass Sidebar。
- Topbar glass pills。
- Today Companion。
- OS Buddy Dock。
- Floating quick action。

Daily Planner content 要配合呢個 chrome：

- H1 左對齊。
- Header actions 右對齊，細 viewport 可換行。
- 唔加第二層 global nav。

### 8.2 Page Header

Elements：

- H1：`copy.pageTitle`。
- Description：`copy.pageDescription`。
- Actions：
  - Back to AI Plan。
  - Get AI Suggestions。
  - Templates dropdown。

Visual：

- H1：`font-heading text-2xl sm:text-3xl font-semibold tracking-tight`。
- Actions：`OSControl`。
- Icon：Lucide，`h-4 w-4`。
- Button 係 glass outline，唔係 solid primary。

States：

- AI loading 時 disabled。
- Templates dropdown 有 Save / Load。
- Focus ring 必須清楚。

### 8.3 Date & Time Card

Surface：

- `OSFrostedPanel as="section"`。
- `space-y-5 p-4 sm:p-5`。

Date navigation：

- Previous day：`OSIconControl` + ChevronLeft。
- Date display：centered glass rectangle。
- Next day：`OSIconControl` + ChevronRight。
- Desktop date：`EEEE, MMMM d, yyyy`。
- Mobile date：`EEE, MMM d, yyyy`。

Date display material：

- `rounded-xl`。
- Light：`border-slate-300/55 bg-white/56`。
- Dark：`border-white/10 bg-white/[0.045]`。
- `backdrop-blur-md`。
- Inset white highlight。

Second row：

- Mini Calendar。
- Today。
- Planning Mode Toggle。
- Google Calendar Sync。

Separators：

- `Separator bg-border/45`。
- 用 separator 分區，唔再加多一層卡片。

### 8.4 Mini Calendar Popover

Trigger：

- Icon button。
- `h-11 min-h-11 w-11 rounded-xl`。
- Custom stroke calendar glyph。

Popover：

- Width：`min(calc(100vw - 2rem), 288px)`。
- Padding：`p-3`。
- Month header 有 prev/next。
- Week labels：`text-[10px] uppercase tracking-wider`。
- Day cells：`h-11 min-h-11 rounded-xl`。

Selected day：

- `bg-primary text-primary-foreground shadow-sm`。

Today but not selected：

- `ring-1 ring-primary/35 ring-offset-1 ring-offset-popover`。

Out-of-month：

- `text-muted-foreground/40`。

### 8.5 Planning Mode Toggle

Component：

- `PlanningModeToggle`。
- Underlying：`OSSegmentedControl`。

Items：

- Time Block + Calendar icon。
- Free Plan + ListChecks icon。

Interaction：

- Active pill 用 `layoutId="planning-mode-pill"`。
- 感覺係一塊 glass lens 滑過去，而唔係 hard switch。
- Reduced motion 時唔做 layout animation。

### 8.6 Google Calendar Sync

Component：

- `OSPrimaryAction`。

Visual：

- Lime primary action。
- Small viewport full-width。
- Desktop auto width。
- Busy state 用 `Loader2 animate-spin`。
- Idle icon 用 `CalendarSync`。

Supporting text：

- Last updated stamp：`text-[10px] tabular-nums`，右對齊。
- Connected account hint：emerald tone，`text-[11px]`。

### 8.7 Time Wheel Picker

Trigger：

- `h-11 min-h-11 w-full`。
- `rounded-xl`。
- `text-sm font-semibold tabular-nums`。
- Light：`bg-white/62 border-slate-300/55`。
- Dark：`bg-white/[0.055] border-white/10`。
- Icon：Clock `h-3.5 w-3.5`。

Popover：

- 三欄：Hour / Minute / AM-PM。
- 每欄 `w-14`。
- Label：`text-[10px] text-center muted`。
- Cancel / Done button 最少 `44px` 高。

Cross-day hint：

- Amber text。
- `TriangleAlert size-3`。
- `text-[11px] leading-snug`。
- 可有 wobble animation，但 reduced motion 要停。

### 8.8 Time Summary Cards

Component：

- `TimeSummaryCard`。

Grid：

- `grid-cols-2 sm:grid-cols-3`。
- Card：`aspect-square`。
- Shape：`rounded-2xl`。

Cards：

| Card | Image | Icon tone | Value tone |
| --- | --- | --- | --- |
| Available | `/images/daily-planner/available.png` | Violet | White |
| Planned | `/images/daily-planner/planned.png` | Sky | White |
| Remaining | `/images/daily-planner/remaining.png` | Emerald or red | Emerald if positive, red if over |

Layer：

1. Photo image，sharp。
2. Dark overlay。
3. Thin glass tint。
4. Icon + label + value。

Interaction：

- Desktop fine pointer：parallax。
- Hover：微升 + shadow。
- Reduced motion：停 parallax。

### 8.9 Free Planning Window Caption

Free Plan mode 用呢個取代 Time Summary Cards。

Material：

- `rounded-2xl`。
- Light：`border-slate-300/50 bg-white/52`。
- Dark：`border-white/10 bg-white/[0.045]`。
- `backdrop-blur-md`。

Text：

- Label：`text-[10px] font-semibold uppercase tracking-[0.12em]`。
- Window：`text-sm font-semibold tabular-nums`。
- Helper：`text-[11px] muted`。

目的：講清楚 planning window，但唔假扮做 schedule timeline。

### 8.10 Today Focus Strip

Component：

- `TodayFocusStrip`。
- Surface：`OSFrostedPanel`。
- Border：`border-emerald-500/20`。

States：

| State | Content | Actions |
| --- | --- | --- |
| No active focus | Plan quality、target、break status、risk | Analyze / Improve / Details / Start / Review |
| Active focus | `ActiveFocusDock` | Pause / Resume / Finish / Distracted |
| Review exists | Review badge | Open Review |
| No plan | Muted hint | No start action |

Score color：

- `>= 80`：emerald。
- `>= 60`：amber。
- `< 60`：rose。

### 8.11 Task Builder

Surface：

- `OSFrostedPanel`。

Header：

- Title：`text-base font-semibold tracking-tight`。
- Create Task with AI：`OSPrimaryAction` + `Wand2`。
- Import from Tasks：`OSControl` + `FolderInput`。

Layout：

- Mobile：actions stacked full-width。
- Desktop：兩個 equal buttons。
- Min height：`44px`。

### 8.12 Quick Add Header

Elements：

- Label：uppercase `text-xs font-semibold tracking-[0.12em]`。
- Add Quick Task：ghost button，`h-11 rounded-xl`。

Behavior：

- Opens Add Quick Task dialog。

### 8.13 Quick Task Button

Component：

- Local `QuickTaskButton`。

Shape：

- Split button。
- Left：直接 add task。
- Right：dropdown。
- Left `rounded-l-xl`，right `rounded-r-xl`。
- Min height：`3rem`。

Left material：

- Light：`bg-white/58 border-slate-300/55`。
- Dark：`bg-white/[0.045] border-white/10`。
- `backdrop-blur-md`。
- Inset white highlight。
- Hover：`-translate-y-px`、更強 border、更亮 fill、更大 shadow。

Icon well：

| 狀態 | Material |
| --- | --- |
| Raster icon | `bg-[#15120f]`、`ring-white/15`、inset highlight、image cover。 |
| Lucide fallback | Light `bg-white/66 text-slate-700 ring-slate-300/55`；dark `bg-white/[0.06] text-white/78 ring-white/10`。 |
| Generating | Overlay `bg-background/45 backdrop-blur-[2px]` + spinner。 |

Built-in quick task tones：

| Preset | Icon | Tone |
| --- | --- | --- |
| Breakfast | Coffee | Amber / brown |
| Lunch | UtensilsCrossed | Emerald |
| Dinner | Soup | Orange |
| Gym | Dumbbell | Rose |
| Meditate | Wind | Sky |
| Improvise | Drama | Violet |
| Read | BookOpen | Indigo |
| Journal | NotebookPen | Teal |
| Break | Timer | Amber |
| Rest | Moon | Slate |

Dropdown：

- Block count wheel。
- Regenerate icon。
- Delete。

### 8.14 Block Count Wheel

用途：

- Quick Task dropdown 改 blocks。

內容：

- Task name：`text-xs font-medium truncate`。
- Wheel values：1 至 30。
- Summary：`text-xs muted`。
- Cancel / Done：最少 `44px` 高。

### 8.15 Your Plan Empty / Summary

Summary：

- Label：`copy.yourPlan(tasks.length)`。
- Badge：total blocks + formatted duration。

Empty：

- `rounded-2xl`。
- Dashed border。
- Light：`border-slate-300/55 bg-white/36`。
- Dark：`border-white/10 bg-white/[0.025]`。
- Centered muted text。

### 8.16 Sortable Task Row

Component：

- `SortableTaskList`。

Row material：

- `rounded-xl`。
- Left border width `4px`，顏色來自 task palette。
- Light：`border-slate-300/55 bg-white/62`。
- Dark：`border-white/10 bg-white/[0.045]`。
- `backdrop-blur-md`。
- `minHeight: 44`。

Task palette：

```txt
#6366f1 indigo
#ec4899 pink
#14b8a6 teal
#f59e0b amber
#8b5cf6 violet
#10b981 emerald
#f97316 orange
#3b82f6 blue
#ef4444 red
#84cc16 lime
#06b6d4 cyan
#a855f7 purple
#e879f9 fuchsia
#fb923c orange
#34d399 emerald
#60a5fa blue
```

Content：

- Grip icon。
- Task title：`text-sm font-semibold leading-snug`。
- Sync dot。
- Badge：blocks + duration。
- Time range：emerald。
- Desktop actions：start focus、add block、remove block、ritual、delete。

Desktop hover：

- 微升。
- Fill 更亮。
- Border 更清楚。
- Shadow 更大。

Mobile swipe：

- Swipe panel width：`144px`。
- Remove block：amber。
- Add block：sky。
- Ritual：violet。
- Delete：rose。
- Chevron toggle panel。
- Start focus：emerald icon button。

Accessibility：

- Keyboard sensor 支援 reorder。
- Icon buttons 有 aria label / tooltip。
- Swipe actions 有 desktop equivalent。

### 8.17 Timeline

Component：

- `TimelineView`。

Surface：

- `OSFrostedPanel`。
- `p-0 overflow-hidden`。

Header：

- `px-4 pb-3 pt-4 sm:px-5`。
- Title：`text-lg font-semibold tracking-tight`。

Grid：

- Time column width：`4.25rem`。
- 每個 10 分鐘 block row：`72px`。
- Block inset：`4px`。
- Track height：row count x `72px`。

Time axis：

- `text-[11px] font-medium tabular-nums muted`。
- Next-day time 用 violet。
- Next-day badge：`text-[9px] uppercase`。

Task card：

- Absolute positioned。
- `left-2.5 right-2.5`。
- `rounded-2xl`。
- Border color = task color。
- Background = task color low alpha。
- Shadow 包含 color glow + inset highlight。
- Title：centered、`text-sm font-semibold`、ellipsis。
- Meta：`text-[11px]`。
- Time range：green/emerald。
- Start focus button：top-right `h-8 w-8`。

### 8.18 Visual Schedule Generator

Component：

- `VisualScheduleGenerator`。

Surface：

- `OSFrostedPanel`。

Header：

- Icon well：`size-10 rounded-xl`。
- Light：`border-white/45 bg-white/65 text-lime-700`。
- Dark：`border-white/10 bg-white/[0.06] text-lime-200`。
- Icon：Sparkles。
- Title：`text-base font-semibold tracking-tight`。
- Blurb：`text-xs leading-relaxed muted`。

Controls：

- Image style select。
- Trigger：`h-11 rounded-xl bg-background/80`。
- Generate：full-width `OSPrimaryAction`。

Image preview：

- `rounded-lg`。
- `border-border/80`。
- `bg-background`。
- Inner shadow。
- Image max height：`min(70vh,560px)`。
- `object-contain object-top`。

Actions after generation：

- Regenerate。
- Download。
- Both use `OSControl`。

### 8.19 Free Plan Board

Component：

- `FreePlanBoard`。

Overall：

- `space-y-4`。
- Uses `GlassPanel`。
- dnd-kit drag and drop。

Quick Capture：

- `GlassPanel variant="strong"`。
- `p-4 sm:p-5`。
- Top specular line。
- Sparkles icon well：`bg-primary/15 text-primary ring-primary/20`。
- Heading：`text-sm font-semibold`。
- Blurb：`text-[12px] leading-relaxed muted`。
- Input：`h-11 rounded-xl bg-background/60 backdrop-blur-sm`。
- Submit：`h-11 rounded-xl px-5`。

Stats：

- 3 columns。
- Tile uses `GlassPanel`。
- Label：`text-[10px] uppercase tracking-wide`。
- Value：`text-lg font-semibold tabular-nums`。
- Sublabel：`text-[11px] line-clamp-2`。

Priority sections：

| Priority | Dot | Top tint | 意義 |
| --- | --- | --- | --- |
| Must | Rose | `from-rose-400/30` | 必做。 |
| Should | Amber | `from-amber-300/30` | 重要但可移動。 |
| Could | Sky | `from-sky-300/25` | 有時間先做。 |
| Done | Emerald | `from-emerald-400/25` | 已完成。 |

Column：

- `GlassPanel`。
- `p-4 sm:p-5`。
- Top tint 只係 soft gradient。
- Drop hover 加 subtle ring + white glow。
- Empty state 用 dashed border。

### 8.20 Free Plan Task Card

Shape：

- `rounded-xl`。
- `border-white/10`。
- `bg-white/[0.04]`。
- `backdrop-blur-md`。
- Inset highlight。

Content：

- Drag handle。
- Completion checkbox。
- Title / notes preview。
- Estimated minutes。
- Actions：start focus、up、down、priority dropdown、delete。

States：

- Hover：`border-white/20 bg-white/[0.07]`。
- Done：muted + line-through。
- Drag source：opacity 30%。
- Drag overlay：`bg-white/[0.08]`、強 shadow、scale `1.02`。

### 8.21 Free Plan Summary

Component：

- `FreePlanSummary`。

用途：

- Read-only recap。
- 唔係第二個 planner。

Surface：

- `GlassPanel`。
- Top specular line。
- Violet icon well。
- Empty：dashed border、`bg-card/20`。

Typography：

- Title：`text-sm font-semibold`。
- Blurb：`text-[12px] leading-relaxed`。
- Window：`text-[11px] font-medium`。
- Section label：`text-[10px] uppercase tracking-wide`。
- Item：`text-[13px] leading-snug`。

Done item：

- Muted。
- Line-through。

### 8.22 Google Sync Dot

Component：

- `PlannerGoogleSyncDot`。

Visual：

- `h-2 w-2 rounded-full`。
- `ring-2 ring-background`。

Status：

| Status | Color |
| --- | --- |
| synced | Emerald |
| pending / local_pending / remote_pending | Sky |
| conflict | Amber |
| remote_deleted | Orange |
| error | Red |

Behavior：

- 有 tooltip。
- 冇 planner task id 或 status 就唔 render。

### 8.23 Dialogs / Sheets / Drawers

Daily Planner hidden layers：

- Add Quick Task dialog。
- Task detail dialog。
- Import Tasks dialog。
- AI Suggestions dialog。
- Create Planner Task AI dialog。
- Template dialog。
- Pre-task ritual modal。
- Plan Quality drawer。
- Start Focus Session sheet。
- Finish Focus Session sheet。
- End of Day Review drawer。

規則：

1. Hidden layer blur 要比 page panel 重。
2. Form input 要有足夠 fill。
3. Primary / secondary / destructive action 要分得清楚。
4. Nested dialog 要用 `--nested-parent-dialog-blur` 同 `--nested-parent-dialog-opacity`。
5. 長內容唔應該用低 opacity glass。

AI planner action tokens：

| Token | 角色 |
| --- | --- |
| `--ai-planner-cancel-bg` | Neutral cancel。 |
| `--ai-planner-quick-bg` | Quick / manual assist action。 |
| `--ai-planner-submit-bg` | AI submit / generate action。 |

## 9. Motion

Motion 要令 hierarchy 清楚，唔可以拖慢 planning。

| Element | Motion |
| --- | --- |
| Page reveal | `data-motion-reveal`。 |
| Glass stagger | `glass-stagger-in`，400ms，200ms 起，80ms increment，600ms cap。 |
| OS controls | 150ms background / border / transform / shadow。 |
| Quick task button | 200ms lift + fill/border change。 |
| Sortable row | 200ms hover lift；drag overlay 200ms lift / 320ms drop。 |
| Mobile swipe row | 280ms snap，ease `cubic-bezier(0.22, 1, 0.36, 1)`。 |
| Free Plan cards | 180ms fade/scale。 |
| Time summary image | 260ms transform/filter；fine pointer parallax。 |
| Mode toggle | Layout animation；reduced motion 停。 |
| Cross-day hint | Small wobble；reduced motion 停。 |

Reduced motion：

- 停 parallax。
- 停 stagger。
- 保留內容同狀態。
- 唔可以只靠 motion 表達 success/error。

## 10. Accessibility

要求：

1. Icon-only control 必須有 `aria-label`。
2. Touch target 最少 `44px`。
3. Glass focus ring 要清楚：`outline: 2px solid var(--primary)` 或 `focus-visible:ring-2`。
4. Status 唔可以只靠顏色，要有 tooltip / label / copy。
5. Photo card 必須有 text shadow。
6. Dialog 要 trap focus 同 return focus。
7. Swipe actions 要有 desktop / keyboard equivalent。
8. Drag-and-drop 要保留 keyboard sensor。
9. Reduced-motion users 要有同等內容。
10. 新 glass surface 要喺 light / dark 都驗 contrast。

## 11. Responsive Rules

| Breakpoint | 行為 |
| --- | --- |
| `< 640px` | Header actions wrap/scroll；date controls stack；重要 buttons full-width；safe bottom padding。 |
| `640px+` | Time controls two columns；actions 可水平排。 |
| `< 1280px` | Time Block main grid 單欄。 |
| `1280px+` | Task Builder 左欄，Generator + Timeline 右欄。 |
| All sizes | Free Plan 永遠單欄。 |

避免：

- Button text overflow。
- Timeline hover 改變 row height。
- Icon 載入令 card 尺寸跳。
- Floating controls 擋住主要操作。

## 12. Design Risks And Guardrails

| Risk | Guardrail |
| --- | --- |
| 太多 glass 令 readability 下降 | Dense section 用 `OSFrostedPanel` 或 `OSSolidPanel`。 |
| Lime / emerald 混淆 | Lime = action；emerald = status / success / focus。 |
| AI color 過多 | Violet / magenta 只俾 AI / intelligence。 |
| Photo card 睇唔清 | 保留 overlay、text shadow、白字。 |
| Free Plan 變成假 schedule | Free Plan 唔顯示 timeline。 |
| Mobile swipe 同 scroll 打架 | 保留 touch-action、threshold、gesture logic。 |
| Theme font 壓爆 layout | 保留 line-height、min-height、wrapping。 |

## 13. Implementation Checklist

- [ ] 先用 `OSFrostedPanel`、`OSControl`、`OSIconControl`、`OSPrimaryAction`、`OSSegmentedControl`。
- [ ] Light glass 要比 dark glass 更實。
- [ ] Photo card 用白字 + text shadow。
- [ ] 所有時間 / 數字用 `tabular-nums`。
- [ ] Mobile interactive controls 最少 `44px`。
- [ ] Time Block = schedule-first；Free Plan = priority-first。
- [ ] 保留 task row keyboard、drag、swipe alternatives。
- [ ] 測 Add Quick Task、block wheel、task detail、import、AI creation、plan quality drawer、focus start/finish、review drawer。
- [ ] 測 `390px`、`768px`、`1280px`、`1440px`。
- [ ] 測 light、dark、reduced motion。

## 14. Implementation Map

| Area | File |
| --- | --- |
| Route orchestration | `app/src/app/[locale]/(protected)/daily-planner/page.tsx` |
| Planning mode toggle | `app/src/components/daily-planner/planning-mode-toggle.tsx` |
| Time summary image cards | `app/src/components/daily-planner/time-summary-card.tsx` |
| Timeline | `app/src/components/daily-planner/timeline-view.tsx` |
| Sortable time-block list | `app/src/components/daily-planner/sortable-task-list.tsx` |
| Free Plan board | `app/src/components/daily-planner/free-plan-board.tsx` |
| Free Plan summary | `app/src/components/daily-planner/free-plan-summary.tsx` |
| Visual schedule generator | `app/src/components/daily-planner/visual-schedule-generator.tsx` |
| Mini calendar | `app/src/components/daily-planner/mini-calendar-popover.tsx` |
| Sync dot | `app/src/components/daily-planner/PlannerGoogleSyncDot.tsx` |
| Focus strip | `app/src/components/daily-planner/focus/today-focus-strip.tsx` |
| Shared OS primitives | `app/src/components/ui/os-primitives.tsx` |
| Shared OS glass classes | `app/src/components/ui/os-glass.ts` |
| Default theme glass tokens | `app/src/app/globals.css` |

