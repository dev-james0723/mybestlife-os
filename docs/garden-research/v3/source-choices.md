# 今天先完成，再帶回魚塘

2026-09-08。本機候選實作；未套用正式資料庫、未發布。

玩家不用先進花園，才能讓今天的投入成為世界的一部分。帳戶已明確連接 Tasks 時，原 Tasks 保存完成會在同一資料庫 transaction 產生最小 receipt。回到魚塘按「重新讀取行動」，選單可顯示「今天已完成」。玩家仍需親自選定並確認，再決定建造種類與位置；讀取選單本身沒有獎勵。

## 可列入的完成

新的 `garden_pond_task_choices(p_account)` 只回傳呼叫者自己的 ID、標題、狀態、project ID 與 `recorded_today`。私有實作先核對登入身分、帳戶一致性與伺服器保存的 Tasks 連接設定；沒有世界或未連接時回傳空清單，不建立世界或追溯來源事件。公開函式是 security invoker wrapper，真正的 metadata 讀取在固定空 search_path、明確 owner 條件的函式內執行。

近期 todo／in-progress 任務仍可選，取消的任務不作新邀請。已完成任務必須有保存的、尚未結算且未修正／刪除的 receipt，其首次觀察時間落在帳戶目前 Garden 日的 04:00 起點到伺服器現在之間。待切換的時區只在既有 window 結束後生效，與 select／claim 的規則一致。清單最多 25 件，先列當天可用的完成，再列近期未完成。

Tasks 的 client `completed_at`、任務標題、用戶端時鐘都不能補造今日證據。連接前完成的任務、昨天的完成、已領過或已達上限結算的紀錄不列為今日可領；取消後再完成不會把同一 settled receipt 重新打開。最終 claim 仍重新驗證，選單不是保留名額或發獎承諾。

## 操作與相容性

選已完成的紀錄後，標題欄保留原任務名稱，今日標籤不混入自己的小步標題。畫面解釋完成紀錄來自何時；不再讓這個已完成選項預選為「只做一部分」。任務部分推進仍可用在未完成任務，並清楚標示自報。

来源更新可手動重讀；Garden revision 改變也刷新選單。讀取失敗顯示可重試訊息，不把失敗當作空白帳戶或完成來源。未連接其他模組不讀其清單。RPC 已加入候選 pause／resume 權限腳本，停用時舊分頁也不能繼續讀取新 RPC。

## 驗證

- `artifacts/garden-v3/concurrency/validation.json`：原生 PostgreSQL 共 24 項檢查，其中五項新增來源選單案例。包括匿名／錯帳戶／未連接拒絕、無自動 enrollment、無 pre-consent 回填、當天完成、帳戶 04:00 與 pending timezone 邊界、一次領取後退出選單、取消／刪除／斷開連接。隔離 fixture，並非正式 Supabase 驗收。
- `artifacts/garden-v3/source-choices/validation.json`：三項實際 browser／SQL 流程，讀取故障恢復、完成後才選小步、一次建設與保存來源。手機觸控模擬，非實體手機或玩家研究。
- `artifacts/garden-v3/db/database-validation.json`：既有 26 項隔離 SQL 檢查通過新 migration，包括 600 配置的 TypeScript／SQL 路徑對照。

本輪重新搜尋 Tasks repository、hooks、Tasks UI 與 Life Agent 工具後，沒有發現已可沿用的 duplicate／clone／recreate workflow；現有 `task_subtasks` 明確帶 `task_id`，但清單項不各別授獎。不要以文件中的未來複製功能，宣稱 repo 已有該入口。跨模組 linked evidence 與可供未來複製／拆分流程沿用的穩定 lineage 仍未完成。
