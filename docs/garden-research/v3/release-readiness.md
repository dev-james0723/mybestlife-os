# Living Pond release candidate — 2026-09-08

狀態：本機實作與隔離驗證進行中。未套用 V3 production migration，未 commit、push 或 deploy。此文件不取代原設計，也不表示 P0／P1 全部驗收完成。

## 已完成的發布保護

`NEXT_PUBLIC_ENABLE_LIVING_POND` 必須明確等於 `true` 才會顯示活水魚塘入口、載入互動面板及呼叫新的 Buddy 邀請服務；缺省或 `false` 保留原花園。這是既有 `/garden` 裡的功能，沒有新增可繞過開關的獨立頁面。公開環境變數在 build 時寫入前端，改值必須重新 build／deploy。測試 builder 明確打開開關，並使用 loopback fixture 服務；`.next-pond-verify` 永遠不是可發布產物。

生活模組連接是每帳戶設定。魚塘來源選單只讀已連接模組的 metadata；感謝紀錄只讀 ID／保存時間，不讀內容。讀取失敗在 UI 顯示可重試狀態，不能被當作生活行動完成。

## 候選 migration 順序

1. 前置：`20260908061801_garden_adventure_world.sql` 的實際部署狀態需在發布前重新查核。
2. `20260908162634_garden_living_pond.sql`：world、intention、receipt、grant、command、event、原子來源 trigger、RLS。
3. `20260908172055_garden_pond_buddy.sql`：邀請投遞紀錄、事件去重、使用者偏好與頻率政策、V2 邀請相容保護。

不能對目前混有其他功能的 dirty working tree 直接執行整體 `db push` 或 production deploy。應先組成只含核准魚塘修改及所需 V2 前置內容的 checkout／patch，核對實际 production schema，再按以上順序驗證。前一階段的 production 紀錄不能當成今天的發布證據。

## 暫停與恢復

一般功能停用：把公開開關設為 `false` 並重建。這會隱藏新版入口；已下載的舊分頁不會立即換程式碼。

需要立即停止新版 RPC 時，先審閱 [pause-pond.sql](release/pause-pond.sql)。它只撤銷 authenticated 對新 public／private RPC 的 execute 權限，保留 worlds、grants、command IDs、來源修正／刪除的 privacy triggers，以及 V2 玩法。這不是刪表式 down migration。未知結果的 IndexedDB command 不可清空；修復後以同一 UUID 重試。

修復並通過檢查後，審閱 [resume-pond.sql](release/resume-pond.sql)，恢復相同 execute 權限，再啟用前端。獨立 PostgreSQL 連線測試已實際執行兩份候選腳本：停用時新 RPC 被拒絕、任務更新和修正 receipt 仍成功、V2 settings 仍可用、世界不變；恢復後重送舊 command 不重複執行。

若 source trigger 本身出錯，這兩份腳本不足以解除該錯誤，不能宣稱已回滾。需針對錯誤函式製作修補並以原始 OS 寫入路徑驗證。不可一律吞掉 trigger 錯誤，否則會把來源成功但 receipt 遺失當成可靠事件；也不可停用 privacy trigger 後不處理停機期間的撤銷／刪除。這項事故處理仍需在具體失敗上制定恢復方案。

## OS 寫入入口盤點

| 來源 | 實際 repo 寫入路徑 | 已有證據 | 尚未代表的事 |
| --- | --- | --- | --- |
| Tasks | `tasksRepository.update` 更新 `tasks.status`；`useBulkUpdateTasks` 平行呼叫同一 repository；建立採 ID upsert；Life Agent 也可寫 tasks | DB trigger 在 row transition 產生 receipt；重送、撤銷及真實兩連線 claim 競態已測 | 尚未在此次 fixture 完整操作 Tasks 表格的 bulk UI、AI 寫入及 planner 各入口 |
| Habits | `habitCompletionsRepository.upsert` 使用 `(habit_id,completion_date)`；另有 update／deleteForDate | 同 habit occurrence 重建 completion row 不重領；頻率與改期修正已有 SQL 測試 | 來源日期差異已修正；原 Today 頁的 checkbox 完成、取消完成、重新完成及花園建造已走通。Counter／duration／routine／timer 和正式 PostgREST／auth 仍待驗證 |
| Gratitude | `/api/grateful-things` 驗證 session 後呼叫 `insertGratefulThing`；repository-core 有 thumbnail 欄位相容 retry；更新不等於新保存 | 首次保存 metadata／刪除去識別化已測；不評價字數或內容 | 隔離測試沒有呼叫真實 photo Storage 或正式 API |
| Rest | 使用者在魚塘先選這一步，再顯式確認 | UI → SQL grant → 放置 → 帳戶讀回已測 | 是自報休息，不代表驗證了時間、運動或生理狀態 |

