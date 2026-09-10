# My Garden：最新實作進度

狀態：**正在實作，最新 Habit 日期候選已通過本機建置、scoped lint、13 項瀏覽器檢查及 42 項原生 PostgreSQL 檢查。上一輪 31 項互動檢查保留於各自版本收據。尚未發布至正式站。** 本頁是程式進度；完整遊戲目標仍以 [設計方案](proposal.zh-TW.md) 為準。

## 這一輪已經做到

| 玩家行為 | 現在的程式結果 | 驗證 |
| --- | --- | --- |
| 同一件事記在 Task、Habit 或 Gratitude | 可以明確關聯紀錄，整組共用一次建設機會；關聯本身不發獎勵 | 8 項連結、重試、保存與刪除流程 |
| 完成關聯的 Habit | 只接受該次選定的日期，Task 保持原本狀態；之後再完成 Task 不會多發一次 | 錯日期先拒絕，正確 occurrence 再成功 |
| 用生活機會建造 | 物件與來源歸因保存；另一個瀏覽器 context 讀回相同世界 | 使用隔離 SQL 帳戶，非正式使用者資料 |
| 刪除原始任務 | 保留已有物件與其他存活關聯，清除原始私人標題 | 重載後檢查世界及資料 |
| 切到觀察模式 | 隱藏布置格線、選取框與預覽物件；水波出現在玩家實際選定的三個位置 | renderer 狀態及截圖 |
| 想專心看魚塘 | 可收起工具、再展開；保留已選路線和未保存的位置 | 8 項減少動態觸控／鍵盤流程 |

## 跨裝置與無障礙回歸

12 項鍵盤靜音、觸控減少動態、無 WebGL 替代操作均通過。三種模式可完成相同配置、休息來源建造和三種動物發現。另有 320px 中文手機、844 × 390 橫向手機、768 × 1024 平板三項版面檢查；面板在畫面內、最後一排位置可操作，可見按鈕至少 44px。

這些是 Chrome 的真實瀏覽器輸入及装置模擬，沒有冒稱實體 iPhone、iPad、低階 Android、screen reader 或十分鐘 GPU／電池驗收。此輪沿用既有音樂與音效，沒有新增錄製音樂資產。

## 已查明並仍要修好的缺口

此前 Habit 測試失敗，原因是測試 helper 使用資料庫 current_date，與連結的 occurrence 差一天。現在使用明確 occurrence，並加入錯日期不能兌獎的負向檢查。

這個實際產品缺口也已修正：花園新選定／新關聯的 Habit 保存原模組的裝置日曆日期與時區，伺服器核對後固定這次 occurrence；凌晨完成、早上才選重點亦可正確確認。原 Habits Today 頁的完成、撤銷／重做、回花園建造及另一時區讀回五項流程已通過。詳見 [Habit 日期契約](habit-calendar.md)。

Task 拆分／複製／重新建立的穩定來源血緣也仍待實作。目前只能精確辨識同 ID 或玩家明確關聯的紀錄，再以整體發獎上限限制濫用；不能聲稱能自動辨識所有新 ID 的重複工作。

## 技術驗證與證據

| 項目 | 結果 | 本機證據 |
| --- | --- | --- |
| 最佳化 Garden 建置與 scoped TypeScript | 通過 | `artifacts/garden-v3/optimized-build.log` |
| 關聯生活資料 UI | 8／8 通過 | `artifacts/garden-v3/linked-evidence/validation.json` |
| 觀察／收起工具／恢復操作 | 8／8 通過 | `artifacts/garden-v3/immersion/validation.json` |
| 鍵盤、減少動態、無 WebGL 等效玩法 | 12／12 通過 | `artifacts/garden-v3/equivalence/validation.json` |
| 窄螢幕、橫向、平板版面 | 3／3 通過 | `artifacts/garden-v3/layout/validation.json` |
| 原生 PostgreSQL 規則與競態 | 42 項；三份 migration 雜湊仍相符 | `artifacts/garden-v3/concurrency/validation.json` |

本輪另建立獨立測試候選 `/private/tmp/garden-pond-verified-ic2gto0c`，複製程式與公開素材，沒有複製環境檔、憑證或部署設定；不會把這份快照覆蓋回共用工作目錄。

建置現在也保存實際輸入來源的雜湊 manifest。啟動預覽及建立瀏覽器 fixture 前會核對，若共用工作目錄在建置後有修改，就停止並要求重新建置，避免新程式套用舊測試結果。

建置使用 `node scripts/build-pond-verify.mjs`；瀏覽器驗證使用同名 `verify-garden-pond-*.mjs` 腳本，Node 22 及隔離 PGlite。`.next-pond-verify` 使用 loopback fixture，不能部署。最新日期修正有更新候選 SQL，並重新通過 42 項原生及 26 項 PGlite 檢查；這仍是隔離帳戶，並非正式 Supabase 驗收。

可直接檢視 [手機收起工具畫面](../../../artifacts/garden-v3/immersion/touch-reduced-focused.png) 和 [桌面觀察模式](../../../artifacts/garden-v3/immersion/desktop-markers.png)。完整變更與限制收錄在 [execution.md](execution.md) 和 [release-readiness.md](release-readiness.md)。

最終收據：[implementation-validation.json](../../../artifacts/garden-v3/implementation-validation.json)。受測候選固定了 474 個程式／設定來源輸入；收據完成時，共用目錄又更新了 `adventure-world.ts`、`gardener-motion.ts`、`pet-motion.ts`。這三份後續動畫修改不在本次候選測試結論內，不能把本次通過當成對之後整個共用目錄的保證；原檔未被覆蓋。

## 接下來的完成順序

1. 補上穩定 Task 來源血緣，完成其餘原始 OS 入口驗證。
2. 完成實體裝置、畫質與音訊生命週期驗收，整理獨立的魚塘發布修改集合，核對正式 schema。
3. 通過發布閘門後更新正式站並登入實玩；目前沒有執行 V3 production migration、commit、push 或 deploy。
4. 依原方案完成自願玩家試玩，再決定 P2 繁殖／個體特徵及 P3 新生態區域。遊戲享受程度與 D30 留存需要真實玩家及時間，不以自動測試替代。


## 最新：原 Habits 頁已接通

2026-09-08 的日期修正收據為 [habit-calendar-validation.json](../../../artifacts/garden-v3/habit-calendar-validation.json)。最新獨立候選是 `/private/tmp/garden-calendar-verify-2xdsbkcc`，原 Habits Today 頁五項流程及八項關聯回歸通過；原頁面的打卡方式和完成判斷保持一致。日期機會會保存為永久物件，取消後重做不會再發一次。

原生 SQL 42 項、PGlite 26 項、相關單元測試 12 項通過，Garden／Dashboard／Habits 最佳化建置與 scoped TypeScript 通過。這一版只在收據時的 tsconfig.json 與共用目錄有差異；沒有把它回寫覆蓋其他工作。

畫面：[原 Habits 頁完成](../../../artifacts/garden-v3/calendar/original-habits-completed.png)、[習慣帶來的魚塘物件](../../../artifacts/garden-v3/calendar/habit-built-perch.png)。Counter、duration、routine／timer 等其他入口、正式 auth／PostgREST、實體裝置及發布仍未完成。
