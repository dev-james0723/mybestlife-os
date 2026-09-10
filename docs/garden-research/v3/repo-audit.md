# My Garden 下一階段：能力與資料缺口

**歷史基準審計：**下文記錄 2026-09-08 初次研究時的 repo 與正式 metadata。工作目錄其後已有候選魚塘實作，最新事實見 [本輪 repo 與設計決策](current-review.zh-TW.md)。本輪只修訂研究文件，沒有重新連線查核正式 schema；下文的「本次」指原始審計。

## 1. 什麼是本次的事實基準

Garden V2 發布 commit 為 `c1ca2a2abf1efba428a8a9a135318e4a69148dac`。目前主工作目錄 HEAD 仍是 `d467ab83`，存在大量其他工作中的修改；這不是 V2 未發布的證據。已逐檔比對：`GardenAdventure.tsx`、`AdventureScene.tsx`、`audio.ts` 與發布 commit 相同；Tasks／Projects／Journal／About Me repositories、全域 types、feature flags 有本機差異。詳見 [source-snapshot.json](source-snapshot.json)。

本次也透過現有 Supabase 連線唯讀查詢正式 schema、欄位、RLS 開關及 trigger metadata，**沒有讀取任何人的任務、日記或其他帳戶內容**。[production-schema-audit.json](production-schema-audit.json) 是核對紀錄。RLS 開啟不等於每個 policy 已安全審計；除了前次 V2 發布所驗證的 Garden 權限，本次沒有重新執行跨帳戶 production 測試。

可靠性分成三層：資料表／欄位存在；應用程式讀寫流程可用；能作為一次且不可重複的獎勵證據。很多模組只滿足前一至兩層。TypeScript 宣告、future-dated migration、前端 toast，都不能單獨證明第三層。

## 2. 能力矩陣