所有來源的 award authority 均是 SQL receipt；OS Buddy CustomEvent 只影響畫面，不能兌換獎勵。`task_subtasks` 清單項目前不獨立授獎。未發現可沿用的通用 task split／recreate lineage；自由建立新 ID 不能完全辨識為同一行動，仍由選定 intention 與 2／24h、6／168h 的總額限制控制。已實作有版本的小步暫停／修改／恢復與明確自報的部分任務推進；同一 Task 的部分和整項完成共用一次機會。明確跨模組 linked evidence 已有候選實作及八項瀏覽器驗證；穩定 lineage 尚待實作。詳見 [dynamic-intentions.md](dynamic-intentions.md)。

## 驗證證據與限制

最新 31 項瀏覽器回歸針對獨立固定候選，詳見 [implementation-update.zh-TW.md](implementation-update.zh-TW.md)。收據列明後續共用動畫檔案差異；尚未把這些差異列為通過驗收。

- `artifacts/garden-v3/db/database-validation.json`：26 項隔離 PGlite／PostgreSQL SQL 測試，其中一項覆蓋 600 個生成配置，對照實際 TypeScript 與 SQL 的完整路徑和棲地判斷。
- `artifacts/garden-v3/concurrency/validation.json`：42 項原生 PostgreSQL 18.4 測試，兩個不同 backend PID 的 TCP session；涵蓋競爭領取、同 UUID 重送、同機會競爭建造、前後順序不同的撤銷、Buddy reserve 去重、停用／恢復、bulk transaction 原子性，同 source ID 刪除重建的去重、小步版本與部分推進，以及刪除來源／更換來源的真實競態；另含十項關聯證據權限、去重、隱私與並行檢查，以及八項來源日曆／DST／跨日與相容檢查。目前三份 migration 雜湊與該 receipt 相符。這不是正式 Supabase 版本及 PostgREST 堆疊驗收。
- `artifacts/garden-v3/buddy/validation.json`：實際 OS Buddy Dock、使用者 opt-in、新成長事件、離線關閉後 reload 補同步。成熟時間由 fixture 調整，沒有冒稱等待真實八小時或發送背景推播。
- 最新前端開關與來源讀取限制已通過 scoped TypeScript／lint、最佳化 Garden/Dashboard build 及 9 項 browser playthrough。包含暫停／恢復未知請求、原生全螢幕、第二個瀏覽器讀回、no-WebGL／reduced-motion 放置，以及未連接來源不讀清單的 network assertions。`playthrough/validation.json` 保存受測來源雜湊。

- `artifacts/garden-v3/intentions/validation.json`：五項觸控模擬流程，涵蓋預計日期、暫停後 reload、換來源、恢復、部分自報與建造。不是實體手機驗收。

- `artifacts/garden-v3/source-choices/validation.json`：三項今日來源的讀取、故障恢復與建造流程；[source-choices.md](source-choices.md) 記錄日期、consent 和不回填歷史的規則。
- `artifacts/garden-v3/equivalence/validation.json`：十二項等效檢查，鍵盤靜音、觸控減少動態和無 WebGL 均保存相同兩種配置、不同魚路、休息來源物件與三種物種。靜音時 AudioContext 保持 suspended／closed。不能因此宣稱完成 screen-reader、實體效能或主觀音色驗收。

- `artifacts/garden-v3/focus/validation.json`：四項實際鍵盤檢查，開啟進入魚塘、Tab／Shift+Tab 在世界內循環、Esc 與明確退出按鈕恢復焦點。修正了 Esc 原本掉到 document.body 的行為；未冒稱 screen-reader 使用者測試。

- `artifacts/garden-v3/linked-evidence/validation.json`：八項實際瀏覽器輸入＋隔離 SQL 流程，涵蓋錯日期拒絕、未知回應重試、同組共用機會、來源歸因建造、後補關聯、第二 context 讀回及刪除來源保留成果。
- `artifacts/garden-v3/immersion/validation.json`：八項觸控減少動態／鍵盤流程。觀察模式隱藏布置工具，只显示三個選定水波；收起面板保留路線及未保存布置，重新打開後仍可記錄魚類。附 renderer 狀態和實際截圖；不是實體 GPU 效能結果。

- `artifacts/garden-v3/calendar/validation.json`：五項原 Habits Today 頁操作，經原 hook／repository payload 與隔離 SQL，完成選定→原頁保存→確認／建造→原頁撤銷／重做→另一時區讀回。詳見 [Habit 日期契約](habit-calendar.md)。

## 仍需完成的閘門

穩定 Task lineage，以及其餘原始 OS 來源入口驗收（包括 Habit counter／duration／routine／timer）、獨立 scoped release checkout、正式環境相容驗證、實體手機／平板十分鐘互動與音訊效能、screen reader 與完整音訊生命週期驗收，以及真實首次遊玩時間。既有音訊原創方向沿用，但這次沒有新增錄製音樂資產。

6–8 位自願玩家的可理解度／自主重玩、兩週 beta 與 D30 追蹤需要真實參與者和時間；目前沒有資料。P2 繁殖／個體特徵與 P3 新生態區域仍受原方案門檻限制。測試帳戶、模擬時間及自動輸入都不能證明有趣、留存改善或低提醒負擔。
