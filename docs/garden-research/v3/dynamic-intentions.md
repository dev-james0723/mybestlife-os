# 動態生活小步：候選實作契約

2026-09-08。本文件對應原方案第 6、9 節，記錄已完成的本機實作與仍待完成的範圍。没有套用正式資料庫。

## 玩家行為

同一個小步可調整標題、來源與可選的預計日期，也可先暫停、再繼續。最多同時選兩件；暫停的小步不佔這兩個位置。最多保留二十件暫停的小步，使用者可以略過不再需要的項目；沒有逾期、動物受傷或世界退化。

修改、暫停、恢復和改期都不發建設機會，不改既有世界物件。已領取或已記下的結果不可改寫後重領；需要新投入時另選一小步。來源被刪除時會清除其私人標題與來源識別；未完成且沒有其他可用關聯證據的小步轉為略過，有存活證據的共用小步可保留。已獲得的世界保留。

任務可選「我想先完成這項任務的一小部分」。使用者替本次成果命名，完成後明確按「我完成了這一小部分」。這是保存了一次自報，沒有把原 Task 勾成 done，也沒有驗證字數、時間或工作的價值。建設機會與物件來源會標示「來自你自己確認的一次行動」。正常保存的 Tasks／Habit／Gratitude 則標示來自生活模組的完成紀錄。

同一 Task 的部分推進與之後整項完成共用一次建設機會；原 Task canonical key 不因改標題、改範圍或再完成而改變。這保留原方案「非重複 Task 的同一 occurrence 不重領」的規則。要有多個獨立可辨認的成果，應選不同的實際下一步；尚未實作通用拆分血緣，不把文字差異當成已證明的新工作。

Habit 的預計日期只改生活安排，不改本次選定的 occurrence date。畫面顯示這次習慣日期；新一期習慣需要另選小步。沒有因拖動日期就重開一次可領機會，也不把未保存的新一期打卡當成舊期證據。

## 資料及同步

- `garden_life_intentions` 加入 `version`、`scope`（completion／chosen_step）、`planned_for`、`paused_at` 與 paused 狀態。ID 保持不變；標題／來源調整與暫停／恢復遞增 version。
- `intention` command 支援 revise／pause／resume；帶 `intention_id`、`intention_version`、既有 world revision 和 UUID。claim／skip 同樣帶目前 intention version。
- 尚未修改的 version 1 允許原本未帶 intention version 的 pending command，以保留此前候選版的 outbox 相容性。修改後缺版本或版本不符，必須重新檢視當前小步；同 command UUID 的已成功結果仍優先走去重讀回。
- 單純改標題／計畫日期保留原始選定時間；換來源或確認方式時重設來源 baseline，以免把舊來源歷史當成新完成。paused 小步的可信 receipt 不因 14 天未使用清理而丟失。
- receipts 與 grants 增加 `evidence_kind`（saved_record／self_report）。Task 部分推進與 Rest 的 explicit confirmation 在同一 SQL transaction 產生自報 receipt 並核對 grant；不信任任意 client timestamp。
- 來源 ownership 檢查以 key-share lock 保護選定／換來源的目標，避免刪除與連結之間出現 dangling reference。Intention 更新另以預期 version 條件寫入，避免另一裝置刪除來源後，舊編輯把私人文字寫回。

鎖順序與 function 權限參照 [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html)、[Supabase database functions](https://supabase.com/docs/guides/database/functions)。這些文件是工程依據；本案的正確性另以實際 SQL 競態測試驗證。

## 本輪證據

`artifacts/garden-v3/concurrency/validation.json` 現有四十二項原生 PostgreSQL 檢查，其中十項覆盖動態小步：暫停／來源替換／恢復、舊版本拒絕、自報部分完成、全項完成不重領、跨帳戶與 consent、Habit 日期、paused receipt 保留，以及兩種真實刪除競態。全程使用隔離測試帳戶。

`artifacts/garden-v3/intentions/validation.json` 的觸控流程涵蓋選定日期、暫停後 reload、paused 狀態下由工作轉為休息、恢復後縮小任務範圍、自報確認後建造並讀回。這是瀏覽器觸控模擬，不是實體手機驗收或真實玩家研究。

## 明確關聯同一生活行動

玩家可在小步或已獲得的物件來源中，明確關聯最多四筆同一行動的 Task／Habit／Gratitude 紀錄。關聯本身沒有獎勵；任一已保存且合資格的關聯完成紀錄可確認同一小步，整組只共用一次建設機會。已確認的小步保留關聯，避免移除後重領；後補的紀錄也不會再发一份。這不是自動語意判斷、Task 拆分血緣或內容評分。

八項瀏覽器測試已通過，涵蓋連結後丟失回應重試、錯誤 Habit 日期拒絕、正確 occurrence 確認、建造、後補感謝紀錄、跨 context 讀回、重複完成及刪除原 Task 保留成果。見 `artifacts/garden-v3/linked-evidence/validation.json`。原 Habits UI 與 Garden 的裝置／帳戶時區差異已另行修正，並通過五項原 Today 頁瀏覽器流程；參照 [Habit 日期契約](habit-calendar.md)。其他 Habit 入口與正式環境仍待驗收。

## 還沒有完成

Task 拆分／複製的穩定 lineage、Projects／Goals 的自動暫停或方向推薦、尚未接入模組的來源 adapters。這次可以手動調整小步，不能因此宣稱所有 OS 計畫變化已自動同步。

Task 選單已支援「完成後才選今日重點」，詳見 [source-choices.md](source-choices.md)。全部原生 OS 寫入入口、實體裝置、完整音訊／無障礙等效流程與實際玩家試玩仍按 release-readiness 的閘門執行。