| 模組 | repo／正式 schema 已有 | 可以使用的最小訊號 | 需要擴充／不能推論 |
| --- | --- | --- | --- |
| Tasks | `tasks`: owner、status、completed_at、project_id、priority、estimated_blocks、scheduled_date；`task_subtasks`: task_id、is_done | 目前完成狀態、明確的專案關聯、使用者設的優先度 | 缺不可變完成事件、拆分 lineage、穩定 recurrence occurrence。`completed_at` 可由前端修改；estimate 不等於實際投入。不能以新增／刪除／再次 done 無限領獎 |
| Projects | planning／active／paused／completed／cancelled、priority；task.project_id | 使用者選中的專案與其下一步；暫停／轉向狀態 | 專案狀態不是成果品質；沒有已驗證的通用 milestone-completed 事件。需要使用者定義「這一步完成是什麼」 |
| Goals／Key Results | 目標狀態、target_date、category；KR current_value／target_value | 顯示方向與使用者選中的里程碑 | 不同 KR 單位不可比較；修改 target/current 不能直接鑄造獎勵。Goal 沒有直接 project_id，不應自動假設 Goal→Project→Task 關係 |
| Schedules／Calendar | daily_plans 的 tasks／free_tasks JSON；日曆由 Tasks、Goals、Habits、Daily Plans 投影；Google API 與 `calendar_task_sync` | 使用者明確選定的計畫下一步；改期訊號 | 行程存在／時間經過 ≠ 已出席或已完成；同一 task 出現在 Calendar 和 Planner 是同一件事。沒有通用 `calendar_events` 表 |
| Planner Focus | repo 有計畫／開始／暫停／完成與 task/project 關聯 | 暫不作正式獎勵條件 | 本次正式 DB **沒有 `planner_focus_sessions`**。dev-login 模式有 browser-local 支援，不是跨裝置證據。要先補 schema 和實際寫入驗收 |
| Habits | checkbox／counter／duration／negative；frequency、archived_at；completion_date、done／skipped、value、completed_at；habit_links | 已選習慣在一個 occurrence 的完成 | done／skipped 必須分開；counter 數量不成倍獎勵；link 是多型關聯，不可假設 FK／owner 已替我們驗證；不給負面習慣或反思 mood 打分 |
| Habit Timer | `timer_sessions` 有起止、暫停、target、status | 可輔助展示「你記錄了一次練習」 | 自報 timer 不證明專注程度；不按分鐘累乘，不能和同一 habit completion 重複發獎 |
| Journal | `journal_entries` 有 owner、entry_date、created_at、next_tiny_step、appreciation、linked_task/project_ids 等 | 只用「已保存一篇」及 ID／時間；若使用者自行選擇，可連回原文 | repo v2 writer 想寫 quadrant／project_ids／task_ids；正式表仍有 emotion_quadrant／linked_project_ids／linked_task_ids，且缺部分 repo 預期欄位。新寫入整條路徑需先驗收；不能直接依 types 使用。不能以情緒正負、字數、AI 分數領獎 |
| Gratitude／Appreciation | 獨立 `grateful_things` 有 content、entry_date、photo_url；Journal 也有 appreciation | 使用者選定的感謝記錄保存成功 | 正式 grateful_things 缺本機 type 的 thumbnail_url，這不妨礙 existence adapter；需要跨兩種記錄的同一 intention 去重，不讀取內容評價真誠度 |
| Knowledge | knowledge_items、收藏、AI 摘要／insights／action_items、資料處理 status | 選一個已存在項目，作為學習意圖的連結 | `ready` 是處理完成，`checked_at` 是來源預覽檢查。未見「已閱讀／已回憶／已應用」可信事件；開啟頁面、收藏、AI 摘要完成均不給成長 |
| Learning | japanese_study_sessions 有日期、duration、study_type | 已保存的練習記錄可作自報證據 | 部分學習路由有 production feature gate；本次未讀 production env，不能宣稱該路由對所有人開放。不能把時長當掌握程度；首版不依賴此模組 |
| Career | opportunities 有 stage、stage_history、next_action_date；decisions、events 存在 | 使用者選定的一次準備／跟進，最好先連成一項 Task | stage_history 是可改資料；不以薪酬、offer、拒絕、職位高低評價人生。結果常不受使用者控制，不以獲聘作進度硬門檻 |
| 方向與偏好 | profiles.focus_areas、focus_mode、timezone、greeting_tone；About Me core_values／mission／sections | 使用者明確選中的 1–2 個方向，接受或修改建議 | About Me 是自由文字／JSON，不是可比較價值分數；不預設掃描全文或讓 AI 替使用者決定「什麼重要」 |
| Garden V2 | 探索、3 花床、井、採集、蝴蝶挑戰；每日 ledger；帳戶植物／收藏；1／3／7 stamp 裝飾 | 可保留移動、相機、互動、顯示／輸入與儲存框架 | 池塘現為水面／石圈／睡蓮地標，沒有 fish entity、棲地編輯、物種條件、繁殖、長期區域 state |
| OS Buddy | profile 身分、garden enter/exit/achievement；前端 task/habit/focus 事件；in-app 邀請 | 身分、即時反應與已有提醒限制 | `CustomEvent` 非 durable event bus：多數事件沒有 owner／source ID／occurrence／版本，不可當獎勵依據；目前 invitation 主要是通用文案，未證明有新生態內容 |

## 3. 花園目前真正的界線

`gardenRepository.getLifeActivity()` 以 existence query 取 task／habit／journal 三個 boolean：任務依 UTC completed_at，另外兩者依 date 欄位。V2 的 Task 增加起始水量，Habit 增添花徑，Journal 顯示池塘睡蓮；這些未構成可長期累積、可配置的生活成果系統。[程式](../../../app/src/lib/repositories/garden.ts)

`garden_adventure_events` 的 primary key 是 user/day/action；SQL 驗證種→澆→收與交付前置條件，將 privileged work 放在 private schema，以 auth.uid 驗證身分與帳戶斷言。它**沒有驗證現實生活行動**，也沒有移動距離／魚類育成等伺服器規則。過去日期可補傳，是為私人 cosmetic retry 設計；下一代生活獎勵不可直接複用任意 p_day。[SQL](../../../app/supabase/migrations/20260908061801_garden_adventure_world.sql)

本機 outbox 已按帳戶隔離、去重／合併並支援未知回應重試；可保留思路，不能沿用固定 regex 當通用世界資料格式。[Persistence](../../../app/src/lib/garden/persistence.ts)／[Hook](../../../app/src/hooks/use-garden-adventure.ts)

舊園藝還有 client-side daily chest 隨機抽取、肥料減量、收成等多步操作，以及 `is_wilted`／checkAndApplyWilt；不能據此說 V2 世界會因缺席荒廢，因目前 V2 主路徑沒有呼叫該 wilt hook。下一版也不要把這些 legacy 庫存直接換成高價值魚類貨幣；需先有交易一致性與相容性方案。

## 4. Buddy 與通知的已知能力

現有 Garden invitation：opt-in、notification_preferences.daily_summary、Buddy enabled、當日沒有玩過、24 小時間隔、安靜時段、前景頁面、無 focusSession、無其他 bubble／menu。Client 約每分鐘檢查，伺服器鎖定每日邀請 claim；不是背景排程。[Hook](../../../app/src/hooks/use-garden-buddy-invitations.ts)／[Eligibility](../../../app/src/lib/garden/persistence.ts)

repo 的 habit timer 有 service-worker `showNotification()`；這不等於 Web Push。所查範圍未見 Garden push subscription、VAPID delivery worker 或在關閉 app 後發送生態通知的工作。新設計先只做前景 invitation，將背景推播放在獨立可選階段。

## 5. 渲染、操作與美術基準

V2 已有 Three.js 自適應 DPR、ACES、可關閉陰影、省電約 30fps、視窗／native fullscreen、touch joystick、鍵盤、地圖選目的地、減少動態效果、無 WebGL 替代操作。`AdventureScene` 是 renderer owner；`GardenAdventure` 是遊戲循環／UI owner。池塘擴充應遵守這個分工，不新增另一個搶更新的 RAF。[Scene](../../../app/src/components/garden/AdventureScene.tsx)／[World](../../../app/src/components/garden/adventure-world.ts)

本次實際查看先前 V2 的本機實玩截圖：sage／lime 植被、奶白玻璃 HUD、圓潤木石、手作比例人物；它是歷史 local evidence，不是本次 production screenshot。音樂沿用 `A Little More Green`，76 BPM、32 小節、日夜兩種配器、分離 music／effects／nature；開啟需使用者操作、退出或失焦暫停。[音樂設計](../v2/audio-design.md)

## 6. 必須先解決的四個缺口

1. **獎勵權威**：新增 server-side life evidence／intention／grant，不把 Buddy event、toast、頁面停留時間當完成證明。
2. **持久世界模型**：新增 world revision、placement、species、discovery、world command；日常 V2 action ledger 保持可讀。
3. **能力協商**：每個 connector 先測 schema 和寫入路徑，回傳 ready／partial／unavailable；日記與 Planner Focus 是明確的優先驗收項。
4. **產品量測**：所查 Garden 目錄未見玩法漏斗／enjoyment／reminder burden telemetry。必須新設計最小事件，不能引用不存在的留存 baseline。

## 7. 本階段完成的驗證

讀過相關 types、repositories、hooks、scene、SQL、feature gates，做了 release source 比對、正式 metadata 唯讀核對、研究來源檢查。沒有測試或操作真實使用者生活資料；本階段沒有遊戲實作可供 FPS／實玩驗收，這些被列入後續 acceptance。前次 799 tests 不是本次下一代設計的測試結果。
